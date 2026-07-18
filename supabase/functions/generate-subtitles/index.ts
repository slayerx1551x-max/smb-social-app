// Supabase Edge Function: generate-subtitles
// Transcribes an uploaded video into a timed subtitle track (SRT + cues).
// Uses OpenAI Whisper when STT_OPENAI_API_KEY is set; otherwise returns a demo
// transcript so the tool is usable before speech-to-text is configured.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Cue = { index: number; start: number; end: number; text: string };

function pad(n: number, len = 2) {
  return String(Math.floor(n)).padStart(len, "0");
}
function ts(seconds: number) {
  const ms = Math.round((seconds - Math.floor(seconds)) * 1000);
  const s = Math.floor(seconds) % 60;
  const m = Math.floor(seconds / 60) % 60;
  const h = Math.floor(seconds / 3600);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}
function toSrt(cues: Cue[]) {
  return cues
    .map((c) => `${c.index}\n${ts(c.start)} --> ${ts(c.end)}\n${c.text.trim()}\n`)
    .join("\n");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function demoCues(): Cue[] {
  const lines = [
    "Hey everyone, welcome back to the channel!",
    "Today I want to show you something we're really proud of.",
    "It only takes a few minutes to get started.",
    "If you like it, drop a comment and follow for more.",
    "Thanks for watching — see you next time!",
  ];
  let t = 0.5;
  return lines.map((text, i) => {
    const dur = 2.6 + text.length / 25;
    const cue: Cue = { index: i + 1, start: t, end: t + dur, text };
    t += dur + 0.25;
    return cue;
  });
}

async function whisperCues(apiKey: string, mediaUrl: string): Promise<Cue[]> {
  const file = await fetch(mediaUrl);
  if (!file.ok) throw new Error("Could not fetch the uploaded video");
  const blob = await file.blob();

  const form = new FormData();
  form.append("file", blob, "video.mp4");
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Transcription failed: ${await res.text()}`);
  const data = await res.json();
  const segments: { start: number; end: number; text: string }[] = data.segments ?? [];
  return segments.map((s, i) => ({
    index: i + 1,
    start: s.start,
    end: s.end,
    text: s.text,
  }));
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
    const mediaUrl: string | undefined = body.mediaUrl;
    if (!businessId || !mediaUrl) return json({ error: "businessId and mediaUrl required" }, 400);

    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("id", businessId)
      .maybeSingle();
    if (!business) return json({ error: "Business not found" }, 404);

    const sttKey = Deno.env.get("STT_OPENAI_API_KEY");
    let cues: Cue[];
    let source: "whisper" | "sample";
    if (sttKey) {
      cues = await whisperCues(sttKey, mediaUrl);
      source = "whisper";
    } else {
      cues = demoCues();
      source = "sample";
    }
    const srt = toSrt(cues);

    const { data: inserted, error: insErr } = await supabase
      .from("content_items")
      .insert({
        business_id: businessId,
        type: "subtitle",
        status: "draft",
        media_url: mediaUrl,
        caption: srt, // the subtitle track (SRT)
        created_by: user.id,
      })
      .select("id")
      .single();
    if (insErr) return json({ error: insErr.message }, 400);

    return json({ source, id: inserted.id, srt, cues });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
