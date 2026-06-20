// src/components/LoginScreen.jsx — v2.1
// Fixed:
//   • Single password input for PIN (no multi-box — works on Samsung tablet)
//   • 2FA is fully optional — "Skip, enter app now" always available
//   • TOTP setup shows QR + raw URI + manual setup key + copy button
//   • Step flow is linear and unambiguous: setup_pin → (optional) setup_totp → app
//   • TOTP verify at login uses a single text input (not broken multi-box)
import { useState, useEffect, useCallback, useRef } from 'react'
import { T } from '../utils/tokens.js'
import {
  hasPIN, setPIN, verifyPIN,
  getTOTPConfig, saveTOTPConfig, generateTOTPSecret, getTOTPQRUrl, getTOTPQRUrlFallback, getTOTPUri, verifyTOTP,
  isDeviceTrusted, trustDevice,
  createSession, saveAuthConfig,
} from '../lib/auth.js'

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  logo:  { fontFamily:"'Cormorant Garamond',serif", fontSize:28, fontWeight:600, color:'#E8C07A', letterSpacing:'0.04em' },
  sub:   { fontSize:11, color:'rgba(232,192,122,0.55)', letterSpacing:'0.18em', textTransform:'uppercase', marginTop:4 },
  card:  { background:'rgba(255,255,255,0.06)', border:'1px solid rgba(232,192,122,0.15)', borderRadius:16, padding:'32px 28px', width:'100%', maxWidth:400, boxSizing:'border-box' },
  label: { color:'rgba(232,192,122,0.7)', fontSize:11, letterSpacing:'0.12em', textTransform:'uppercase', display:'block', marginBottom:4, marginTop:18 },
  input: { width:'100%', boxSizing:'border-box', padding:'13px 14px', borderRadius:10, border:'1px solid rgba(232,192,122,0.3)', background:'rgba(255,255,255,0.07)', color:'#E8C07A', fontSize:16, outline:'none', marginTop:2, fontFamily:"'Inter',sans-serif", WebkitAppearance:'none' },
  btn:   { width:'100%', padding:'14px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#B8975A,#CFA96E)', color:'#0F2318', fontSize:14, fontWeight:700, cursor:'pointer', marginTop:14, letterSpacing:'0.04em' },
  ghost: { background:'none', border:'none', color:'rgba(232,192,122,0.55)', fontSize:12, cursor:'pointer', padding:'6px 0', textDecoration:'underline' },
  err:   { color:'#F87171', fontSize:12, marginTop:10, textAlign:'center', lineHeight:1.5 },
  ok:    { color:'#86EFAC', fontSize:12, marginTop:10, textAlign:'center' },
}

// ── Shared wrapper ─────────────────────────────────────────────────────────────
function Wrap({ children }) {
  return (
    <div style={{ minHeight:'100vh', background:`linear-gradient(145deg,#0F2318 0%,#1A3828 60%,#102820 100%)`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px 16px', fontFamily:"'Inter',sans-serif" }}>
      <div style={{ textAlign:'center', marginBottom:28 }}>
        <div style={S.logo}>Botanica Living</div>
        <div style={S.sub}>Group Command Centre</div>
      </div>
      <div style={S.card}>{children}</div>
    </div>
  )
}

// ── Heading ───────────────────────────────────────────────────────────────────
function H({ title, sub }) {
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ color:'#E8C07A', fontSize:18, fontWeight:600, marginBottom:4 }}>{title}</div>
      {sub && <div style={{ color:'rgba(232,192,122,0.55)', fontSize:12, lineHeight:1.65 }}>{sub}</div>}
    </div>
  )
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyBtn({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(() => {})
  }
  return (
    <button
      onClick={copy}
      style={{ background:'rgba(184,151,90,0.15)', border:'1px solid rgba(184,151,90,0.3)', borderRadius:7, color:'#E8C07A', fontSize:11, padding:'5px 12px', cursor:'pointer', flexShrink:0 }}
    >
      {copied ? '✓ Copied' : label}
    </button>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
export default function LoginScreen({ onAuthenticated }) {
  // Steps: null (loading) | setup_pin | setup_totp | login | totp
  const [step,          setStep]          = useState(null)
  const [pin,           setPin]           = useState('')
  const [pinConfirm,    setPinConfirm]    = useState('')
  const [totpCode,      setTotpCode]      = useState('')    // code entered by user
  const [totpSecret,    setTotpSecret]    = useState('')    // generated secret for setup
  const [error,         setError]         = useState('')
  const [working,       setWorking]       = useState(false)
  const [remember,      setRemember]      = useState(false)
  const [qrFailed,      setQrFailed]      = useState(0)    // 0=ok, 1=primary failed, 2=all failed

  const pinRef     = useRef(null)
  const confirmRef = useRef(null)
  const totpRef    = useRef(null)

  // Determine initial step
  useEffect(() => {
    setStep(hasPIN() ? 'login' : 'setup_pin')
  }, [])

  // Auto-focus on step change
  useEffect(() => {
    const t = setTimeout(() => {
      if (step === 'login')      pinRef.current?.focus()
      if (step === 'setup_pin')  pinRef.current?.focus()
      if (step === 'totp')       totpRef.current?.focus()
      if (step === 'setup_totp') totpRef.current?.focus()
    }, 80)
    return () => clearTimeout(t)
  }, [step])

  const clear = () => { setError(''); }

  // ── Enter app (after successful auth) ─────────────────────────────────────
  const enterApp = useCallback((trustThisDevice = false) => {
    saveAuthConfig({ setupComplete: true, inactivityMinutes: 30 })
    createSession()
    if (trustThisDevice) trustDevice()
    onAuthenticated()
  }, [onAuthenticated])

  // ── Skip 2FA (always available) ────────────────────────────────────────────
  const skip2FA = useCallback(() => {
    saveTOTPConfig('', false)
    enterApp(remember)
  }, [enterApp, remember])

  // ── Step 1: Create PIN ─────────────────────────────────────────────────────
  const handleSetupPIN = useCallback(async () => {
    if (pin.length < 4)   { setError('PIN must be at least 4 characters.'); return }
    if (pin !== pinConfirm) { setError('PINs do not match. Try again.'); return }
    setWorking(true); clear()
    try {
      await setPIN(pin)
      // Generate a secret ready for 2FA setup screen
      const secret = generateTOTPSecret()
      setTotpSecret(secret)
      setTotpCode('')
      setQrFailed(0)
      setStep('setup_totp')
    } catch (e) { setError(e.message) }
    setWorking(false)
  }, [pin, pinConfirm])

  // ── Step 2: Verify TOTP setup ──────────────────────────────────────────────
  const handleVerifyTOTPSetup = useCallback(async () => {
    const code = totpCode.replace(/\s/g, '')
    if (code.length !== 6) { setError('Enter the 6-digit code from your authenticator app.'); return }
    setWorking(true); clear()
    const valid = await verifyTOTP(totpSecret, code)
    if (!valid) {
      setError('Code not valid. Check your device time is correct and try again. Or tap "Skip 2FA" to enter now.')
      setWorking(false); return
    }
    saveTOTPConfig(totpSecret, true)
    enterApp(remember)
    setWorking(false)
  }, [totpCode, totpSecret, enterApp, remember])

  // ── Login: verify PIN ──────────────────────────────────────────────────────
  const handleLogin = useCallback(async () => {
    if (!pin) { setError('Enter your PIN.'); return }
    setWorking(true); clear()
    try {
      const ok = await verifyPIN(pin)
      if (!ok) { setError('Incorrect PIN.'); setWorking(false); return }
      const cfg = getTOTPConfig()
      if (cfg.enabled && !isDeviceTrusted()) {
        setTotpCode('')
        setWorking(false)
        setStep('totp')
        return
      }
      enterApp(remember)
    } catch (e) { setError(e.message) }
    setWorking(false)
  }, [pin, remember, enterApp])

  // ── Login: verify TOTP ────────────────────────────────────────────────────
  const handleLoginTOTP = useCallback(async () => {
    const code = totpCode.replace(/\s/g, '')
    if (code.length !== 6) { setError('Enter the 6-digit code.'); return }
    setWorking(true); clear()
    const { secret } = getTOTPConfig()
    const valid = await verifyTOTP(secret, code)
    if (!valid) { setError('Code incorrect or expired. Try again.'); setWorking(false); return }
    enterApp(remember)
    setWorking(false)
  }, [totpCode, remember, enterApp])

  // ── Forgot PIN ─────────────────────────────────────────────────────────────
  const handleForgotPIN = () => {
    if (!window.confirm(
      'Reset your PIN?\n\n' +
      'WARNING: All locally stored app data will be cleared on this device for security.\n' +
      'Your Supabase data (transactions, documents) is NOT affected and will reload after login.\n\n' +
      'Continue?'
    )) return
    localStorage.removeItem('bl_auth_pin')
    localStorage.removeItem('bl_auth_totp')
    localStorage.removeItem('bl_auth_trusted')
    const KEEP = ['bl_auth_config', 'bl_device_id']
    for (const key of Object.keys(localStorage)) {
      if (!KEEP.includes(key) && key.startsWith('bl_')) localStorage.removeItem(key)
    }
    sessionStorage.removeItem('bl_session')
    setPin(''); setPinConfirm(''); setError(''); setStep('setup_pin')
  }

  // ─────────────────────────────────────────────────────────────────────────
  if (step === null) return <Wrap><div style={{ color:'#E8C07A', textAlign:'center', padding:20 }}>Loading…</div></Wrap>

  // ── SETUP: Create PIN ─────────────────────────────────────────────────────
  if (step === 'setup_pin') return (
    <Wrap>
      <H title="Create Your PIN" sub="Set a PIN to protect access. Minimum 4 characters — letters, digits or symbols." />

      <label style={S.label}>New PIN</label>
      <input
        ref={pinRef}
        type="password"
        inputMode="numeric"
        placeholder="Enter PIN"
        value={pin}
        autoComplete="new-password"
        onChange={e => { setPin(e.target.value); clear() }}
        onKeyDown={e => e.key === 'Enter' && confirmRef.current?.focus()}
        style={S.input}
      />

      <label style={S.label}>Confirm PIN</label>
      <input
        ref={confirmRef}
        type="password"
        inputMode="numeric"
        placeholder="Re-enter PIN"
        value={pinConfirm}
        autoComplete="new-password"
        onChange={e => { setPinConfirm(e.target.value); clear() }}
        onKeyDown={e => e.key === 'Enter' && handleSetupPIN()}
        style={S.input}
      />

      {error && <div style={S.err}>⚠ {error}</div>}

      <button style={S.btn} onClick={handleSetupPIN} disabled={working || pin.length < 4}>
        {working ? 'Setting up…' : 'Create PIN & Continue →'}
      </button>

      <div style={{ marginTop:14, fontSize:11, color:'rgba(232,192,122,0.45)', textAlign:'center', lineHeight:1.5 }}>
        Next step: optional 2FA setup. You can skip 2FA and enter the app immediately.
      </div>
    </Wrap>
  )

  // ── SETUP: 2FA (optional) ─────────────────────────────────────────────────
  // ── SETUP: 2FA (optional) ─────────────────────────────────────────────────
  if (step === 'setup_totp') {
    const manualUri = getTOTPUri(totpSecret, 'BotanicaLiving')
    // Try primary QR service; fallback and retry cycle through alternatives
    const QR_SOURCES = [
      getTOTPQRUrl(totpSecret, 'BotanicaLiving'),
      getTOTPQRUrlFallback(totpSecret, 'BotanicaLiving'),
    ]
    const qrSrc = qrFailed === 1 ? QR_SOURCES[1] : QR_SOURCES[0]
    const showImg = qrFailed < 2   // hide image entirely only after both sources fail

    return (
      <Wrap>
        <H
          title="Set Up 2FA (Optional)"
          sub="Scan the QR code with Google Authenticator or Authy. 2FA is optional — tap Skip to enter the app now."
        />

        {/* QR image with fallback chain */}
        <div style={{ textAlign:'center', marginBottom:14 }}>
          {showImg ? (
            <>
              <img
                key={qrSrc}
                src={qrSrc}
                alt="Scan this QR code in Google Authenticator"
                style={{ width:190, height:190, borderRadius:10, background:'#fff', padding:6, display:'block', margin:'0 auto 8px' }}
                onError={() => setQrFailed(prev => (prev || 0) + 1)}
              />
              <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
                <button
                  style={{ ...S.ghost, fontSize:11 }}
                  onClick={() => setQrFailed(0)}
                >
                  ↺ Retry QR image
                </button>
                <button
                  style={{ ...S.ghost, fontSize:11 }}
                  onClick={() => {
                    const s = generateTOTPSecret()
                    setTotpSecret(s)
                    setTotpCode('')
                    setQrFailed(0)
                    setError('')
                  }}
                >
                  ⟳ Generate new QR / key
                </button>
              </div>
            </>
          ) : (
            <div style={{ padding:'12px 14px', background:'rgba(185,28,28,0.1)', border:'1px solid rgba(185,28,28,0.25)', borderRadius:10, marginBottom:8, fontSize:12, color:'#F87171' }}>
              QR image could not load from any source.
              Use the manual setup key below — it works the same way.
              <div style={{ marginTop:8 }}>
                <button
                  style={{ ...S.ghost, fontSize:11, color:'#F87171' }}
                  onClick={() => {
                    const s = generateTOTPSecret()
                    setTotpSecret(s)
                    setTotpCode('')
                    setQrFailed(0)
                    setError('')
                  }}
                >
                  ⟳ Generate new key and retry
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Manual setup key — always visible, not hidden in details */}
        <div style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(232,192,122,0.2)', borderRadius:10, padding:'12px 14px', marginBottom:10 }}>
          <div style={{ fontSize:10, color:'rgba(232,192,122,0.55)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:8 }}>
            Manual setup key — use this if QR scan fails
          </div>
          <div style={{ fontSize:11, color:'rgba(232,192,122,0.6)', marginBottom:8, lineHeight:1.5 }}>
            In Google Authenticator: tap <strong style={{color:'#E8C07A'}}>+</strong> → <strong style={{color:'#E8C07A'}}>Enter a setup key</strong> → Account: <em>BotanicaLiving</em> → Key: paste below → Type: Time-based
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <code style={{ fontSize:14, color:'#E8C07A', letterSpacing:'0.15em', wordBreak:'break-all', flex:1, fontFamily:'monospace', lineHeight:1.8 }}>
              {totpSecret.match(/.{1,4}/g)?.join(' ')}
            </code>
            <CopyBtn text={totpSecret} label="Copy" />
          </div>
        </div>

        {/* Full URI — collapsed but copyable */}
        <details style={{ marginBottom:12 }}>
          <summary style={{ fontSize:11, color:'rgba(232,192,122,0.4)', cursor:'pointer', userSelect:'none' }}>
            Show full otpauth:// URI (for other apps)
          </summary>
          <div style={{ display:'flex', gap:8, alignItems:'flex-start', marginTop:6 }}>
            <code style={{ fontSize:10, color:'rgba(232,192,122,0.45)', wordBreak:'break-all', flex:1, fontFamily:'monospace', lineHeight:1.65 }}>{manualUri}</code>
            <CopyBtn text={manualUri} label="Copy" />
          </div>
        </details>

        {/* Code verification */}
        <label style={S.label}>Enter 6-digit code from your authenticator app</label>
        <input
          ref={totpRef}
          type="text"
          inputMode="numeric"
          placeholder="000000"
          value={totpCode}
          maxLength={7}
          autoComplete="one-time-code"
          onChange={e => { setTotpCode(e.target.value.replace(/\D/g, '')); clear() }}
          onKeyDown={e => e.key === 'Enter' && handleVerifyTOTPSetup()}
          style={{ ...S.input, textAlign:'center', letterSpacing:'0.3em', fontSize:22 }}
        />

        {/* Trusted device */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:12 }}>
          <input
            type="checkbox" id="trust-s" checked={remember}
            onChange={e => setRemember(e.target.checked)}
            style={{ accentColor:'#B8975A', width:15, height:15 }}
          />
          <label htmlFor="trust-s" style={{ color:'rgba(232,192,122,0.65)', fontSize:12, cursor:'pointer' }}>
            Trust this device (skip 2FA on next login here)
          </label>
        </div>

        {error && <div style={S.err}>⚠ {error}</div>}

        <button
          style={S.btn}
          onClick={handleVerifyTOTPSetup}
          disabled={working || totpCode.replace(/\D/g, '').length !== 6}
        >
          {working ? 'Verifying…' : 'Verify & Enable 2FA'}
        </button>

        {/* Skip — always prominent */}
        <button
          style={{ ...S.btn, background:'transparent', color:'#E8C07A', border:'1px solid rgba(232,192,122,0.3)', marginTop:8 }}
          onClick={skip2FA}
        >
          Skip 2FA — Enter App Now
        </button>

        <div style={{ marginTop:10, fontSize:11, color:'rgba(232,192,122,0.38)', textAlign:'center', lineHeight:1.5 }}>
          You can enable 2FA at any time from Settings → Security.
        </div>
      </Wrap>
    )
  }

  // ── LOGIN: PIN ────────────────────────────────────────────────────────────
  if (step === 'login') return (
    <Wrap>
      <H title="Welcome Back" sub="Enter your PIN to access the Command Centre." />

      <label style={S.label}>PIN</label>
      <input
        ref={pinRef}
        type="password"
        inputMode="numeric"
        placeholder="Enter PIN"
        value={pin}
        autoComplete="current-password"
        onChange={e => { setPin(e.target.value); clear() }}
        onKeyDown={e => e.key === 'Enter' && handleLogin()}
        style={S.input}
      />

      <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:14 }}>
        <input type="checkbox" id="trust-l" checked={remember} onChange={e => setRemember(e.target.checked)} style={{ accentColor:'#B8975A', width:15, height:15 }} />
        <label htmlFor="trust-l" style={{ color:'rgba(232,192,122,0.6)', fontSize:12, cursor:'pointer' }}>Trust this device (skip 2FA)</label>
      </div>

      {error && <div style={S.err}>⚠ {error}</div>}

      <button style={S.btn} onClick={handleLogin} disabled={working || !pin}>
        {working ? 'Checking…' : 'Enter App'}
      </button>

      <div style={{ textAlign:'center', marginTop:14 }}>
        <button style={S.ghost} onClick={handleForgotPIN}>Forgot PIN? Reset</button>
      </div>
    </Wrap>
  )

  // ── LOGIN: TOTP ───────────────────────────────────────────────────────────
  if (step === 'totp') return (
    <Wrap>
      <H title="Two-Factor Authentication" sub="Enter the 6-digit code from your authenticator app (Google Authenticator, Authy, etc.)." />

      <label style={S.label}>6-digit code</label>
      <input
        ref={totpRef}
        type="text"
        inputMode="numeric"
        placeholder="000000"
        value={totpCode}
        maxLength={7}
        autoComplete="one-time-code"
        onChange={e => { setTotpCode(e.target.value.replace(/\D/g,'')); clear() }}
        onKeyDown={e => e.key === 'Enter' && handleLoginTOTP()}
        style={{ ...S.input, textAlign:'center', letterSpacing:'0.3em', fontSize:22 }}
      />

      <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:14 }}>
        <input type="checkbox" id="trust-t" checked={remember} onChange={e => setRemember(e.target.checked)} style={{ accentColor:'#B8975A', width:15, height:15 }} />
        <label htmlFor="trust-t" style={{ color:'rgba(232,192,122,0.6)', fontSize:12, cursor:'pointer' }}>Trust this device</label>
      </div>

      {error && <div style={S.err}>⚠ {error}</div>}

      <button style={S.btn} onClick={handleLoginTOTP} disabled={working || totpCode.replace(/\D/g,'').length !== 6}>
        {working ? 'Verifying…' : 'Confirm'}
      </button>

      <div style={{ textAlign:'center', marginTop:10 }}>
        <button style={S.ghost} onClick={() => { setStep('login'); setTotpCode(''); setPin(''); clear() }}>← Back to PIN</button>
      </div>
    </Wrap>
  )

  return null
}
