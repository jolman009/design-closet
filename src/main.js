// App orchestrator: styles, session/auth boot, data load, theme, weather,
// connectivity, PWA install + update, and wiring inline handlers to window.
import './styles.css'

import { S } from './state.js'
import { $, toast } from './ui.js'
import { db, supabase, setAccessToken, getSession, signOut } from './supabase.js'
import { DEFAULT_LAT, DEFAULT_LON } from './config.js'
import { render, go } from './render.js'
import { renderNav } from './views.js'
import { generateOutfit } from './engine.js'
import { renderAuth, authSubmit, authToggle, authGoogle, authReset, authResendFor } from './auth.js'
import * as modals from './modals.js'

/* ---------------- Theme ---------------- */
async function setTheme(t, persist = true) {
  document.documentElement.dataset.theme = t
  $('#mode-f')?.classList.toggle('on', t === 'feminine')
  $('#mode-m')?.classList.toggle('on', t === 'masculine')
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    'content',
    t === 'masculine' ? '#161412' : '#4e635a',
  )
  render()
  if (persist && S.profile) {
    S.profile.theme_pref = t
    db('closet_profile', { method: 'PATCH', body: JSON.stringify({ theme_pref: t }) }).catch(() => {})
  }
}

/* ---------------- Weather ---------------- */
async function fetchWeather() {
  try {
    const pos = await new Promise((res) => {
      if (!navigator.geolocation) return res(null)
      navigator.geolocation.getCurrentPosition((p) => res(p), () => res(null), { timeout: 4000 })
    })
    const lat = pos?.coords.latitude ?? DEFAULT_LAT,
      lon = pos?.coords.longitude ?? DEFAULT_LON
    const r = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`,
    )
    const j = await r.json()
    const code = j.current.weather_code
    const desc =
      code === 0 ? 'Sunny & Dry' : code < 4 ? 'Partly Cloudy' : code < 50 ? 'Foggy' : code < 70 ? 'Rainy' : code < 80 ? 'Snowy' : code < 85 ? 'Showers' : 'Stormy'
    const icon =
      code === 0 ? 'sunny' : code < 4 ? 'partly_cloudy_day' : code < 50 ? 'foggy' : code < 70 ? 'rainy' : 'weather_snowy'
    S.weather = { temp: Math.round(j.current.temperature_2m), desc, icon }
    if (S.tab === 'home') render()
  } catch (e) {
    /* keep default */
  }
}

/* ---------------- Data load ---------------- */
async function loadCloset() {
  const [items, events, outfits, prof] = await Promise.all([
    db('closet_items?select=*&order=created_at.desc'),
    db('closet_events?select=*&order=event_at.asc'),
    db('closet_outfits?select=*&order=created_at.desc'),
    db('closet_profile?select=*'),
  ])
  S.items = items || []
  S.events = events || []
  S.outfits = outfits || []
  S.profile = prof?.[0] || (await ensureProfile())
}

// Create a profile row for a brand-new user (RLS fills user_id via DEFAULT auth.uid()).
async function ensureProfile() {
  const name = S.user?.user_metadata?.full_name || S.user?.email?.split('@')[0] || 'You'
  try {
    const [row] = await db('closet_profile', {
      method: 'POST',
      body: JSON.stringify({ name, palette: [], sizes: {}, goals: [], theme_pref: 'feminine' }),
    })
    return row
  } catch (e) {
    return { name, palette: [], sizes: {}, goals: [], theme_pref: 'feminine' }
  }
}

/* ---------------- App boot (authenticated) ---------------- */
let appBooted = false
async function bootApp() {
  if (appBooted) return
  appBooted = true
  // Restore app chrome hidden by the auth screen.
  $('#appHeader')?.style.removeProperty('display')
  $('#modeWrap')?.style.removeProperty('display')
  $('#nav')?.style.removeProperty('display')
  renderNav()
  render()
  try {
    await loadCloset()
    setTheme(S.profile?.theme_pref || 'feminine', false)
    S.loaded = true
    render()
    handleLaunchParams()
  } catch (e) {
    console.error(e)
    S.loaded = true
    render()
    toast('Could not reach your closet — check your connection.')
  }
  fetchWeather()
}

// Deep links from PWA shortcuts: ?tab=closet, ?action=add
function handleLaunchParams() {
  const q = new URLSearchParams(location.search)
  const tab = q.get('tab')
  if (tab && ['home', 'closet', 'outfits', 'events', 'profile'].includes(tab)) go(tab)
  if (q.get('action') === 'add') modals.openItemForm()
}

/* ---------------- Auth lifecycle ---------------- */
function showAuth() {
  appBooted = false
  S.loaded = false
  renderAuth()
}

async function initSession() {
  const session = await getSession()
  setAccessToken(session?.access_token)
  S.user = session?.user || null
  if (S.user) bootApp()
  else showAuth()

  supabase.auth.onAuthStateChange((event, sess) => {
    setAccessToken(sess?.access_token)
    S.user = sess?.user || null
    if (event === 'SIGNED_IN' && S.user) bootApp()
    if (event === 'SIGNED_OUT') {
      // Reset in-memory state, then show auth.
      Object.assign(S, { items: [], events: [], outfits: [], profile: null, tab: 'home', _homeFit: null })
      appBooted = false
      showAuth()
    }
  })
}

async function signOutUser() {
  await signOut()
  toast('Signed out.')
}

/* ---------------- Connectivity ---------------- */
window.addEventListener('online', () => {
  S.online = true
  render()
  toast('Back online.')
})
window.addEventListener('offline', () => {
  S.online = false
  render()
})

/* ---------------- PWA: install prompt ---------------- */
let deferredPrompt = null
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e
  if (localStorage.getItem('dc_install_dismissed')) return
  showInstallBanner()
})
function showInstallBanner() {
  const b = $('#installBanner')
  if (!b) return
  b.classList.add('show')
}
function dismissInstall() {
  $('#installBanner')?.classList.remove('show')
  localStorage.setItem('dc_install_dismissed', '1')
}
async function doInstall() {
  $('#installBanner')?.classList.remove('show')
  if (!deferredPrompt) return
  deferredPrompt.prompt()
  await deferredPrompt.userChoice
  deferredPrompt = null
}
window.addEventListener('appinstalled', () => {
  dismissInstall()
  toast('Design Closet installed.')
})

/* ---------------- PWA: service worker update ---------------- */
async function initPWA() {
  try {
    const { registerSW } = await import('virtual:pwa-register')
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        showUpdateToast(() => updateSW(true))
      },
      onOfflineReady() {
        toast('Ready to use offline.')
      },
    })
  } catch (e) {
    /* SW disabled in dev — ignore */
  }
}
function showUpdateToast(onReload) {
  const host = $('#modal')
  const el = document.createElement('div')
  el.className = 'update-toast'
  el.innerHTML = `<span>A new version is ready.</span><button>Refresh</button>`
  el.querySelector('button').onclick = onReload
  host.appendChild(el)
  setTimeout(() => el.remove(), 12000)
}

/* ---------------- Wire inline handlers to window ---------------- */
Object.assign(window, {
  S,
  render,
  go,
  setTheme,
  generateOutfit,
  signOutUser,
  dismissInstall,
  doInstall,
  toast,
  // helpers used by inline handlers
  $id: (id) => document.getElementById(id),
  // auth
  authSubmit,
  authToggle,
  authGoogle,
  authReset,
  authResendFor,
  // modals + actions
  ...modals,
})

/* ---------------- Go ---------------- */
initSession()
initPWA()
