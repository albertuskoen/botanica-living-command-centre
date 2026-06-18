import { T } from './tokens.js'

// ── BOTANICA LIVING GROUP — GLOBAL STYLES v1.3 ───────────────────────────────
// Premium executive operating system UI
// Inspired by: Apple Vision Pro · Tesla · Linear · Arc · Stripe

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Inter:wght@300;400;500;600;700&display=swap');

  /* ─── RESET ────────────────────────────────────────────────────────────────── */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; scroll-behavior: smooth; }

  /* ─── DESIGN TOKENS (CSS vars) ──────────────────────────────────────────────── */
  :root {
    --sw: 268px;
    --r4:  6px;   --r8:  10px;  --r12: 14px;
    --r16: 18px;  --r24: 24px;  --r32: 32px;
    --sh1: 0 1px  4px rgba(15,35,24,0.06), 0 2px  8px rgba(15,35,24,0.04);
    --sh2: 0 4px 16px rgba(15,35,24,0.08), 0 2px  6px rgba(15,35,24,0.04);
    --sh3: 0 8px 32px rgba(15,35,24,0.12), 0 4px 12px rgba(15,35,24,0.06);
    --sh4: 0 16px 56px rgba(15,35,24,0.16), 0 8px 20px rgba(15,35,24,0.08);
    --shg: 0 0 0 3px rgba(184,151,90,0.22);
    --glass-bg:  rgba(255,255,255,0.66);
    --glass-bd:  rgba(255,255,255,0.36);
    --glass-blr: blur(28px) saturate(190%) brightness(102%);
    --ease: cubic-bezier(0.22,1,0.36,1);
    --t1: 0.14s var(--ease);
    --t2: 0.22s var(--ease);
    --t3: 0.36s var(--ease);
  }

  /* ─── BASE ──────────────────────────────────────────────────────────────────── */
  body {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 14px; line-height: 1.6; color: ${T.text};
    background: ${T.cream};
    background-image:
      radial-gradient(ellipse 70% 40% at 15% 0%,  rgba(45,90,61,0.07)  0%, transparent 55%),
      radial-gradient(ellipse 55% 35% at 85% 100%, rgba(184,151,90,0.06) 0%, transparent 50%),
      radial-gradient(ellipse 40% 60% at 50% 50%,  rgba(244,239,230,0.3) 0%, transparent 70%);
    min-height: 100vh;
  }
  .app { display: flex; min-height: 100vh; }

  /* ─── SIDEBAR ───────────────────────────────────────────────────────────────── */
  .sidebar {
    width: var(--sw);
    background: ${T.forest};
    background-image: linear-gradient(175deg, #162C1E 0%, ${T.forest} 40%, #080F0B 100%);
    display: flex; flex-direction: column;
    position: fixed; inset: 0 auto 0 0;
    z-index: 200; overflow: hidden;
    transition: width var(--t3);
    box-shadow: 2px 0 40px rgba(0,0,0,0.3), inset -1px 0 0 rgba(255,255,255,0.03);
  }
  .sidebar::before {
    content: '';
    position: absolute; inset: 0;
    background: radial-gradient(ellipse 80% 40% at 50% 0%, rgba(184,151,90,0.07) 0%, transparent 60%);
    pointer-events: none;
  }
  .sidebar-scroll { flex: 1; overflow-y: auto; overflow-x: hidden; padding-bottom: 16px; }
  .sidebar-scroll::-webkit-scrollbar { width: 0; }

  .sidebar-logo {
    padding: 26px 22px 20px;
    flex-shrink: 0;
    position: relative;
  }
  .sidebar-logo::after {
    content: '';
    position: absolute; bottom: 0; left: 22px; right: 22px; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(184,151,90,0.28), transparent);
  }
  .logo-mark {
    display: flex; align-items: center; gap: 10px; margin-bottom: 8px;
  }
  .logo-gem {
    width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
    background: linear-gradient(135deg, rgba(184,151,90,0.3), rgba(184,151,90,0.12));
    border: 1px solid rgba(184,151,90,0.25);
    display: flex; align-items: center; justify-content: center;
    font-size: 15px; color: ${T.goldLight};
    box-shadow: 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1);
  }
  .logo-text .wordmark {
    font-family: 'Cormorant Garamond', serif;
    font-size: 15px; font-weight: 600; color: ${T.goldLight};
    letter-spacing: 0.08em; line-height: 1.2;
    display: block;
  }
  .logo-text .sub {
    font-size: 9px; letter-spacing: 0.22em; text-transform: uppercase;
    color: rgba(255,255,255,0.25); display: block; margin-top: 1px;
  }
  .logo-reg {
    font-size: 9px; color: rgba(255,255,255,0.14);
    letter-spacing: 0.03em;
  }

  .nav-section {
    padding: 18px 14px 4px;
  }
  .nav-section-label {
    font-size: 9px; letter-spacing: 0.28em; text-transform: uppercase;
    color: rgba(255,255,255,0.18); font-weight: 700; padding: 0 8px;
  }
  .nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 12px; margin: 2px 0;
    border-radius: var(--r8);
    cursor: pointer;
    color: rgba(255,255,255,0.45);
    font-size: 13px; font-weight: 400;
    transition: all var(--t2);
    position: relative;
    user-select: none;
  }
  .nav-item:hover {
    color: rgba(255,255,255,0.9);
    background: rgba(255,255,255,0.06);
  }
  .nav-item.active {
    color: ${T.goldBright};
    background: linear-gradient(135deg, rgba(184,151,90,0.2), rgba(184,151,90,0.08));
    font-weight: 600;
    box-shadow: inset 0 0 0 1px rgba(184,151,90,0.22), var(--sh1);
  }
  .nav-item.active::before {
    content: '';
    position: absolute; right: -14px; top: 50%;
    transform: translateY(-50%);
    width: 3px; height: 20px;
    background: linear-gradient(180deg, ${T.goldBright}, ${T.gold});
    border-radius: 2px 0 0 2px;
    box-shadow: 0 0 12px rgba(232,192,122,0.5);
  }
  .nav-icon {
    width: 28px; height: 28px; border-radius: var(--r4);
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; flex-shrink: 0;
    transition: all var(--t2);
  }
  .nav-item.active .nav-icon {
    background: rgba(184,151,90,0.2);
    color: ${T.goldBright};
  }
  .nav-label { flex: 1; }

  .sidebar-footer {
    padding: 14px 22px; flex-shrink: 0;
    border-top: 1px solid rgba(255,255,255,0.05);
    font-size: 10px; color: rgba(255,255,255,0.18);
  }
  .sidebar-version { font-size: 9px; color: rgba(255,255,255,0.1); margin-top: 2px; }

  /* ─── MAIN CONTENT ──────────────────────────────────────────────────────────── */
  .main { margin-left: var(--sw); flex: 1; min-height: 100vh; display: flex; flex-direction: column; }

  .page-header {
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blr);
    -webkit-backdrop-filter: var(--glass-blr);
    border-bottom: 1px solid var(--glass-bd);
    padding: 22px 36px 18px;
    display: flex; align-items: flex-end; justify-content: space-between;
    gap: 16px; flex-wrap: wrap;
    position: sticky; top: 0; z-index: 50;
    box-shadow: var(--sh1);
  }
  .page-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 30px; font-weight: 300; color: ${T.forest};
    letter-spacing: -0.02em; line-height: 1;
  }
  .page-subtitle {
    font-size: 11px; color: ${T.textLight}; letter-spacing: 0.12em;
    text-transform: uppercase; margin-top: 4px; font-weight: 500;
  }
  .page-content { padding: 28px 36px; flex: 1; }

  /* ─── GLASS CARDS ───────────────────────────────────────────────────────────── */
  .g-card {
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blr);
    -webkit-backdrop-filter: var(--glass-blr);
    border: 1px solid var(--glass-bd);
    border-radius: var(--r16);
    padding: 22px;
    box-shadow: var(--sh2);
    transition: box-shadow var(--t2), transform var(--t2);
    position: relative; overflow: hidden;
  }
  .g-card::before {
    content: '';
    position: absolute; inset: 0; border-radius: inherit;
    background: linear-gradient(145deg, rgba(255,255,255,0.35) 0%, transparent 55%);
    pointer-events: none;
  }
  .g-card:hover { box-shadow: var(--sh3); }
  .g-card-click:hover { transform: translateY(-2px); cursor: pointer; }

  .g-card-dark {
    background: linear-gradient(145deg, ${T.forest} 0%, #0A1A10 100%);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: var(--r16); padding: 22px;
    box-shadow: var(--sh3); color: ${T.white}; position: relative; overflow: hidden;
  }
  .g-card-dark::before {
    content: '';
    position: absolute; inset: 0;
    background: radial-gradient(ellipse 80% 60% at 80% 0%, rgba(184,151,90,0.09) 0%, transparent 60%);
    pointer-events: none;
  }

  /* stat card with coloured top line */
  .stat-card {
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blr); -webkit-backdrop-filter: var(--glass-blr);
    border: 1px solid var(--glass-bd);
    border-radius: var(--r12); padding: 18px 20px;
    position: relative; overflow: hidden;
    box-shadow: var(--sh1);
    transition: all var(--t2); cursor: pointer;
  }
  .stat-card::before {
    content: ''; position: absolute; inset: 0; border-radius: inherit;
    background: linear-gradient(145deg, rgba(255,255,255,0.4) 0%, transparent 60%);
    pointer-events: none;
  }
  .stat-card:hover { box-shadow: var(--sh3); transform: translateY(-2px); }
  .stat-top { height: 2px; border-radius: 2px; margin-bottom: 14px; }
  .stat-label { font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: ${T.textLight}; font-weight: 600; margin-bottom: 8px; }
  .stat-value { font-family: 'Cormorant Garamond', serif; font-size: 26px; font-weight: 300; line-height: 1; letter-spacing: -0.01em; }
  .stat-sub { font-size: 11px; color: ${T.textMid}; margin-top: 7px; }

  /* ─── HEALTH SCORE RING ──────────────────────────────────────────────────────── */
  .ring-wrap { position: relative; flex-shrink: 0; }
  .ring-svg  { transform: rotate(-90deg); display: block; }
  .ring-bg   { fill: none; stroke: rgba(210,200,184,0.3); }
  .ring-fg   { fill: none; stroke-linecap: round; transition: stroke-dashoffset 1s var(--ease); }
  .ring-text {
    position: absolute; inset: 0;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
  }
  .ring-num  { font-family: 'Cormorant Garamond', serif; font-weight: 400; line-height: 1; }
  .ring-unit { font-size: 9px; color: ${T.textLight}; letter-spacing: 0.06em; margin-top: 1px; }

  /* ─── KPI HERO CARDS ─────────────────────────────────────────────────────────── */
  .kpi-row { display: grid; gap: 14px; }
  .kpi-card {
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blr); -webkit-backdrop-filter: var(--glass-blr);
    border: 1px solid var(--glass-bd);
    border-radius: var(--r16); padding: 22px 24px;
    position: relative; overflow: hidden;
    box-shadow: var(--sh2);
    transition: all 0.24s var(--ease);
    cursor: pointer;
  }
  .kpi-card::before {
    content: ''; position: absolute; top: -30%; right: -10%; width: 120%; height: 120%;
    background: radial-gradient(ellipse, rgba(255,255,255,0.22) 0%, transparent 60%);
    pointer-events: none;
  }
  .kpi-card:hover { transform: translateY(-3px); box-shadow: var(--sh4); }
  .kpi-chip {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 700;
    letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 14px;
  }
  .kpi-amount {
    font-family: 'Cormorant Garamond', serif;
    font-size: 32px; font-weight: 300; line-height: 1;
    letter-spacing: -0.02em; margin-bottom: 8px;
  }
  .kpi-label { font-size: 12px; color: ${T.textMid}; }
  .kpi-bar { height: 3px; background: rgba(210,200,184,0.3); border-radius: 3px; overflow: hidden; margin-top: 14px; }
  .kpi-bar-fill { height: 100%; border-radius: 3px; transition: width 0.8s var(--ease); }

  /* ─── COMPANY BANNER ─────────────────────────────────────────────────────────── */
  .company-banner {
    background: linear-gradient(145deg, ${T.forest} 0%, #0D2218 55%, #070E0A 100%);
    border-radius: var(--r24); padding: 28px 32px;
    position: relative; overflow: hidden;
    box-shadow: var(--sh4);
    border: 1px solid rgba(255,255,255,0.04);
  }
  .company-banner::before {
    content: ''; position: absolute; inset: 0;
    background:
      radial-gradient(ellipse 60% 80% at 85% 50%, rgba(184,151,90,0.1) 0%, transparent 65%),
      radial-gradient(ellipse 40% 40% at 20% 20%, rgba(45,90,61,0.15) 0%, transparent 50%);
    pointer-events: none;
  }
  .banner-gem {
    position: absolute; right: 32px; top: 50%; transform: translateY(-50%);
    font-size: 72px; color: rgba(184,151,90,0.05); pointer-events: none;
    font-family: serif;
  }

  /* ─── BADGES ─────────────────────────────────────────────────────────────────── */
  .badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 10px; border-radius: 20px;
    font-size: 11px; font-weight: 600; letter-spacing: 0.04em;
  }
  .badge-forest { background: rgba(45,90,61,0.18); color: ${T.forestGlow}; border: 1px solid rgba(45,90,61,0.2); }
  .badge-gold   { background: ${T.goldPale}; color: ${T.gold}; border: 1px solid rgba(184,151,90,0.22); }
  .badge-grey   { background: rgba(161,161,170,0.12); color: ${T.textMid}; border: 1px solid rgba(161,161,170,0.18); }
  .badge-red    { background: ${T.redPale}; color: ${T.danger}; border: 1px solid rgba(185,28,28,0.15); }
  .badge-teal   { background: ${T.tealPale}; color: ${T.teal}; border: 1px solid rgba(14,116,144,0.18); }
  .badge-green  { background: ${T.greenPale}; color: ${T.green}; border: 1px solid rgba(21,128,61,0.18); }
  .badge-blue   { background: ${T.bluePale}; color: ${T.blue}; border: 1px solid rgba(29,78,216,0.18); }

  /* ─── FINANCE KPI colours ──────────────────────────────────────────────────── */
  .fc-inv { color: ${T.teal}; }
  .fc-inc { color: ${T.green}; }
  .fc-exp { color: ${T.red}; }
  .fc-rem { color: ${T.gold}; }
  .fc-net { color: ${T.forest}; }
  .border-inv { border-top: 2px solid ${T.teal} !important; }
  .border-inc { border-top: 2px solid ${T.green} !important; }
  .border-exp { border-top: 2px solid ${T.red} !important; }
  .border-rem { border-top: 2px solid ${T.gold} !important; }
  .border-net { border-top: 2px solid ${T.forestLight} !important; }

  /* ─── PRIORITY BADGES ────────────────────────────────────────────────────────── */
  .pri-critical { background: ${T.redPale};    color: ${T.danger};      border: 1px solid rgba(185,28,28,0.15); }
  .pri-high     { background: rgba(184,151,90,0.12); color: #92650A; border: 1px solid rgba(184,151,90,0.22); }
  .pri-medium   { background: ${T.greenPale};  color: ${T.green};       border: 1px solid rgba(21,128,61,0.18); }
  .pri-low      { background: rgba(161,161,170,0.1); color: ${T.textMid}; border: 1px solid rgba(161,161,170,0.15); }

  /* ─── GRID HELPERS ──────────────────────────────────────────────────────────── */
  .grid-2 { display: grid; grid-template-columns: repeat(2,1fr); gap: 16px; }
  .grid-3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
  .grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; }
  .grid-5 { display: grid; grid-template-columns: repeat(5,1fr); gap: 14px; }
  .g8  { gap:  8px !important; }
  .g12 { gap: 12px !important; }
  .g16 { gap: 16px !important; }
  .g20 { gap: 20px !important; }
  .g24 { gap: 24px !important; }

  /* ─── TABLE ──────────────────────────────────────────────────────────────────── */
  .table-wrap { overflow-x: auto; border-radius: var(--r12); }
  table { width: 100%; border-collapse: collapse; }
  th {
    text-align: left; font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase;
    color: ${T.textLight}; padding: 11px 16px;
    border-bottom: 1px solid ${T.beigeDeep};
    background: rgba(228,221,208,0.55);
    font-weight: 700; white-space: nowrap;
    backdrop-filter: blur(8px);
  }
  th:first-child { border-radius: var(--r8) 0 0 0; }
  th:last-child  { border-radius: 0 var(--r8) 0 0; }
  td { padding: 12px 16px; border-bottom: 1px solid rgba(210,200,184,0.4); font-size: 13px; vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr { transition: background var(--t1); }
  tr:hover td { background: rgba(255,255,255,0.6); }
  .td-name { font-weight: 600; color: ${T.forest}; }
  .td-num  { font-family: 'Cormorant Garamond', serif; font-size: 16px; color: ${T.forestLight}; }

  /* ─── BUTTONS ────────────────────────────────────────────────────────────────── */
  .btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 9px 18px; border-radius: var(--r8);
    font-size: 13px; font-weight: 600; letter-spacing: 0.01em;
    cursor: pointer; border: none;
    transition: all var(--t2); font-family: 'Inter', sans-serif;
    white-space: nowrap; user-select: none;
  }
  .btn:active { transform: scale(0.98); }
  .btn-primary {
    background: linear-gradient(145deg, ${T.forestLight}, ${T.forest});
    color: ${T.goldBright}; box-shadow: var(--sh2), 0 0 0 0 rgba(184,151,90,0);
  }
  .btn-primary:hover { box-shadow: var(--sh3), 0 0 20px rgba(15,35,24,0.2); transform: translateY(-1px); }
  .btn-gold {
    background: linear-gradient(145deg, ${T.goldBright}, ${T.gold});
    color: ${T.white}; box-shadow: var(--sh2);
  }
  .btn-gold:hover { box-shadow: var(--sh3), 0 0 20px rgba(184,151,90,0.25); transform: translateY(-1px); }
  .btn-outline {
    background: var(--glass-bg); backdrop-filter: blur(12px);
    border: 1px solid ${T.beigeDeep}; color: ${T.textMid};
  }
  .btn-outline:hover { border-color: ${T.gold}; color: ${T.forest}; background: rgba(255,255,255,0.85); }
  .btn-ghost { background: transparent; color: ${T.textMid}; }
  .btn-ghost:hover { background: rgba(0,0,0,0.05); color: ${T.text}; }
  .btn-danger { background: ${T.danger}; color: ${T.white}; }
  .btn-danger:hover { opacity: 0.88; }
  .btn-sm  { padding: 6px 14px; font-size: 12px; border-radius: var(--r4); }
  .btn-xs  { padding: 4px 10px; font-size: 11px; border-radius: var(--r4); }
  .btn-icon { width: 34px; height: 34px; padding: 0; justify-content: center; border-radius: var(--r8); }

  /* ─── FORMS ──────────────────────────────────────────────────────────────────── */
  .form-grid   { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
  .form-field  { display: flex; flex-direction: column; gap: 5px; }
  .form-field.full { grid-column: 1 / -1; }
  label { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: ${T.textMid}; font-weight: 600; }
  input, select, textarea {
    padding: 10px 14px; border: 1.5px solid rgba(210,200,184,0.7);
    border-radius: var(--r8); font-size: 13px; font-family: 'Inter', sans-serif;
    background: rgba(255,255,255,0.72); backdrop-filter: blur(8px);
    color: ${T.text}; outline: none; transition: all var(--t1); width: 100%;
  }
  input:focus, select:focus, textarea:focus {
    border-color: ${T.gold}; background: rgba(255,255,255,0.95);
    box-shadow: 0 0 0 3px rgba(184,151,90,0.14);
  }
  input::placeholder { color: ${T.textMuted}; }
  textarea { resize: vertical; min-height: 72px; }

  /* ─── MODAL ──────────────────────────────────────────────────────────────────── */
  .modal-overlay {
    position: fixed; inset: 0; z-index: 500;
    background: rgba(8,15,10,0.65);
    backdrop-filter: blur(8px) saturate(150%); -webkit-backdrop-filter: blur(8px) saturate(150%);
    display: flex; align-items: center; justify-content: center; padding: 16px;
    animation: ovIn 0.16s ease;
  }
  @keyframes ovIn { from { opacity: 0; } to { opacity: 1; } }
  .modal {
    background: rgba(247,243,237,0.94);
    backdrop-filter: blur(48px) saturate(220%); -webkit-backdrop-filter: blur(48px) saturate(220%);
    border: 1px solid rgba(255,255,255,0.55);
    border-radius: var(--r32); width: 720px; max-width: 100%; max-height: 92vh;
    overflow-y: auto; padding: 32px;
    box-shadow: var(--sh4), inset 0 1px 0 rgba(255,255,255,0.65);
    animation: mdIn 0.22s var(--ease);
  }
  @keyframes mdIn { from { transform: translateY(16px) scale(0.98); opacity: 0; } to { transform: none; opacity: 1; } }
  .modal-lg  { width: 880px; }
  .modal-xl  { width: 1040px; }
  .modal-header {
    display: flex; justify-content: space-between; align-items: flex-start;
    margin-bottom: 22px; padding-bottom: 18px; border-bottom: 1px solid rgba(210,200,184,0.5);
  }
  .modal-title { font-family: 'Cormorant Garamond', serif; font-size: 24px; font-weight: 400; color: ${T.forest}; }
  .modal-close {
    width: 30px; height: 30px; border-radius: 50%;
    background: rgba(161,161,170,0.12); border: none; cursor: pointer;
    color: ${T.textMid}; font-size: 14px;
    display: flex; align-items: center; justify-content: center; transition: all var(--t1);
  }
  .modal-close:hover { background: rgba(161,161,170,0.22); color: ${T.text}; }
  .modal-footer {
    display: flex; justify-content: flex-end; gap: 10px;
    margin-top: 24px; padding-top: 20px; border-top: 1px solid rgba(210,200,184,0.5);
  }

  /* ─── TABS ───────────────────────────────────────────────────────────────────── */
  .tabs {
    display: flex; gap: 2px; padding: 3px;
    background: rgba(210,200,184,0.22); border-radius: var(--r8);
    margin-bottom: 22px; overflow-x: auto; -webkit-overflow-scrolling: touch;
  }
  .tab {
    padding: 8px 18px; font-size: 13px; font-weight: 500; color: ${T.textMid};
    border-radius: var(--r8); cursor: pointer; transition: all var(--t1);
    white-space: nowrap; user-select: none;
  }
  .tab:hover { color: ${T.forest}; background: rgba(255,255,255,0.5); }
  .tab.active { color: ${T.forest}; background: ${T.white}; font-weight: 600; box-shadow: var(--sh1); }

  /* ─── PROGRESS BAR ───────────────────────────────────────────────────────────── */
  .pbar { height: 4px; background: rgba(210,200,184,0.35); border-radius: 4px; overflow: hidden; }
  .pbar-fill { height: 100%; border-radius: 4px; transition: width 0.8s var(--ease); }
  .pbar-gold   { background: linear-gradient(90deg, ${T.gold}, ${T.goldBright}); }
  .pbar-teal   { background: linear-gradient(90deg, ${T.teal}, #1A9EB8); }
  .pbar-green  { background: linear-gradient(90deg, ${T.green}, #22A864); }
  .pbar-red    { background: linear-gradient(90deg, ${T.red}, #E83333); }
  .pbar-forest { background: linear-gradient(90deg, ${T.forest}, ${T.forestLight}); }

  /* ─── INSIGHT BOX ────────────────────────────────────────────────────────────── */
  .insight-box {
    background: linear-gradient(145deg, ${T.forest} 0%, #0A1A10 100%);
    border-radius: var(--r16); padding: 26px; color: ${T.white};
    box-shadow: var(--sh4); position: relative; overflow: hidden;
    border: 1px solid rgba(255,255,255,0.04);
  }
  .insight-box::before {
    content: ''; position: absolute; top: -20%; right: -10%; width: 80%; height: 100%;
    background: radial-gradient(ellipse, rgba(184,151,90,0.12) 0%, transparent 60%); pointer-events: none;
  }
  .insight-tag  { font-size: 9px; letter-spacing: 0.26em; text-transform: uppercase; color: ${T.goldBright}; margin-bottom: 12px; font-weight: 700; position: relative; }
  .insight-text { font-size: 14px; line-height: 1.85; color: rgba(255,255,255,0.8); position: relative; }

  /* ─── QUOTE ──────────────────────────────────────────────────────────────────── */
  .quote-block {
    background: linear-gradient(145deg, ${T.forest}, #08120C);
    border-radius: var(--r16); padding: 30px; text-align: center;
    box-shadow: var(--sh4); position: relative; overflow: hidden;
    border: 1px solid rgba(255,255,255,0.04);
  }
  .quote-block::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(184,151,90,0.08), transparent 65%);
    pointer-events: none;
  }
  .quote-text { font-family: 'Cormorant Garamond', serif; font-size: 24px; font-weight: 300; font-style: italic; color: ${T.goldBright}; position: relative; }
  .quote-attr { font-size: 10px; color: rgba(255,255,255,0.28); margin-top: 10px; letter-spacing: 0.18em; text-transform: uppercase; position: relative; }

  /* ─── MILESTONE ──────────────────────────────────────────────────────────────── */
  .milestone-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(210,200,184,0.32); }
  .milestone-row:last-child { border-bottom: none; }
  .m-icon { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; }
  .m-done   { background: rgba(21,128,61,0.15); color: ${T.green}; }
  .m-prog   { background: ${T.goldPale}; color: ${T.gold}; }
  .m-future { background: rgba(161,161,170,0.1); color: ${T.textLight}; }
  .m-title  { font-weight: 500; font-size: 13px; color: ${T.text}; }
  .m-sub    { font-size: 11px; color: ${T.textLight}; margin-top: 1px; }

  /* ─── STRATEGY ───────────────────────────────────────────────────────────────── */
  .strategy-pillar {
    border-left: 2px solid ${T.gold}; padding: 15px 20px;
    background: var(--glass-bg); backdrop-filter: var(--glass-blr); -webkit-backdrop-filter: var(--glass-blr);
    border-radius: 0 var(--r8) var(--r8) 0;
    margin-bottom: 10px; box-shadow: var(--sh1); transition: all var(--t2);
  }
  .strategy-pillar:hover { box-shadow: var(--sh2); transform: translateX(2px); }
  .sp-title { font-family: 'Cormorant Garamond', serif; font-size: 18px; font-weight: 400; color: ${T.forest}; margin-bottom: 5px; }
  .sp-body  { font-size: 13px; color: ${T.textMid}; line-height: 1.75; }

  /* ─── FOUNDERS CARDS ─────────────────────────────────────────────────────────── */
  .fc-card {
    background: var(--glass-bg); backdrop-filter: var(--glass-blr); -webkit-backdrop-filter: var(--glass-blr);
    border: 1px solid var(--glass-bd); border-radius: var(--r16); padding: 20px;
    position: relative; overflow: hidden; box-shadow: var(--sh2); transition: all var(--t2);
  }
  .fc-card:hover { box-shadow: var(--sh3); transform: translateY(-2px); }
  .fc-card::before { content: '✦'; position: absolute; top: 14px; right: 14px; color: ${T.goldLight}; font-size: 11px; opacity: 0.6; }
  .fc-name { font-family: 'Cormorant Garamond', serif; font-size: 17px; font-weight: 400; color: ${T.forest}; margin-bottom: 3px; padding-right: 20px; }
  .fc-cat  { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: ${T.gold}; margin-bottom: 14px; font-weight: 600; }
  .fc-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; }
  .fc-metric { background: rgba(228,221,208,0.45); border-radius: 8px; padding: 9px 11px; }
  .fc-mlabel { font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: ${T.textLight}; font-weight: 600; }
  .fc-mvalue { font-family: 'Cormorant Garamond', serif; font-size: 16px; color: ${T.forestLight}; margin-top: 2px; }

  /* ─── PRIORITY / ACTION ITEMS ────────────────────────────────────────────────── */
  .priority-item { display: flex; align-items: flex-start; gap: 11px; padding: 11px 0; border-bottom: 1px solid rgba(210,200,184,0.32); }
  .priority-item:last-child { border-bottom: none; }
  .p-dot { width: 7px; height: 7px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; }
  .p-dot-gold  { background: ${T.gold};        box-shadow: 0 0 6px rgba(184,151,90,0.45); }
  .p-dot-green { background: ${T.forestLight}; box-shadow: 0 0 6px rgba(45,90,61,0.45); }
  .p-title { font-weight: 600; font-size: 13px; color: ${T.text}; }
  .p-desc  { font-size: 12px; color: ${T.textMid}; margin-top: 2px; line-height: 1.5; }

  /* ─── ACTION / TASK CARDS ────────────────────────────────────────────────────── */
  .action-card {
    background: var(--glass-bg); backdrop-filter: var(--glass-blr); -webkit-backdrop-filter: var(--glass-blr);
    border: 1px solid var(--glass-bd); border-radius: var(--r12);
    padding: 15px 18px; margin-bottom: 8px; transition: all var(--t2); box-shadow: var(--sh1);
  }
  .action-card:hover { box-shadow: var(--sh2); transform: translateY(-1px); }

  /* ─── DOCUMENT CARDS ─────────────────────────────────────────────────────────── */
  .doc-card {
    background: var(--glass-bg); backdrop-filter: var(--glass-blr); -webkit-backdrop-filter: var(--glass-blr);
    border: 1px solid var(--glass-bd); border-radius: var(--r12);
    padding: 16px; display: flex; align-items: flex-start; gap: 14px;
    box-shadow: var(--sh1); transition: all var(--t2); cursor: pointer;
  }
  .doc-card:hover { box-shadow: var(--sh3); transform: translateY(-1px); border-color: rgba(184,151,90,0.22); }
  .doc-icon {
    width: 42px; height: 42px; border-radius: 10px;
    background: linear-gradient(145deg, rgba(184,151,90,0.2), rgba(184,151,90,0.08));
    display: flex; align-items: center; justify-content: center;
    font-size: 19px; flex-shrink: 0; box-shadow: var(--sh1);
  }

  .doc-drop-zone {
    border: 2px dashed rgba(210,200,184,0.6); border-radius: var(--r16);
    padding: 44px 24px; text-align: center; cursor: pointer;
    transition: all var(--t2); background: rgba(255,255,255,0.25);
  }
  .doc-drop-zone:hover, .doc-drop-zone.over {
    border-color: ${T.gold}; background: rgba(255,255,255,0.5);
    box-shadow: 0 0 0 4px rgba(184,151,90,0.1);
  }

  /* ─── BUSINESS PROGRESS ──────────────────────────────────────────────────────── */
  .bp-hero {
    background: linear-gradient(145deg, ${T.forest} 0%, #0D2018 70%, #060E08 100%);
    padding: 26px 36px; display: flex; align-items: center; justify-content: space-between;
    gap: 20px; flex-wrap: wrap; position: relative; overflow: hidden;
    border-bottom: 1px solid rgba(255,255,255,0.04);
  }
  .bp-hero::before {
    content: ''; position: absolute; top: -40%; right: 0; width: 50%; height: 200%;
    background: radial-gradient(ellipse, rgba(184,151,90,0.07) 0%, transparent 60%); pointer-events: none;
  }
  .bp-title  { font-family: 'Cormorant Garamond', serif; font-size: 26px; font-weight: 300; color: ${T.white}; line-height: 1; position: relative; }
  .bp-sub    { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.35); margin-top: 5px; position: relative; }
  .bp-pct    { font-family: 'Cormorant Garamond', serif; font-size: 52px; font-weight: 300; color: ${T.goldBright}; line-height: 1; }
  .bp-pct-lbl{ font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.35); margin-top: 3px; }
  .bp-pbar   { width: 180px; height: 3px; background: rgba(255,255,255,0.1); border-radius: 3px; margin-top: 10px; overflow: hidden; }
  .bp-pbar-f { height: 100%; background: linear-gradient(90deg, ${T.gold}, ${T.goldBright}); transition: width 0.9s var(--ease); }

  .bp-filters {
    display: flex; align-items: center; gap: 7px; padding: 13px 36px;
    background: rgba(255,255,255,0.5); backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(210,200,184,0.4); flex-wrap: wrap;
  }
  .bp-flabel { font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; color: ${T.textLight}; font-weight: 700; margin-right: 2px; }
  .bp-fbtn {
    padding: 4px 12px; border-radius: 20px; border: 1px solid rgba(210,200,184,0.5);
    background: transparent; font-size: 12px; font-family: 'Inter', sans-serif;
    color: ${T.textMid}; cursor: pointer; transition: all var(--t1); font-weight: 500;
  }
  .bp-fbtn:hover  { border-color: ${T.gold}; color: ${T.forest}; }
  .bp-fbtn.active { background: ${T.forest}; color: ${T.goldBright}; border-color: ${T.forest}; box-shadow: var(--sh1); }

  .bp-section       { margin-bottom: 24px; }
  .bp-sec-header    { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid rgba(210,200,184,0.38); }
  .bp-sec-title     { font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 400; color: ${T.forest}; }
  .bp-sec-meta      { display: flex; align-items: center; gap: 10px; }
  .bp-sec-count     { font-size: 11px; color: ${T.textLight}; }
  .bp-minibar       { width: 90px; height: 3px; background: rgba(210,200,184,0.38); border-radius: 3px; overflow: hidden; }
  .bp-minibar-fill  { height: 100%; background: linear-gradient(90deg, ${T.gold}, ${T.goldBright}); border-radius: 3px; }
  .bp-sec-pct       { font-family: 'Cormorant Garamond', serif; font-size: 14px; color: ${T.gold}; min-width: 32px; text-align: right; }

  .bp-task {
    background: var(--glass-bg); backdrop-filter: var(--glass-blr); -webkit-backdrop-filter: var(--glass-blr);
    border: 1px solid var(--glass-bd); border-radius: var(--r8);
    padding: 13px 16px; margin-bottom: 7px; transition: all var(--t2);
  }
  .bp-task:hover { box-shadow: var(--sh2); transform: translateY(-1px); }
  .bp-task-top   { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
  .bp-task-left  { display: flex; align-items: flex-start; gap: 11px; flex: 1; }
  .bp-chk {
    width: 17px; height: 17px; border-radius: 5px; border: 1.5px solid rgba(210,200,184,0.6);
    cursor: pointer; background: transparent; flex-shrink: 0; margin-top: 1px;
    display: flex; align-items: center; justify-content: center; transition: all var(--t1);
    font-size: 10px; color: ${T.white};
  }
  .bp-chk.done { background: ${T.green};  border-color: ${T.green};  box-shadow: 0 0 8px rgba(21,128,61,0.3); }
  .bp-chk.prog { background: ${T.gold};   border-color: ${T.gold};   box-shadow: 0 0 8px rgba(184,151,90,0.3); }
  .bp-tname { font-size: 13px; font-weight: 500; color: ${T.text}; line-height: 1.4; }
  .bp-tname.done { text-decoration: line-through; color: ${T.textLight}; }
  .bp-tright { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
  .bp-tmeta  { display: flex; align-items: center; gap: 12px; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(210,200,184,0.3); flex-wrap: wrap; }
  .bp-tmi    { display: flex; align-items: center; gap: 4px; font-size: 11px; color: ${T.textLight}; }
  .bp-tml    { font-weight: 600; color: ${T.textMid}; }
  .bp-expand { background: none; border: none; font-size: 11px; color: ${T.gold}; cursor: pointer; padding: 0; font-family: 'Inter', sans-serif; margin-left: auto; font-weight: 600; }
  .bp-detail { margin-top: 11px; padding-top: 11px; border-top: 1px solid rgba(210,200,184,0.3); display: grid; grid-template-columns: 1fr 1fr; gap: 11px; }
  .bp-ssel {
    padding: 4px 9px; border-radius: 20px; border: 1px solid rgba(210,200,184,0.5);
    font-size: 11px; font-family: 'Inter', sans-serif; font-weight: 500;
    cursor: pointer; outline: none; background: rgba(255,255,255,0.6); transition: all var(--t1);
  }
  .bp-ssel.done { background: ${T.greenPale}; color: ${T.green}; border-color: rgba(21,128,61,0.2); }
  .bp-ssel.prog { background: ${T.goldPale};  color: #92650A;    border-color: rgba(184,151,90,0.25); }
  .bp-ssel.not  { background: rgba(161,161,170,0.08); color: ${T.textMid}; border-color: rgba(161,161,170,0.15); }

  .bp-sum-row  { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 24px; }
  .bp-sum-card {
    background: var(--glass-bg); backdrop-filter: var(--glass-blr); -webkit-backdrop-filter: var(--glass-blr);
    border: 1px solid var(--glass-bd); border-radius: var(--r12); padding: 15px 17px; text-align: center; box-shadow: var(--sh1); transition: all var(--t2);
  }
  .bp-sum-card:hover { box-shadow: var(--sh2); transform: translateY(-2px); }
  .bp-sum-num { font-family: 'Cormorant Garamond', serif; font-size: 30px; font-weight: 300; line-height: 1; margin-bottom: 4px; }
  .bp-sum-lbl { font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: ${T.textLight}; font-weight: 600; }

  /* ─── SETTINGS ───────────────────────────────────────────────────────────────── */
  .settings-section {
    background: var(--glass-bg); backdrop-filter: var(--glass-blr); -webkit-backdrop-filter: var(--glass-blr);
    border: 1px solid var(--glass-bd); border-radius: var(--r12); padding: 22px; margin-bottom: 16px; box-shadow: var(--sh1);
  }
  .settings-title { font-family: 'Cormorant Garamond', serif; font-size: 18px; font-weight: 400; color: ${T.forest}; margin-bottom: 16px; }
  .settings-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(210,200,184,0.32); font-size: 13px; }
  .settings-row:last-child { border-bottom: none; }
  .settings-key { color: ${T.textMid}; font-weight: 500; }
  .settings-val { color: ${T.forest}; font-family: 'Cormorant Garamond', serif; font-size: 15px; }

  /* ─── CALC / SCENARIO ────────────────────────────────────────────────────────── */
  .calc-section { background: rgba(228,221,208,0.4); border: 1px solid rgba(210,200,184,0.4); border-radius: var(--r12); padding: 18px; margin-bottom: 14px; }
  .calc-stitle  { font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: ${T.gold}; font-weight: 700; margin-bottom: 12px; }
  .calc-result  { background: linear-gradient(145deg, ${T.forest}, #08120C); border-radius: var(--r12); padding: 24px; color: ${T.white}; box-shadow: var(--sh4); }
  .calc-row     { display: flex; justify-content: space-between; align-items: baseline; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
  .calc-row:last-child { border-bottom: none; }
  .calc-rl { font-size: 12px; color: rgba(255,255,255,0.52); }
  .calc-rv { font-family: 'Cormorant Garamond', serif; font-size: 20px; color: ${T.goldBright}; }
  .calc-rv.hi  { font-size: 26px; color: ${T.white}; }
  .scenario-out { background: linear-gradient(145deg, ${T.forest}, ${T.forestMid}); border-radius: var(--r12); padding: 24px; color: ${T.white}; box-shadow: var(--sh4); }
  .sc-metric    { text-align: center; padding: 14px; }
  .sc-val       { font-family: 'Cormorant Garamond', serif; font-size: 30px; font-weight: 300; color: ${T.goldBright}; line-height: 1; margin-bottom: 5px; }
  .sc-lbl       { font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(255,255,255,0.42); font-weight: 600; }

  /* ─── SECTION LABEL / UTILITY ────────────────────────────────────────────────── */
  .sec-label { font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: ${T.gold}; font-weight: 700; margin-bottom: 14px; }
  .divider   { height: 1px; background: linear-gradient(90deg,transparent,rgba(210,200,184,0.6),transparent); margin: 20px 0; }
  .empty-st  { text-align: center; padding: 52px 20px; color: ${T.textLight}; }
  .empty-ic  { font-size: 38px; margin-bottom: 10px; opacity: 0.32; }
  .flex      { display: flex; }
  .flex-col  { display: flex; flex-direction: column; }
  .ic        { align-items: center; }
  .jb        { justify-content: space-between; }
  .mb12 { margin-bottom: 12px; }
  .mb16 { margin-bottom: 16px; }
  .mb20 { margin-bottom: 20px; }
  .mb24 { margin-bottom: 24px; }
  .mt12 { margin-top: 12px; }
  .mt16 { margin-top: 16px; }

  /* ─── ANIMATIONS ─────────────────────────────────────────────────────────────── */
  @keyframes fadeUp  { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
  @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  .fade-up { animation: fadeUp 0.32s var(--ease) both; }
  .skeleton {
    background: linear-gradient(90deg, rgba(228,221,208,0.4) 25%, rgba(228,221,208,0.72) 50%, rgba(228,221,208,0.4) 75%);
    background-size: 200% 100%; animation: shimmer 1.6s infinite; border-radius: 8px;
  }

  /* ─── MOBILE BUTTON ──────────────────────────────────────────────────────────── */
  .mob-btn {
    position: fixed; bottom: 22px; right: 22px; z-index: 300;
    width: 52px; height: 52px; border-radius: 50%;
    background: linear-gradient(145deg, ${T.forestLight}, ${T.forest});
    color: ${T.goldBright}; border: none; font-size: 21px;
    display: none; align-items: center; justify-content: center;
    box-shadow: var(--sh4); cursor: pointer; transition: all var(--t2);
  }
  .mob-btn:hover { transform: scale(1.06); }
  .mob-overlay { display: none; }

  /* ─── RESPONSIVE ─────────────────────────────────────────────────────────────── */
  @media (max-width: 960px) {
    :root { --sw: 0px; }
    .sidebar { width: 0; transition: width var(--t3); }
    .sidebar.open { width: 272px; }
    .main { margin-left: 0; }
    .mob-btn { display: flex; }
    .mob-overlay.show { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 199; backdrop-filter: blur(3px); }
    .page-header { padding: 16px; position: static; }
    .page-content { padding: 16px; }
    .grid-5, .grid-4 { grid-template-columns: repeat(2,1fr); }
    .grid-3 { grid-template-columns: repeat(2,1fr); }
    .grid-2 { grid-template-columns: 1fr; }
    .form-grid, .form-grid-3 { grid-template-columns: 1fr; }
    .form-field.full { grid-column: 1; }
    .bp-hero { flex-direction: column; padding: 20px; }
    .bp-filters { padding: 12px 16px; }
    .bp-sum-row { grid-template-columns: repeat(2,1fr); }
    .company-banner .banner-gem { display: none; }
    .modal { border-radius: var(--r24); padding: 22px; }
    .bp-detail { grid-template-columns: 1fr; }
  }
  @media (max-width: 520px) {
    .grid-5, .grid-4, .grid-3, .grid-2 { grid-template-columns: 1fr; }
    .page-title { font-size: 26px; }
    .bp-sum-row { grid-template-columns: repeat(2,1fr); }
    .tabs { gap: 1px; }
    .tab { padding: 7px 12px; font-size: 12px; }
  }
  @media (min-width: 961px) {
    .mob-btn { display: none !important; }
  }

  /* ── LEGACY ALIASES ── */
  .section-label,.sec-label{font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#B8975A;font-weight:700;margin-bottom:14px;}
  .empty-state{text-align:center;padding:52px 20px;color:#A1A1AA;}
  .empty-icon{font-size:38px;margin-bottom:10px;opacity:0.32;}
  .flex-col{display:flex;flex-direction:column;}
  .items-center{align-items:center;}
  .justify-between{justify-content:space-between;}
  .gap-8{gap:8px!important;} .gap-12{gap:12px!important;} .gap-16{gap:16px!important;} .gap-20{gap:20px!important;} .gap-24{gap:24px!important;}
  .mb-16{margin-bottom:16px;} .mb-20{margin-bottom:20px;} .mb-24{margin-bottom:24px;} .mt-16{margin-top:16px;} .mt-20{margin-top:20px;}
  .card{background:var(--glass-bg);backdrop-filter:var(--glass-blr);-webkit-backdrop-filter:var(--glass-blr);border:1px solid var(--glass-bd);border-radius:var(--r16);padding:20px;box-shadow:var(--sh2);}
  .bp-filter-btn{padding:4px 12px;border-radius:20px;border:1px solid rgba(210,200,184,0.5);background:transparent;font-size:12px;font-family:'Inter',sans-serif;color:#52525B;cursor:pointer;transition:all 0.14s;font-weight:500;}
  .bp-filter-btn:hover{border-color:#B8975A;color:#2D5A3D;}
  .bp-filter-btn.active{background:#0F2318;color:#E8C07A;border-color:#0F2318;}
`

export default css
