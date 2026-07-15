# Design Closet

Your personal stylist, as a **Progressive Web App**. Design Closet suggests daily
outfits from the clothes you actually own — weather-aware, occasion-ready, and
beautifully organized. Built to install like a native app and ship to the
**Google Play Store** as a Trusted Web Activity (TWA).

<p>
  <img src="public/icons/icon-192.png" width="72" alt="Design Closet icon">
</p>

## Features

- **Home** — a daily outfit suggestion driven by live weather, upcoming events, and your closet.
- **Closet** — a photo-first grid with category filters, favorites, and add/edit/remove.
- **Add item** — camera or library capture, resized client-side, with automatic color tagging.
- **Outfits** — occasion picker + a rule-based generator scored on formality, warmth, season, favorites, and palette.
- **Events** — schedule engagements and auto-plan a look for each.
- **Profile** — style persona, palette, sizes, and goals. Feminine / Masculine themes.
- **Accounts** — email/password + Google sign-in, with per-user data isolation (RLS).
- **PWA** — installable, offline-capable, with an update prompt and app shortcuts.

## Tech stack

| Layer      | Choice                                             |
| ---------- | -------------------------------------------------- |
| Build      | [Vite](https://vitejs.dev) 5                       |
| PWA        | [vite-plugin-pwa](https://vite-pwa-org.netlify.app) (Workbox) |
| Backend    | [Supabase](https://supabase.com) — Postgres + Auth + Storage |
| Hosting    | Firebase Hosting                                   |
| Play Store | Bubblewrap TWA                                     |
| UI         | Vanilla ES modules, Playfair Display + Inter, Material Symbols |

## Project structure

```
design-closet/
├─ index.html               # App shell + PWA meta tags
├─ src/
│  ├─ main.js               # Boot, auth lifecycle, theme, weather, PWA install/update, global wiring
│  ├─ config.js             # Env-sourced config (Supabase, defaults)
│  ├─ supabase.js           # Auth + RLS-aware REST/storage helpers
│  ├─ auth.js               # Sign-in / sign-up screen
│  ├─ state.js              # Shared state + design constants
│  ├─ ui.js                 # DOM/format helpers, thumbnails
│  ├─ engine.js             # Rule-based outfit generator
│  ├─ render.js             # Central render loop
│  ├─ views.js              # Home / Closet / Outfits / Events / Profile
│  ├─ modals.js             # Sheets + data actions
│  └─ styles.css            # Design tokens + components
├─ public/
│  ├─ icons/                # Generated PWA + Play Store icons
│  ├─ .well-known/assetlinks.json   # Digital Asset Links (TWA)
│  ├─ offline.html          # Offline fallback
│  ├─ favicon.svg, robots.txt
├─ brand/                   # SVG logo sources (rasterized to icons)
├─ scripts/generate-icons.mjs
├─ supabase/schema.sql      # Tables + per-user RLS + storage policies
├─ twa/                     # Bubblewrap TWA config + Play Store guide
├─ firebase.json, .firebaserc
├─ vite.config.js           # Vite + PWA manifest/service-worker config
└─ .env.example
```

## Getting started

```bash
# 1. Install deps
npm install

# 2. Configure environment
cp .env.example .env        # values already point at the design-closet Supabase project

# 3. Run the dev server
npm run dev                 # http://localhost:5173

# 4. Production build + local preview (service worker active here, not in dev)
npm run build
npm run preview             # http://localhost:4173
```

> Icons are regenerated automatically on `npm run build`. To regenerate them
> manually after editing `brand/*.svg`, run `npm run icons`.

## Backend setup (Supabase)

1. Open the Supabase project → **SQL Editor**.
2. Paste and run [`supabase/schema.sql`](supabase/schema.sql). It is idempotent:
   it ensures the tables, adds a `user_id` owner column, enables **Row Level
   Security**, and locks the `closet-photos` bucket to authenticated writes.
3. **Auth** → Providers: enable **Email**, and **Google** if you want OAuth
   (add your OAuth client + set the redirect URL to your deployed origin).
4. **Auth** → URL Configuration: add your production URL (and
   `http://localhost:5173`) to the redirect allow-list.

> Existing pre-auth sample rows have `user_id = NULL` and become invisible under
> RLS. The bottom of `schema.sql` shows how to claim or delete them.

### Security note

The anon key ships in the client bundle — that is expected and safe **because
RLS is enabled**: a user can only read/write rows where `user_id = auth.uid()`.
Never put the `service_role` key in the client.

## Deploy to Firebase Hosting

```bash
npm install -g firebase-tools
firebase login

# Set your project id in .firebaserc (replace the placeholder), then:
npm run deploy              # runs `npm run build` + `firebase deploy --only hosting`
```

`firebase.json` already sets the right headers: `assetlinks.json` as JSON with
CORS, `sw.js` as no-cache, hashed assets as immutable, and a SPA rewrite.

## Ship to the Google Play Store

The PWA is wrapped as a **Trusted Web Activity**. Full step-by-step guide:
[`twa/README.md`](twa/README.md). In short:

1. Deploy the PWA over HTTPS (above).
2. `npm i -g @bubblewrap/cli`, edit `twa/twa-manifest.json` with your domain,
   then `bubblewrap init` + `bubblewrap build`.
3. Put the app's SHA-256 signing fingerprint into
   `public/.well-known/assetlinks.json`, redeploy, and verify it's live.
4. Upload the generated `.aab` to Play Console.

## PWA behavior

- **Install** — an install banner appears when the browser allows it; dismissal
  is remembered. iOS: Share → *Add to Home Screen*.
- **Offline** — the app shell, fonts, and viewed closet photos are cached; data
  requests are network-first and fall back to cache. `offline.html` is the last
  resort.
- **Updates** — a new deploy triggers a "new version ready → Refresh" toast
  (prompt-style, so we never reload mid-edit).
- **Shortcuts** — long-press the installed icon for *Today's Outfit* and *Add a Piece*.

## What's placeholder (fill these in)

| File | Value | Status |
| ---- | ----- | ------ |
| `.firebaserc` | Firebase project id → `design-closet` | ✅ set |
| `twa/twa-manifest.json` | Hosting domain → `design-closet.web.app` | ✅ set |
| `public/.well-known/assetlinks.json` | Play App Signing SHA-256 | ⏳ fill during Play packaging (see `twa/README.md`) |

Deployed origin: **https://design-closet.web.app** (also `design-closet.firebaseapp.com`).
Remember to add this origin to **Supabase → Auth → URL Configuration** so sign-in
redirects (Google OAuth, magic links, password reset) work in production.

## Roadmap

- Web Push / FCM notifications (the TWA shell already delegates them).
- Real AI vision tagging for fabric/category from photos.
- Wear-tracking to rotate suggestions and surface neglected pieces.
- Google Calendar connector for events.
