// Modals ("sheets") and the data actions behind them: add/edit/remove items,
// favorites, outfit save/delete, event creation, profile editing, goals.
import { S, CAT_LABEL, CAT_ICON, COLOR_HEX, OCCASIONS } from './state.js'
import { $, esc, toast, thumbHTML, theme } from './ui.js'
import { db, uploadPhoto } from './supabase.js'
import { generateOutfit, itemsOf } from './engine.js'
import { render } from './render.js'

/* ---------------- Sheet plumbing ---------------- */
export function closeModal() {
  $('#modal').innerHTML = ''
}
function sheet(inner) {
  $('#modal').innerHTML = `<div class="overlay" onclick="if(event.target===this)closeModal()"><div class="sheet">${inner}</div></div>`
}
export function segPick(btn) {
  ;[...btn.parentElement.children].forEach((b) => b.classList.remove('on'))
  btn.classList.add('on')
}
const segVal = (id) => $(`#${id} .chip.on`)?.dataset.v

/* ---------------- Favorites / generation ---------------- */
export async function toggleFav(id) {
  const it = S.items.find((i) => i.id === id)
  it.favorite = !it.favorite
  render()
  db(`closet_items?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ favorite: it.favorite }),
  }).catch(() => {})
}
export function doGenerate() {
  const g = generateOutfit(S.occasion)
  if (!g) {
    toast('Add a few more pieces first — I need at least a top, bottom and shoes.')
    return
  }
  S.genOutfit = g
  render()
}
export async function saveGenerated() {
  const g = S.genOutfit
  if (!g) return
  try {
    const [row] = await db('closet_outfits', {
      method: 'POST',
      body: JSON.stringify({ name: g.name, occasion: g.occasion, note: g.note, item_ids: g.item_ids }),
    })
    S.outfits.unshift(row)
    S.genOutfit = null
    render()
    toast('Saved to your collection.')
  } catch (e) {
    toast('Could not save the look.')
  }
}
export async function deleteOutfit(id) {
  S.outfits = S.outfits.filter((o) => o.id !== id)
  render()
  db(`closet_outfits?id=eq.${id}`, { method: 'DELETE' }).catch(() => {})
}
export async function planForEvent(eventId) {
  const e = S.events.find((x) => x.id === eventId)
  const g = generateOutfit(e.event_type)
  if (!g) {
    toast('Your closet needs a few more pieces first.')
    return
  }
  try {
    const [row] = await db('closet_outfits', {
      method: 'POST',
      body: JSON.stringify({
        name: g.name,
        occasion: g.occasion,
        note: `For ${e.title}. ${g.note}`,
        item_ids: g.item_ids,
      }),
    })
    S.outfits.unshift(row)
    e.planned_outfit = row.id
    await db(`closet_events?id=eq.${eventId}`, {
      method: 'PATCH',
      body: JSON.stringify({ planned_outfit: row.id }),
    })
    render()
    toast(`"${row.name}" planned for ${e.title}.`)
  } catch (err) {
    toast('Could not plan the outfit.')
  }
}

/* ---------------- Goals ---------------- */
export async function toggleGoal(ix) {
  const goals = S.profile.goals
  goals[ix].done = !goals[ix].done
  render()
  db('closet_profile', { method: 'PATCH', body: JSON.stringify({ goals }) }).catch(() => {})
}
export function addGoal() {
  const label = prompt('What piece are you hunting for?')
  if (!label) return
  const note = prompt('Any preference? (optional)') || ''
  S.profile.goals = [...(S.profile.goals || []), { label, note, done: false }]
  render()
  db('closet_profile', {
    method: 'PATCH',
    body: JSON.stringify({ goals: S.profile.goals }),
  }).catch(() => {})
}

/* ---------------- Add / edit item ("New Treasure") ---------------- */
let pendingPhoto = null // {blob, dataUrl}
export function openItemForm(item) {
  pendingPhoto = null
  const i = item || {}
  sheet(`
    <button class="icon-btn close" onclick="closeModal()"><span class="ms">close</span></button>
    <h3>${item ? 'Edit Piece' : 'New Treasure'}</h3>
    <p class="sub">Capture the essence of your style.</p>
    <div class="capture" id="cap" onclick="$id('file').click()">
      ${
        i.photo_url
          ? `<img src="${esc(i.photo_url)}">`
          : `
      <span class="ms cam">photo_camera</span>
      <div class="t1">TAP TO CAPTURE</div>
      <div class="t2">OR CHOOSE FROM LIBRARY</div>`
      }
    </div>
    <input type="file" id="file" accept="image/*" capture="environment" style="display:none" onchange="photoChosen(this)">
    <label class="f-label">Name</label>
    <input class="f-in" id="f-name" placeholder="e.g. Silk Blouse" value="${esc(i.name || '')}">
    <label class="f-label">Brand</label>
    <input class="f-in" id="f-brand" placeholder="e.g. Everlane" value="${esc(i.brand || '')}">
    <label class="f-label">Category</label>
    <select class="f-in" id="f-cat">${Object.entries(CAT_LABEL)
      .map(([k, v]) => `<option value="${k}" ${i.category === k ? 'selected' : ''}>${v}</option>`)
      .join('')}</select>
    <label class="f-label">Color Palette</label>
    <input class="f-in" id="f-colors" placeholder="e.g. sage, ecru, charcoal" value="${esc(
      (i.colors || []).join(', '),
    )}">
    <label class="f-label">Season</label>
    <select class="f-in" id="f-season">${['all', 'spring', 'summer', 'fall', 'winter']
      .map((s) => `<option value="${s}" ${i.season === s ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`)
      .join('')}</select>
    <label class="f-label">Fabric</label>
    <input class="f-in" id="f-fabric" placeholder="e.g. Linen, Silk, Wool" value="${esc(i.fabric || '')}">
    <label class="f-label">Formality — 1 casual · 5 formal</label>
    <div class="seg" id="f-formality">${[1, 2, 3, 4, 5]
      .map(
        (n) =>
          `<button class="chip ${(i.formality || 3) === n ? 'on' : ''}" data-v="${n}" onclick="segPick(this)">${n}</button>`,
      )
      .join('')}</div>
    <label class="f-label">Warmth — 1 light · 5 heavy</label>
    <div class="seg" id="f-warmth">${[1, 2, 3, 4, 5]
      .map(
        (n) =>
          `<button class="chip ${(i.warmth || 3) === n ? 'on' : ''}" data-v="${n}" onclick="segPick(this)">${n}</button>`,
      )
      .join('')}</div>
    <label class="f-label">Wardrobe</label>
    <div class="seg" id="f-style">${[
      ['feminine', 'Feminine'],
      ['masculine', 'Masculine'],
      ['both', 'Both'],
    ]
      .map(
        ([k, v]) =>
          `<button class="chip ${(i.style || theme()) === k ? 'on' : ''}" data-v="${k}" onclick="segPick(this)">${v}</button>`,
      )
      .join('')}</div>
    <div class="tog-row">
      <div><div class="tt">Automatic Tagging</div><div class="ts">Let the app read colors from your photo</div></div>
      <button class="switch on" id="f-auto" onclick="this.classList.toggle('on')"></button>
    </div>
    <button class="btn btn-p btn-block" style="margin-top:26px" id="f-save" onclick="saveItem('${i.id || ''}')">Save to Closet</button>
    ${item ? `<button class="del-link" onclick="deleteItem('${i.id}')">Remove from closet</button>` : ''}
    <p class="footnote">A place for everything, and everything in its place.</p>
  `)
}

export function photoChosen(input) {
  const f = input.files[0]
  if (!f) return
  const img = new Image()
  img.onload = () => {
    const max = 1080,
      sc = Math.min(1, max / Math.max(img.width, img.height))
    const cv = document.createElement('canvas')
    cv.width = Math.round(img.width * sc)
    cv.height = Math.round(img.height * sc)
    const cx = cv.getContext('2d')
    cx.drawImage(img, 0, 0, cv.width, cv.height)
    cv.toBlob(
      (b) => {
        pendingPhoto = { blob: b, dataUrl: cv.toDataURL('image/jpeg', 0.75) }
        $('#cap').innerHTML = `<img src="${pendingPhoto.dataUrl}">`
        if ($('#f-auto').classList.contains('on')) autoTag(cx, cv)
      },
      'image/jpeg',
      0.85,
    )
    URL.revokeObjectURL(img.src)
  }
  img.src = URL.createObjectURL(f)
}
function autoTag(cx, cv) {
  const d = cx.getImageData(0, 0, cv.width, cv.height).data,
    buckets = {}
  for (let n = 0; n < 6000; n++) {
    const px = Math.floor(Math.random() * (d.length / 4)) * 4
    const r = d[px],
      g = d[px + 1],
      b = d[px + 2]
    const k = `${r >> 5}_${g >> 5}_${b >> 5}`
    buckets[k] = buckets[k] || { r: 0, g: 0, b: 0, c: 0 }
    const B = buckets[k]
    B.r += r
    B.g += g
    B.b += b
    B.c++
  }
  const tops = Object.values(buckets)
    .sort((a, b) => b.c - a.c)
    .slice(0, 3)
    .map((B) => ({ r: B.r / B.c, g: B.g / B.c, b: B.b / B.c }))
  const names = [...new Set(tops.map(nearestColorName))].slice(0, 2)
  if (names.length) {
    $('#f-colors').value = names.join(', ')
    toast(`Tagged colors: ${names.join(', ')}`)
  }
}
function nearestColorName({ r, g, b }) {
  let best = 'grey',
    bd = 1e9
  for (const [name, hex] of Object.entries(COLOR_HEX)) {
    const R = parseInt(hex.slice(1, 3), 16),
      G = parseInt(hex.slice(3, 5), 16),
      B = parseInt(hex.slice(5, 7), 16)
    const dd = (R - r) ** 2 + (G - g) ** 2 + (B - b) ** 2
    if (dd < bd) {
      bd = dd
      best = name
    }
  }
  return best
}
export async function saveItem(id) {
  const name = $('#f-name').value.trim()
  if (!name) {
    toast('Give the piece a name.')
    return
  }
  $('#f-save').disabled = true
  const body = {
    name,
    brand: $('#f-brand').value.trim() || null,
    category: $('#f-cat').value,
    colors: $('#f-colors')
      .value.split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
    season: $('#f-season').value,
    fabric: $('#f-fabric').value.trim() || null,
    formality: +segVal('f-formality') || 3,
    warmth: +segVal('f-warmth') || 3,
    style: segVal('f-style') || 'both',
  }
  try {
    let row
    if (id) {
      ;[row] = await db(`closet_items?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(body) })
    } else {
      ;[row] = await db('closet_items', { method: 'POST', body: JSON.stringify(body) })
    }
    if (pendingPhoto) {
      const url = await uploadPhoto(row.id, pendingPhoto.blob)
      ;[row] = await db(`closet_items?id=eq.${row.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ photo_url: url }),
      })
    }
    if (id) S.items = S.items.map((i) => (i.id === id ? row : i))
    else S.items.unshift(row)
    S._homeFit = null
    closeModal()
    render()
    toast(id ? 'Piece updated.' : `"${row.name}" added to your closet.`)
  } catch (e) {
    console.error(e)
    toast('Could not save — check your connection.')
    $('#f-save').disabled = false
  }
}
export async function deleteItem(id) {
  if (!confirm('Remove this piece from your closet?')) return
  S.items = S.items.filter((i) => i.id !== id)
  S._homeFit = null
  closeModal()
  render()
  db(`closet_items?id=eq.${id}`, { method: 'DELETE' }).catch(() => {})
  toast('Removed.')
}
export function openItemDetail(id) {
  const i = S.items.find((x) => x.id === id)
  if (!i) return
  sheet(`
    <button class="icon-btn close" onclick="closeModal()"><span class="ms">close</span></button>
    ${thumbHTML(i)}
    <div class="row" style="margin-top:16px">
      <div>
        <h3 style="margin:0">${esc(i.name)}</h3>
        <div class="kicker" style="margin-top:2px">${esc(i.brand || CAT_LABEL[i.category])}</div>
      </div>
      <button class="fav ${i.favorite ? 'on' : ''}" style="position:static" onclick="toggleFav('${i.id}');closeModal()"><span class="ms ${
        i.favorite ? 'fill' : ''
      }">favorite</span></button>
    </div>
    <div class="seg" style="margin-top:16px">
      <span class="chip">${CAT_LABEL[i.category]}</span>
      <span class="chip">${esc(i.season)}</span>
      ${i.fabric ? `<span class="chip">${esc(i.fabric)}</span>` : ''}
      ${(i.colors || []).map((c) => `<span class="chip">${esc(c)}</span>`).join('')}
    </div>
    <div style="display:flex;gap:10px;margin-top:24px">
      <button class="btn btn-p" style="flex:1" onclick='closeModal();openItemForm(${JSON.stringify(i).replace(
        /'/g,
        '&#39;',
      )})'>Edit</button>
      <button class="btn btn-ghost" onclick="deleteItem('${i.id}')">Remove</button>
    </div>
  `)
}
export function openOutfitDetail(id, isHome) {
  const o = isHome ? S._homeFit : S.outfits.find((x) => x.id === id)
  if (!o) return
  const items = o._items || itemsOf(o)
  sheet(`
    <button class="icon-btn close" onclick="closeModal()"><span class="ms">close</span></button>
    <div class="kicker">Stylist's Note</div>
    <h3>${esc(o.name)}</h3>
    <p class="sub" style="font-style:italic;font-family:'Playfair Display',serif">"${esc(
      o.note || 'A considered composition from your own closet.',
    )}"</p>
    ${items
      .map(
        (i) => `
      <div class="card event" onclick="closeModal();openItemDetail('${i.id}')">
        ${thumbHTML(i, '')?.replace(
          'class="thumb "',
          'class="thumb" style="width:64px;height:64px;aspect-ratio:1;border-radius:8px;flex-shrink:0"',
        )}
        <div style="flex:1;min-width:0">
          <div class="et">${esc(i.name)}</div>
          <div class="ed">${esc(i.brand || CAT_LABEL[i.category])}</div>
        </div>
        <span class="ms" style="color:var(--text-2)">chevron_right</span>
      </div>`,
      )
      .join('')}
    ${
      isHome
        ? `<button class="btn btn-p btn-block" style="margin-top:22px" onclick="S.genOutfit=S._homeFit;saveGenerated();closeModal()">Save This Look</button>
              <button class="btn btn-ghost btn-block" style="margin-top:10px" onclick="S._homeFit=generateOutfit('casual');closeModal();render()">Try Another</button>`
        : ''
    }
  `)
}

/* ---------------- Events ---------------- */
export function openEventForm() {
  const d = new Date(Date.now() + 86400e3)
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}T19:00`
  sheet(`
    <button class="icon-btn close" onclick="closeModal()"><span class="ms">close</span></button>
    <h3>New Event</h3>
    <p class="sub">Tell me where you're headed; I'll handle the look.</p>
    <label class="f-label">Title</label>
    <input class="f-in" id="e-title" placeholder="e.g. Dinner at Le Plaisir">
    <label class="f-label">When</label>
    <input class="f-in" id="e-when" type="datetime-local" value="${iso}">
    <label class="f-label">Type</label>
    <div class="seg" id="e-type">${OCCASIONS.map(
      (o, ix) => `<button class="chip ${ix === 0 ? 'on' : ''}" data-v="${o.key}" onclick="segPick(this)">${o.label}</button>`,
    ).join('')}</div>
    <label class="f-label">Location (optional)</label>
    <input class="f-in" id="e-loc" placeholder="e.g. Arts District">
    <button class="btn btn-p btn-block" style="margin-top:26px" onclick="saveEvent()">Add to Schedule</button>
  `)
}
export async function saveEvent() {
  const title = $('#e-title').value.trim()
  if (!title) {
    toast('Give the event a title.')
    return
  }
  const when = $('#e-when').value
  if (!when) {
    toast('Pick a date and time.')
    return
  }
  try {
    const [row] = await db('closet_events', {
      method: 'POST',
      body: JSON.stringify({
        title,
        event_at: new Date(when).toISOString(),
        event_type: segVal('e-type') || 'casual',
        location: $('#e-loc').value.trim() || null,
      }),
    })
    S.events.push(row)
    S.events.sort((a, b) => new Date(a.event_at) - new Date(b.event_at))
    closeModal()
    render()
    toast('Event added.')
  } catch (e) {
    toast('Could not save the event.')
  }
}

/* ---------------- Profile ---------------- */
export function openProfileForm() {
  const p = S.profile
  sheet(`
    <button class="icon-btn close" onclick="closeModal()"><span class="ms">close</span></button>
    <h3>Your Profile</h3>
    <label class="f-label">Name</label>
    <input class="f-in" id="p-name" value="${esc(p.name || '')}">
    <label class="f-label">Location</label>
    <input class="f-in" id="p-loc" value="${esc(p.location || '')}">
    <label class="f-label">Style Persona</label>
    <input class="f-in" id="p-persona" value="${esc(p.persona || '')}" placeholder="How do you like to dress?">
    <label class="f-label">Preferred palette (comma separated)</label>
    <input class="f-in" id="p-pal" value="${esc((p.palette || []).join(', '))}" placeholder="sage, ecru, charcoal">
    <label class="f-label">Sizes — tops / bottoms / shoes</label>
    <div style="display:flex;gap:10px">
      <input class="f-in" id="p-s1" value="${esc((p.sizes || {}).tops || '')}" placeholder="M">
      <input class="f-in" id="p-s2" value="${esc((p.sizes || {}).bottoms || '')}" placeholder="32/30">
      <input class="f-in" id="p-s3" value="${esc((p.sizes || {}).shoes || '')}" placeholder="10 US">
    </div>
    <button class="btn btn-p btn-block" style="margin-top:26px" onclick="saveProfile()">Save</button>
  `)
}
export async function saveProfile() {
  const body = {
    name: $('#p-name').value.trim() || 'You',
    location: $('#p-loc').value.trim(),
    persona: $('#p-persona').value.trim(),
    palette: $('#p-pal')
      .value.split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
    sizes: {
      tops: $('#p-s1').value.trim(),
      bottoms: $('#p-s2').value.trim(),
      shoes: $('#p-s3').value.trim(),
    },
  }
  try {
    const [row] = await db('closet_profile', { method: 'PATCH', body: JSON.stringify(body) })
    S.profile = row
    closeModal()
    render()
    toast('Profile saved.')
  } catch (e) {
    toast('Could not save profile.')
  }
}
