// Authentication screen: email/password sign-in & sign-up, Google OAuth,
// and password reset. Rendered into #view before the main app boots.
import { $, esc, toast } from './ui.js'
import {
  signIn,
  signUp,
  signInWithGoogle,
  resetPassword,
  resendConfirmation,
  getAuthProviders,
} from './supabase.js'

let mode = 'signin' // 'signin' | 'signup'
// Provider availability, discovered from the project settings. Assume email-only
// until we learn otherwise so we never render a dead OAuth button.
let providers = { email: true, google: false, confirmEmail: false }
let providersLoaded = false

// Load enabled providers once, then re-render if the auth screen is still up.
async function ensureProviders() {
  if (providersLoaded) return
  const prev = providers.google
  providers = await getAuthProviders()
  providersLoaded = true
  // Only re-render if the result changes what's on screen (the OAuth button),
  // so we never wipe fields the user is already typing into.
  if (providers.google !== prev && $('.auth-wrap')) renderAuth()
}

export function renderAuth() {
  ensureProviders()
  // Hide chrome that only belongs to the authed app.
  document.querySelector('#nav')?.style.setProperty('display', 'none')
  document.querySelector('#fab')?.style.setProperty('display', 'none')
  document.querySelector('#appHeader')?.style.setProperty('display', 'none')
  document.querySelector('#modeWrap')?.style.setProperty('display', 'none')

  const isUp = mode === 'signup'
  document.querySelector('#view').innerHTML = `
  <div class="auth-wrap">
    <img class="auth-logo" src="/favicon.svg" alt="Design Closet">
    <div class="auth-brand">Design Closet</div>
    <div class="auth-tag">Your closet, curated into daily confidence.</div>
    <div class="auth-card">
      <h2>${isUp ? 'Create your closet' : 'Welcome back'}</h2>
      <p class="sub" style="margin:2px 0 4px">${
        isUp ? 'A few seconds to your personal stylist.' : 'Sign in to your wardrobe.'
      }</p>

      ${
        isUp
          ? `<label class="f-label">Name</label>
             <input class="f-in" id="a-name" placeholder="Your name" autocomplete="name">`
          : ''
      }
      <label class="f-label">Email</label>
      <input class="f-in" id="a-email" type="email" placeholder="you@example.com" autocomplete="email" inputmode="email">
      <label class="f-label">Password</label>
      <input class="f-in" id="a-pass" type="password" placeholder="••••••••" autocomplete="${
        isUp ? 'new-password' : 'current-password'
      }">

      <div class="auth-err" id="a-err"></div>
      <button class="btn btn-p btn-block" id="a-submit" onclick="authSubmit()">${
        isUp ? 'Create Account' : 'Sign In'
      }</button>

      ${
        !isUp
          ? `<div style="text-align:center;margin-top:12px"><button class="link" onclick="authReset()">Forgot password?</button></div>`
          : ''
      }

      ${
        providers.google
          ? `<div class="auth-divider">or</div>
             <button class="btn btn-ghost btn-block" onclick="authGoogle()">
               <span class="ms" style="font-size:18px;margin-right:8px">login</span>Continue with Google
             </button>`
          : ''
      }
    </div>

    <div class="auth-switch">
      ${
        isUp
          ? `Already have a closet? <button onclick="authToggle()">Sign in</button>`
          : `New here? <button onclick="authToggle()">Create an account</button>`
      }
    </div>
    <div class="auth-legal">
      <a href="/privacy" target="_blank" rel="noopener">Privacy Policy</a>
      <span>·</span>
      <a href="/terms" target="_blank" rel="noopener">Terms</a>
    </div>
  </div>`

  // Submit on Enter from the password field. NOTE: must not return a falsy value
  // from onkeydown — that cancels the keystroke and blocks typing entirely.
  const pass = $('#a-pass')
  if (pass)
    pass.onkeydown = (e) => {
      if (e.key === 'Enter') authSubmit()
    }
}

function setErr(msg) {
  const el = $('#a-err')
  if (el) el.textContent = msg || ''
}
function busy(on) {
  const b = $('#a-submit')
  if (!b) return
  b.disabled = on
  b.innerHTML = on ? '<span class="spin"></span>' : mode === 'signup' ? 'Create Account' : 'Sign In'
}

export function authToggle() {
  mode = mode === 'signin' ? 'signup' : 'signin'
  renderAuth()
}

export async function authSubmit() {
  const email = $('#a-email')?.value.trim()
  const pass = $('#a-pass')?.value
  const name = $('#a-name')?.value.trim()
  setErr('')
  if (!email || !pass) return setErr('Enter your email and password.')
  if (mode === 'signup' && pass.length < 6) return setErr('Password must be at least 6 characters.')
  busy(true)
  try {
    if (mode === 'signup') {
      const { data, error } = await signUp(email, pass, name)
      if (error) throw error
      if (!data.session) {
        // Email confirmation is on — no session yet. Show a clear next step.
        showCheckEmail(email)
        return
      }
    } else {
      const { error } = await signIn(email, pass)
      if (error) throw error
    }
    // onAuthStateChange in main.js takes over from here (boots the app).
  } catch (e) {
    busy(false)
    setErr(humanize(e?.message))
  }
}

// Shown only when the project requires email confirmation before first sign-in.
function showCheckEmail(email) {
  document.querySelector('#view').innerHTML = `
  <div class="auth-wrap">
    <img class="auth-logo" src="/favicon.svg" alt="Design Closet">
    <div class="auth-brand">Almost there</div>
    <div class="auth-tag">One tap and your closet is ready.</div>
    <div class="auth-card" style="text-align:center">
      <span class="ms" style="font-size:44px;color:var(--primary)">mark_email_read</span>
      <h2 style="margin-top:8px">Confirm your email</h2>
      <p class="sub">We sent a confirmation link to<br><strong>${esc(email)}</strong>.
      Tap it, then come back and sign in.</p>
      <button class="btn btn-p btn-block" style="margin-top:22px" onclick="authToggle()">Back to sign in</button>
      <button class="link" style="margin-top:14px" onclick="authResendFor('${esc(email)}')">Resend confirmation</button>
    </div>
  </div>`
}

export async function authResendFor(email) {
  const { error } = await resendConfirmation(email)
  toast(error ? 'Could not resend — try again shortly.' : 'Confirmation email resent.')
}

export async function authGoogle() {
  setErr('')
  const { error } = await signInWithGoogle()
  if (error) setErr(humanize(error.message))
}

export async function authReset() {
  const email = $('#a-email')?.value.trim()
  if (!email) return setErr('Enter your email first, then tap reset.')
  const { error } = await resetPassword(email)
  if (error) return setErr(humanize(error.message))
  toast('Password reset link sent — check your email.')
}

function humanize(msg) {
  if (!msg) return 'Something went wrong. Please try again.'
  if (/invalid login credentials/i.test(msg)) return 'Email or password is incorrect.'
  if (/already registered|already been/i.test(msg)) return 'That email already has an account — sign in instead.'
  if (/rate limit|too many/i.test(msg)) return 'Too many attempts. Please wait a moment.'
  if (/network|fetch/i.test(msg)) return 'Network error — check your connection.'
  return esc(msg)
}
