// format.js — v1.4 Production hardened
// All helpers are null/undefined/NaN safe

// ── Currency / number display ──────────────────────────────────────────────────
export const ZAR = n => {
  const v = Number(n)
  if (n == null || isNaN(v)) return 'R\u202F0.00'
  return `R\u202F${v.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export const USD = n => {
  const v = Number(n)
  if (n == null || isNaN(v)) return '$0.00'
  return `$${v.toFixed(2)}`
}

export const pct = n => {
  const v = Number(n)
  return `${isNaN(v) ? '0.0' : Math.max(0, Math.min(100, v)).toFixed(1)}%`
}

export const R2 = (n, d = 2) => {
  const v = typeof n === 'number' ? n : Number(n)
  return isNaN(v) ? '–' : v.toFixed(d)
}

// ── ID generation — safe on empty arrays and arrays with non-numeric ids ───────
export const nextId = arr => {
  if (!Array.isArray(arr) || arr.length === 0) return 1
  const ids = arr.map(x => Number(x?.id)).filter(n => !isNaN(n))
  return ids.length === 0 ? 1 : Math.max(...ids) + 1
}

// ── Date helpers ───────────────────────────────────────────────────────────────
export const fmtDate = d => {
  if (!d) return '–'
  try {
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return '–'
    return dt.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return '–' }
}

export const today = () => {
  try { return new Date().toISOString().split('T')[0] }
  catch { return '2026-01-01' }
}

export const clamp = (n, lo, hi) => {
  const v = Number(n)
  return isNaN(v) ? lo : Math.min(hi, Math.max(lo, v))
}

// ── Smart number input helpers (Bug 3) ────────────────────────────────────────
// parseNum: raw input string → number, 0 on empty/invalid
export const parseNum = str => {
  if (str === '' || str == null) return 0
  const n = parseFloat(String(str).replace(/[^0-9.-]/g, ''))
  return isNaN(n) ? 0 : n
}

// fmtNum: number → display string for text inputs, '' when 0
export const fmtNum = (n, allowEmpty = true) => {
  const v = Number(n)
  if (allowEmpty && (v === 0 || isNaN(v))) return ''
  return isNaN(v) ? '' : v.toFixed(2).replace(/\.00$/, '')
}

// safeAmount: ensure a stored amount is always a valid finite number
export const safeAmount = n => {
  const v = parseFloat(n)
  return isFinite(v) && !isNaN(v) ? v : 0
}

// ── String safety ──────────────────────────────────────────────────────────────
export const safeStr   = (v, fallback = '') => (typeof v === 'string' ? v : String(v ?? fallback))
export const truncate  = (s, n = 80) => { const str = safeStr(s); return str.length > n ? str.slice(0, n) + '…' : str }
