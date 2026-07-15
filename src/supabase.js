// Supabase integration.
//
// We use @supabase/supabase-js purely for AUTH (session persistence + token
// refresh), and keep the original lightweight REST helpers for data so the
// existing PostgREST query strings work unchanged. Every REST call carries the
// signed-in user's JWT, so Row Level Security scopes reads/writes to that user.
import { createClient } from '@supabase/supabase-js'
import { SB_URL, SB_ANON, BUCKET } from './config.js'

export const supabase = createClient(SB_URL, SB_ANON, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // handles OAuth / magic-link redirects
  },
})

// Cached access token, kept fresh by the onAuthStateChange listener in main.js.
let accessToken = null
export function setAccessToken(t) {
  accessToken = t || null
}
function authHeaders() {
  return {
    apikey: SB_ANON,
    Authorization: `Bearer ${accessToken || SB_ANON}`,
  }
}

/** PostgREST data helper — same signature the app used before. Throws on error. */
export async function db(path, opts = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(opts.headers || {}),
    },
  })
  if (!r.ok) {
    const t = await r.text()
    throw new Error(t || r.status)
  }
  const txt = await r.text()
  return txt ? JSON.parse(txt) : null
}

/** Uploads a resized JPEG to Storage and returns a cache-busted public URL. */
export async function uploadPhoto(id, blob) {
  const r = await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${id}.jpg`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'image/jpeg', 'x-upsert': 'true' },
    body: blob,
  })
  if (!r.ok) throw new Error('photo upload failed')
  return `${SB_URL}/storage/v1/object/public/${BUCKET}/${id}.jpg?v=${Math.floor(
    performance.now(),
  )}`
}

/* ---------------- Auth helpers ---------------- */
export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}
export function signUp(email, password, name) {
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name || '' } },
  })
}
export function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password })
}
export function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
}
export function resetPassword(email) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  })
}
export function signOut() {
  return supabase.auth.signOut()
}
