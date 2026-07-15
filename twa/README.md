# Packaging Design Closet for the Google Play Store (TWA)

Design Closet ships to Play as a **Trusted Web Activity (TWA)** — a thin Android
wrapper around the deployed PWA. There is no separate app codebase to maintain;
the Android app loads your hosted PWA full-screen with no browser chrome.

## Prerequisites

- The PWA is deployed and reachable over **HTTPS** (Firebase Hosting).
- Node 18+ and a JDK 17 (Bubblewrap installs an Android SDK/JDK on first run).
- A Google Play Developer account ($25 one-time).

## 1. Install Bubblewrap

```bash
npm install -g @bubblewrap/cli
```

## 2. Point the config at your domain

Edit [`twa-manifest.json`](./twa-manifest.json) and replace every
`REPLACE_WITH_YOUR_DOMAIN` with your Firebase domain
(e.g. `design-closet.web.app` or your custom domain). Then, from this folder:

```bash
cd twa
bubblewrap init --manifest ./twa-manifest.json   # first time only
bubblewrap build
```

`bubblewrap build` produces:
- `app-release-signed.aab`  ← upload this to Play Console
- `app-release-signed.apk`  ← for local device testing

On first `init`, Bubblewrap creates a signing keystore (`android.keystore`).
**Back it up** — losing it means you can't ship updates. Keep it out of git
(already covered by `.gitignore`).

## 3. Wire up Digital Asset Links (removes the browser URL bar)

The TWA only runs full-screen if your site verifies ownership of the app.

1. Get the app's SHA-256 signing fingerprint:
   ```bash
   bubblewrap fingerprint list
   ```
   > If you use **Play App Signing** (recommended), the fingerprint that matters
   > is the one Play shows under *Release → Setup → App signing*. Use that one.
2. Paste it into [`../public/.well-known/assetlinks.json`](../public/.well-known/assetlinks.json),
   replacing `REPLACE_WITH_YOUR_APP_SIGNING_SHA256_FINGERPRINT`.
   Confirm `package_name` matches `packageId` in the TWA manifest
   (`app.designcloset.twa`).
3. Redeploy the site (`npm run deploy`) and verify it is publicly served:
   ```
   https://YOUR_DOMAIN/.well-known/assetlinks.json
   ```

## 4. Upload to Play Console

1. Create the app in [Play Console](https://play.google.com/console).
2. Upload `app-release-signed.aab` to a testing track (Internal testing first).
3. Fill in the store listing (icon = `../public/icons/playstore-512.png`,
   plus a feature graphic and screenshots), content rating, data-safety form,
   and privacy policy URL.
4. Roll out to Internal testing → verify install → promote to Production.

## Updating the app later

- **Web content** updates automatically — just `npm run deploy`. Users get the
  new PWA on next launch (the service worker prompts to refresh).
- **Native shell** changes (name, icon, permissions) require bumping
  `appVersionCode` in `twa-manifest.json`, rebuilding, and uploading a new AAB.

## Notes

- `enableNotifications: true` wires the Android notification delegation. To
  actually send pushes you'll later add Web Push (VAPID) or FCM — the shell is
  ready for it.
- Keep `packageId` stable forever; it is the app's permanent identity on Play.
