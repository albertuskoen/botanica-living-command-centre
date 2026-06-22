import { T } from './tokens.js'

// ── BOTANICA LIVING GROUP — GLOBAL DESIGN SYSTEM v2.4 ───────────────────────
// Dark premium glassmorphism — Brief palette: #0F1A14 · #171C18 · #1F2B21 · #2E4A34 · #A7C69A · #D4AF37 · #F7F8F7
// Glassmorphism: bg rgba(15,26,20,0.6–0.75) · border rgba(255,255,255,0.06–0.1) · blur 10–20px
// Samsung Tab S8 Ultra optimised · All breakpoints maintained

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Manrope:wght@300;400;500;600;700;800&display=swap');

  /* ═══════════════════════════════════════════════════════════════════════════
     RESET
  ═══════════════════════════════════════════════════════════════════════════ */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    scroll-behavior: smooth;
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     DESIGN TOKENS
  ═══════════════════════════════════════════════════════════════════════════ */
  :root {
    --sw: 260px;
    --max-content: 1440px;
    --page-pad: 32px;
    --section-gap: 24px;
    --card-pad: 20px;
    --card-pad-sm: 14px;

    --sp2:  2px;   --sp4:  4px;   --sp6:  6px;
    --sp8:  8px;   --sp10: 10px;  --sp12: 12px;
    --sp14: 14px;  --sp16: 16px;  --sp20: 20px;
    --sp24: 24px;  --sp28: 28px;  --sp32: 32px;
    --sp40: 40px;  --sp48: 48px;

    /* Rounded corners — generous as per brief */
    --r4:  8px;   --r8:  12px;
    --r12: 16px;  --r16: 20px;
    --r24: 24px;  --r32: 32px;

    /* Typography — Inter + Manrope */
    --fs-xs:   10px;
    --fs-sm:   11px;
    --fs-base: 13px;
    --fs-md:   14px;
    --fs-lg:   16px;
    --fs-xl:   18px;
    --fs-2xl:  22px;
    --fs-3xl:  26px;
    --fs-4xl:  32px;
    --fs-5xl:  40px;
    --fs-serif-base: 15px;
    --fs-serif-md:   18px;
    --fs-serif-lg:   22px;
    --fs-serif-xl:   28px;
    --fs-serif-2xl:  34px;
    --fs-serif-3xl:  42px;

    --lh-tight:  1.2;
    --lh-snug:   1.4;
    --lh-base:   1.6;
    --lh-relaxed:1.75;
    --lh-loose:  1.85;

    /* Shadows — deeper for dark bg */
    --sh1: 0 1px 4px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2);
    --sh2: 0 4px 16px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.25);
    --sh3: 0 8px 32px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3);
    --sh4: 0 16px 56px rgba(0,0,0,0.6), 0 8px 20px rgba(0,0,0,0.35);

    /* Glassmorphism — from brief */
    --glass-bg:  rgba(15,26,20,0.65);
    --glass-bd:  rgba(255,255,255,0.07);
    --glass-blr: blur(16px) saturate(180%);

    /* Card glass — slightly lighter */
    --card-bg:   rgba(23,28,24,0.80);
    --card-bd:   rgba(255,255,255,0.07);
    --card-blr:  blur(20px) saturate(160%);

    /* Green glow effects */
    --glow-sage: 0 0 20px rgba(167,198,154,0.12);
    --glow-gold: 0 0 24px rgba(212,175,55,0.15);
    --glow-green:0 0 20px rgba(110,232,160,0.15);

    --ease: cubic-bezier(0.22,1,0.36,1);
    --t1: 0.14s var(--ease);
    --t2: 0.22s var(--ease);
    --t3: 0.36s var(--ease);
    --touch-min: 44px;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     BASE — Dark forest background
  ═══════════════════════════════════════════════════════════════════════════ */
  body {
    font-family: 'Inter', 'Manrope', system-ui, -apple-system, sans-serif;
    font-size: var(--fs-base);
    line-height: var(--lh-base);
    color: ${T.text};
    background: ${T.forest};
    background-image:
      radial-gradient(ellipse 80% 50% at 20% 0%,   rgba(46,74,52,0.35) 0%, transparent 60%),
      radial-gradient(ellipse 60% 40% at 80% 100%,  rgba(212,175,55,0.06) 0%, transparent 55%),
      radial-gradient(ellipse 40% 60% at 90% 20%,   rgba(46,74,52,0.15) 0%, transparent 50%);
    min-height: 100vh;
    overflow-x: hidden;
  }
  .app { display: flex; min-height: 100vh; overflow: hidden; }

  /* ═══════════════════════════════════════════════════════════════════════════
     TYPOGRAPHY
  ═══════════════════════════════════════════════════════════════════════════ */
  .page-title {
    font-family: 'Manrope', 'Inter', sans-serif;
    font-size: var(--fs-3xl); font-weight: 700; color: ${T.text};
    letter-spacing: -0.02em; line-height: var(--lh-tight);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%;
  }
  .page-subtitle {
    font-size: var(--fs-xs); color: ${T.textLight};
    letter-spacing: 0.10em; text-transform: uppercase;
    margin-top: var(--sp4); font-weight: 500;
  }
  .sec-label, .section-label {
    font-size: var(--fs-xs); letter-spacing: 0.18em;
    text-transform: uppercase; color: ${T.gold}; font-weight: 700;
    margin-bottom: var(--sp14); display: block;
  }
  .card-title {
    font-family: 'Manrope', sans-serif;
    font-size: var(--fs-lg); font-weight: 600; color: ${T.text};
    line-height: var(--lh-snug); overflow: hidden; text-overflow: ellipsis;
  }
  .desc { font-size: var(--fs-base); color: ${T.textMid}; line-height: var(--lh-relaxed); max-width: 72ch; overflow-wrap: break-word; word-break: break-word; }
  .desc-sm { font-size: var(--fs-sm); color: ${T.textMid}; line-height: var(--lh-snug); overflow-wrap: break-word; word-break: break-word; }

  .stat-label { font-size: var(--fs-xs); letter-spacing: 0.16em; text-transform: uppercase; color: ${T.textLight}; font-weight: 600; margin-bottom: var(--sp8); }
  .stat-value { font-family: 'Manrope', sans-serif; font-size: var(--fs-4xl); font-weight: 700; line-height: 1; letter-spacing: -0.02em; overflow: hidden; text-overflow: ellipsis; }
  .stat-sub   { font-size: var(--fs-sm); color: ${T.textLight}; margin-top: var(--sp6); }
  .stat-top   { height: 2px; border-radius: 2px; margin-bottom: var(--sp14); }

  label {
    font-size: var(--fs-xs); letter-spacing: 0.10em;
    text-transform: uppercase; color: ${T.textLight}; font-weight: 600;
    display: block;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     SIDEBAR — Dark glass panel
  ═══════════════════════════════════════════════════════════════════════════ */
  .sidebar {
    width: var(--sw);
    background: rgba(11,20,16,0.92);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border-right: 1px solid rgba(255,255,255,0.06);
    display: flex; flex-direction: column;
    position: fixed; inset: 0 auto 0 0;
    z-index: 200; overflow: hidden;
    transition: width var(--t3);
    box-shadow: 4px 0 40px rgba(0,0,0,0.5);
    padding-left: env(safe-area-inset-left, 0px);
  }
  .sidebar::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 300px;
    background: radial-gradient(ellipse 100% 60% at 50% 0%, rgba(46,74,52,0.4) 0%, transparent 70%);
    pointer-events: none;
  }
  .sidebar-scroll { flex: 1; overflow-y: auto; overflow-x: hidden; padding-bottom: var(--sp16); }
  .sidebar-scroll::-webkit-scrollbar { width: 0; }

  .sidebar-logo { padding: 24px 18px 20px; flex-shrink: 0; position: relative; }
  .sidebar-logo::after {
    content: ''; position: absolute; bottom: 0; left: 18px; right: 18px; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(212,175,55,0.25), transparent);
  }
  .logo-mark { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
  .logo-gem {
    width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
    background: linear-gradient(135deg, rgba(212,175,55,0.25), rgba(212,175,55,0.08));
    border: 1px solid rgba(212,175,55,0.3);
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; color: ${T.goldBright};
    box-shadow: 0 2px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08), var(--glow-gold);
  }
  .logo-text .wordmark {
    font-family: 'Manrope', sans-serif;
    font-size: 14px; font-weight: 700; color: ${T.text};
    letter-spacing: 0.02em; line-height: 1.2; display: block;
  }
  .logo-text .sub {
    font-size: 9px; letter-spacing: 0.20em; text-transform: uppercase;
    color: ${T.textLight}; display: block; margin-top: 2px;
  }
  .logo-reg { font-size: 9px; color: rgba(247,248,247,0.18); letter-spacing: 0.03em; }

  .nav-section { padding: 16px 12px 4px; }
  .nav-section-label {
    font-size: 9px; letter-spacing: 0.24em; text-transform: uppercase;
    color: rgba(167,198,154,0.35); font-weight: 700; padding: 0 8px; margin-bottom: 4px;
  }
  .nav-item {
    display: flex; align-items: center; gap: 10px;
    min-height: var(--touch-min); padding: 0 10px;
    margin: 1px 0; border-radius: var(--r8);
    cursor: pointer; color: rgba(247,248,247,0.40);
    font-size: var(--fs-sm); font-weight: 400;
    transition: all var(--t2); position: relative; user-select: none;
  }
  .nav-item:hover { color: ${T.text}; background: rgba(46,74,52,0.35); }
  .nav-item.active {
    color: ${T.text};
    background: rgba(46,74,52,0.50);
    font-weight: 600;
    border: 1px solid rgba(212,175,55,0.18);
    box-shadow: var(--sh1), var(--glow-sage);
  }
  .nav-item.active::before {
    content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%);
    width: 3px; height: 18px;
    background: linear-gradient(180deg, ${T.goldBright}, ${T.gold});
    border-radius: 0 2px 2px 0; box-shadow: var(--glow-gold);
  }
  .nav-icon {
    width: 30px; height: 30px; border-radius: var(--r4);
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; flex-shrink: 0; transition: all var(--t2);
    color: rgba(167,198,154,0.55);
  }
  .nav-item.active .nav-icon { background: rgba(212,175,55,0.15); color: ${T.goldBright}; }
  .nav-item:hover .nav-icon  { color: ${T.sage}; }
  .nav-label { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sidebar-footer {
    padding: 14px 18px; flex-shrink: 0;
    border-top: 1px solid rgba(255,255,255,0.05);
    font-size: var(--fs-xs); color: rgba(247,248,247,0.20);
  }
  .sidebar-version { font-size: 9px; color: rgba(247,248,247,0.12); margin-top: 2px; }

  /* ═══════════════════════════════════════════════════════════════════════════
     MAIN CONTENT
  ═══════════════════════════════════════════════════════════════════════════ */
  .main {
    margin-left: var(--sw); flex: 1;
    min-height: 100vh; min-width: 0;
    display: flex; flex-direction: column;
    padding-right: env(safe-area-inset-right, 0px);
  }

  .page-header {
    background: rgba(11,20,16,0.75);
    backdrop-filter: var(--glass-blr); -webkit-backdrop-filter: var(--glass-blr);
    border-bottom: 1px solid rgba(255,255,255,0.06);
    padding: 20px var(--page-pad) 16px;
    display: flex; align-items: flex-end; justify-content: space-between;
    gap: var(--sp16); flex-wrap: wrap;
    position: sticky; top: 0; z-index: 50;
    box-shadow: var(--sh1);
    min-width: 0;
  }
  .page-header-left { min-width: 0; flex: 1; }
  .page-header-right { flex-shrink: 0; display: flex; gap: var(--sp8); flex-wrap: wrap; }

  .page-content {
    padding: var(--sp28) var(--page-pad);
    flex: 1; min-width: 0; max-width: 100%; overflow-x: hidden;
  }
  .content-inner { max-width: var(--max-content); margin: 0 auto; }

  /* ═══════════════════════════════════════════════════════════════════════════
     GLASS CARDS — Dark glassmorphism
  ═══════════════════════════════════════════════════════════════════════════ */
  .g-card {
    background: var(--card-bg);
    backdrop-filter: var(--card-blr); -webkit-backdrop-filter: var(--card-blr);
    border: 1px solid var(--card-bd);
    border-radius: var(--r16); padding: var(--card-pad);
    box-shadow: var(--sh2);
    transition: box-shadow var(--t2), transform var(--t2), border-color var(--t2);
    position: relative; min-width: 0; overflow: hidden;
  }
  .g-card::before {
    content: ''; position: absolute; inset: 0; border-radius: inherit;
    background: linear-gradient(145deg, rgba(167,198,154,0.04) 0%, transparent 50%);
    pointer-events: none;
  }
  .g-card:hover { box-shadow: var(--sh3); border-color: rgba(255,255,255,0.10); }
  .g-card-click { cursor: pointer; }
  .g-card-click:hover { transform: translateY(-2px); border-color: rgba(212,175,55,0.18); }

  .g-card h2, .g-card h3, .g-card .card-heading {
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;
  }
  .g-card p, .g-card .card-desc {
    overflow-wrap: break-word; word-break: break-word; max-width: 100%;
  }

  /* Dark hero card */
  .g-card-dark {
    background: linear-gradient(145deg, rgba(15,26,20,0.95) 0%, rgba(11,20,16,0.98) 100%);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: var(--r16); padding: var(--card-pad);
    box-shadow: var(--sh3); color: ${T.text};
    position: relative; overflow: hidden; min-width: 0;
  }
  .g-card-dark::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse 80% 60% at 80% 0%, rgba(46,74,52,0.20) 0%, transparent 60%);
    pointer-events: none;
  }

  /* Stat cards */
  .stat-card {
    background: var(--card-bg);
    backdrop-filter: var(--card-blr); -webkit-backdrop-filter: var(--card-blr);
    border: 1px solid var(--card-bd);
    border-radius: var(--r12); padding: var(--sp16) var(--sp20);
    position: relative; overflow: hidden;
    box-shadow: var(--sh1);
    transition: all var(--t2); cursor: pointer; min-width: 0;
  }
  .stat-card::before {
    content: ''; position: absolute; inset: 0; border-radius: inherit;
    background: linear-gradient(145deg, rgba(167,198,154,0.05) 0%, transparent 60%);
    pointer-events: none;
  }
  .stat-card:hover { box-shadow: var(--sh3); transform: translateY(-2px); border-color: rgba(212,175,55,0.20); }

  /* ═══════════════════════════════════════════════════════════════════════════
     GRID SYSTEM
  ═══════════════════════════════════════════════════════════════════════════ */
  .grid-2 { display: grid; grid-template-columns: repeat(2,1fr); gap: var(--sp16); }
  .grid-3 { display: grid; grid-template-columns: repeat(3,1fr); gap: var(--sp16); }
  .grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: var(--sp14); }
  .grid-5 { display: grid; grid-template-columns: repeat(5,1fr); gap: var(--sp14); }
  .g8  { gap: var(--sp8)  !important; }
  .g12 { gap: var(--sp12) !important; }
  .g16 { gap: var(--sp16) !important; }
  .g20 { gap: var(--sp20) !important; }
  .g24 { gap: var(--sp24) !important; }

  /* ═══════════════════════════════════════════════════════════════════════════
     BADGES
  ═══════════════════════════════════════════════════════════════════════════ */
  .badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 10px; border-radius: 20px;
    font-size: var(--fs-xs); font-weight: 600; letter-spacing: 0.04em;
    white-space: nowrap; flex-shrink: 0;
  }
  .badge-forest { background: rgba(46,74,52,0.35); color: ${T.sage}; border: 1px solid rgba(46,74,52,0.5); }
  .badge-gold   { background: rgba(212,175,55,0.15); color: ${T.goldBright}; border: 1px solid rgba(212,175,55,0.25); }
  .badge-grey   { background: rgba(255,255,255,0.06); color: ${T.textLight}; border: 1px solid rgba(255,255,255,0.08); }
  .badge-red    { background: rgba(255,107,107,0.12); color: ${T.red}; border: 1px solid rgba(255,107,107,0.22); }
  .badge-teal   { background: rgba(78,205,196,0.12); color: ${T.teal}; border: 1px solid rgba(78,205,196,0.22); }
  .badge-green  { background: rgba(110,232,160,0.12); color: ${T.green}; border: 1px solid rgba(110,232,160,0.22); }
  .badge-blue   { background: rgba(96,165,250,0.12); color: ${T.blue}; border: 1px solid rgba(96,165,250,0.22); }

  .pri-critical { background: rgba(255,68,68,0.12);  color: ${T.danger}; border: 1px solid rgba(255,68,68,0.25); }
  .pri-high     { background: rgba(212,175,55,0.12); color: ${T.goldBright}; border: 1px solid rgba(212,175,55,0.22); }
  .pri-medium   { background: rgba(110,232,160,0.12);color: ${T.green}; border: 1px solid rgba(110,232,160,0.22); }
  .pri-low      { background: rgba(255,255,255,0.05);color: ${T.textLight}; border: 1px solid rgba(255,255,255,0.08); }

  /* Finance */
  .fc-inv { color: ${T.teal}; }  .fc-inc { color: ${T.green}; }
  .fc-exp { color: ${T.red}; }   .fc-rem { color: ${T.gold}; }  .fc-net { color: ${T.sage}; }
  .border-inv { border-top: 2px solid ${T.teal}   !important; }
  .border-inc { border-top: 2px solid ${T.green}  !important; }
  .border-exp { border-top: 2px solid ${T.red}    !important; }
  .border-rem { border-top: 2px solid ${T.gold}   !important; }
  .border-net { border-top: 2px solid ${T.sage}   !important; }

  /* ═══════════════════════════════════════════════════════════════════════════
     TABLE
  ═══════════════════════════════════════════════════════════════════════════ */
  .table-wrap {
    overflow-x: auto; border-radius: var(--r12);
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
    scrollbar-color: rgba(212,175,55,0.2) transparent;
  }
  .table-wrap::-webkit-scrollbar { height: 4px; }
  .table-wrap::-webkit-scrollbar-track { background: transparent; }
  .table-wrap::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.2); border-radius: 4px; }

  table { width: 100%; border-collapse: collapse; }
  th {
    text-align: left; font-size: var(--fs-xs); letter-spacing: 0.14em;
    text-transform: uppercase; color: ${T.textLight};
    padding: 11px 16px; border-bottom: 1px solid rgba(255,255,255,0.06);
    background: rgba(15,26,20,0.60); font-weight: 700;
    white-space: nowrap; backdrop-filter: blur(8px); min-width: max-content;
  }
  th:first-child { border-radius: var(--r8) 0 0 0; }
  th:last-child  { border-radius: 0 var(--r8) 0 0; }
  td {
    padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.04);
    font-size: var(--fs-base); vertical-align: middle;
    max-width: 280px; overflow: hidden; text-overflow: ellipsis; color: ${T.text};
  }
  td.td-wrap { white-space: normal; overflow: visible; text-overflow: unset; }
  tr:last-child td { border-bottom: none; }
  tr { transition: background var(--t1); }
  tr:hover td { background: rgba(46,74,52,0.20); }
  .td-name { font-weight: 600; color: ${T.text}; white-space: nowrap; }
  .td-num  { font-family: 'Manrope', sans-serif; font-size: var(--fs-lg); color: ${T.text}; white-space: nowrap; font-weight: 600; }

  /* ═══════════════════════════════════════════════════════════════════════════
     BUTTONS
  ═══════════════════════════════════════════════════════════════════════════ */
  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    min-height: var(--touch-min); padding: 0 18px;
    border-radius: var(--r8);
    font-size: var(--fs-base); font-weight: 600; letter-spacing: 0.01em;
    cursor: pointer; border: none;
    transition: all var(--t2); font-family: 'Inter', sans-serif;
    white-space: nowrap; user-select: none; text-decoration: none;
    flex-shrink: 0;
  }
  .btn:active { transform: scale(0.97); }
  .btn:disabled { opacity: 0.35; cursor: not-allowed; transform: none; }

  .btn-primary  {
    background: linear-gradient(135deg, rgba(46,74,52,0.9), rgba(31,43,33,0.95));
    color: ${T.goldBright};
    border: 1px solid rgba(212,175,55,0.30);
    box-shadow: var(--sh2), var(--glow-gold);
  }
  .btn-primary:hover:not(:disabled)  {
    background: linear-gradient(135deg, rgba(46,74,52,1), rgba(31,43,33,1));
    box-shadow: var(--sh3), 0 0 28px rgba(212,175,55,0.20);
    border-color: rgba(212,175,55,0.45);
    transform: translateY(-1px);
  }
  .btn-gold {
    background: linear-gradient(135deg, ${T.goldBright}, ${T.gold});
    color: ${T.forest}; font-weight: 700;
    box-shadow: var(--sh2), var(--glow-gold);
  }
  .btn-gold:hover:not(:disabled) { box-shadow: var(--sh3), 0 0 32px rgba(212,175,55,0.30); transform: translateY(-1px); }
  .btn-outline  {
    background: rgba(255,255,255,0.04);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.10);
    color: ${T.textMid};
  }
  .btn-outline:hover:not(:disabled) {
    border-color: rgba(212,175,55,0.35); color: ${T.text};
    background: rgba(46,74,52,0.25);
  }
  .btn-ghost    { background: transparent; color: ${T.textLight}; }
  .btn-ghost:hover:not(:disabled) { background: rgba(255,255,255,0.05); color: ${T.text}; }
  .btn-danger   { background: rgba(255,68,68,0.20); color: ${T.red}; border: 1px solid rgba(255,68,68,0.30); }
  .btn-danger:hover:not(:disabled) { background: rgba(255,68,68,0.30); }

  .btn-sm  { min-height: 36px; padding: 0 14px; font-size: var(--fs-sm); border-radius: var(--r4); }
  .btn-xs  { min-height: 30px; padding: 0 10px; font-size: var(--fs-xs); border-radius: var(--r4); }
  .btn-icon { width: var(--touch-min); height: var(--touch-min); padding: 0; border-radius: var(--r8); }

  /* ═══════════════════════════════════════════════════════════════════════════
     FORMS
  ═══════════════════════════════════════════════════════════════════════════ */
  .form-grid   { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp14); }
  .form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--sp14); }
  .form-field  { display: flex; flex-direction: column; gap: var(--sp6); min-width: 0; }
  .form-field.full { grid-column: 1 / -1; }

  input, select, textarea {
    padding: 11px 14px;
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: var(--r8); font-size: var(--fs-base);
    font-family: 'Inter', sans-serif;
    background: rgba(15,26,20,0.70);
    backdrop-filter: blur(8px);
    color: ${T.text}; outline: none;
    transition: all var(--t1); width: 100%;
    min-height: var(--touch-min);
    -webkit-appearance: none; appearance: none;
  }
  select { -webkit-appearance: auto; appearance: auto; }
  select option { background: #1F2B21; color: ${T.text}; }
  input:focus, select:focus, textarea:focus {
    border-color: rgba(212,175,55,0.50);
    background: rgba(22,34,26,0.85);
    box-shadow: 0 0 0 3px rgba(212,175,55,0.10), var(--glow-gold);
  }
  input::placeholder { color: ${T.textMuted}; }
  textarea { resize: vertical; min-height: 72px; }
  @media (max-width: 768px) { input, select, textarea { font-size: 16px; } }

  /* ═══════════════════════════════════════════════════════════════════════════
     MODAL
  ═══════════════════════════════════════════════════════════════════════════ */
  .modal-overlay {
    position: fixed; inset: 0; z-index: 500;
    background: rgba(8,14,10,0.80);
    backdrop-filter: blur(12px) saturate(130%); -webkit-backdrop-filter: blur(12px) saturate(130%);
    display: flex; align-items: center; justify-content: center;
    padding: var(--sp16);
    animation: ovIn 0.16s ease;
    padding-bottom: max(var(--sp16), env(safe-area-inset-bottom));
  }
  @keyframes ovIn { from { opacity: 0; } to { opacity: 1; } }

  .modal {
    background: rgba(19,29,22,0.96);
    backdrop-filter: blur(40px) saturate(180%); -webkit-backdrop-filter: blur(40px) saturate(180%);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: var(--r24); width: 720px; max-width: 100%;
    max-height: min(92vh, 860px);
    overflow-y: auto; padding: 28px;
    box-shadow: var(--sh4), inset 0 1px 0 rgba(255,255,255,0.06);
    animation: mdIn 0.22s var(--ease);
    -webkit-overflow-scrolling: touch;
  }
  @keyframes mdIn { from { transform: translateY(16px) scale(0.98); opacity: 0; } to { transform: none; opacity: 1; } }
  .modal-lg  { width: 880px; }
  .modal-xl  { width: 1040px; }

  .modal-header {
    display: flex; justify-content: space-between; align-items: flex-start;
    margin-bottom: 22px; padding-bottom: 18px; border-bottom: 1px solid rgba(255,255,255,0.07);
    min-width: 0; gap: var(--sp12);
  }
  .modal-title {
    font-family: 'Manrope', sans-serif; font-size: var(--fs-xl); font-weight: 700; color: ${T.text};
    overflow: hidden; text-overflow: ellipsis; flex: 1;
  }
  .modal-close {
    width: var(--touch-min); height: var(--touch-min); border-radius: 50%;
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); cursor: pointer;
    color: ${T.textLight}; font-size: 14px;
    display: flex; align-items: center; justify-content: center;
    transition: all var(--t1); flex-shrink: 0;
  }
  .modal-close:hover { background: rgba(255,255,255,0.10); color: ${T.text}; }
  .modal-footer {
    display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap;
    margin-top: 24px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.07);
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     TABS
  ═══════════════════════════════════════════════════════════════════════════ */
  .tabs {
    display: flex; gap: 2px; padding: 3px;
    background: rgba(255,255,255,0.04); border-radius: var(--r8);
    margin-bottom: 22px; border: 1px solid rgba(255,255,255,0.06);
    overflow-x: auto; -webkit-overflow-scrolling: touch;
    scrollbar-width: none; flex-wrap: nowrap; min-width: 0;
  }
  .tabs::-webkit-scrollbar { display: none; }
  .tab {
    min-height: 36px; padding: 0 16px;
    display: flex; align-items: center;
    font-size: var(--fs-base); font-weight: 500; color: ${T.textLight};
    border-radius: var(--r4); cursor: pointer; transition: all var(--t1);
    white-space: nowrap; user-select: none; flex-shrink: 0;
  }
  .tab:hover { color: ${T.text}; background: rgba(46,74,52,0.30); }
  .tab.active { color: ${T.text}; background: rgba(46,74,52,0.55); font-weight: 600; border: 1px solid rgba(212,175,55,0.20); box-shadow: var(--sh1); }

  /* ═══════════════════════════════════════════════════════════════════════════
     PROGRESS BARS
  ═══════════════════════════════════════════════════════════════════════════ */
  .pbar { height: 4px; background: rgba(255,255,255,0.06); border-radius: 4px; overflow: hidden; }
  .pbar-fill { height: 100%; border-radius: 4px; transition: width 0.8s var(--ease); }
  .pbar-gold   { background: linear-gradient(90deg, ${T.gold}, ${T.goldBright}); }
  .pbar-teal   { background: linear-gradient(90deg, ${T.teal}, #7EE8E0); }
  .pbar-green  { background: linear-gradient(90deg, ${T.green}, #8EF8B0); }
  .pbar-red    { background: linear-gradient(90deg, ${T.red}, #FF8B8B); }
  .pbar-forest { background: linear-gradient(90deg, ${T.forestBright}, ${T.sage}); }

  /* ═══════════════════════════════════════════════════════════════════════════
     HEALTH SCORE RING
  ═══════════════════════════════════════════════════════════════════════════ */
  .ring-wrap { position: relative; flex-shrink: 0; }
  .ring-svg  { transform: rotate(-90deg); display: block; }
  .ring-bg   { fill: none; stroke: rgba(255,255,255,0.06); }
  .ring-fg   { fill: none; stroke-linecap: round; transition: stroke-dashoffset 1s var(--ease); }
  .ring-text {
    position: absolute; inset: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
  }
  .ring-num  { font-family: 'Manrope', sans-serif; font-weight: 700; line-height: 1; }
  .ring-unit { font-size: 9px; color: ${T.textLight}; letter-spacing: 0.06em; margin-top: 1px; }

  /* ═══════════════════════════════════════════════════════════════════════════
     INSIGHT / QUOTE / COMPANY BANNER
  ═══════════════════════════════════════════════════════════════════════════ */
  .insight-box {
    background: linear-gradient(145deg, rgba(15,26,20,0.95) 0%, rgba(11,20,16,0.98) 100%);
    border: 1px solid rgba(46,74,52,0.40);
    border-radius: var(--r16); padding: 26px; color: ${T.text};
    box-shadow: var(--sh4); position: relative; overflow: hidden; min-width: 0;
  }
  .insight-box::before {
    content: ''; position: absolute; top: -20%; right: -10%; width: 80%; height: 100%;
    background: radial-gradient(ellipse, rgba(212,175,55,0.08) 0%, transparent 60%); pointer-events: none;
  }
  .insight-tag  { font-size: 9px; letter-spacing: 0.26em; text-transform: uppercase; color: ${T.goldBright}; margin-bottom: 12px; font-weight: 700; position: relative; }
  .insight-text { font-size: var(--fs-md); line-height: var(--lh-loose); color: ${T.textMid}; position: relative; overflow-wrap: break-word; }

  .quote-block {
    background: linear-gradient(145deg, rgba(15,26,20,0.95), rgba(11,20,16,0.98));
    border: 1px solid rgba(46,74,52,0.40);
    border-radius: var(--r16); padding: 30px; text-align: center;
    box-shadow: var(--sh4); position: relative; overflow: hidden;
  }
  .quote-block::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212,175,55,0.06), transparent 65%);
    pointer-events: none;
  }
  .quote-text { font-family: 'Manrope', sans-serif; font-size: var(--fs-serif-xl); font-weight: 300; font-style: italic; color: ${T.goldBright}; position: relative; }
  .quote-attr { font-size: var(--fs-xs); color: ${T.textLight}; margin-top: 10px; letter-spacing: 0.18em; text-transform: uppercase; position: relative; }

  .company-banner {
    background: linear-gradient(145deg, rgba(15,26,20,0.96) 0%, rgba(11,20,16,0.98) 55%, rgba(8,14,10,1) 100%);
    border-radius: var(--r24); padding: 28px 32px;
    position: relative; overflow: hidden;
    box-shadow: var(--sh4); border: 1px solid rgba(46,74,52,0.35); min-width: 0;
  }
  .company-banner::before {
    content: ''; position: absolute; inset: 0;
    background:
      radial-gradient(ellipse 60% 80% at 85% 50%, rgba(212,175,55,0.07) 0%, transparent 65%),
      radial-gradient(ellipse 40% 40% at 20% 20%, rgba(46,74,52,0.20) 0%, transparent 50%);
    pointer-events: none;
  }
  .banner-gem {
    position: absolute; right: 32px; top: 50%; transform: translateY(-50%);
    font-size: 72px; color: rgba(212,175,55,0.05); pointer-events: none;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     MILESTONE / PRIORITY / ACTION
  ═══════════════════════════════════════════════════════════════════════════ */
  .milestone-row { display: flex; align-items: flex-start; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
  .milestone-row:last-child { border-bottom: none; }
  .m-icon { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; margin-top: 2px; }
  .m-done   { background: rgba(110,232,160,0.15); color: ${T.green}; }
  .m-prog   { background: rgba(212,175,55,0.15); color: ${T.gold}; }
  .m-future { background: rgba(255,255,255,0.06); color: ${T.textLight}; }
  .m-title  { font-weight: 500; font-size: var(--fs-base); color: ${T.text}; overflow-wrap: break-word; }
  .m-sub    { font-size: var(--fs-sm); color: ${T.textLight}; margin-top: 1px; }

  .priority-item { display: flex; align-items: flex-start; gap: 11px; padding: 11px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
  .priority-item:last-child { border-bottom: none; }
  .p-dot { width: 7px; height: 7px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; }
  .p-dot-gold  { background: ${T.gold};  box-shadow: 0 0 8px rgba(212,175,55,0.50); }
  .p-dot-green { background: ${T.green}; box-shadow: 0 0 8px rgba(110,232,160,0.50); }
  .p-title { font-weight: 600; font-size: var(--fs-base); color: ${T.text}; overflow-wrap: break-word; }
  .p-desc  { font-size: var(--fs-sm); color: ${T.textLight}; margin-top: 2px; line-height: var(--lh-snug); overflow-wrap: break-word; }

  .action-card {
    background: var(--card-bg); backdrop-filter: var(--card-blr); -webkit-backdrop-filter: var(--card-blr);
    border: 1px solid var(--card-bd); border-radius: var(--r12);
    padding: var(--sp14) var(--sp16); margin-bottom: 8px;
    transition: all var(--t2); box-shadow: var(--sh1); min-width: 0;
  }
  .action-card:hover { box-shadow: var(--sh2); transform: translateY(-1px); border-color: rgba(212,175,55,0.18); }

  /* ═══════════════════════════════════════════════════════════════════════════
     DOCUMENT CARDS
  ═══════════════════════════════════════════════════════════════════════════ */
  .doc-card {
    background: var(--card-bg); backdrop-filter: var(--card-blr); -webkit-backdrop-filter: var(--card-blr);
    border: 1px solid var(--card-bd); border-radius: var(--r12);
    padding: var(--sp16); display: flex; align-items: flex-start; gap: 14px;
    box-shadow: var(--sh1); transition: all var(--t2); cursor: pointer; min-width: 0;
  }
  .doc-card:hover { box-shadow: var(--sh3); transform: translateY(-1px); border-color: rgba(212,175,55,0.22); }
  .doc-icon {
    width: 42px; height: 42px; border-radius: 10px;
    background: rgba(212,175,55,0.10);
    border: 1px solid rgba(212,175,55,0.18);
    display: flex; align-items: center; justify-content: center;
    font-size: 19px; flex-shrink: 0; box-shadow: var(--sh1);
  }
  .doc-name { font-weight: 600; font-size: var(--fs-base); color: ${T.text}; overflow-wrap: break-word; }
  .doc-meta { font-size: var(--fs-sm); color: ${T.textLight}; margin-top: 3px; overflow-wrap: break-word; }

  .doc-drop-zone {
    border: 2px dashed rgba(255,255,255,0.12); border-radius: var(--r16);
    padding: 44px 24px; text-align: center; cursor: pointer;
    transition: all var(--t2); background: rgba(15,26,20,0.40);
    min-height: 140px; display: flex; flex-direction: column; align-items: center; justify-content: center;
  }
  .doc-drop-zone:hover, .doc-drop-zone.over {
    border-color: rgba(212,175,55,0.45); background: rgba(46,74,52,0.20);
    box-shadow: 0 0 0 4px rgba(212,175,55,0.08);
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     BUSINESS PROGRESS
  ═══════════════════════════════════════════════════════════════════════════ */
  .bp-hero {
    background: linear-gradient(145deg, rgba(15,26,20,0.98) 0%, rgba(11,20,16,1) 70%, rgba(8,14,10,1) 100%);
    padding: 26px var(--page-pad); display: flex; align-items: center; justify-content: space-between;
    gap: var(--sp20); flex-wrap: wrap; position: relative; overflow: hidden;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .bp-hero::before {
    content: ''; position: absolute; top: -40%; right: 0; width: 50%; height: 200%;
    background: radial-gradient(ellipse, rgba(212,175,55,0.05) 0%, transparent 60%); pointer-events: none;
  }
  .bp-title { font-family: 'Manrope', sans-serif; font-size: var(--fs-serif-xl); font-weight: 700; color: ${T.text}; line-height: 1; }
  .bp-sub   { font-size: var(--fs-sm); letter-spacing: 0.12em; text-transform: uppercase; color: ${T.textLight}; margin-top: 5px; overflow-wrap: break-word; }
  .bp-pct   { font-family: 'Manrope', sans-serif; font-size: var(--fs-5xl); font-weight: 700; color: ${T.goldBright}; line-height: 1; }
  .bp-pct-lbl { font-size: var(--fs-xs); letter-spacing: 0.18em; text-transform: uppercase; color: ${T.textLight}; margin-top: 3px; }
  .bp-pbar    { width: 180px; height: 3px; background: rgba(255,255,255,0.08); border-radius: 3px; margin-top: 10px; overflow: hidden; }
  .bp-pbar-f  { height: 100%; background: linear-gradient(90deg, ${T.gold}, ${T.goldBright}); transition: width 0.9s var(--ease); }

  .bp-filters {
    display: flex; align-items: center; gap: 7px;
    padding: 12px var(--page-pad);
    background: rgba(11,20,16,0.60); backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255,255,255,0.05);
    overflow-x: auto; flex-wrap: nowrap;
    -webkit-overflow-scrolling: touch; scrollbar-width: none;
  }
  .bp-filters::-webkit-scrollbar { display: none; }
  .bp-flabel { font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; color: ${T.textLight}; font-weight: 700; margin-right: 2px; white-space: nowrap; flex-shrink: 0; }
  .bp-fbtn {
    padding: 0 12px; min-height: 32px;
    display: inline-flex; align-items: center;
    border-radius: 20px; border: 1px solid rgba(255,255,255,0.10);
    background: transparent; font-size: var(--fs-sm);
    font-family: 'Inter', sans-serif; color: ${T.textLight};
    cursor: pointer; transition: all var(--t1); font-weight: 500;
    white-space: nowrap; flex-shrink: 0;
  }
  .bp-fbtn:hover  { border-color: rgba(212,175,55,0.35); color: ${T.text}; }
  .bp-fbtn.active { background: rgba(46,74,52,0.55); color: ${T.goldBright}; border-color: rgba(212,175,55,0.30); box-shadow: var(--sh1); }

  .bp-section { margin-bottom: 24px; }
  .bp-sec-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.07);
    gap: var(--sp12); flex-wrap: wrap;
  }
  .bp-sec-title { font-family: 'Manrope', sans-serif; font-size: var(--fs-xl); font-weight: 600; color: ${T.text}; flex: 1; min-width: 0; }
  .bp-sec-meta  { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
  .bp-sec-count { font-size: var(--fs-sm); color: ${T.textLight}; white-space: nowrap; }
  .bp-minibar   { width: 90px; height: 3px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; }
  .bp-minibar-fill { height: 100%; background: linear-gradient(90deg, ${T.gold}, ${T.goldBright}); border-radius: 3px; }
  .bp-sec-pct   { font-family: 'Manrope', sans-serif; font-size: var(--fs-serif-base); color: ${T.gold}; min-width: 32px; text-align: right; }

  .bp-task {
    background: var(--card-bg); backdrop-filter: var(--card-blr); -webkit-backdrop-filter: var(--card-blr);
    border: 1px solid var(--card-bd); border-radius: var(--r8);
    padding: var(--sp12) var(--sp16); margin-bottom: 7px;
    transition: all var(--t2); min-width: 0;
  }
  .bp-task:hover { box-shadow: var(--sh2); transform: translateY(-1px); border-color: rgba(212,175,55,0.15); }
  .bp-task-top  { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; min-width: 0; }
  .bp-task-left { display: flex; align-items: flex-start; gap: 11px; flex: 1; min-width: 0; }
  .bp-chk {
    width: 18px; height: 18px; border-radius: 5px; border: 1.5px solid rgba(255,255,255,0.15);
    cursor: pointer; background: transparent; flex-shrink: 0; margin-top: 2px;
    display: flex; align-items: center; justify-content: center; transition: all var(--t1);
    font-size: 10px; color: ${T.forest};
  }
  .bp-chk.done { background: ${T.green};  border-color: ${T.green};  box-shadow: var(--glow-green); }
  .bp-chk.prog { background: ${T.gold};   border-color: ${T.gold};   box-shadow: var(--glow-gold); }
  .bp-tname { font-size: var(--fs-base); font-weight: 500; color: ${T.text}; line-height: var(--lh-snug); overflow-wrap: break-word; min-width: 0; }
  .bp-tname.done { text-decoration: line-through; color: ${T.textLight}; }
  .bp-tright { display: flex; align-items: center; gap: 6px; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end; }
  .bp-tmeta  { display: flex; align-items: center; gap: 12px; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.05); flex-wrap: wrap; }
  .bp-tmi    { display: flex; align-items: center; gap: 4px; font-size: var(--fs-sm); color: ${T.textLight}; }
  .bp-tml    { font-weight: 600; color: ${T.textMid}; }
  .bp-expand { background: none; border: none; font-size: var(--fs-sm); color: ${T.gold}; cursor: pointer; padding: 0; font-family: 'Inter', sans-serif; margin-left: auto; font-weight: 600; white-space: nowrap; }
  .bp-detail { margin-top: 11px; padding-top: 11px; border-top: 1px solid rgba(255,255,255,0.06); display: grid; grid-template-columns: 1fr 1fr; gap: 11px; }
  .bp-ssel {
    padding: 0 9px; min-height: 28px;
    display: inline-flex; align-items: center;
    border-radius: 20px; border: 1px solid rgba(255,255,255,0.10);
    font-size: var(--fs-xs); font-family: 'Inter', sans-serif; font-weight: 500;
    cursor: pointer; outline: none; background: rgba(15,26,20,0.60); transition: all var(--t1);
    white-space: nowrap; color: ${T.textLight};
  }
  .bp-ssel.done { background: rgba(110,232,160,0.12); color: ${T.green}; border-color: rgba(110,232,160,0.25); }
  .bp-ssel.prog { background: rgba(212,175,55,0.12); color: ${T.goldBright}; border-color: rgba(212,175,55,0.25); }
  .bp-ssel.not  { background: rgba(255,255,255,0.05); color: ${T.textLight}; border-color: rgba(255,255,255,0.08); }

  .bp-sum-row  { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 24px; }
  .bp-sum-card {
    background: var(--card-bg); backdrop-filter: var(--card-blr); -webkit-backdrop-filter: var(--card-blr);
    border: 1px solid var(--card-bd); border-radius: var(--r12); padding: 15px 17px; text-align: center; box-shadow: var(--sh1); min-width: 0;
  }
  .bp-sum-num { font-family: 'Manrope', sans-serif; font-size: var(--fs-serif-2xl); font-weight: 700; line-height: 1; margin-bottom: 4px; }
  .bp-sum-lbl { font-size: var(--fs-xs); letter-spacing: 0.14em; text-transform: uppercase; color: ${T.textLight}; font-weight: 600; }

  /* ═══════════════════════════════════════════════════════════════════════════
     STRATEGY / FOUNDERS / SETTINGS
  ═══════════════════════════════════════════════════════════════════════════ */
  .strategy-pillar {
    border-left: 2px solid ${T.gold}; padding: 15px 20px;
    background: var(--card-bg); backdrop-filter: var(--card-blr); -webkit-backdrop-filter: var(--card-blr);
    border-radius: 0 var(--r8) var(--r8) 0;
    margin-bottom: 10px; box-shadow: var(--sh1); transition: all var(--t2); min-width: 0;
  }
  .strategy-pillar:hover { box-shadow: var(--sh2); transform: translateX(2px); }
  .sp-title { font-family: 'Manrope', sans-serif; font-size: var(--fs-md); font-weight: 600; color: ${T.text}; margin-bottom: 5px; overflow-wrap: break-word; }
  .sp-body  { font-size: var(--fs-base); color: ${T.textLight}; line-height: var(--lh-relaxed); overflow-wrap: break-word; }

  .fc-card {
    background: var(--card-bg); backdrop-filter: var(--card-blr); -webkit-backdrop-filter: var(--card-blr);
    border: 1px solid var(--card-bd); border-radius: var(--r16);
    padding: var(--sp20); position: relative; overflow: hidden;
    box-shadow: var(--sh2); transition: all var(--t2); min-width: 0;
  }
  .fc-card:hover { box-shadow: var(--sh3); transform: translateY(-2px); border-color: rgba(212,175,55,0.20); }
  .fc-card::before { content: '✦'; position: absolute; top: 14px; right: 14px; color: rgba(212,175,55,0.15); font-size: 11px; }
  .fc-name { font-family: 'Manrope', sans-serif; font-size: var(--fs-md); font-weight: 600; color: ${T.text}; margin-bottom: 3px; padding-right: 20px; overflow-wrap: break-word; }
  .fc-cat  { font-size: var(--fs-xs); letter-spacing: 0.12em; text-transform: uppercase; color: ${T.gold}; margin-bottom: 14px; font-weight: 600; }
  .fc-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; }
  .fc-metric  { background: rgba(255,255,255,0.04); border-radius: 8px; padding: 9px 11px; border: 1px solid rgba(255,255,255,0.05); }
  .fc-mlabel  { font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: ${T.textLight}; font-weight: 600; }
  .fc-mvalue  { font-family: 'Manrope', sans-serif; font-size: var(--fs-md); color: ${T.text}; margin-top: 2px; font-weight: 600; }

  .settings-section {
    background: var(--card-bg); backdrop-filter: var(--card-blr); -webkit-backdrop-filter: var(--card-blr);
    border: 1px solid var(--card-bd); border-radius: var(--r12); padding: 22px; margin-bottom: 16px; box-shadow: var(--sh1); min-width: 0;
  }
  .settings-title { font-family: 'Manrope', sans-serif; font-size: var(--fs-xl); font-weight: 700; color: ${T.text}; margin-bottom: 16px; overflow-wrap: break-word; }
  .settings-row {
    display: flex; justify-content: space-between; align-items: center; gap: var(--sp12);
    padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: var(--fs-base);
    flex-wrap: wrap;
  }
  .settings-row:last-child { border-bottom: none; }
  .settings-key { color: ${T.textLight}; font-weight: 500; overflow-wrap: break-word; }
  .settings-val { color: ${T.text}; font-family: 'Manrope', sans-serif; font-size: var(--fs-md); text-align: right; overflow-wrap: break-word; max-width: 55%; font-weight: 600; }

  /* ═══════════════════════════════════════════════════════════════════════════
     CALC / SCENARIO
  ═══════════════════════════════════════════════════════════════════════════ */
  .calc-section { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: var(--r12); padding: 18px; margin-bottom: 14px; min-width: 0; }
  .calc-stitle  { font-size: var(--fs-xs); letter-spacing: 0.2em; text-transform: uppercase; color: ${T.gold}; font-weight: 700; margin-bottom: 12px; }
  .calc-result  { background: rgba(11,20,16,0.96); border: 1px solid rgba(46,74,52,0.35); border-radius: var(--r12); padding: 24px; color: ${T.text}; box-shadow: var(--sh4); min-width: 0; }
  .calc-row     { display: flex; justify-content: space-between; align-items: baseline; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); gap: 8px; }
  .calc-row:last-child { border-bottom: none; }
  .calc-rl { font-size: var(--fs-sm); color: ${T.textLight}; flex: 1; overflow-wrap: break-word; }
  .calc-rv { font-family: 'Manrope', sans-serif; font-size: var(--fs-serif-lg); color: ${T.goldBright}; white-space: nowrap; font-weight: 600; }
  .calc-rv.hi  { font-size: var(--fs-serif-xl); color: ${T.text}; }
  .scenario-out { background: linear-gradient(145deg, rgba(15,26,20,0.96), rgba(11,20,16,0.98)); border: 1px solid rgba(46,74,52,0.35); border-radius: var(--r12); padding: 24px; color: ${T.text}; box-shadow: var(--sh4); min-width: 0; }
  .sc-metric    { text-align: center; padding: 14px; }
  .sc-val       { font-family: 'Manrope', sans-serif; font-size: var(--fs-serif-2xl); font-weight: 700; color: ${T.goldBright}; line-height: 1; margin-bottom: 5px; overflow-wrap: break-word; }
  .sc-lbl       { font-size: var(--fs-xs); letter-spacing: 0.16em; text-transform: uppercase; color: ${T.textLight}; font-weight: 600; }

  /* ═══════════════════════════════════════════════════════════════════════════
     UTILITY
  ═══════════════════════════════════════════════════════════════════════════ */
  .divider   { height: 1px; background: linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent); margin: 20px 0; }
  .empty-st  { text-align: center; padding: 52px 20px; color: ${T.textLight}; }
  .empty-ic  { font-size: 38px; margin-bottom: 10px; opacity: 0.20; }
  .flex      { display: flex; }
  .flex-col  { display: flex; flex-direction: column; }
  .ic  { align-items: center; }
  .jb  { justify-content: space-between; }
  .mb12 { margin-bottom: var(--sp12); } .mb16 { margin-bottom: var(--sp16); }
  .mb20 { margin-bottom: var(--sp20); } .mb24 { margin-bottom: var(--sp24); }
  .mt12 { margin-top: var(--sp12); } .mt16 { margin-top: var(--sp16); }
  .overflow-hidden  { overflow: hidden; }
  .text-ellipsis    { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .break-word       { overflow-wrap: break-word; word-break: break-word; }
  .min-w-0          { min-width: 0; }
  .max-w-full       { max-width: 100%; }
  .w-full           { width: 100%; }

  /* ═══════════════════════════════════════════════════════════════════════════
     ANIMATIONS
  ═══════════════════════════════════════════════════════════════════════════ */
  @keyframes fadeUp  { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
  @keyframes shimmer { 0% { background-position:-200% 0; } 100% { background-position:200% 0; } }
  .fade-up  { animation: fadeUp 0.32s var(--ease) both; }
  .skeleton {
    background: linear-gradient(90deg, rgba(46,74,52,0.15) 25%, rgba(46,74,52,0.30) 50%, rgba(46,74,52,0.15) 75%);
    background-size: 200% 100%; animation: shimmer 1.6s infinite; border-radius: 8px;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     MOBILE FAB
  ═══════════════════════════════════════════════════════════════════════════ */
  .mob-btn {
    position: fixed; bottom: max(22px, env(safe-area-inset-bottom, 22px)); right: 22px;
    z-index: 300; width: 52px; height: 52px; border-radius: 50%;
    background: linear-gradient(145deg, rgba(46,74,52,0.95), rgba(15,26,20,0.98));
    border: 1px solid rgba(212,175,55,0.30);
    color: ${T.goldBright}; font-size: 21px;
    display: none; align-items: center; justify-content: center;
    box-shadow: var(--sh4), var(--glow-gold); cursor: pointer; transition: all var(--t2);
  }
  .mob-btn:hover { transform: scale(1.06); }
  .mob-overlay { display: none; }

  /* ═══════════════════════════════════════════════════════════════════════════
     RESPONSIVE BREAKPOINTS
  ═══════════════════════════════════════════════════════════════════════════ */

  @media (min-width: 1400px) {
    :root { --page-pad: 44px; --card-pad: 24px; --section-gap: 28px; }
    .page-title { font-size: 32px; }
    .stat-value { font-size: 30px; }
    .mob-btn { display: none !important; }
  }

  @media (min-width: 960px) and (max-width: 1399px) {
    :root { --page-pad: 26px; --card-pad: 16px; }
    .sidebar { width: 220px; }
    :root { --sw: 220px; }
    .main { margin-left: 220px; }
    .page-title { font-size: 24px; }
    .stat-value { font-size: 20px; }
    .grid-5 { grid-template-columns: repeat(3,1fr); }
    .grid-4 { grid-template-columns: repeat(3,1fr); }
    .company-banner { padding: 20px 22px; }
    .mob-btn { display: none !important; }
  }

  @media (min-width: 600px) and (max-width: 959px) {
    :root { --sw: 0px; --page-pad: 18px; --card-pad: 14px; }
    .sidebar { width: 0; overflow: hidden; transition: width var(--t3); }
    .sidebar.open { width: 252px; }
    .main { margin-left: 0; }
    .page-header { padding: 14px var(--page-pad); position: sticky; top: 0; }
    .page-content { padding: var(--sp20) var(--page-pad); }
    .page-title { font-size: 22px; }
    .grid-5, .grid-4 { grid-template-columns: repeat(2,1fr); }
    .grid-3 { grid-template-columns: repeat(2,1fr); }
    .form-grid { grid-template-columns: 1fr 1fr; }
    .form-grid-3 { grid-template-columns: 1fr 1fr; }
    .bp-hero { flex-direction: row; padding: 18px var(--page-pad); }
    .bp-pct  { font-size: 40px; }
    .bp-sum-row { grid-template-columns: repeat(4,1fr); }
    .bp-detail { grid-template-columns: 1fr 1fr; }
    .company-banner .banner-gem { display: none; }
    .stat-value { font-size: 18px; }
    .mob-btn { display: flex; }
    .mob-overlay.show { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 199; backdrop-filter: blur(4px); }
    .modal { border-radius: var(--r24); padding: 20px; width: 95vw; }
    .modal-lg, .modal-xl { width: 95vw; }
  }

  @media (max-width: 599px) {
    :root { --sw: 0px; --page-pad: 14px; --card-pad: 12px; }
    .sidebar { width: 0; overflow: hidden; transition: width var(--t3); }
    .sidebar.open { width: 272px; }
    .main { margin-left: 0; }
    .page-header { padding: 12px var(--page-pad); position: static; flex-direction: column; align-items: flex-start; }
    .page-header-right { width: 100%; }
    .page-content { padding: 14px var(--page-pad); }
    .page-title   { font-size: 20px; }
    .grid-5, .grid-4, .grid-3, .grid-2 { grid-template-columns: 1fr; }
    .form-grid, .form-grid-3 { grid-template-columns: 1fr; }
    .form-field.full { grid-column: 1; }
    .bp-hero { flex-direction: column; align-items: flex-start; padding: 16px var(--page-pad); }
    .bp-pct { font-size: 36px; }
    .bp-pbar { width: 100%; margin-left: 0; }
    .bp-sum-row { grid-template-columns: repeat(2,1fr); }
    .bp-detail { grid-template-columns: 1fr; }
    .company-banner { padding: 16px 18px; border-radius: var(--r16); }
    .company-banner .banner-gem { display: none; }
    .stat-value { font-size: 18px; }
    .modal { border-radius: var(--r16); padding: 14px; max-height: 98vh; border-radius: 16px 16px 0 0; align-self: flex-end; width: 100%; }
    .modal-overlay { padding: 0; align-items: flex-end; }
    .modal-lg, .modal-xl { width: 100%; }
    .tab { padding: 0 11px; font-size: 12px; }
    .page-header-right .btn { font-size: 12px; padding: 0 11px; }
    .mob-btn { display: flex; }
    .mob-overlay.show { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 199; backdrop-filter: blur(4px); }
  }

  @media (min-width: 960px) {
    .mob-btn    { display: none !important; }
    .mob-overlay { display: none !important; }
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     LEGACY ALIASES
  ═══════════════════════════════════════════════════════════════════════════ */
  .section-label   { font-size:var(--fs-xs); letter-spacing:0.18em; text-transform:uppercase; color:${T.gold}; font-weight:700; margin-bottom:14px; display:block; }
  .empty-state     { text-align:center; padding:52px 20px; color:${T.textLight}; }
  .empty-icon      { font-size:38px; margin-bottom:10px; opacity:0.20; }
  .items-center    { align-items:center; }
  .justify-between { justify-content:space-between; }
  .gap-8  { gap:var(--sp8)  !important; } .gap-12 { gap:var(--sp12) !important; }
  .gap-16 { gap:var(--sp16) !important; } .gap-20 { gap:var(--sp20) !important; }
  .gap-24 { gap:var(--sp24) !important; }
  .mb-16  { margin-bottom:var(--sp16); } .mb-20  { margin-bottom:var(--sp20); }
  .mb-24  { margin-bottom:var(--sp24); } .mt-16  { margin-top:var(--sp16); } .mt-20  { margin-top:var(--sp20); }
  .card { background:var(--card-bg); backdrop-filter:var(--card-blr); -webkit-backdrop-filter:var(--card-blr); border:1px solid var(--card-bd); border-radius:var(--r16); padding:var(--card-pad); box-shadow:var(--sh2); min-width:0; }
  .bp-filter-btn { padding:0 12px; min-height:32px; display:inline-flex; align-items:center; border-radius:20px; border:1px solid rgba(255,255,255,0.10); background:transparent; font-size:var(--fs-sm); font-family:'Inter',sans-serif; color:${T.textLight}; cursor:pointer; transition:all 0.14s; font-weight:500; white-space:nowrap; flex-shrink:0; }
  .bp-filter-btn:hover  { border-color:rgba(212,175,55,0.35); color:${T.text}; }
  .bp-filter-btn.active { background:rgba(46,74,52,0.55); color:${T.goldBright}; border-color:rgba(212,175,55,0.30); }
  .progress-bar { height:4px; background:rgba(255,255,255,0.06); border-radius:4px; overflow:hidden; }
  .progress-fill { height:100%; border-radius:4px; background:linear-gradient(90deg,${T.gold},${T.goldBright}); transition:width 0.8s var(--ease); }
  .insight-label { font-size:9px; letter-spacing:0.26em; text-transform:uppercase; color:${T.goldBright}; margin-bottom:12px; font-weight:700; }

  /* ── Legacy v1.x class aliases ── */
  .bp-hero-title    { font-family:'Manrope',sans-serif; font-size:26px; font-weight:700; color:${T.text}; line-height:1; position:relative; }
  .bp-hero-sub      { font-size:11px; letter-spacing:0.12em; text-transform:uppercase; color:${T.textLight}; margin-top:5px; }
  .bp-overall       { text-align:right; position:relative; }
  .bp-overall-pct   { font-family:'Manrope',sans-serif; font-size:52px; font-weight:700; color:${T.goldBright}; line-height:1; }
  .bp-overall-label { font-size:10px; letter-spacing:0.18em; text-transform:uppercase; color:${T.textLight}; margin-top:3px; }
  .bp-overall-bar   { width:180px; height:3px; background:rgba(255,255,255,0.08); border-radius:3px; margin-top:10px; overflow:hidden; }
  .bp-overall-bar-fill { height:100%; background:linear-gradient(90deg,${T.gold},${T.goldBright}); transition:width 0.9s; }
  .bp-summary-row   { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:24px; }
  .bp-summary-card  { background:var(--card-bg); backdrop-filter:var(--card-blr); -webkit-backdrop-filter:var(--card-blr); border:1px solid var(--card-bd); border-radius:var(--r12); padding:15px 17px; text-align:center; box-shadow:var(--sh1); }
  .bp-summary-num   { font-family:'Manrope',sans-serif; font-size:30px; font-weight:700; line-height:1; margin-bottom:4px; }
  .bp-summary-lbl   { font-size:10px; letter-spacing:0.14em; text-transform:uppercase; color:${T.textLight}; font-weight:600; }
  .bp-section-header{ display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; padding-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.07); gap:12px; flex-wrap:wrap; }
  .bp-section-title { font-family:'Manrope',sans-serif; font-size:20px; font-weight:600; color:${T.text}; flex:1; min-width:0; }
  .bp-section-meta  { display:flex; align-items:center; gap:10px; flex-shrink:0; }
  .bp-section-count { font-size:11px; color:${T.textLight}; white-space:nowrap; }
  .bp-mini-bar      { width:90px; height:3px; background:rgba(255,255,255,0.08); border-radius:3px; overflow:hidden; }
  .bp-mini-bar-fill { height:100%; background:linear-gradient(90deg,${T.gold},${T.goldBright}); border-radius:3px; }
  .bp-task-top      { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
  .bp-task-left     { display:flex; align-items:flex-start; gap:11px; flex:1; min-width:0; }
  .bp-task-right    { display:flex; align-items:center; gap:6px; flex-shrink:0; flex-wrap:wrap; justify-content:flex-end; }
  .bp-task-checkbox { width:18px; height:18px; border-radius:5px; border:1.5px solid rgba(255,255,255,0.15); cursor:pointer; background:transparent; flex-shrink:0; display:flex; align-items:center; justify-content:center; transition:all 0.14s; font-size:10px; color:${T.forest}; }
  .bp-task-checkbox.completed   { background:${T.green}; border-color:${T.green}; }
  .bp-task-checkbox.in-progress { background:${T.gold}; border-color:${T.gold}; }
  .bp-task-name     { font-size:13px; font-weight:500; color:${T.text}; line-height:1.4; overflow-wrap:break-word; min-width:0; }
  .bp-task-name.completed { text-decoration:line-through; color:${T.textLight}; }
  .bp-task-bottom   { display:flex; align-items:center; gap:12px; margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.06); flex-wrap:wrap; }
  .bp-task-meta-item{ display:flex; align-items:center; gap:4px; font-size:11px; color:${T.textLight}; }
  .bp-task-meta-label { font-weight:600; color:${T.textMid}; }
  .bp-task-detail   { margin-top:11px; padding-top:11px; border-top:1px solid rgba(255,255,255,0.06); display:grid; grid-template-columns:1fr 1fr; gap:11px; }
  .bp-task-expand-btn { background:none; border:none; font-size:11px; color:${T.gold}; cursor:pointer; padding:0; font-family:'Inter',sans-serif; margin-left:auto; font-weight:600; white-space:nowrap; }
  .bp-status-select { padding:0 9px; min-height:28px; display:inline-flex; align-items:center; border-radius:20px; border:1px solid rgba(255,255,255,0.10); font-size:11px; font-family:'Inter',sans-serif; font-weight:500; cursor:pointer; outline:none; background:rgba(15,26,20,0.60); color:${T.textLight}; }
  .bp-status-select.completed   { background:rgba(110,232,160,0.12); color:${T.green}; border-color:rgba(110,232,160,0.25); }
  .bp-status-select.in-progress { background:rgba(212,175,55,0.12); color:${T.goldBright}; border-color:rgba(212,175,55,0.25); }
  .bp-status-select.not-started { background:rgba(255,255,255,0.05); color:${T.textLight}; border-color:rgba(255,255,255,0.08); }
  .bp-filter-label  { font-size:9px; letter-spacing:0.2em; text-transform:uppercase; color:${T.textLight}; font-weight:700; margin-right:2px; white-space:nowrap; flex-shrink:0; }
  .action-top  { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
  .action-name { font-size:13px; font-weight:600; color:${T.text}; }
  .action-name.done { text-decoration:line-through; color:${T.textLight}; font-weight:400; }
  .action-meta { display:flex; gap:6px; flex-wrap:wrap; margin-top:7px; align-items:center; }
  @media (max-width:599px) {
    .bp-summary-row { grid-template-columns:repeat(2,1fr); }
    .bp-task-detail { grid-template-columns:1fr; }
    .bp-task-right  { flex-direction:column; align-items:flex-end; gap:4px; }
  }
`

export default css
