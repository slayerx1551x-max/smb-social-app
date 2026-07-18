// Supabase Edge Function: social-oauth
// Real-ready OAuth for Instagram, YouTube, TikTok, Facebook.
//   action "config"    -> which platforms have API keys configured
//   action "authorize" -> provider authorize URL (client opens it)
//   action "exchange"  -> exchange the returned code for tokens, store them
//
// Secrets (set per platform; missing ones simply stay in "demo" mode):
//   META_APP_ID / META_APP_SECRET               (instagram + facebook)
//   YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET    (youtube via Google)
//   TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET     (tiktok)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Platform = "instagram" | "youtube" | "tiktok" | "facebook";

function creds(platform: Platform): { id?: string; secret?: string } {
  switch (platform) {
    case "instagram":
    case "facebook":
      return { id: Deno.env.get("META_APP_ID"), secret: Deno.env.get("META_APP_SECRET") };
    case "youtube":
      return { id: Deno.env.get("YOUTUBE_CLIENT_ID"), secret: Deno.env.get("YOUTUBE_CLIENT_SECRET") };
    case "tiktok":
      return { id: Deno.env.get("TIKTOK_CLIENT_KEY"), secret: Deno.env.get("TIKTOK_CLIENT_SECRET") };
  }
}

const isConfigured = (p: Platform) => {
  const c = creds(p);
  return Boolean(c.id && c.secret);
};

const SCOPES: Record<Platform, string> = {
  facebook: "public_profile,pages_show_list",
  instagram: "instagram_basic,pages_show_list",
  youtube: "https://www.googleapis.com/auth/youtube.readonly",
  tiktok: "user.info.basic",
};

function authorizeUrl(platform: Platform, redirectUri: string, state: string): string {
  const { id } = creds(platform);
  const scope = encodeURIComponent(SCOPES[platform]);
  const rd = encodeURIComponent(redirectUri);
  switch (platform) {
    case "facebook":
    case "instagram":
      return `https://www.facebook.com/v21.0/dialog/oauth?client_id=${id}&redirect_uri=${rd}&scope=${scope}&state=${state}&response_type=code`;
    case "youtube":
      return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${id}&redirect_uri=${rd}&response_type=code&access_type=offline&prompt=consent&scope=${scope}&state=${state}`;
    case "tiktok":
      return `https://www.tiktok.com/v2/auth/authorize/?client_key=${id}&scope=${scope}&response_type=code&redirect_uri=${rd}&state=${state}`;
  }
}

// Returns { accessToken, refreshToken?, expiresIn?, accountId?, accountName? }
async function exchangeCode(platform: Platform, code: string, redirectUri: string) {
  const { id, secret } = creds(platform);
  if (platform === "facebook" || platform === "instagram") {
    const u = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    u.searchParams.set("client_id", id!);
    u.searchParams.set("client_secret", secret!);
    u.searchParams.set("redirect_uri", redirectUri);
    u.searchParams.set("code", code);
    const tok = await (await fetch(u)).json();
    const me = await (
      await fetch(`https://graph.facebook.com/me?fields=id,name&access_token=${tok.access_token}`)
    ).json();
    return {
      accessToken: tok.access_token,
      expiresIn: tok.expires_in,
      accountId: me.id,
      accountName: me.name,
    };
  }
  if (platform === "youtube") {
    const body = new URLSearchParams({
      client_id: id!,
      client_secret: secret!,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    });
    const tok = await (
      await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      })
    ).json();
    return { accessToken: tok.access_token, refreshToken: tok.refresh_token, expiresIn: tok.expires_in };
  }
  // tiktok
  const body = new URLSearchParams({
    client_key: id!,
    client_secret: secret!,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });
  const tok = await (
    await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    })
  ).json();
  return {
    accessToken: tok.access_token,
    refreshToken: tok.refresh_token,
    expiresIn: tok.expires_in,
    accountId: tok.open_id,
  };
}

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

    const authed = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
    } = await authed.auth.getUser();
    if (!user) return json({ error: "Not authenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const action: string = body.action;

    if (action === "config") {
      const platforms: Platform[] = ["instagram", "youtube", "tiktok", "facebook"];
      const configured = Object.fromEntries(platforms.map((p) => [p, isConfigured(p)]));
      return json({ configured });
    }

    const platform = body.platform as Platform;
    const businessId = body.businessId as string;
    if (!platform || !businessId) return json({ error: "platform and businessId required" }, 400);
    if (!isConfigured(platform)) return json({ error: `${platform} is not configured` }, 400);

    // Membership check via RLS (authed client can only see member businesses).
    const { data: biz } = await authed
      .from("businesses")
      .select("id")
      .eq("id", businessId)
      .maybeSingle();
    if (!biz) return json({ error: "Not a member of this business" }, 403);

    const redirectUri = body.redirectUri as string;

    if (action === "authorize") {
      if (!redirectUri) return json({ error: "redirectUri required" }, 400);
      const state = `${businessId}:${crypto.randomUUID()}`;
      return json({ url: authorizeUrl(platform, redirectUri, state) });
    }

    if (action === "exchange") {
      const code = body.code as string;
      if (!code || !redirectUri) return json({ error: "code and redirectUri required" }, 400);
      const t = await exchangeCode(platform, code, redirectUri);

      // Service-role client to write token columns (revoked from client roles).
      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { error } = await admin.from("connected_accounts").upsert(
        {
          business_id: businessId,
          platform,
          account_id: t.accountId ?? `${platform}-${user.id}`,
          account_name: t.accountName ?? null,
          access_token: t.accessToken ?? null,
          refresh_token: t.refreshToken ?? null,
          token_expires_at: t.expiresIn
            ? new Date(Date.now() + Number(t.expiresIn) * 1000).toISOString()
            : null,
          status: "connected",
        },
        { onConflict: "business_id,platform,account_id" },
      );
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
