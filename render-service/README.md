# Render Service (Remotion → 9:16 MP4)

Separate Node service that renders templated motion-graphics videos with **Remotion + ffmpeg**. Kept out of Supabase Edge Functions on purpose — renders are heavy (headless Chromium + ffmpeg).

## Templates (1080×1920, 30fps, 5s)
`promo` · `product` · `event` · `hours` · `review` — see `src/templates.tsx`. Each takes `{ headline, subline, cta, colors, logoUrl }` and animates them in with spring reveals over the brand colors + logo.

## Run locally
```bash
cd render-service
npm install                       # pulls Remotion + a headless Chromium
cp .env.example .env              # fill in your Supabase keys
npm run server                    # starts http://localhost:8787
```
Preview/design the templates visually with **Remotion Studio**:
```bash
npm run studio
```

## API
`POST /render` (Bearer = the user's Supabase access token)
```json
{
  "contentId": "uuid (optional — the content_items row to attach the MP4 to)",
  "businessId": "uuid",
  "template": "promo | product | event | hours | review",
  "headline": "...", "subline": "...", "cta": "...",
  "colors": ["#2F80FF", "#22D3EE", "#0B2447"],
  "logoUrl": "https://..."
}
```
Flow: verifies the JWT + business membership → renders the composition → uploads the MP4 to the Supabase `media` bucket (service role) → returns `{ "videoUrl": "..." }` and sets `content_items.media_url`.

## Wire it to the app
Set `EXPO_PUBLIC_RENDER_URL` in `app/.env` to this service's URL (e.g. `http://localhost:8787` in dev, or your deployed URL). The **Animation studio** page then renders real MP4s; without it, the page shows the live in-app animated preview only.

## Deploy
Any Node host that allows headless Chromium + ffmpeg works (Fly.io, Railway, Render, a VM, or AWS Lambda via `@remotion/lambda`). Requirements: enough RAM/CPU for a Chromium render, and the three Supabase env vars.
