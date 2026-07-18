// Supabase Edge Function: generate-caption
// Generates a platform-tailored post caption + hashtags from a topic, using the
// business brand profile. Uses Claude when ANTHROPIC_API_KEY is set; otherwise a
// deterministic template so the tool works before a key is added.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.68.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-opus-4-8";

type Platform = "instagram" | "youtube" | "tiktok" | "facebook";

const PLATFORM_GUIDE: Record<Platform, string> = {
  instagram: "Instagram: punchy and warm, 1-2 short lines, tasteful emoji, a soft call-to-action. 5-8 hashtags.",
  youtube: "YouTube: a compelling, search-friendly video title-style caption plus 1 line of description. 4-6 hashtags.",
  tiktok: "TikTok: a very short, hooky first line that stops the scroll; casual and fun. 4-6 trend-friendly hashtags.",
  facebook: "Facebook: a slightly longer, friendly, community-oriented caption. 3-5 hashtags.",
};

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    caption: { type: "string" },
    hashtags: { type: "array", items: { type: "string" } },
  },
  required: ["caption", "hashtags"],
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
    const platform: Platform = body.platform ?? "instagram";
    const topic: string = (body.topic ?? "").toString().trim();
    if (!businessId) return json({ error: "businessId required" }, 400);
    if (!topic) return json({ error: "topic required" }, 400);

    const { data: business, error: bizErr } = await supabase
      .from("businesses")
      .select("id, name, type, tone, description")
      .eq("id", businessId)
      .maybeSingle();
    if (bizErr) return json({ error: bizErr.message }, 400);
    if (!business) return json({ error: "Business not found" }, 404);

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    let caption: string;
    let hashtags: string[];
    let source: "claude" | "sample";

    if (apiKey) {
      ({ caption, hashtags } = await withClaude(apiKey, business, platform, topic));
      source = "claude";
    } else {
      ({ caption, hashtags } = sample(business, platform, topic));
      source = "sample";
    }

    const { data: inserted, error: insErr } = await supabase
      .from("content_items")
      .insert({
        business_id: businessId,
        type: "caption",
        status: "draft",
        platform,
        caption,
        hashtags,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (insErr) return json({ error: insErr.message }, 400);

    return json({ source, id: inserted.id, caption, hashtags });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

async function withClaude(
  apiKey: string,
  business: Record<string, unknown>,
  platform: Platform,
  topic: string,
): Promise<{ caption: string; hashtags: string[] }> {
  const client = new Anthropic({ apiKey });
  const profile = [
    `Business: ${business.name}`,
    business.type ? `Type: ${business.type}` : "",
    business.tone ? `Brand voice: ${business.tone}` : "",
    business.description ? `About: ${business.description}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const system =
    "You write social media captions for small businesses. Match the brand voice, " +
    "sound human (no corporate clichés), and tailor length + style to the platform. " +
    "Return hashtags without the # sign. Never invent facts, prices, or events not implied by the input.";

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 700,
    system,
    thinking: { type: "adaptive" },
    output_config: { effort: "low", format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
    messages: [
      {
        role: "user",
        content:
          `${profile}\n\nPlatform: ${PLATFORM_GUIDE[platform]}\n\n` +
          `Write one caption for a post about: "${topic}". Return JSON matching the schema.`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("Claude returned no text");
  const parsed = JSON.parse(textBlock.text) as { caption: string; hashtags: string[] };
  return parsed;
}

function sample(
  business: Record<string, unknown>,
  platform: Platform,
  topic: string,
): { caption: string; hashtags: string[] } {
  const name = String(business.name ?? "us");
  const base: Record<Platform, string> = {
    instagram: `${topic} — happening now at ${name} ✨ Come see what everyone's talking about.`,
    youtube: `${topic} | ${name}`,
    tiktok: `POV: ${topic} at ${name} 👀 you don't want to miss this`,
    facebook: `We're excited to share: ${topic}. Stop by ${name} and say hello — we'd love to see you!`,
  };
  const tags: Record<Platform, string[]> = {
    instagram: ["local", "smallbusiness", "supportlocal", "instadaily", "community"],
    youtube: ["shorts", "local", "smallbusiness", "vlog"],
    tiktok: ["fyp", "foryou", "local", "smallbusiness"],
    facebook: ["local", "community", "smallbusiness"],
  };
  return { caption: base[platform], hashtags: tags[platform] };
}
