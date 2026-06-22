// ── BOTANICA LIVING GROUP — DESIGN TOKENS v2.4 ───────────────────────────────
// Dark forest · Glassmorphism · Gold accents · Premium modern
// Color palette from visual brief: #0F1A14 · #171C18 · #1F2B21 · #2E4A34 · #A7C69A · #D4AF37 · #F7F8F7

export const T = {
  // ── Core brand — dark forest base ───────────────────────────────────────────
  forest:      '#0F1A14',   // deepest — body bg, sidebar base
  forestMid:   '#171C18',   // cards on dark bg
  forestLight: '#1F2B21',   // elevated surfaces
  forestBright:'#2E4A34',   // hover states, active accents
  forestGlow:  '#3D6B47',   // glow accents, subtle highlights
  sage:        '#A7C69A',   // mid sage — icon tints, subtle text

  // ── Backgrounds ─────────────────────────────────────────────────────────────
  cream:       '#0F1A14',   // main background (dark mode)
  creamDeep:   '#0B1410',   // deeper bg layer
  beige:       '#171C18',   // card surfaces
  beigeDeep:   'rgba(255,255,255,0.06)',  // borders

  // ── Gold accents ─────────────────────────────────────────────────────────────
  gold:        '#D4AF37',   // primary gold from brief
  goldLight:   '#E4C84A',   // lighter gold
  goldBright:  '#F0D060',   // bright highlight gold
  goldPale:    'rgba(212,175,55,0.12)',
  goldGlow:    'rgba(212,175,55,0.22)',

  // ── Text — light on dark ──────────────────────────────────────────────────────
  text:        '#F7F8F7',   // primary — near white from brief
  textMid:     '#A7C69A',   // secondary — sage green
  textLight:   'rgba(247,248,247,0.45)',  // muted
  textMuted:   'rgba(247,248,247,0.22)',  // placeholder
  white:       '#FFFFFF',

  // ── Finance semantic colours ─────────────────────────────────────────────────
  teal:        '#4ECDC4',   // receivables / investment
  tealPale:    'rgba(78,205,196,0.12)',
  tealGlow:    'rgba(78,205,196,0.22)',
  green:       '#6EE8A0',   // income / positive
  greenPale:   'rgba(110,232,160,0.12)',
  greenGlow:   'rgba(110,232,160,0.22)',
  red:         '#FF6B6B',   // expenses
  redPale:     'rgba(255,107,107,0.12)',
  redGlow:     'rgba(255,107,107,0.22)',
  danger:      '#FF4444',

  // ── Semantic ─────────────────────────────────────────────────────────────────
  blue:        '#60A5FA',
  bluePale:    'rgba(96,165,250,0.12)',
  purple:      '#A78BFA',
  purplePale:  'rgba(167,139,250,0.12)',

  // ── Glassmorphism layers (dark base from brief) ───────────────────────────────
  // Background: rgba(15,26,20, 0.6–0.75) · Border: 1px solid rgba(255,255,255,0.06–0.1)
  glass:       'rgba(15,26,20,0.65)',
  glassLight:  'rgba(30,50,35,0.55)',
  glassCard:   'rgba(23,28,24,0.80)',
  glassHover:  'rgba(46,74,52,0.60)',
  glassDark:   'rgba(11,20,16,0.85)',
  glassBorder: 'rgba(255,255,255,0.08)',
  glassBorderSubtle: 'rgba(255,255,255,0.05)',
  glassBorderGold: 'rgba(212,175,55,0.20)',
}

export default T
