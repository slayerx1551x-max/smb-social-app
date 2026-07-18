// Supabase Edge Function: generate-graphic
// Writes short on-graphic copy (headline / subheadline / CTA) for a branded
// social image. The client composes the actual 9:16 graphic from the brand
// colors + logo. Uses Claude when ANTHROPIC_API_KEY is set; demo copy otherwise.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.68.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-opus-4-8";

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    headline: { type: "string" },
    subheadline: { type: "string" },
    cta: { type: "string" },
  },
  required: ["headline", "subheadline", "cta"],
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
    const topic: string = (body.topic ?? "").toString().trim();
    if (!businessId) return json({ error: "businessId required" }, 400);
    if (!topic) return json({ error: "topic required" }, 400);

    const { data: business } = await supabase
      .from("businesses")
      .select("id, name, tone, description")
      .eq("id", businessId)
      .maybeSingle();
    if (!business) return json({ error: "Business not found" }, 404);

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    let out: { headline: string; subheadline: string; cta: string };
    let source: "claude" | "sample";

    if (apiKey) {
      out = await withClaude(apiKey, business, topic);
      source = "claude";
    } else {
      out = sample(topic);
      source = "sample";
    }

    const { data: inserted, error: insErr } = await supabase
      .from("content_items")
      .insert({
        business_id: businessId,
        type: "graphic",
        status: "draft",
        caption: `${out.headline}\n${out.subheadline}\n${out.cta}`,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (insErr) return json({ error: insErr.message }, 400);

    return json({ source, id: inserted.id, ...out });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

async function withClaude(
  apiKey: string,
  business: Record<string, unknown>,
  topic: string,
) {
  const client = new Anthropic({ apiKey });
  const profile = [
    `Business: ${business.name}`,
    business.tone ? `Brand voice: ${business.tone}` : "",
    business.description ? `About: ${business.description}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const system =
    "You write punchy copy for a branded social media graphic (a poster-style image). " +
    "Keep it extremely short and high-impact. headline: <= 6 words. subheadline: <= 12 words. " +
    "cta: <= 4 words (e.g. 'Order now', 'Book today'). Match the brand voice. No hashtags, no emoji.";

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    system,
    thinking: { type: "adaptive" },
    output_config: { effort: "low", format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
    messages: [
      {
        role: "user",
        content: `${profile}\n\nDesign graphic copy for: "${topic}". Return JSON matching the schema.`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("Claude returned no text");
  return JSON.parse(textBlock.text) as { headline: string; subheadline: string; cta: string };
}

function sample(topic: string) {
  const t = topic.charAt(0).toUpperCase() + topic.slice(1);
  return {
    headline: t.length > 28 ? t.slice(0, 28) : t,
    subheadline: "Now available — don't miss out on this one.",
    cta: "Visit us today",
  };
}
