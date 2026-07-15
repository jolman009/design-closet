// Wear-tracking: logging "I wore this", and helpers for rotation / neglect.
import { S } from './state.js'
import { db } from './supabase.js'
import { toast } from './ui.js'
import { render } from './render.js'
import { itemsOf } from './engine.js'

// Whole days since a piece was last worn (null last_worn → Infinity = never worn).
export function daysSinceWorn(item) {
  if (!item?.last_worn) return Infinity
  return Math.floor((Date.now() - new Date(item.last_worn).getTime()) / 86400000)
}

// Human label for wear recency, e.g. "Worn today", "3d ago", "Never worn".
export function wornLabel(item) {
  const d = daysSinceWorn(item)
  if (d === Infinity) return 'Never worn'
  if (d === 0) return 'Worn today'
  if (d === 1) return 'Worn yesterday'
  if (d < 30) return `Worn ${d}d ago`
  const m = Math.floor(d / 30)
  return `Worn ${m}mo ago`
}

// Least-worn pieces (fewest wears, then longest since worn). Used by Home's
// "Rediscover" section to nudge neglected clothing back into rotation.
export function neglectedItems(limit = 3) {
  return [...S.items]
    .sort((a, b) => (a.worn_count || 0) - (b.worn_count || 0) || daysSinceWorn(b) - daysSinceWorn(a))
    .slice(0, limit)
}

// Apply a wear to a set of items locally (optimistic) — bump count + stamp date.
function applyLocalWear(ids) {
  const now = new Date().toISOString()
  for (const id of ids) {
    const it = S.items.find((i) => i.id === id)
    if (it) {
      it.worn_count = (it.worn_count || 0) + 1
      it.last_worn = now
    }
  }
  S._homeFit = null // regenerate the daily suggestion with fresh rotation
}

// Persist a wear: increment each item and write one row to the wear log.
async function persistWear(ids, outfitId) {
  await Promise.all(
    ids.map((id) => {
      const it = S.items.find((i) => i.id === id)
      return db(`closet_items?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ worn_count: it?.worn_count ?? 1, last_worn: it?.last_worn }),
      })
    }),
  )
  await db('closet_wears', {
    method: 'POST',
    body: JSON.stringify({ item_ids: ids, outfit_id: outfitId || null }),
  })
}

// Mark an outfit worn (from the home suggestion or a saved look).
export async function markOutfitWorn(id, isHome) {
  const o = isHome ? S._homeFit : S.outfits.find((x) => x.id === id)
  if (!o) return
  const items = o._items || itemsOf(o)
  const ids = items.map((i) => i.id)
  if (!ids.length) return
  const outfitId = isHome ? null : o.id
  applyLocalWear(ids)
  render()
  toast(`Logged — ${items.length} pieces marked worn.`)
  try {
    await persistWear(ids, outfitId)
  } catch (e) {
    toast('Saved locally, but sync failed — check your connection.')
  }
}

// Mark a single item worn (from item detail).
export async function logItemWear(id) {
  const it = S.items.find((i) => i.id === id)
  if (!it) return
  applyLocalWear([id])
  render()
  toast(`"${it.name}" marked worn.`)
  try {
    await persistWear([id], null)
  } catch (e) {
    toast('Saved locally, but sync failed — check your connection.')
  }
}
