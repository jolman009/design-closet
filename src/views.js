// View render functions. Handlers referenced by inline onclick are exposed on
// window in main.js (see wireGlobals), which keeps this a light refactor of the
// original single-file app while running as real ES modules.
import { S, CAT_ICON, CAT_LABEL, EVENT_ICON, OCCASIONS, TABS } from './state.js'
import { COLOR_HEX } from './state.js'
import { esc, greeting, fmtEvent, thumbHTML } from './ui.js'
import { generateOutfit, itemsOf } from './engine.js'
import { neglectedItems, wornLabel } from './wear.js'
import { mergedUpcoming, gcalConfigured } from './gcal.js'

export function renderNav() {
  const nav = document.querySelector('#nav')
  nav.innerHTML = TABS.map(
    (t) => `
    <button class="${S.tab === t.key ? 'on' : ''}" onclick="go('${t.key}')">
      <span class="pill"><span class="ms ${S.tab === t.key ? 'fill' : ''}">${t.icon}</span></span>${t.label}
    </button>`,
  ).join('')
}

export function vHome() {
  if (!S.loaded)
    return `<div class="skel" style="height:34px;width:60%;margin-top:14px"></div><div class="skel" style="height:330px;margin-top:22px"></div><div class="skel" style="height:80px;margin-top:22px"></div>`
  const name = S.profile?.name || 'You'
  const upcoming = mergedUpcoming(3600e3).slice(0, 3)
  const suggestion =
    S._homeFit || (S._homeFit = generateOutfit(upcoming[0]?.event_type || 'casual'))
  const recent = S.items.slice(0, 3)
  return `
  <div class="row" style="align-items:flex-end">
    <div>
      <div class="kicker">${greeting()}, ${esc(name)}</div>
      <h1 class="title">Today's<br>Suggestion</h1>
    </div>
    <div class="weather">
      <div class="t"><span class="ms" style="color:var(--gold);font-size:20px">${S.weather.icon}</span> ${S.weather.temp}°C</div>
      <div class="d">${esc(S.weather.desc)}</div>
    </div>
  </div>
  ${
    suggestion
      ? `
  <div class="hero" style="margin-top:20px" onclick="openOutfitDetail(null, true)">
    <div class="shine"></div>
    <div class="hero-body">
      <span class="badge">Editor's Pick</span>
      <h3>${esc(suggestion.name)}</h3>
      <div class="tags">${suggestion._items
        .slice(0, 3)
        .map(
          (i) =>
            `<span class="tag">${esc(i.fabric || CAT_LABEL[i.category])} ${esc(
              i.category === 'shoes' ? 'Shoe' : '',
            )}</span>`,
        )
        .join('')}</div>
      <div class="note-row">
        <div class="note">${esc(suggestion.note)}</div>
        <div class="wear">WEAR THIS <span class="ms" style="font-size:18px">arrow_forward</span></div>
      </div>
    </div>
  </div>`
      : `
  <div class="card empty" style="margin-top:20px"><span class="ms">checkroom</span>Your closet is empty. Add a few pieces and your stylist will take it from there.</div>`
  }

  <section>
    <div class="row"><h2 class="sec">Upcoming Events</h2><button class="link" onclick="go('events')">View Calendar</button></div>
    ${
      upcoming.length
        ? upcoming.map(eventCard).join('')
        : `<p class="sub" style="margin-top:12px">Nothing scheduled. Add an event and I'll plan the look.</p>`
    }
  </section>

  <section>
    <div class="row"><h2 class="sec">Recent Additions</h2><button class="link" onclick="go('closet')">Closet</button></div>
    <div class="grid" style="grid-template-columns:repeat(3,1fr);gap:10px">
      <button class="slot" style="min-height:110px" onclick="openItemForm()"><div class="plus"><span class="ms">add</span></div></button>
      ${recent
        .map((i) => `<div class="item-card" onclick="openItemDetail('${i.id}')">${thumbHTML(i)}</div>`)
        .join('')}
    </div>
  </section>
  ${rediscover()}`
}

// Nudge neglected pieces back into rotation.
function rediscover() {
  if (S.items.length < 4) return ''
  const pieces = neglectedItems(3)
  if (!pieces.length) return ''
  return `
  <section>
    <div class="row"><h2 class="sec">Rediscover</h2></div>
    <p class="sub" style="margin-top:2px">Pieces you haven't reached for in a while.</p>
    <div class="grid" style="grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px">
      ${pieces
        .map(
          (i) => `
        <div class="item-card" onclick="openItemDetail('${i.id}')">
          ${thumbHTML(i)}
          <div class="item-meta" style="padding:8px 10px 10px">
            <div class="nm" style="font-size:12.5px">${esc(i.name)}</div>
            <div class="br" style="font-size:9.5px">${esc(wornLabel(i))}</div>
          </div>
        </div>`,
        )
        .join('')}
    </div>
  </section>`
}

export function eventCard(e) {
  const planned = e.planned_outfit && S.outfits.find((o) => o.id === e.planned_outfit)
  const isG = e.source === 'google'
  const planFn = isG ? 'planForGoogleEvent' : 'planForEvent'
  return `
  <div class="card event">
    <div class="eicon"><span class="ms">${EVENT_ICON[e.event_type] || 'event'}</span></div>
    <div style="flex:1;min-width:0">
      <div class="et">${esc(e.title)}${isG ? '<span class="gcal-tag">Calendar</span>' : ''}</div>
      <div class="ed">${fmtEvent(e.event_at)}${e.location ? ' · ' + esc(e.location) : ''}</div>
    </div>
    ${
      planned
        ? `<button class="btn btn-ghost" onclick="openOutfitDetail('${planned.id}')">View Look</button>`
        : `<button class="btn btn-p" onclick="${planFn}('${e.id}')">Plan Outfit</button>`
    }
  </div>`
}

export function vCloset() {
  if (!S.loaded)
    return `<div class="skel" style="height:34px;width:50%;margin-top:14px"></div><div class="grid">${'<div class="skel" style="height:230px"></div>'.repeat(
      4,
    )}</div>`
  const cats = ['all', ...Object.keys(CAT_LABEL)]
  const list = S.items.filter((i) => S.closetFilter === 'all' || i.category === S.closetFilter)
  return `
  <h1 class="title">Your Closet</h1>
  <p class="sub">A curated view of your personal style, organized for effortless daily selection.</p>
  <div class="chips">${cats
    .map(
      (c) =>
        `<button class="chip ${S.closetFilter === c ? 'on' : ''}" onclick="S.closetFilter='${c}';render()">${
          c === 'all' ? 'All' : CAT_LABEL[c]
        }</button>`,
    )
    .join('')}</div>
  <div class="grid">
    <button class="slot" onclick="openItemForm()"><div class="plus"><span class="ms">add</span></div>Add New Item</button>
    ${list
      .map(
        (i) => `
      <div class="item-card" onclick="openItemDetail('${i.id}')">
        ${thumbHTML(i)}
        <div class="item-meta">
          <div class="nm">${esc(i.name)}</div>
          <div class="br">${esc(i.brand || CAT_LABEL[i.category])}</div>
          <button class="fav ${i.favorite ? 'on' : ''}" onclick="event.stopPropagation();toggleFav('${i.id}')"><span class="ms ${
            i.favorite ? 'fill' : ''
          }" style="font-size:19px">favorite</span></button>
        </div>
      </div>`,
      )
      .join('')}
  </div>
  ${
    !list.length && S.closetFilter !== 'all'
      ? `<div class="empty"><span class="ms">${CAT_ICON[S.closetFilter]}</span>No ${CAT_LABEL[
          S.closetFilter
        ].toLowerCase()} yet.</div>`
      : ''
  }`
}

export function vOutfits() {
  if (!S.loaded)
    return `<div class="skel" style="height:34px;width:70%;margin-top:14px"></div><div class="skel" style="height:180px;margin-top:22px"></div>`
  const g = S.genOutfit
  return `
  <h1 class="title">What are you<br>dressing for?</h1>
  <p class="sub">Select an occasion and let your stylist curate the perfect look from your wardrobe.</p>
  <div class="occ-row">
    ${OCCASIONS.map(
      (o) =>
        `<button class="occ ${S.occasion === o.key ? 'on' : ''}" onclick="S.occasion='${o.key}';render()"><span class="ms">${o.icon}</span>${o.label}</button>`,
    ).join('')}
  </div>
  <div class="gen-wrap"><button class="btn btn-p" style="padding:15px 38px;border-radius:9999px" onclick="doGenerate()"><span class="ms" style="font-size:16px;margin-right:6px">auto_awesome</span>Generate Ideas</button></div>
  ${g ? outfitCard(g, true) : ''}
  <section>
    <div class="row"><h2 class="sec">Curated for You</h2></div>
    ${
      S.outfits.length
        ? S.outfits.map((o) => outfitCard(o, false)).join('')
        : `<p class="sub" style="margin-top:12px">Saved looks will appear here.</p>`
    }
  </section>`
}

export function outfitCard(o, isDraft) {
  const items = o._items || itemsOf(o)
  const cells = items
    .slice(0, 4)
    .map(
      (it, ix) =>
        `<div class="cell ${ix === 0 ? 'tall' : ''}">${
          it.photo_url ? `<img src="${esc(it.photo_url)}">` : `<span class="ms">${CAT_ICON[it.category]}</span>`
        }</div>`,
    )
    .join('')
  return `
  <div class="card outfit-card">
    <div class="ocol">${cells}</div>
    <div class="o-meta row" style="align-items:flex-end">
      <div>
        <div class="occ-label">Occasion: ${esc(
          (OCCASIONS.find((x) => x.key === o.occasion) || {}).label || o.occasion || 'Any',
        )}</div>
        <h4>${esc(o.name)}</h4>
        <div class="pieces">${items.map((i) => esc(i.name)).join(' · ')}</div>
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-top:14px">
      ${
        isDraft
          ? `<button class="btn btn-p" style="flex:1" onclick="saveGenerated()">Save to Collection</button>
           <button class="btn btn-ghost" onclick="doGenerate()"><span class="ms" style="font-size:17px">refresh</span></button>`
          : `<button class="btn btn-ghost" style="flex:1" onclick="openOutfitDetail('${o.id}')">View</button>
           <button class="btn btn-ghost" onclick="deleteOutfit('${o.id}')"><span class="ms" style="font-size:17px">delete</span></button>`
      }
    </div>
  </div>`
}

export function vEvents() {
  if (!S.loaded)
    return `<div class="skel" style="height:34px;width:50%;margin-top:14px"></div><div class="skel" style="height:80px;margin-top:22px"></div>`
  const up = mergedUpcoming(86400e3)
  return `
  <div class="row" style="align-items:flex-end">
    <div><div class="kicker">Your Schedule</div><h1 class="title">Events</h1></div>
    <button class="btn btn-p" onclick="openEventForm()"><span class="ms" style="font-size:16px;margin-right:4px">add</span>New</button>
  </div>
  <p class="sub">Every engagement, dressed with intention.</p>
  ${gcalControl()}
  <section style="margin-top:18px">
    ${
      up.length
        ? up.map(eventCard).join('')
        : `<div class="empty"><span class="ms">calendar_month</span>No upcoming events. Add one and I'll plan the outfit.</div>`
    }
  </section>`
}

// Google Calendar connect / status control. Hidden when not configured.
function gcalControl() {
  if (!gcalConfigured()) return ''
  const g = S.google
  if (g.loading && !g.connected)
    return `<div class="gcal-bar"><span class="spin"></span> Connecting to Google Calendar…</div>`
  if (g.connected)
    return `
    <div class="gcal-bar connected">
      <span class="ms" style="color:var(--primary)">event_available</span>
      <span style="flex:1">Google Calendar connected${g.events.length ? ` · ${g.events.length} upcoming` : ''}</span>
      <button class="link" onclick="disconnectGoogle()">Disconnect</button>
    </div>`
  return `
    <button class="gcal-bar connect" onclick="connectGoogleCalendar()">
      <span class="ms">calendar_add_on</span>
      <span style="flex:1;text-align:left">Connect Google Calendar</span>
      <span class="ms">chevron_right</span>
    </button>`
}

export function vProfile() {
  if (!S.loaded || !S.profile)
    return `<div class="skel" style="height:86px;width:86px;border-radius:50%;margin:24px auto"></div>`
  const p = S.profile
  const initial = (p.name || '?').trim()[0]?.toUpperCase() || '?'
  const goals = Array.isArray(p.goals) ? p.goals : []
  return `
  <div style="text-align:center">
    <div class="avatar">${esc(initial)}</div>
    <div class="serif" style="font-size:28px;font-weight:600">${esc(p.name || 'You')}</div>
    <div class="kicker" style="margin-top:4px">${esc(p.location || S.user?.email || '')}</div>
    <button class="link" onclick="openProfileForm()" style="margin-top:6px">Edit Profile</button>
  </div>
  <section>
    <div class="row"><h2 class="sec">Style Persona</h2></div>
    <div class="card persona">
      "${esc(p.persona || 'Tell your stylist how you like to dress.')}"
      <div class="ptags"><span class="ptag">Architectural</span><span class="ptag">Monochrome</span><span class="ptag">Effortless</span></div>
    </div>
  </section>
  <section>
    <div class="row"><h2 class="sec">Preferred Palette</h2></div>
    <div class="palette">
      ${
        (p.palette || [])
          .map(
            (c) =>
              `<div class="pal"><div class="sw" style="background:${COLOR_HEX[c] || c}"></div><div class="pn">${esc(
                c,
              )}</div></div>`,
          )
          .join('') || '<p class="sub">No palette set.</p>'
      }
    </div>
  </section>
  <section>
    <div class="row"><h2 class="sec">Standard Sizes</h2></div>
    <div class="sizes">
      ${['tops', 'bottoms', 'shoes']
        .map(
          (k) =>
            `<div class="card size"><div class="sl">${k}</div><div class="sv">${esc(
              (p.sizes || {})[k] || '—',
            )}</div></div>`,
        )
        .join('')}
    </div>
  </section>
  <section>
    <div class="row"><h2 class="sec">Style Goals</h2><button class="link" onclick="addGoal()">＋ Add</button></div>
    ${
      goals
        .map(
          (g, ix) => `
      <div class="card goal ${g.done ? 'done' : ''}" onclick="toggleGoal(${ix})">
        <span class="ms gc">${g.done ? 'check_circle' : 'radio_button_unchecked'}</span>
        <div><div class="gt">${esc(g.label)}</div><div class="gn">${esc(g.note || '')}</div></div>
      </div>`,
        )
        .join('') || '<p class="sub" style="margin-top:12px">No goals yet.</p>'
    }
  </section>
  <button class="btn btn-ghost btn-block" style="margin-top:26px" onclick="signOutUser()"><span class="ms" style="font-size:17px;margin-right:6px">logout</span>Sign Out</button>
  <div class="auth-legal" style="margin-top:18px">
    <a href="/privacy" target="_blank" rel="noopener">Privacy</a>
    <span>·</span>
    <a href="/terms" target="_blank" rel="noopener">Terms</a>
    <span>·</span>
    <a href="/delete-account" target="_blank" rel="noopener">Delete Account</a>
  </div>
  <p class="footnote">A place for everything, and everything in its place.</p>`
}

export const VIEWS = {
  home: vHome,
  closet: vCloset,
  outfits: vOutfits,
  events: vEvents,
  profile: vProfile,
}
