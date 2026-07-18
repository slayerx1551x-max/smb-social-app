// Supabase Edge Function: plan-animation
// Turns a prompt + business profile into a motion-graphics plan: which template
// to use and the on-screen text. The render service (Remotion) turns the plan +
// brand colors/logo into a 9:16 MP4. Uses Claude when ANTHROPIC_API_KEY is set.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.68.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-opus-4-8";

type Template = "promo" | "product" | "event" | "hours" | "review";

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    template: { type: "string", enum: ["promo", "product", "event", "hours", "review"] },
    headline: { type: "string" },
    subline: { type: "string" },
    cta: { type: "string" },
  },
  required: ["template", "headline", "subline", "cta"],
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return json({ error: "Not authenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const businessId: string | undefined = body.businessId;
    const prompt: string = (body.prompt ?? "").toString().trim();
    if (!businessId) return json({ error: "businessId required" }, 400);
    if (!prompt) return json({ error: "prompt required" }, 400);

    const { data: business } = await supabase
      .from("businesses")
      .select("id, name, tone, description")
      .eq("id", businessId)
      .maybeSingle();
    if (!business) return json({ error: "Business not found" }, 404);

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    let plan: { template: Template; headline: string; subline: string; cta: string };
    let source: "claude" | "sample";

    if (apiKey) {
      plan = await withClaude(apiKey, business, prompt);
      source = "claude";
    } else {
      plan = sample(String(business.name ?? "us"), prompt);
      source = "sample";
    }

    const { data: inserted, error: insErr } = await supabase
      .from("content_items")
      .insert({
        business_id: businessId,
        type: "animation",
        status: "draft",
        caption: `[${plan.template}] ${plan.headline}\n${plan.subline}\n${plan.cta}`,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (insErr) return json({ error: insErr.message }, 400);

    return json({ source, id: inserted.id, ...plan });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

async function withClaude(apiKey: string, business: Record<string, unknown>, prompt: string) {
  const client = new Anthropic({ apiKey });
  const profile = [
    `Business: ${business.name}`,
    business.tone ? `Brand voice: ${business.tone}` : "",
    business.description ? `About: ${business.description}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const system =
    "You plan short 9:16 motion-graphics videos for small businesses. Choose the best template: " +
    "'promo' (sale/offer), 'product' (product spotlight), 'event' (event announcement), " +
    "'hours' (we're open / hours), 'review' (customer review highlight). Write very short on-screen " +
    "text. headline <= 5 words. subline <= 12 words. cta <= 4 words. Match the brand voice, no hashtags.";

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    system,
    thinking: { type: "adaptive" },
    output_config: { effort: "low", format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
    messages: [
      {
        role: "user",
        content: `${profile}\n\nPlan a motion-graphics video for: "${prompt}". Return JSON matching the schema.`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("Claude returned no text");
  return JSON.parse(textBlock.text) as {
    template: Template;
    headline: string;
    subline: string;
    cta: string;
  };
}

function sample(name: string, prompt: string) {
  const p = prompt.toLowerCase();
  let template: Template = "promo";
  if (/(open|hour|closing|closed)/.test(p)) template = "hours";
  else if (/(event|launch|party|grand opening)/.test(p)) template = "event";
  else if (/(review|testimonial|rating|stars)/.test(p)) template = "review";
  else if (/(product|new|drop|menu|item)/.test(p)) template = "product";
  const short = prompt.length > 26 ? prompt.slice(0, 26) : prompt;
  return {
    template,
    headline: short.charAt(0).toUpperCase() + short.slice(1),
    subline: `From all of us at ${name}.`,
    cta: template === "hours" ? "Come on in" : "Learn more",
  };
}
