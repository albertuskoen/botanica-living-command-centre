export const ZAR    = (n) => n != null && !isNaN(n) ? `R ${Number(n).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2})}` : 'R 0.00'
export const USD    = (n) => n != null ? `$${Number(n).toFixed(2)}` : '$0.00'
export const pct    = (n) => `${Number(n).toFixed(1)}%`
export const R2     = (n,d=2) => typeof n==='number' ? n.toFixed(d) : '–'
export const nextId = (arr) => arr.length ? Math.max(...arr.map(x=>x.id))+1 : 1
export const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-ZA',{day:'2-digit',month:'short',year:'numeric'}) : '–'
export const today  = () => new Date().toISOString().split('T')[0]
