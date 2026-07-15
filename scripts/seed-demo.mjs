// Seeds a demo account with a sample wardrobe, events, outfit, and profile so the
// Play Store screenshots show a real, populated app. Idempotent (wipes first).
// Usage: node scripts/generate-store-assets... (called by npm run store:seed)
const SB = process.env.VITE_SUPABASE_URL || 'https://tifnqeujvdhhwpvhvycn.supabase.co'
const KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpZm5xZXVqdmRoaHdwdmh2eWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNzUyOTQsImV4cCI6MjA5OTY1MTI5NH0.ByYeltZeU05hQl_OpprugwZrX4RNuy_X51WFs8iCO-Q'

export const DEMO = { email: 'demo@designcloset.app', password: 'DemoCloset#2026' }

const h = (token) => ({
  apikey: KEY,
  Authorization: `Bearer ${token || KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
})

async function auth() {
  // Try sign-in; if the demo user doesn't exist yet, sign up.
  let r = await fetch(`${SB}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(DEMO),
  })
  if (!r.ok) {
    r = await fetch(`${SB}/auth/v1/signup`, {
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(DEMO),
    })
  }
  const j = await r.json()
  const token = j.access_token
  if (!token) throw new Error('No access token: ' + JSON.stringify(j))
  return token
}

async function wipe(token) {
  // id=not.is.null matches every row (works for both uuid and int id columns);
  // RLS scopes the delete to the demo user's own rows.
  for (const t of ['closet_outfits', 'closet_events', 'closet_items', 'closet_profile']) {
    await fetch(`${SB}/rest/v1/${t}?id=not.is.null`, { method: 'DELETE', headers: h(token) })
  }
}

const ITEMS = [
  ['Silk Blouse', 'Everlane', 'top', ['ecru'], 'all', 'Silk', 4, 2, 'both', true],
  ['Cashmere Sweater', 'COS', 'top', ['camel'], 'winter', 'Cashmere', 3, 4, 'both', false],
  ['Linen Shirt', 'Uniqlo', 'top', ['white'], 'summer', 'Linen', 2, 1, 'both', false],
  ['Ribbed Tee', null, 'top', ['charcoal'], 'all', 'Cotton', 1, 2, 'both', false],
  ['Tailored Trousers', 'Theory', 'bottom', ['charcoal'], 'all', 'Wool', 4, 3, 'both', true],
  ['Straight Jeans', "Levi's", 'bottom', ['indigo'], 'all', 'Denim', 2, 3, 'both', false],
  ['Pleated Skirt', null, 'bottom', ['sage'], 'spring', 'Cotton', 3, 2, 'feminine', false],
  ['Slip Dress', 'Reformation', 'dress', ['black'], 'summer', 'Silk', 4, 1, 'feminine', true],
  ['Knit Midi Dress', null, 'dress', ['olive'], 'fall', 'Knit', 3, 3, 'feminine', false],
  ['Wool Coat', 'Max Mara', 'outerwear', ['camel'], 'winter', 'Wool', 4, 5, 'both', true],
  ['Trench Coat', 'Burberry', 'outerwear', ['sand'], 'spring', 'Cotton', 4, 3, 'both', false],
  ['Leather Loafers', null, 'shoes', ['espresso'], 'all', 'Leather', 3, 2, 'both', false],
  ['White Sneakers', 'Common Projects', 'shoes', ['white'], 'all', 'Leather', 2, 2, 'both', true],
  ['Strappy Heels', null, 'shoes', ['black'], 'all', 'Leather', 5, 1, 'feminine', false],
  ['Structured Tote', null, 'accessory', ['espresso'], 'all', 'Leather', 3, 1, 'both', false],
  ['Silk Scarf', null, 'accessory', ['burgundy'], 'all', 'Silk', 3, 1, 'feminine', false],
]

function iso(daysAhead, hh, mm) {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  d.setHours(hh, mm, 0, 0)
  return d.toISOString()
}

export async function seed() {
  const token = await auth()
  await wipe(token)

  // Items
  const body = ITEMS.map((i) => ({
    name: i[0], brand: i[1], category: i[2], colors: i[3], season: i[4],
    fabric: i[5], formality: i[6], warmth: i[7], style: i[8], favorite: i[9],
  }))
  const items = await (
    await fetch(`${SB}/rest/v1/closet_items`, { method: 'POST', headers: h(token), body: JSON.stringify(body) })
  ).json()
  const byName = (n) => items.find((x) => x.name === n)?.id

  // A saved outfit
  await fetch(`${SB}/rest/v1/closet_outfits`, {
    method: 'POST',
    headers: h(token),
    body: JSON.stringify({
      name: 'The Executive Minimalist',
      occasion: 'work',
      note: 'Perfect for a 21°C sunny & dry day.',
      item_ids: [byName('Silk Blouse'), byName('Tailored Trousers'), byName('Leather Loafers')].filter(Boolean),
    }),
  })

  // Events
  await fetch(`${SB}/rest/v1/closet_events`, {
    method: 'POST',
    headers: h(token),
    body: JSON.stringify([
      { title: 'Client Presentation', event_at: iso(2, 10, 0), event_type: 'work', location: 'Downtown' },
      { title: 'Dinner at Bestia', event_at: iso(3, 19, 30), event_type: 'date', location: 'Arts District' },
      { title: 'Weekend Brunch', event_at: iso(5, 11, 0), event_type: 'casual', location: 'Silver Lake' },
    ]),
  })

  // Profile (id auto-increments once migration 003 is applied).
  await fetch(`${SB}/rest/v1/closet_profile`, {
    method: 'POST',
    headers: h(token),
    body: JSON.stringify({
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
    }),
  })

  console.log(`Seeded demo account (${items.length} items) → ${DEMO.email}`)
  return DEMO
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) seed().catch((e) => { console.error(e); process.exit(1) })
