// ── FORMAT HELPERS ─────────────────────────────────────────────────────────────

export const ZAR    = n => n!=null&&!isNaN(n) ? `R\u202F${Number(n).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2})}` : 'R\u202F0.00'
export const USD    = n => n!=null ? `$${Number(n).toFixed(2)}` : '$0.00'
export const pct    = n => `${Number(n).toFixed(1)}%`
export const R2     = (n,d=2) => typeof n==='number' ? n.toFixed(d) : '–'
export const nextId = arr => arr.length ? Math.max(...arr.map(x=>x.id))+1 : 1
export const fmtDate = d => d ? new Date(d).toLocaleDateString('en-ZA',{day:'2-digit',month:'short',year:'numeric'}) : '–'
export const today   = () => new Date().toISOString().split('T')[0]
export const clamp   = (n,lo,hi) => Math.min(hi,Math.max(lo,n))

// ── SMART NUMBER INPUT HELPERS ─────────────────────────────────────────────────
// Bug 3 fix: controlled text inputs that don't fight the user.
// Usage:
//   const [raw, setRaw] = useNumericInput(0)          // raw string state
//   <input value={raw} onChange={e=>setRaw(e.target.value)} onBlur={…} />
//   const parsed = parseNum(raw)                       // number for calculations

// parseNum: convert raw string → number, return 0 if empty/invalid
export const parseNum = str => {
  if (str === '' || str === null || str === undefined) return 0
  const n = parseFloat(String(str).replace(/[^0-9.-]/g,''))
  return isNaN(n) ? 0 : n
}

// fmtNum: format number for display in a text field on blur
// shows '' when 0 (so field appears empty on focus), otherwise 2dp
export const fmtNum = (n, allowEmpty=true) => {
  const v = Number(n)
  if (allowEmpty && v === 0) return ''
  return isNaN(v) ? '' : v.toFixed(2).replace(/\.00$/,'')
}

// A simple hook-like factory: given a raw state value and setter,
// returns { value, onChange, onBlur } props for an <input>
export function numProps(raw, setRaw, onBlur) {
  return {
    value: raw,
    onChange: e => setRaw(e.target.value),
    onBlur: e => {
      const n = parseNum(e.target.value)
      setRaw(n === 0 ? '' : String(n))
      if (onBlur) onBlur(n)
    },
  }
}
