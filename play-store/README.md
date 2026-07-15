# Play Store graphic assets

Generated from the live app (a seeded demo account) via `npm run store:shots`.
Regenerate any time after UI changes.

| File | Size | Where it goes in Play Console |
| ---- | ---- | ----------------------------- |
| `icon-512.png` | 512×512 | Store listing → App icon |
| `feature-graphic.png` | 1024×500 | Store listing → Feature graphic |
| `phone-1080x1920-*.png` | 1080×1920 | Store listing → Phone screenshots (2–8) |
| `tablet7-1200x1920-*.png` | 1200×1920 | Store listing → 7-inch tablet screenshots |
| `tablet10-1600x2560-*.png` | 1600×2560 | Store listing → 10-inch tablet screenshots |

Screens captured: Home, Closet, Outfits, Events, Profile.

## Regenerating

```bash
npm run store:shots   # seeds the demo account, then captures all assets
```

Uses the demo account `demo@designcloset.app` (seeded by `scripts/seed-demo.mjs`)
and the locally-installed Chrome via puppeteer-core. The demo profile is injected
client-side for the shots (see note in `scripts/capture-store.mjs`).
