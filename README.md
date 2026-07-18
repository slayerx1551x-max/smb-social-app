# SMB Social Media Marketing App

Mobile-first app for small businesses to manage social media across **Instagram, YouTube, TikTok, and Facebook** — connections, dashboards, and a set of AI content-creation tools (graphics, captions, subtitles, motion graphics).

## Tech stack
- **Frontend:** React Native + Expo (TypeScript, expo-router)
- **Backend:** Supabase (auth, Postgres, storage, edge functions, scheduled jobs)
- **AI:** Anthropic Claude API (captions, hashtags, subtitles)
- **Motion graphics:** Remotion → 9:16 MP4
- **Render service:** separate Node service for Remotion/ffmpeg (not edge functions)
- **Integrations:** Meta Graph API (IG + FB), TikTok API, YouTube Data API
- **Payments:** Stripe

## Monorepo layout
```
smb-social-app/
├── app/                 # Expo app (React Native + TypeScript)
│   └── src/
│       ├── app/         # expo-router routes: (auth), (onboarding), (app)
│       ├── lib/         # supabase client, auth + business context
│       └── types/       # generated DB types
├── supabase/
│   ├── migrations/      # SQL schema (source of truth)
│   └── config.toml
└── render-service/       # Remotion/ffmpeg render service → 9:16 MP4 (Phase 7)
```

## Build order (stop after each phase for review)
1. **Phase 1 — DONE:** Expo scaffold + Supabase + auth (magic link) + profile setup + schema
2. **Phase 2 — DONE:** Connect Accounts page (all 4 platforms) + status, real-ready OAuth backend (`social-oauth` edge function) with a working demo mode
3. **Phase 3 — DONE:** Dashboards — `sync-metrics` edge function (real APIs when keys exist, realistic demo otherwise) + visual overview & per-platform breakdown
4. **Phase 4 — DONE:** Caption Generator — `generate-caption` edge function (Claude, per-platform, with demo fallback) + a Create tab hosting each generator as its own page
5. **Phase 5 — DONE:** Subtitle Generator — pick a video → `generate-subtitles` edge function transcribes it (OpenAI Whisper when `STT_OPENAI_API_KEY` is set; demo transcript otherwise) → timed SRT track (copy / download)
6. **Phase 6 — DONE:** Graphic Design Generator — `generate-graphic` writes on-graphic copy (Claude/demo); the app composes a branded 9:16 image from brand colors + logo, live preview + PNG export
7. **Phase 7 — DONE:** Animation Generator — `plan-animation` (Claude picks a template + writes the text) + the **`render-service/`** Remotion project (5 templates → 9:16 MP4, uploads to Storage). In-app animated preview works today; real MP4s render once the service runs.

## Database (Phase 1)
Tenant model: each **business** is a workspace; users join via `workspace_members`.

| Table | Purpose |
|---|---|
| `profiles` | public mirror of `auth.users` |
| `businesses` | brand profile (name, type, brand_colors, logo_url, tone, description) |
| `workspace_members` | user ↔ business membership + role |
| `connected_accounts` | per-platform OAuth tokens + status |
| `content_items` | generator outputs & posts |
| `metrics` | account- and post-level metrics samples |

All tenant tables are protected by **Row Level Security** scoped through `is_member_of(business_id)`. OAuth token columns are revoked from client roles (edge functions use the service role). Logos live in a public `brand-logos` storage bucket (upload restricted to authenticated users).

## Local setup
```bash
npm install            # from repo root (installs workspaces)
cp app/.env.example app/.env   # already populated for the dev project
npm run app            # Expo dev server (phone via Expo Go)
npm run app:web        # browser preview
```

## Turning on real social connections (Phase 2)

The **Connect Accounts** page works in **demo mode** out of the box (adds a placeholder account so the app is fully usable). It flips to **real OAuth**, per platform, the moment that platform's API keys are set as Supabase Edge Function secrets. The backend is the `social-oauth` edge function (`config` / `authorize` / `exchange` actions); tokens are exchanged and stored **server-side** with the service role — they never touch the client.

Set secrets via `supabase secrets set KEY=value --project-ref tqvznoeszjuouvzsovhk` (or the dashboard → Edge Functions → Secrets):

| Platform | Secrets | Where to create the app | Redirect URI to register |
|---|---|---|---|
| Instagram + Facebook | `META_APP_ID`, `META_APP_SECRET` | developers.facebook.com → Meta app (Facebook Login) | your app's redirect (e.g. `smbsocial://` / web origin) |
| YouTube | `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET` | console.cloud.google.com → OAuth client + YouTube Data API | same redirect |
| TikTok | `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` | developers.tiktok.com → app | same redirect |

⚠️ **Meta and TikTok require App Review** (permissions like `instagram_basic`, `pages_show_list`) — this takes **weeks**, so start it early. Google may require OAuth verification for YouTube scopes. Until keys exist, the platform shows "demo available" and connecting adds a demo account.

## Notes / gotchas
- **Auth:** email magic link. Supabase's default email is a **link** (not a code) sent from `noreply@mail.app.supabase.io` — it often lands in Gmail's Spam/Promotions. Wire real email (Resend) before launch.
- **Meta app review gates launch:** Instagram + Facebook publishing/insights require Meta App Review, which takes weeks — **start it early** (Phase 2).
- 9:16 vertical is the default video output. Royalty-free assets only.
- Never hardcode keys — Expo public client keys in `app/.env`; server secrets in Supabase.
