// src/lib/auth.js
// ─────────────────────────────────────────────────────────────────────────────
// App-level authentication for Botanica Living Group Command Centre.
//
// DESIGN:
//   Single-owner PWA — no backend auth server needed.
//   Security model:
//     • PIN hashed with PBKDF2 (Web Crypto) — never stored in plaintext
//     • Optional TOTP 2FA (RFC 6238) compatible with Google Authenticator / Authy
//     • Trusted device flag stored per-device (skips 2FA on trusted devices)
//     • Session token in sessionStorage (expires on tab close)
//     • Inactivity timer — auto-logout after configured idle minutes
//     • All Supabase document access uses signed URLs generated after login
//
// SETUP FLOW (first run):
//   1. User sets a PIN (min 6 digits)
//   2. Optionally scans TOTP QR code with Authenticator app
//   3. After login, user can mark device as trusted
//
// KEYS STORED:
//   localStorage 'bl_auth_pin'     — { hash, salt, iterations } (PBKDF2)
//   localStorage 'bl_auth_totp'    — { secret, enabled } (base32 TOTP secret)
//   localStorage 'bl_auth_trusted' — { [deviceId]: true } (trusted device registry)
//   localStorage 'bl_auth_config'  — { inactivityMinutes, setupComplete }
//   sessionStorage 'bl_session'    — { token, expiresAt } (cleared on close)
// ─────────────────────────────────────────────────────────────────────────────

// ── Constants ─────────────────────────────────────────────────────────────────
const PBKDF2_ITERATIONS = 200_000
const PBKDF2_HASH       = 'SHA-256'
const SESSION_HOURS     = 12          // session lives 12 hours max
const DEFAULT_IDLE_MIN  = 30          // auto-logout after 30 minutes idle

// ── Device ID (stable per browser profile) ────────────────────────────────────
export function getDeviceId() {
  let id = localStorage.getItem('bl_device_id')
  if (!id) {
    id = `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
    localStorage.setItem('bl_device_id', id)
  }
  return id
}

// ── PBKDF2 helpers ────────────────────────────────────────────────────────────
function buf2hex(buf) {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}
function hex2buf(hex) {
  const arr = new Uint8Array(hex.length / 2)
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return arr.buffer
}

async function pbkdf2Hash(pin, saltHex) {
  const enc     = new TextEncoder()
  const keyMat  = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits'])
  const bits     = await crypto.subtle.deriveBits(
    { name:'PBKDF2', salt: hex2buf(saltHex), iterations: PBKDF2_ITERATIONS, hash: PBKDF2_HASH },
    keyMat, 256
  )
  return buf2hex(bits)
}

// ── PIN management ────────────────────────────────────────────────────────────
export async function setPIN(pin) {
  if (!pin || pin.length < 4) throw new Error('PIN must be at least 4 characters.')
  const salt    = buf2hex(crypto.getRandomValues(new Uint8Array(16)).buffer)
  const hash    = await pbkdf2Hash(pin, salt)
  localStorage.setItem('bl_auth_pin', JSON.stringify({ hash, salt, iterations: PBKDF2_ITERATIONS }))
}

export async function verifyPIN(pin) {
  const stored = localStorage.getItem('bl_auth_pin')
  if (!stored) return false
  const { hash, salt } = JSON.parse(stored)
  const attempt = await pbkdf2Hash(pin, salt)
  return attempt === hash
}

export function hasPIN() {
  return !!localStorage.getItem('bl_auth_pin')
}

// ── TOTP (RFC 6238 — Google Authenticator compatible) ────────────────────────
// Pure browser implementation — no library needed for verification.
// Generates and verifies 6-digit TOTP codes with ±1 window tolerance.

function base32Decode(b32) {
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  b32 = b32.toUpperCase().replace(/=+$/, '')
  let bits = '', bytes = []
  for (const c of b32) {
    const v = CHARS.indexOf(c)
    if (v < 0) continue
    bits += v.toString(2).padStart(5, '0')
  }
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2))
  return new Uint8Array(bytes)
}

async function hmacSha1(key, data) {
  const k = await crypto.subtle.importKey('raw', key, { name:'HMAC', hash:'SHA-1' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data))
}

async function totpCode(secret, timeStep = Math.floor(Date.now() / 1000 / 30)) {
  const key     = base32Decode(secret)
  const t       = new Uint8Array(8)
  let step      = timeStep
  for (let i = 7; i >= 0; i--) { t[i] = step & 0xff; step >>= 8 }
  const mac     = await hmacSha1(key, t)
  const offset  = mac[19] & 0xf
  const code    = ((mac[offset] & 0x7f) << 24 | mac[offset+1] << 16 | mac[offset+2] << 8 | mac[offset+3]) % 1_000_000
  return code.toString().padStart(6, '0')
}

// Generate a random base32 TOTP secret (160 bits)
export function generateTOTPSecret() {
  const CHARS  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const bytes  = crypto.getRandomValues(new Uint8Array(20))
  return Array.from(bytes).map(b => CHARS[b % 32]).join('')
}

export function getTOTPQRUrl(secret, label = 'BotanicaLiving') {
  const issuer  = 'BotanicaLiving'
  const uri     = `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&digits=6&period=30`
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(uri)}`
}

export async function verifyTOTP(secret, userCode) {
  // Check current window ± 1 step (90-second tolerance)
  const step  = Math.floor(Date.now() / 1000 / 30)
  const clean = userCode.replace(/\s/g, '')
  for (const s of [step - 1, step, step + 1]) {
    if (await totpCode(secret, s) === clean) return true
  }
  return false
}

export function getTOTPConfig() {
  const stored = localStorage.getItem('bl_auth_totp')
  if (!stored) return { enabled: false, secret: null }
  return JSON.parse(stored)
}

export function saveTOTPConfig(secret, enabled) {
  localStorage.setItem('bl_auth_totp', JSON.stringify({ secret, enabled }))
}

// ── Trusted devices ────────────────────────────────────────────────────────────
export function isDeviceTrusted() {
  const stored = localStorage.getItem('bl_auth_trusted')
  if (!stored) return false
  const trusted = JSON.parse(stored)
  return !!trusted[getDeviceId()]
}

export function trustDevice() {
  const stored = localStorage.getItem('bl_auth_trusted')
  const trusted = stored ? JSON.parse(stored) : {}
  trusted[getDeviceId()] = true
  localStorage.setItem('bl_auth_trusted', JSON.stringify(trusted))
}

export function untrustDevice() {
  const stored = localStorage.getItem('bl_auth_trusted')
  if (!stored) return
  const trusted = JSON.parse(stored)
  delete trusted[getDeviceId()]
  localStorage.setItem('bl_auth_trusted', JSON.stringify(trusted))
}

// ── Session ───────────────────────────────────────────────────────────────────
export function createSession() {
  const token     = buf2hex(crypto.getRandomValues(new Uint8Array(16)).buffer)
  const expiresAt = Date.now() + SESSION_HOURS * 60 * 60 * 1000
  sessionStorage.setItem('bl_session', JSON.stringify({ token, expiresAt }))
  touchSession()
  return token
}

export function getSession() {
  try {
    const stored = sessionStorage.getItem('bl_session')
    if (!stored) return null
    const sess = JSON.parse(stored)
    if (Date.now() > sess.expiresAt) { clearSession(); return null }
    return sess
  } catch { return null }
}

export function touchSession() {
  // Update last activity time in sessionStorage
  try {
    const stored = sessionStorage.getItem('bl_session')
    if (!stored) return
    const sess = JSON.parse(stored)
    sess.lastActivity = Date.now()
    sessionStorage.setItem('bl_session', JSON.stringify(sess))
  } catch {}
}

export function clearSession() {
  sessionStorage.removeItem('bl_session')
}

export function isSessionValid() {
  return !!getSession()
}

// ── Inactivity config ─────────────────────────────────────────────────────────
export function getAuthConfig() {
  const stored = localStorage.getItem('bl_auth_config')
  if (!stored) return { inactivityMinutes: DEFAULT_IDLE_MIN, setupComplete: false }
  return JSON.parse(stored)
}

export function saveAuthConfig(config) {
  localStorage.setItem('bl_auth_config', JSON.stringify({ ...getAuthConfig(), ...config }))
}

// Check if idle too long
export function isIdleExpired() {
  const { inactivityMinutes } = getAuthConfig()
  const stored = sessionStorage.getItem('bl_session')
  if (!stored) return true
  try {
    const sess = JSON.parse(stored)
    const idleMs = inactivityMinutes * 60 * 1000
    return Date.now() - (sess.lastActivity || 0) > idleMs
  } catch { return true }
}
