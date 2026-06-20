// src/components/LoginScreen.jsx
// App-level login gate — shown before any page content.
// Handles: first-time PIN setup · PIN login · TOTP 2FA · Trusted device · Setup wizard
import { useState, useEffect, useCallback, useRef } from 'react'
import { T } from '../utils/tokens.js'
import {
  hasPIN, setPIN, verifyPIN,
  getTOTPConfig, saveTOTPConfig, generateTOTPSecret, getTOTPQRUrl, verifyTOTP,
  isDeviceTrusted, trustDevice,
  createSession, getAuthConfig, saveAuthConfig,
} from '../lib/auth.js'

const LOGO_STYLE = {
  fontFamily: "'Cormorant Garamond', serif",
  fontSize: 28, fontWeight: 600, color: T.goldBright, letterSpacing: '0.04em',
}
const SUBTITLE_STYLE = {
  fontSize: 11, color: 'rgba(232,192,122,0.6)', letterSpacing: '0.18em',
  textTransform: 'uppercase', marginTop: 4,
}
const CARD_STYLE = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(232,192,122,0.15)',
  borderRadius: 16, padding: '32px 36px', width: '100%', maxWidth: 380,
}
const INPUT_STYLE = {
  width: '100%', boxSizing: 'border-box', padding: '12px 14px',
  borderRadius: 10, border: '1px solid rgba(232,192,122,0.25)',
  background: 'rgba(255,255,255,0.06)', color: T.goldBright,
  fontSize: 15, letterSpacing: 2, outline: 'none', marginTop: 6,
  fontFamily: "'Inter', sans-serif",
}
const BTN_PRIMARY = {
  width: '100%', padding: '13px', borderRadius: 10, border: 'none',
  background: 'linear-gradient(135deg,#B8975A,#CFA96E)', color: T.forest,
  fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 12,
  letterSpacing: '0.05em',
}
const BTN_GHOST = {
  background: 'none', border: 'none', color: 'rgba(232,192,122,0.6)',
  fontSize: 12, cursor: 'pointer', padding: '4px 0', textDecoration: 'underline',
}
const ERR_STYLE = {
  color: '#F87171', fontSize: 12, marginTop: 8, textAlign: 'center',
}
const LABEL_STYLE = {
  color: 'rgba(232,192,122,0.7)', fontSize: 12, letterSpacing: '0.12em',
  textTransform: 'uppercase', display: 'block', marginBottom: 2, marginTop: 16,
}

// ── OTP digit input ────────────────────────────────────────────────────────────
function OTPInput({ value, onChange, length = 6 }) {
  const refs = Array.from({ length }, () => useRef(null)) // eslint-disable-line react-hooks/rules-of-hooks
  const digits = value.split('').concat(Array(length).fill('')).slice(0, length)

  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      const next = value.slice(0, -1)
      onChange(next)
      if (i > 0) refs[i - 1].current?.focus()
      return
    }
    if (!/^\d$/.test(e.key)) return
    const next = (value + e.key).slice(0, length)
    onChange(next)
    if (i < length - 1) refs[i + 1].current?.focus()
  }

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={refs[i]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          readOnly
          onKeyDown={e => handleKey(i, e)}
          onClick={() => refs[i].current?.focus()}
          style={{
            width: 42, height: 52, textAlign: 'center', fontSize: 22,
            borderRadius: 10, border: `1.5px solid ${d ? 'rgba(184,151,90,0.7)' : 'rgba(232,192,122,0.2)'}`,
            background: 'rgba(255,255,255,0.06)', color: T.goldBright, outline: 'none',
            cursor: 'text', caretColor: 'transparent',
          }}
        />
      ))}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
export default function LoginScreen({ onAuthenticated }) {
  const [step,        setStep]        = useState(null)   // null=loading | 'login' | 'setup_pin' | 'setup_totp' | 'totp'
  const [pin,         setPin]         = useState('')
  const [pinConfirm,  setPinConfirm]  = useState('')
  const [totp,        setTotp]        = useState('')
  const [error,       setError]       = useState('')
  const [working,     setWorking]     = useState(false)
  const [remember,    setRemember]    = useState(false)
  const [totpSecret,  setTotpSecret]  = useState('')
  const [totpSetupCode, setTotpSetupCode] = useState('')
  const [showTotp,    setShowTotp]    = useState(false)  // toggle TOTP in setup

  // On mount — determine which screen to show
  useEffect(() => {
    if (!hasPIN()) {
      setStep('setup_pin')
    } else {
      setStep('login')
    }
  }, [])

  // ── First-time PIN setup ───────────────────────────────────────────────────
  const handleSetupPIN = useCallback(async () => {
    if (pin.length < 4)              { setError('PIN must be at least 4 characters.'); return }
    if (pin !== pinConfirm)           { setError('PINs do not match.'); return }
    setWorking(true); setError('')
    try {
      await setPIN(pin)
      // If TOTP was enabled in setup, go to TOTP verification setup
      if (showTotp && totpSecret) {
        setStep('setup_totp_verify')
      } else {
        // Done — create session
        saveAuthConfig({ setupComplete: true, inactivityMinutes: 30 })
        createSession()
        onAuthenticated()
      }
    } catch (e) { setError(e.message) }
    setWorking(false)
  }, [pin, pinConfirm, showTotp, totpSecret, onAuthenticated])

  // ── TOTP setup: generate secret and QR ────────────────────────────────────
  const handleEnableTotp = useCallback(() => {
    const secret = generateTOTPSecret()
    setTotpSecret(secret)
    setTotpSetupCode('')
    setStep('setup_totp')
  }, [])

  const handleVerifyTotpSetup = useCallback(async () => {
    if (totpSetupCode.length !== 6) { setError('Enter the 6-digit code from your authenticator app.'); return }
    setWorking(true); setError('')
    const valid = await verifyTOTP(totpSecret, totpSetupCode)
    if (!valid) { setError('Code incorrect. Ensure your device time is correct and try again.'); setWorking(false); return }
    saveTOTPConfig(totpSecret, true)
    saveAuthConfig({ setupComplete: true, inactivityMinutes: 30 })
    createSession()
    onAuthenticated()
    setWorking(false)
  }, [totpSecret, totpSetupCode, onAuthenticated])

  // ── Login with PIN ─────────────────────────────────────────────────────────
  const handleLogin = useCallback(async () => {
    if (!pin) { setError('Enter your PIN.'); return }
    setWorking(true); setError('')
    try {
      const ok = await verifyPIN(pin)
      if (!ok) { setError('Incorrect PIN.'); setWorking(false); return }

      const totp2fa = getTOTPConfig()
      if (totp2fa.enabled && !isDeviceTrusted()) {
        // Need TOTP — move to second factor step
        setWorking(false)
        setStep('totp')
        return
      }

      // PIN correct + no 2FA needed (trusted device or 2FA not configured)
      createSession()
      if (remember) trustDevice()
      onAuthenticated()
    } catch (e) { setError(e.message) }
    setWorking(false)
  }, [pin, remember, onAuthenticated])

  // ── Verify TOTP at login ───────────────────────────────────────────────────
  const handleTOTP = useCallback(async () => {
    if (totp.length !== 6) { setError('Enter the 6-digit code.'); return }
    setWorking(true); setError('')
    const { secret } = getTOTPConfig()
    const valid = await verifyTOTP(secret, totp)
    if (!valid) { setError('Code incorrect or expired. Try again.'); setWorking(false); return }
    createSession()
    if (remember) trustDevice()
    onAuthenticated()
    setWorking(false)
  }, [totp, remember, onAuthenticated])

  // ── Shared layout ──────────────────────────────────────────────────────────
  const Wrapper = ({ children }) => (
    <div style={{
      minHeight: '100vh', background: `linear-gradient(145deg, ${T.forest} 0%, ${T.forestMid} 60%, #102820 100%)`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={LOGO_STYLE}>Botanica Living</div>
        <div style={SUBTITLE_STYLE}>Group Command Centre</div>
      </div>
      <div style={CARD_STYLE}>{children}</div>
    </div>
  )

  if (step === null) return <Wrapper><div style={{ color: T.goldBright, textAlign: 'center', padding: 20 }}>Loading…</div></Wrapper>

  // ── Setup PIN ──────────────────────────────────────────────────────────────
  if (step === 'setup_pin') return (
    <Wrapper>
      <div style={{ color: T.goldBright, fontSize: 17, fontWeight: 600, marginBottom: 6 }}>Set Up Your PIN</div>
      <div style={{ color: 'rgba(232,192,122,0.55)', fontSize: 12, lineHeight: 1.6, marginBottom: 20 }}>
        Create a PIN to protect access to this app. Minimum 4 characters — digits, letters, or symbols.
      </div>

      <label style={LABEL_STYLE}>Create PIN</label>
      <input
        type="password"
        placeholder="Enter PIN"
        value={pin}
        onChange={e => { setPin(e.target.value); setError('') }}
        style={INPUT_STYLE}
        autoComplete="new-password"
        onKeyDown={e => e.key === 'Enter' && (pinConfirm ? handleSetupPIN() : null)}
      />
      <label style={LABEL_STYLE}>Confirm PIN</label>
      <input
        type="password"
        placeholder="Re-enter PIN"
        value={pinConfirm}
        onChange={e => { setPinConfirm(e.target.value); setError('') }}
        style={INPUT_STYLE}
        autoComplete="new-password"
        onKeyDown={e => e.key === 'Enter' && handleSetupPIN()}
      />

      {/* Optional TOTP setup */}
      <div style={{ marginTop: 20, padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(232,192,122,0.12)', background: 'rgba(255,255,255,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="checkbox"
            id="totp-opt"
            checked={showTotp}
            onChange={e => {
              setShowTotp(e.target.checked)
              if (e.target.checked && !totpSecret) {
                const s = generateTOTPSecret(); setTotpSecret(s)
              }
            }}
            style={{ accentColor: T.gold, width: 16, height: 16 }}
          />
          <label htmlFor="totp-opt" style={{ color: 'rgba(232,192,122,0.8)', fontSize: 13, cursor: 'pointer' }}>
            Enable 2FA (Google Authenticator / Authy)
          </label>
        </div>
        {showTotp && totpSecret && (
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'rgba(232,192,122,0.5)', marginBottom: 8 }}>
              Scan with your authenticator app, then continue:
            </div>
            <img
              src={getTOTPQRUrl(totpSecret)}
              alt="QR code"
              style={{ width: 160, height: 160, borderRadius: 8, background: '#fff', padding: 4 }}
            />
            <div style={{ fontSize: 10, color: 'rgba(232,192,122,0.4)', marginTop: 6, wordBreak: 'break-all', fontFamily: 'monospace' }}>
              {totpSecret}
            </div>
          </div>
        )}
      </div>

      {error && <div style={ERR_STYLE}>⚠ {error}</div>}
      <button style={BTN_PRIMARY} onClick={handleSetupPIN} disabled={working}>
        {working ? 'Setting up…' : showTotp ? 'Continue to 2FA →' : 'Create PIN & Enter App'}
      </button>
    </Wrapper>
  )

  // ── Verify TOTP during setup ───────────────────────────────────────────────
  if (step === 'setup_totp') return (
    <Wrapper>
      <div style={{ color: T.goldBright, fontSize: 17, fontWeight: 600, marginBottom: 6 }}>Verify Authenticator App</div>
      <div style={{ color: 'rgba(232,192,122,0.55)', fontSize: 12, lineHeight: 1.6, marginBottom: 20 }}>
        Enter the 6-digit code shown in your authenticator app to confirm 2FA is working correctly.
      </div>
      <OTPInput value={totpSetupCode} onChange={setTotpSetupCode} />
      {error && <div style={ERR_STYLE}>⚠ {error}</div>}
      <button style={BTN_PRIMARY} onClick={handleVerifyTotpSetup} disabled={working || totpSetupCode.length !== 6}>
        {working ? 'Verifying…' : 'Confirm & Enter App'}
      </button>
      <div style={{ textAlign: 'center', marginTop: 10 }}>
        <button style={BTN_GHOST} onClick={() => { saveTOTPConfig('', false); saveAuthConfig({ setupComplete: true, inactivityMinutes: 30 }); createSession(); onAuthenticated() }}>
          Skip 2FA for now
        </button>
      </div>
    </Wrapper>
  )

  // ── Login with PIN ─────────────────────────────────────────────────────────
  if (step === 'login') return (
    <Wrapper>
      <div style={{ color: T.goldBright, fontSize: 17, fontWeight: 600, marginBottom: 6 }}>Welcome Back</div>
      <div style={{ color: 'rgba(232,192,122,0.55)', fontSize: 12, marginBottom: 24 }}>
        Enter your PIN to access the Command Centre.
      </div>

      <label style={LABEL_STYLE}>PIN</label>
      <input
        type="password"
        placeholder="Enter PIN"
        value={pin}
        autoFocus
        onChange={e => { setPin(e.target.value); setError('') }}
        style={INPUT_STYLE}
        autoComplete="current-password"
        onKeyDown={e => e.key === 'Enter' && handleLogin()}
      />

      {/* Trusted device option */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
        <input
          type="checkbox"
          id="trust"
          checked={remember}
          onChange={e => setRemember(e.target.checked)}
          style={{ accentColor: T.gold, width: 15, height: 15 }}
        />
        <label htmlFor="trust" style={{ color: 'rgba(232,192,122,0.6)', fontSize: 12, cursor: 'pointer' }}>
          Trust this device (skip 2FA on this device)
        </label>
      </div>

      {error && <div style={ERR_STYLE}>⚠ {error}</div>}
      <button style={BTN_PRIMARY} onClick={handleLogin} disabled={working}>
        {working ? 'Verifying…' : 'Enter App'}
      </button>

      <div style={{ textAlign: 'center', marginTop: 14 }}>
        <button style={BTN_GHOST} onClick={() => {
          if (window.confirm(
            'Reset your PIN?\n\n' +
            'WARNING: For security, ALL locally stored app data will also be cleared on this device. ' +
            'Data in Supabase (transactions, documents) is not affected and will reload after you log in with your new PIN.\n\n' +
            'Make sure you have a backup or Supabase connected before continuing.\n\n' +
            'Continue?'
          )) {
            // Clear auth credentials
            localStorage.removeItem('bl_auth_pin')
            localStorage.removeItem('bl_auth_totp')
            localStorage.removeItem('bl_auth_trusted')
            // Clear all app data from localStorage so the new PIN holder
            // cannot access the previous user's records on this device.
            // Data in Supabase is unaffected and reloads after new login.
            const AUTH_KEYS = ['bl_auth_pin','bl_auth_totp','bl_auth_trusted','bl_auth_config','bl_device_id','bl_session']
            for (const key of Object.keys(localStorage)) {
              if (!AUTH_KEYS.includes(key)) localStorage.removeItem(key)
            }
            sessionStorage.removeItem('bl_session')
            setPin(''); setPinConfirm(''); setError(''); setStep('setup_pin')
          }
        }}>
          Forgot PIN? Reset
        </button>
      </div>
    </Wrapper>
  )

  // ── 2FA step ───────────────────────────────────────────────────────────────
  if (step === 'totp') return (
    <Wrapper>
      <div style={{ color: T.goldBright, fontSize: 17, fontWeight: 600, marginBottom: 6 }}>Two-Factor Authentication</div>
      <div style={{ color: 'rgba(232,192,122,0.55)', fontSize: 12, lineHeight: 1.6, marginBottom: 20 }}>
        Enter the 6-digit code from your authenticator app.
      </div>
      <OTPInput value={totp} onChange={setTotp} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
        <input type="checkbox" id="trust2" checked={remember} onChange={e => setRemember(e.target.checked)} style={{ accentColor: T.gold }} />
        <label htmlFor="trust2" style={{ color: 'rgba(232,192,122,0.6)', fontSize: 12, cursor: 'pointer' }}>Trust this device</label>
      </div>

      {error && <div style={ERR_STYLE}>⚠ {error}</div>}
      <button style={BTN_PRIMARY} onClick={handleTOTP} disabled={working || totp.length !== 6}>
        {working ? 'Verifying…' : 'Confirm'}
      </button>
      <div style={{ textAlign: 'center', marginTop: 10 }}>
        <button style={BTN_GHOST} onClick={() => { setStep('login'); setTotp(''); setPin('') }}>← Back</button>
      </div>
    </Wrapper>
  )

  return null
}
