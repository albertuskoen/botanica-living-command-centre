export const R      = (n, d = 2) => typeof n === 'number' ? n.toFixed(d) : '–'
export const ZAR    = (n) => n != null && !isNaN(n) ? `R ${Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '–'
export const USD    = (n) => n != null ? `$${Number(n).toFixed(2)}` : '–'
export const pct    = (n) => `${Number(n).toFixed(1)}%`
export const nextId = (arr) => arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1
