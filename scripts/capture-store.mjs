// Generates Play Store visual assets:
//   • Feature graphic (1024×500)
//   • Phone screenshots (1080×1920) — Home, Closet, Outfits, Events, Profile
//   • 7" tablet (1200×1920) and 10" tablet (1600×2560) screenshots
//
// Uses the locally-installed Chrome via puppeteer-core, logging into the demo
// account seeded by scripts/seed-demo.mjs. Run: npm run store:shots
import puppeteer from 'puppeteer-core'
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { seed, DEMO } from './seed-demo.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = (f) => join(root, 'play-store', f)
const APP = 'https://design-closet.web.app'
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const FEATURE_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  *{margin:0;box-sizing:border-box}
  body{width:1024px;height:500px;overflow:hidden;font-family:'Inter',sans-serif;
    background:linear-gradient(135deg,#9db2a5 0%,#59705f 55%,#324439 100%);color:#fff;position:relative}
  .shine{position:absolute;inset:0;background:radial-gradient(120% 90% at 85% 10%,rgba(255,255,255,.30),transparent 55%);mix-blend-mode:soft-light}
  .wrap{position:relative;height:100%;display:flex;align-items:center;justify-content:space-between;padding:0 76px}
  .kicker{font:600 15px 'Inter';letter-spacing:.32em;text-transform:uppercase;color:#e7efe9;opacity:.9}
  h1{font-family:'Playfair Display',serif;font-weight:600;font-size:70px;line-height:1.05;letter-spacing:.02em;margin:14px 0 18px}
  p{font:400 24px 'Inter';color:#eef3ef;max-width:520px;line-height:1.5}
  .mark{width:230px;height:230px;flex-shrink:0;filter:drop-shadow(0 12px 30px rgba(0,0,0,.28))}
  .badge{display:inline-block;margin-top:22px;background:rgba(20,24,20,.35);backdrop-filter:blur(6px);
    border:1px solid rgba(255,255,255,.25);border-radius:9999px;padding:9px 20px;font:600 13px 'Inter';letter-spacing:.14em;text-transform:uppercase}
</style></head>
<body>
  <div class="shine"></div>
  <div class="wrap">
    <div>
      <div class="kicker">Your Personal Stylist</div>
      <h1>Design<br>Closet</h1>
      <p>Daily outfit ideas from the clothes you already own — weather-aware, occasion-ready.</p>
      <div class="badge">AI Wardrobe Stylist</div>
    </div>
    <svg class="mark" viewBox="0 0 512 512" fill="none">
      <g stroke="#f4f0ec" stroke-linecap="round" stroke-linejoin="round"><path d="M118 148 L196 372 L256 252 L316 372 L394 148" stroke-width="34"/></g>
      <g stroke="#324439" stroke-linecap="round" stroke-linejoin="round">
        <path d="M256 196 C256 172 238 166 238 150 C238 138 248 130 258 132" stroke-width="11"/>
        <path d="M256 198 L196 250 L316 250 Z" stroke-width="12"/><path d="M196 250 L316 250" stroke-width="12"/>
      </g>
    </svg>
  </div>
</body></html>`

// Representative demo profile. Injected client-side for screenshots because the
// legacy closet_profile table can't persist per-user profiles until migration
// 003 is applied (see supabase/migrations/003_fix_profile_id.sql).
const DEMO_PROFILE = {
  name: 'Ava',
  location: 'Los Angeles',
  persona:
    'Quiet luxury with an architectural edge — clean lines, tonal layering, and considered simplicity.',
  palette: ['sage', 'ecru', 'charcoal', 'camel'],
  sizes: { tops: 'S', bottoms: '27', shoes: '8' },
  goals: [
    { label: 'Find the perfect white shirt', note: 'Crisp, not sheer', done: false },
    { label: 'Build a capsule for travel', note: 'Under 12 pieces', done: true },
  ],
  theme_pref: 'feminine',
}

const PHONE = { width: 450, height: 800, dsf: 2.4 } // → 1080×1920
const TAB7 = { width: 800, height: 1280, dsf: 1.5 } // → 1200×1920
const TAB10 = { width: 800, height: 1280, dsf: 2 } // → 1600×2560

async function gotoTab(page, tab, extra) {
  await page.evaluate((t) => window.go(t), tab)
  if (extra) await page.evaluate(extra)
  await page.evaluate(() => document.fonts.ready)
  await sleep(650)
  // Remove promotional/system overlays that shouldn't appear in store shots.
  await page.evaluate(() => {
    document.querySelector('#installBanner')?.remove()
    document.querySelectorAll('.update-toast, .toast').forEach((e) => e.remove())
  })
  await sleep(120)
}

async function login(page) {
  await page.goto(APP, { waitUntil: 'networkidle2' })
  // The session persists across pages in the same browser; only fill the form
  // when the auth screen is actually shown.
  await page.waitForFunction(
    () => document.querySelector('#a-email') || (window.S && window.S.loaded),
    { timeout: 25000 },
  )
  if (await page.$('#a-email')) {
    await page.type('#a-email', DEMO.email)
    await page.type('#a-pass', DEMO.password)
    await page.click('#a-submit')
  }
  await page.waitForFunction(() => window.S && window.S.loaded === true, { timeout: 25000 })
  await page.evaluate((prof) => {
    localStorage.setItem('dc_install_dismissed', '1')
    document.querySelector('#installBanner')?.remove()
    // Present a complete demo profile (see DEMO_PROFILE note).
    window.S.profile = Object.assign({}, window.S.profile, prof)
    window.S._homeFit = null
    window.render()
  }, DEMO_PROFILE)
  await page.evaluate(() => document.fonts.ready)
  await sleep(900)
}

async function captureSet(browser, cfg, shots, label) {
  const page = await browser.newPage()
  await page.setViewport({ width: cfg.width, height: cfg.height, deviceScaleFactor: cfg.dsf })
  await login(page)
  for (const [tab, name, extra] of shots) {
    await gotoTab(page, tab, extra)
    await page.screenshot({ path: out(`${label}-${name}.png`) })
    console.log('✓', `${label}-${name}.png`)
  }
  await page.close()
}

async function run() {
  await mkdir(out(''), { recursive: true })
  await seed() // ensure demo data is fresh

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    pipe: true, // more reliable than the WS transport in sandboxed shells
    timeout: 60000,
    args: ['--no-sandbox', '--disable-gpu', '--disable-setuid-sandbox', '--hide-scrollbars'],
  })

  // Feature graphic (render at 2× then downscale for crispness → exactly 1024×500)
  const fpage = await browser.newPage()
  await fpage.setViewport({ width: 1024, height: 500, deviceScaleFactor: 2 })
  await fpage.setContent(FEATURE_HTML, { waitUntil: 'networkidle2' })
  await fpage.evaluate(() => document.fonts.ready)
  await sleep(600)
  const fbuf = await fpage.screenshot({ type: 'png' })
  await sharp(fbuf).resize(1024, 500).png().toFile(out('feature-graphic.png'))
  console.log('✓ feature-graphic.png (1024×500)')
  await fpage.close()

  // App screenshots
  const gen = () => window.doGenerate && window.doGenerate()
  await captureSet(browser, PHONE, [
    ['home', 'home'],
    ['closet', 'closet'],
    ['outfits', 'outfits', gen],
    ['events', 'events'],
    ['profile', 'profile'],
  ], 'phone-1080x1920')

  await captureSet(browser, TAB7, [
    ['home', 'home'],
    ['closet', 'closet'],
  ], 'tablet7-1200x1920')

  await captureSet(browser, TAB10, [
    ['home', 'home'],
    ['outfits', 'outfits', gen],
  ], 'tablet10-1600x2560')

  await browser.close()
  console.log('\nAll store assets written to /play-store')
}

run().catch((e) => { console.error(e); process.exit(1) })
