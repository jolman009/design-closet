// Google Calendar connector (optional).
//
// Uses Google Identity Services (GIS) to obtain a read-only Calendar access
// token client-side — decoupled from the app's email/password auth. Events are
// fetched live and merged into the UI; nothing is stored in our database.
import { S } from './state.js'
import { GOOGLE_CLIENT_ID } from './config.js'
import { toast } from './ui.js'
import { db } from './supabase.js'
import { generateOutfit } from './engine.js'
import { render } from './render.js'

const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'
const TOKEN_KEY = 'dc_gcal_token' // { access_token, exp }
const LINKED_KEY = 'dc_gcal_linked' // '1' once the user has connected before

export const gcalConfigured = () => !!GOOGLE_CLIENT_ID

/* ---------------- GIS loading + token client ---------------- */
let gisPromise = null
function loadGis() {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (gisPromise) return gisPromise
  gisPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Failed to load Google Identity Services'))
    document.head.appendChild(s)
  })
  return gisPromise
}

let tokenClient = null
async function getTokenClient() {
  await loadGis()
  if (!tokenClient) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPE,
      callback: (resp) => {
        if (resp.error || !resp.access_token) {
          S.google.loading = false
          render()
          if (resp.error && resp.error !== 'access_denied') toast('Could not connect Google Calendar.')
          return
        }
        const exp = Date.now() + (Number(resp.expires_in || 3600) - 60) * 1000
        localStorage.setItem(TOKEN_KEY, JSON.stringify({ access_token: resp.access_token, exp }))
        localStorage.setItem(LINKED_KEY, '1')
        fetchGoogleEvents()
      },
    })
  }
  return tokenClient
}

function storedToken() {
  try {
    const t = JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null')
    return t && t.exp > Date.now() ? t : null
  } catch {
    return null
  }
}

/* ---------------- Public actions ---------------- */
export async function connectGoogleCalendar() {
  if (!gcalConfigured()) return toast('Google Calendar isn’t configured yet.')
  S.google.loading = true
  render()
  try {
    const client = await getTokenClient()
    // Empty prompt = silent if already consented; GIS shows consent otherwise.
    client.requestAccessToken({ prompt: localStorage.getItem(LINKED_KEY) ? '' : 'consent' })
  } catch (e) {
    S.google.loading = false
    render()
    toast('Could not reach Google.')
  }
}

export function disconnectGoogle(silent = false) {
  localStorage.removeItem(TOKEN_KEY)
  if (!silent) localStorage.removeItem(LINKED_KEY)
  S.google.connected = false
  S.google.events = []
  render()
  if (!silent) toast('Google Calendar disconnected.')
}

// On app boot: if a valid token exists, load events; if previously linked but
// the token expired, silently try to refresh (no popup when already consented).
export async function restoreGoogleCalendar() {
  if (!gcalConfigured()) return
  if (storedToken()) return fetchGoogleEvents()
  if (localStorage.getItem(LINKED_KEY)) {
    try {
      const client = await getTokenClient()
      client.requestAccessToken({ prompt: '' })
    } catch {
      /* stays disconnected until the user taps Connect */
    }
  }
}

async function fetchGoogleEvents() {
  const t = storedToken()
  if (!t) return
  S.google.loading = true
  render()
  const now = new Date().toISOString()
  const max = new Date(Date.now() + 30 * 864e5).toISOString()
  const url =
    `https://www.googleapis.com/calendar/v3/calendars/primary/events` +
    `?timeMin=${encodeURIComponent(now)}&timeMax=${encodeURIComponent(max)}` +
    `&singleEvents=true&orderBy=startTime&maxResults=25`
  try {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${t.access_token}` } })
    if (r.status === 401) {
      disconnectGoogle(true) // token rejected — keep "linked" so we show Reconnect
      return
    }
    const j = await r.json()
    S.google.events = (j.items || []).map(normalizeEvent).filter(Boolean)
    S.google.connected = true
  } catch (e) {
    /* keep whatever we had */
  } finally {
    S.google.loading = false
    render()
  }
}

function normalizeEvent(item) {
  const startRaw = item.start?.dateTime || (item.start?.date ? `${item.start.date}T09:00:00` : null)
  if (!startRaw) return null
  return {
    id: 'g_' + item.id,
    title: item.summary || '(Untitled event)',
    event_at: new Date(startRaw).toISOString(),
    event_type: inferEventType(`${item.summary || ''} ${item.description || ''}`),
    location: item.location || null,
    source: 'google',
    htmlLink: item.htmlLink || null,
    planned_outfit: null,
  }
}

// Best-effort mapping from a calendar title to our occasion vocabulary.
function inferEventType(text) {
  const t = text.toLowerCase()
  if (/\b(gym|run|workout|yoga|pilates|training|hike|cycle|ride)\b/.test(t)) return 'active'
  if (/\b(flight|trip|travel|airport|vacation|hotel)\b/.test(t)) return 'travel'
  if (/\b(gala|wedding|black tie|formal|ceremony|opera|premiere)\b/.test(t)) return 'formal'
  if (/\b(date|dinner|drinks|anniversary|valentine)\b/.test(t)) return 'date'
  if (/\b(meeting|standup|stand-up|1:1|review|interview|work|client|sync|call|presentation|conference)\b/.test(t)) return 'work'
  return 'casual'
}

// Merge manual + Google events, upcoming-first. `windowMs` = how far back to keep.
export function mergedUpcoming(windowMs = 3600e3) {
  const cutoff = Date.now() - windowMs
  return [...(S.events || []), ...(S.google.events || [])]
    .filter((e) => new Date(e.event_at).getTime() > cutoff)
    .sort((a, b) => new Date(a.event_at) - new Date(b.event_at))
}

// Plan (generate + save) a look for a Google event. Calendar is read-only, so we
// attach the saved outfit id to the in-memory event to flip it to "View Look".
export async function planForGoogleEvent(id) {
  const e = S.google.events.find((x) => x.id === id)
  if (!e) return
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
    render()
    toast(`“${row.name}” planned for ${e.title}.`)
  } catch (err) {
    toast('Could not plan the outfit.')
  }
}
