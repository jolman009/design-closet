// Authentication screen: email/password sign-in & sign-up, Google OAuth,
// and password reset. Rendered into #view before the main app boots.
import { $, esc, toast } from './ui.js'
import { signIn, signUp, signInWithGoogle, resetPassword } from './supabase.js'

let mode = 'signin' // 'signin' | 'signup'

export function renderAuth() {
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

      <div class="auth-divider">or</div>
      <button class="btn btn-ghost btn-block" onclick="authGoogle()">
        <span class="ms" style="font-size:18px;margin-right:8px">login</span>Continue with Google
      </button>
    </div>

    <div class="auth-switch">
      ${
        isUp
          ? `Already have a closet? <button onclick="authToggle()">Sign in</button>`
          : `New here? <button onclick="authToggle()">Create an account</button>`
      }
    </div>
  </div>`

  // Submit on Enter from the password field.
  const pass = $('#a-pass')
  if (pass) pass.onkeydown = (e) => e.key === 'Enter' && authSubmit()
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
        // Email confirmation is on — no session returned yet.
        busy(false)
        setErr('')
        toast('Check your email to confirm your account.')
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
