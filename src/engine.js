// Rule-based outfit generator: scores pieces on formality fit, warmth vs. the
// current temperature, season, favorites and palette match.
import { S, OUTFIT_NAMES } from './state.js'
import { seasonNow, theme } from './ui.js'

function targetWarmth() {
  const t = S.weather.temp
  return t < 5 ? 5 : t < 12 ? 4 : t < 19 ? 3 : t < 27 ? 2 : 1
}
function occasionFormality(o) {
  return { work: 4, date: 4, casual: 2, formal: 5, active: 1, travel: 2 }[o] || 3
}

function pickBest(pool, target, used) {
  const tw = targetWarmth()
  let best = null,
    bestScore = -1e9
  for (const it of pool) {
    if (used.has(it.id)) continue
    let s = 10 - Math.abs(it.formality - target) * 2.2 - Math.abs(it.warmth - tw) * 1.1
    if (it.favorite) s += 1.2
    if (it.season === seasonNow()) s += 0.8
    else if (it.season !== 'all') s -= 0.8
    if ((S.profile?.palette || []).some((p) => (it.colors || []).includes(p))) s += 0.9
    // Rotation: avoid just-worn pieces, gently resurface neglected ones.
    if (it.last_worn) {
      const days = (Date.now() - new Date(it.last_worn).getTime()) / 86400000
      if (days < 2) s -= 1.8
      else if (days < 5) s -= 0.8
      else if (days > 21) s += 0.7
    } else {
      s += 0.5 // never worn — give it a turn
    }
    s += Math.random() * 1.6 // gentle variety between generations
    if (s > bestScore) {
      bestScore = s
      best = it
    }
  }
  return best
}

export function generateOutfit(occ) {
  const t = theme()
  const pool = S.items.filter((i) => i.style === 'both' || i.style === t)
  const F = occasionFormality(occ),
    used = new Set(),
    picks = []
  const cat = (c) => pool.filter((i) => i.category === c)

  // dress route vs separates route
  const dress =
    t === 'feminine' && ['date', 'formal', 'casual'].includes(occ)
      ? pickBest(cat('dress'), F, used)
      : null
  const top = pickBest(cat('top'), F, used),
    bottom = pickBest(cat('bottom'), F, used)
  const sepScore = (top ? 1 : 0) + (bottom ? 1 : 0)
  if (dress && (Math.random() < 0.45 || sepScore < 2)) {
    picks.push(dress)
    used.add(dress.id)
  } else {
    if (top) {
      picks.push(top)
      used.add(top.id)
    }
    if (bottom) {
      picks.push(bottom)
      used.add(bottom.id)
    }
  }
  const shoes = pickBest(cat('shoes'), F, used)
  if (shoes) {
    picks.push(shoes)
    used.add(shoes.id)
  }
  if (targetWarmth() >= 3) {
    const out = pickBest(cat('outerwear'), F, used)
    if (out) {
      picks.push(out)
      used.add(out.id)
    }
  }
  const acc = pickBest(cat('accessory'), F, used)
  if (acc && picks.length >= 2) picks.push(acc)

  if (picks.length < 2) return null
  const names = OUTFIT_NAMES[occ] || OUTFIT_NAMES.casual
  return {
    name: names[Math.floor(Math.random() * names.length)],
    occasion: occ,
    item_ids: picks.map((p) => p.id),
    note: `Perfect for a ${S.weather.temp}°C ${S.weather.desc.toLowerCase()} day.`,
    _items: picks,
  }
}

export const itemsOf = (o) =>
  (o.item_ids || []).map((id) => S.items.find((i) => i.id === id)).filter(Boolean)
