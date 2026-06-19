import { T } from './tokens.js'

// ── BOTANICA LIVING GROUP — GLOBAL DESIGN SYSTEM v1.4 ───────────────────────
// Samsung Tab S8 Ultra: 1848×2960px (portrait) / 2960×1848px (landscape)
// Breakpoints: phone <600 | tablet-portrait 600-960 | tablet-landscape 960-1400 | desktop >1400

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Inter:wght@300;400;500;600;700&display=swap');

  /* ═══════════════════════════════════════════════════════════════════════════
     RESET
  ═══════════════════════════════════════════════════════════════════════════ */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    scroll-behavior: smooth;
    /* Prevent text size inflation on mobile */
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     DESIGN TOKENS — Single source of truth for all spacing, type, radius, shadow
  ═══════════════════════════════════════════════════════════════════════════ */
  :root {
    /* ── Layout ── */
    --sw: 268px;            /* sidebar width — desktop */
    --max-content: 1440px;  /* max page content width */
    --page-pad: 36px;       /* page horizontal padding */
    --section-gap: 24px;    /* gap between major sections */
    --card-pad: 22px;       /* default card inner padding */
    --card-pad-sm: 16px;    /* compact card padding */

    /* ── Spacing scale ── */
    --sp2:  2px;   --sp4:  4px;   --sp6:  6px;
    --sp8:  8px;   --sp10: 10px;  --sp12: 12px;
    --sp14: 14px;  --sp16: 16px;  --sp20: 20px;
    --sp24: 24px;  --sp28: 28px;  --sp32: 32px;
    --sp40: 40px;  --sp48: 48px;

    /* ── Border radius scale ── */
    --r4:  6px;   --r8:  10px;
    --r12: 14px;  --r16: 18px;
    --r24: 24px;  --r32: 32px;

    /* ── Typography scale ── */
    --fs-xs:   10px;   /* labels, chips, badges */
    --fs-sm:   11px;   /* meta text, captions */
    --fs-base: 13px;   /* body text, table cells */
    --fs-md:   14px;   /* card descriptions */
    --fs-lg:   16px;   /* card values, td-num */
    --fs-xl:   18px;   /* modal titles, settings headings */
    --fs-2xl:  22px;   /* section titles */
    --fs-3xl:  26px;   /* page titles */
    --fs-4xl:  30px;   /* large KPI numbers */
    --fs-5xl:  36px;   /* hero numbers */
    --fs-serif-base: 15px;
    --fs-serif-md:   18px;
    --fs-serif-lg:   22px;
    --fs-serif-xl:   26px;
    --fs-serif-2xl:  30px;
    --fs-serif-3xl:  36px;

    /* ── Line heights ── */
    --lh-tight:  1.2;
    --lh-snug:   1.4;
    --lh-base:   1.6;
    --lh-relaxed:1.75;
    --lh-loose:  1.85;

    /* ── Shadows ── */
    --sh1: 0 1px  4px rgba(15,35,24,0.06), 0 2px  8px rgba(15,35,24,0.04);
    --sh2: 0 4px 16px rgba(15,35,24,0.08), 0 2px  6px rgba(15,35,24,0.04);
    --sh3: 0 8px 32px rgba(15,35,24,0.12), 0 4px 12px rgba(15,35,24,0.06);
    --sh4: 0 16px 56px rgba(15,35,24,0.16), 0 8px 20px rgba(15,35,24,0.08);

    /* ── Glass ── */
    --glass-bg:  rgba(255,255,255,0.66);
    --glass-bd:  rgba(255,255,255,0.36);
    --glass-blr: blur(28px) saturate(190%) brightness(102%);

    /* ── Motion ── */
    --ease: cubic-bezier(0.22,1,0.36,1);
    --t1: 0.14s var(--ease);
    --t2: 0.22s var(--ease);
    --t3: 0.36s var(--ease);

    /* ── Touch targets ── */
    --touch-min: 44px;   /* minimum touch target — WCAG 2.5.5 */
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     BASE
  ═══════════════════════════════════════════════════════════════════════════ */
  body {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    font-size: var(--fs-base);
    line-height: var(--lh-base);
    color: ${T.text};
    background: ${T.cream};
    background-image:
      radial-gradient(ellipse 70% 40% at 15% 0%,  rgba(45,90,61,0.07)  0%, transparent 55%),
      radial-gradient(ellipse 55% 35% at 85% 100%, rgba(184,151,90,0.06) 0%, transparent 50%);
    min-height: 100vh;
    /* Prevent horizontal overflow at body level */
    overflow-x: hidden;
  }
  .app { display: flex; min-height: 100vh; overflow: hidden; }

  /* ═══════════════════════════════════════════════════════════════════════════
     TYPOGRAPHY SYSTEM
     All text elements use the scale — no arbitrary font-sizes in components
  ═══════════════════════════════════════════════════════════════════════════ */

  /* Page-level headings */
  .page-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: var(--fs-3xl); font-weight: 300; color: ${T.forest};
    letter-spacing: -0.02em; line-height: var(--lh-tight);
    /* Guard: don't let long titles break layout */
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%;
  }
  .page-subtitle {
    font-size: var(--fs-xs); color: ${T.textLight};
    letter-spacing: 0.12em; text-transform: uppercase;
    margin-top: var(--sp4); font-weight: 500;
    /* Guard: wrap subtitle if needed */
    white-space: normal; line-height: var(--lh-snug);
  }

  /* Section labels */
  .sec-label, .section-label {
    font-size: var(--fs-xs); letter-spacing: 0.22em;
    text-transform: uppercase; color: ${T.gold}; font-weight: 700;
    margin-bottom: var(--sp14); display: block;
  }

  /* Card / modal title */
  .card-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: var(--fs-serif-lg); font-weight: 400; color: ${T.forest};
    line-height: var(--lh-snug);
    /* Guard */
    overflow: hidden; text-overflow: ellipsis;
  }

  /* Description text — max-width + wrapping guard */
  .desc {
    font-size: var(--fs-base); color: ${T.textMid};
    line-height: var(--lh-relaxed);
    max-width: 72ch; /* optimal reading width */
    overflow-wrap: break-word; word-break: break-word;
  }
  .desc-sm {
    font-size: var(--fs-sm); color: ${T.textMid};
    line-height: var(--lh-snug);
    overflow-wrap: break-word; word-break: break-word;
  }

  /* Stat / KPI values */
  .stat-label { font-size: var(--fs-xs); letter-spacing: 0.18em; text-transform: uppercase; color: ${T.textLight}; font-weight: 600; margin-bottom: var(--sp8); }
  .stat-value { font-family: 'Cormorant Garamond', serif; font-size: var(--fs-4xl); font-weight: 300; line-height: 1; letter-spacing: -0.01em; overflow: hidden; text-overflow: ellipsis; }
  .stat-sub   { font-size: var(--fs-sm); color: ${T.textMid}; margin-top: var(--sp6); }
  .stat-top   { height: 2px; border-radius: 2px; margin-bottom: var(--sp14); }

  /* Label text (form labels etc.) */
  label {
    font-size: var(--fs-xs); letter-spacing: 0.12em;
    text-transform: uppercase; color: ${T.textMid}; font-weight: 600;
    display: block; /* ensure block for spacing */
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     SIDEBAR
  ═══════════════════════════════════════════════════════════════════════════ */
  .sidebar {
    width: var(--sw);
    background: ${T.forest};
    background-image: linear-gradient(175deg, #162C1E 0%, ${T.forest} 40%, #080F0B 100%);
    display: flex; flex-direction: column;
    position: fixed; inset: 0 auto 0 0;
    z-index: 200; overflow: hidden;
    transition: width var(--t3);
    box-shadow: 2px 0 40px rgba(0,0,0,0.3), inset -1px 0 0 rgba(255,255,255,0.03);
    /* Samsung: safe area inset left */
    padding-left: env(safe-area-inset-left, 0px);
  }
  .sidebar::before {
    content: '';
    position: absolute; inset: 0;
    background: radial-gradient(ellipse 80% 40% at 50% 0%, rgba(184,151,90,0.07) 0%, transparent 60%);
    pointer-events: none;
  }
  .sidebar-scroll { flex: 1; overflow-y: auto; overflow-x: hidden; padding-bottom: var(--sp16); }
  .sidebar-scroll::-webkit-scrollbar { width: 0; }

  .sidebar-logo { padding: 26px 22px 20px; flex-shrink: 0; position: relative; }
  .sidebar-logo::after {
    content: ''; position: absolute; bottom: 0; left: 22px; right: 22px; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(184,151,90,0.28), transparent);
  }
  .logo-mark { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
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
    letter-spacing: 0.08em; line-height: 1.2; display: block;
  }
  .logo-text .sub {
    font-size: 9px; letter-spacing: 0.22em; text-transform: uppercase;
    color: rgba(255,255,255,0.25); display: block; margin-top: 1px;
  }
  .logo-reg { font-size: 9px; color: rgba(255,255,255,0.14); letter-spacing: 0.03em; }

  .nav-section { padding: 18px 14px 4px; }
  .nav-section-label {
    font-size: 9px; letter-spacing: 0.28em; text-transform: uppercase;
    color: rgba(255,255,255,0.18); font-weight: 700; padding: 0 8px;
  }
  .nav-item {
    display: flex; align-items: center; gap: 10px;
    /* Touch target: min 44px height */
    min-height: var(--touch-min);
    padding: 0 12px;
    margin: 2px 0; border-radius: var(--r8);
    cursor: pointer; color: rgba(255,255,255,0.45);
    font-size: var(--fs-base); font-weight: 400;
    transition: all var(--t2); position: relative; user-select: none;
  }
  .nav-item:hover { color: rgba(255,255,255,0.9); background: rgba(255,255,255,0.06); }
  .nav-item.active {
    color: ${T.goldBright};
    background: linear-gradient(135deg, rgba(184,151,90,0.2), rgba(184,151,90,0.08));
    font-weight: 600;
    box-shadow: inset 0 0 0 1px rgba(184,151,90,0.22), var(--sh1);
  }
  .nav-item.active::before {
    content: ''; position: absolute; right: -14px; top: 50%; transform: translateY(-50%);
    width: 3px; height: 20px;
    background: linear-gradient(180deg, ${T.goldBright}, ${T.gold});
    border-radius: 2px 0 0 2px; box-shadow: 0 0 12px rgba(232,192,122,0.5);
  }
  .nav-icon {
    width: 28px; height: 28px; border-radius: var(--r4);
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; flex-shrink: 0; transition: all var(--t2);
  }
  .nav-item.active .nav-icon { background: rgba(184,151,90,0.2); color: ${T.goldBright}; }
  .nav-label { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sidebar-footer {
    padding: 14px 22px; flex-shrink: 0;
    border-top: 1px solid rgba(255,255,255,0.05);
    font-size: var(--fs-xs); color: rgba(255,255,255,0.18);
  }
  .sidebar-version { font-size: 9px; color: rgba(255,255,255,0.1); margin-top: 2px; }

  /* ═══════════════════════════════════════════════════════════════════════════
     MAIN CONTENT
  ═══════════════════════════════════════════════════════════════════════════ */
  .main {
    margin-left: var(--sw); flex: 1;
    min-height: 100vh; min-width: 0; /* prevent flex overflow */
    display: flex; flex-direction: column;
    /* Samsung: safe area right */
    padding-right: env(safe-area-inset-right, 0px);
  }

  .page-header {
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blr); -webkit-backdrop-filter: var(--glass-blr);
    border-bottom: 1px solid var(--glass-bd);
    padding: 20px var(--page-pad) 16px;
    display: flex; align-items: flex-end; justify-content: space-between;
    gap: var(--sp16); flex-wrap: wrap;
    position: sticky; top: 0; z-index: 50;
    box-shadow: var(--sh1);
    /* Guard: header must not overflow */
    min-width: 0;
  }
  .page-header-left { min-width: 0; flex: 1; }
  .page-header-right { flex-shrink: 0; display: flex; gap: var(--sp8); flex-wrap: wrap; }

  .page-content {
    padding: var(--sp28) var(--page-pad);
    flex: 1;
    /* Guard: content must not overflow its container */
    min-width: 0; max-width: 100%;
    overflow-x: hidden;
  }

  /* Content width cap on ultra-wide screens */
  .content-inner {
    max-width: var(--max-content);
    margin: 0 auto;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     GLASS CARDS — Layout guard: overflow visible by default, min-width 0
  ═══════════════════════════════════════════════════════════════════════════ */
  .g-card {
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blr); -webkit-backdrop-filter: var(--glass-blr);
    border: 1px solid var(--glass-bd);
    border-radius: var(--r16); padding: var(--card-pad);
    box-shadow: var(--sh2);
    transition: box-shadow var(--t2), transform var(--t2);
    position: relative;
    /* Layout guard */
    min-width: 0; overflow: hidden;
  }
  .g-card::before {
    content: ''; position: absolute; inset: 0; border-radius: inherit;
    background: linear-gradient(145deg, rgba(255,255,255,0.35) 0%, transparent 55%);
    pointer-events: none;
  }
  .g-card:hover { box-shadow: var(--sh3); }
  .g-card-click { cursor: pointer; }
  .g-card-click:hover { transform: translateY(-2px); }

  /* Card text guards — prevent content from spilling */
  .g-card h2, .g-card h3, .g-card .card-heading {
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    min-width: 0;
  }
  .g-card p, .g-card .card-desc {
    overflow-wrap: break-word; word-break: break-word;
    max-width: 100%;
  }

  .g-card-dark {
    background: linear-gradient(145deg, ${T.forest} 0%, #0A1A10 100%);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: var(--r16); padding: var(--card-pad);
    box-shadow: var(--sh3); color: ${T.white};
    position: relative; overflow: hidden; min-width: 0;
  }
  .g-card-dark::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse 80% 60% at 80% 0%, rgba(184,151,90,0.09) 0%, transparent 60%);
    pointer-events: none;
  }

  /* Stat cards */
  .stat-card {
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blr); -webkit-backdrop-filter: var(--glass-blr);
    border: 1px solid var(--glass-bd);
    border-radius: var(--r12); padding: var(--sp16) var(--sp20);
    position: relative; overflow: hidden;
    box-shadow: var(--sh1);
    transition: all var(--t2); cursor: pointer;
    min-width: 0; /* layout guard */
  }
  .stat-card::before {
    content: ''; position: absolute; inset: 0; border-radius: inherit;
    background: linear-gradient(145deg, rgba(255,255,255,0.4) 0%, transparent 60%);
    pointer-events: none;
  }
  .stat-card:hover { box-shadow: var(--sh3); transform: translateY(-2px); }

  /* ═══════════════════════════════════════════════════════════════════════════
     GRID SYSTEM — responsive at each breakpoint
  ═══════════════════════════════════════════════════════════════════════════ */
  .grid-2 { display: grid; grid-template-columns: repeat(2,1fr); gap: var(--sp16); }
  .grid-3 { display: grid; grid-template-columns: repeat(3,1fr); gap: var(--sp16); }
  .grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: var(--sp14); }
  .grid-5 { display: grid; grid-template-columns: repeat(5,1fr); gap: var(--sp14); }
  /* Gap overrides */
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
    white-space: nowrap; flex-shrink: 0; /* badges must never wrap */
  }
  .badge-forest { background: rgba(45,90,61,0.18); color: ${T.forestGlow}; border: 1px solid rgba(45,90,61,0.2); }
  .badge-gold   { background: ${T.goldPale}; color: ${T.gold}; border: 1px solid rgba(184,151,90,0.22); }
  .badge-grey   { background: rgba(161,161,170,0.12); color: ${T.textMid}; border: 1px solid rgba(161,161,170,0.18); }
  .badge-red    { background: ${T.redPale}; color: ${T.danger}; border: 1px solid rgba(185,28,28,0.15); }
  .badge-teal   { background: ${T.tealPale}; color: ${T.teal}; border: 1px solid rgba(14,116,144,0.18); }
  .badge-green  { background: ${T.greenPale}; color: ${T.green}; border: 1px solid rgba(21,128,61,0.18); }
  .badge-blue   { background: ${T.bluePale}; color: ${T.blue}; border: 1px solid rgba(29,78,216,0.18); }

  /* Priority badges */
  .pri-critical { background: ${T.redPale};    color: ${T.danger};  border: 1px solid rgba(185,28,28,0.15); }
  .pri-high     { background: rgba(184,151,90,0.12); color: #92650A; border: 1px solid rgba(184,151,90,0.22); }
  .pri-medium   { background: ${T.greenPale};  color: ${T.green};   border: 1px solid rgba(21,128,61,0.18); }
  .pri-low      { background: rgba(161,161,170,0.1); color: ${T.textMid}; border: 1px solid rgba(161,161,170,0.15); }

  /* Finance colours */
  .fc-inv { color: ${T.teal}; } .fc-inc { color: ${T.green}; }
  .fc-exp { color: ${T.red}; } .fc-rem { color: ${T.gold}; } .fc-net { color: ${T.forest}; }
  .border-inv { border-top: 2px solid ${T.teal} !important; }
  .border-inc { border-top: 2px solid ${T.green} !important; }
  .border-exp { border-top: 2px solid ${T.red} !important; }
  .border-rem { border-top: 2px solid ${T.gold} !important; }
  .border-net { border-top: 2px solid ${T.forestLight} !important; }

  /* ═══════════════════════════════════════════════════════════════════════════
     TABLE — responsive + overflow guards
  ═══════════════════════════════════════════════════════════════════════════ */
  .table-wrap {
    overflow-x: auto; border-radius: var(--r12);
    -webkit-overflow-scrolling: touch; /* smooth scroll Samsung */
    /* Guard: show scrollbar hint on Samsung */
    scrollbar-width: thin;
    scrollbar-color: rgba(184,151,90,0.3) transparent;
  }
  .table-wrap::-webkit-scrollbar { height: 4px; }
  .table-wrap::-webkit-scrollbar-track { background: transparent; }
  .table-wrap::-webkit-scrollbar-thumb { background: rgba(184,151,90,0.3); border-radius: 4px; }

  table { width: 100%; border-collapse: collapse; }
  th {
    text-align: left; font-size: var(--fs-xs); letter-spacing: 0.18em;
    text-transform: uppercase; color: ${T.textLight};
    padding: 11px 16px; border-bottom: 1px solid ${T.beigeDeep};
    background: rgba(228,221,208,0.55); font-weight: 700;
    white-space: nowrap; backdrop-filter: blur(8px);
    /* Prevent column headers from squishing */
    min-width: max-content;
  }
  th:first-child { border-radius: var(--r8) 0 0 0; }
  th:last-child  { border-radius: 0 var(--r8) 0 0; }
  td {
    padding: 12px 16px; border-bottom: 1px solid rgba(210,200,184,0.4);
    font-size: var(--fs-base); vertical-align: middle;
    /* Text overflow guard */
    max-width: 280px; overflow: hidden; text-overflow: ellipsis;
  }
  td.td-wrap { white-space: normal; overflow: visible; text-overflow: unset; } /* opt-out for wrapping cells */
  tr:last-child td { border-bottom: none; }
  tr { transition: background var(--t1); }
  tr:hover td { background: rgba(255,255,255,0.6); }
  .td-name { font-weight: 600; color: ${T.forest}; white-space: nowrap; }
  .td-num  { font-family: 'Cormorant Garamond', serif; font-size: var(--fs-lg); color: ${T.forestLight}; white-space: nowrap; }

  /* ═══════════════════════════════════════════════════════════════════════════
     BUTTONS — touch-friendly minimum sizes
  ═══════════════════════════════════════════════════════════════════════════ */
  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    /* Touch target: min 44px height */
    min-height: var(--touch-min); padding: 0 18px;
    border-radius: var(--r8);
    font-size: var(--fs-base); font-weight: 600; letter-spacing: 0.01em;
    cursor: pointer; border: none;
    transition: all var(--t2); font-family: 'Inter', sans-serif;
    white-space: nowrap; user-select: none; text-decoration: none;
    flex-shrink: 0; /* buttons must not shrink below their content */
  }
  .btn:active { transform: scale(0.97); }
  .btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

  .btn-primary  { background: linear-gradient(145deg, ${T.forestLight}, ${T.forest}); color: ${T.goldBright}; box-shadow: var(--sh2); }
  .btn-primary:hover:not(:disabled)  { box-shadow: var(--sh3); transform: translateY(-1px); }
  .btn-gold     { background: linear-gradient(145deg, ${T.goldBright}, ${T.gold}); color: ${T.white}; box-shadow: var(--sh2); }
  .btn-gold:hover:not(:disabled)     { box-shadow: var(--sh3); transform: translateY(-1px); }
  .btn-outline  { background: var(--glass-bg); backdrop-filter: blur(12px); border: 1px solid ${T.beigeDeep}; color: ${T.textMid}; }
  .btn-outline:hover:not(:disabled)  { border-color: ${T.gold}; color: ${T.forest}; background: rgba(255,255,255,0.85); }
  .btn-ghost    { background: transparent; color: ${T.textMid}; }
  .btn-ghost:hover:not(:disabled)    { background: rgba(0,0,0,0.05); color: ${T.text}; }
  .btn-danger   { background: ${T.danger}; color: ${T.white}; }
  .btn-danger:hover:not(:disabled)   { opacity: 0.88; }

  /* Sizes — all maintain 44px touch target */
  .btn-sm  { min-height: 36px; padding: 0 14px; font-size: var(--fs-sm); border-radius: var(--r4); }
  .btn-xs  { min-height: 30px; padding: 0 10px; font-size: var(--fs-xs); border-radius: var(--r4); }
  .btn-icon { width: var(--touch-min); height: var(--touch-min); padding: 0; border-radius: var(--r8); }

  /* ═══════════════════════════════════════════════════════════════════════════
     FORMS — no leading zero, consistent sizing, tablet-friendly
  ═══════════════════════════════════════════════════════════════════════════ */
  .form-grid   { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp14); }
  .form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--sp14); }
  .form-field  { display: flex; flex-direction: column; gap: var(--sp6); min-width: 0; }
  .form-field.full { grid-column: 1 / -1; }

  input, select, textarea {
    padding: 11px 14px;                 /* touch-friendly height */
    border: 1.5px solid rgba(210,200,184,0.7);
    border-radius: var(--r8); font-size: var(--fs-base);
    font-family: 'Inter', sans-serif;
    background: rgba(255,255,255,0.72); backdrop-filter: blur(8px);
    color: ${T.text}; outline: none;
    transition: all var(--t1); width: 100%;
    /* Touch: ensure min height on all platforms */
    min-height: var(--touch-min);
    /* Remove browser quirks */
    -webkit-appearance: none; appearance: none;
  }
  select { -webkit-appearance: auto; appearance: auto; } /* restore arrow on selects */
  input:focus, select:focus, textarea:focus {
    border-color: ${T.gold}; background: rgba(255,255,255,0.95);
    box-shadow: 0 0 0 3px rgba(184,151,90,0.14);
  }
  input::placeholder { color: ${T.textMuted}; }
  textarea { resize: vertical; min-height: 72px; }
  /* Prevent iOS zoom on focus (font-size must be ≥16px in input on iOS) */
  @media (max-width: 768px) {
    input, select, textarea { font-size: 16px; }
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     MODAL — touch-friendly, Samsung-optimised
  ═══════════════════════════════════════════════════════════════════════════ */
  .modal-overlay {
    position: fixed; inset: 0; z-index: 500;
    background: rgba(8,15,10,0.65);
    backdrop-filter: blur(8px) saturate(150%); -webkit-backdrop-filter: blur(8px) saturate(150%);
    display: flex; align-items: center; justify-content: center;
    padding: var(--sp16);
    animation: ovIn 0.16s ease;
    /* Samsung: account for system UI */
    padding-bottom: max(var(--sp16), env(safe-area-inset-bottom));
  }
  @keyframes ovIn { from { opacity: 0; } to { opacity: 1; } }

  .modal {
    background: rgba(247,243,237,0.94);
    backdrop-filter: blur(48px) saturate(220%); -webkit-backdrop-filter: blur(48px) saturate(220%);
    border: 1px solid rgba(255,255,255,0.55);
    border-radius: var(--r32); width: 720px; max-width: 100%;
    /* Guard: don't fill entire screen height */
    max-height: min(92vh, 860px);
    overflow-y: auto; padding: 32px;
    box-shadow: var(--sh4), inset 0 1px 0 rgba(255,255,255,0.65);
    animation: mdIn 0.22s var(--ease);
    -webkit-overflow-scrolling: touch;
  }
  @keyframes mdIn { from { transform: translateY(16px) scale(0.98); opacity: 0; } to { transform: none; opacity: 1; } }
  .modal-lg  { width: 880px; }
  .modal-xl  { width: 1040px; }

  .modal-header {
    display: flex; justify-content: space-between; align-items: flex-start;
    margin-bottom: 22px; padding-bottom: 18px; border-bottom: 1px solid rgba(210,200,184,0.5);
    /* Guard */
    min-width: 0; gap: var(--sp12);
  }
  .modal-title {
    font-family: 'Cormorant Garamond', serif; font-size: var(--fs-xl); font-weight: 400; color: ${T.forest};
    /* Guard */
    overflow: hidden; text-overflow: ellipsis; flex: 1;
  }
  .modal-close {
    width: var(--touch-min); height: var(--touch-min); border-radius: 50%;
    background: rgba(161,161,170,0.12); border: none; cursor: pointer;
    color: ${T.textMid}; font-size: 14px;
    display: flex; align-items: center; justify-content: center;
    transition: all var(--t1); flex-shrink: 0;
  }
  .modal-close:hover { background: rgba(161,161,170,0.22); color: ${T.text}; }
  .modal-footer {
    display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap;
    margin-top: 24px; padding-top: 20px; border-top: 1px solid rgba(210,200,184,0.5);
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     TABS — horizontal scroll on small screens, touch-friendly
  ═══════════════════════════════════════════════════════════════════════════ */
  .tabs {
    display: flex; gap: 2px; padding: 3px;
    background: rgba(210,200,184,0.22); border-radius: var(--r8);
    margin-bottom: 22px;
    /* Scroll on small screens — never overflow or wrap */
    overflow-x: auto; -webkit-overflow-scrolling: touch;
    scrollbar-width: none; /* hide scrollbar but keep scrollable */
    flex-wrap: nowrap; /* NEVER wrap */
    /* Ensure tabs container doesn't shrink the page */
    min-width: 0;
  }
  .tabs::-webkit-scrollbar { display: none; }
  .tab {
    /* Touch target */
    min-height: 36px; padding: 0 16px;
    display: flex; align-items: center;
    font-size: var(--fs-base); font-weight: 500; color: ${T.textMid};
    border-radius: var(--r8); cursor: pointer; transition: all var(--t1);
    white-space: nowrap; user-select: none; flex-shrink: 0; /* tabs must not shrink */
  }
  .tab:hover { color: ${T.forest}; background: rgba(255,255,255,0.5); }
  .tab.active { color: ${T.forest}; background: ${T.white}; font-weight: 600; box-shadow: var(--sh1); }

  /* ═══════════════════════════════════════════════════════════════════════════
     PROGRESS BARS
  ═══════════════════════════════════════════════════════════════════════════ */
  .pbar { height: 4px; background: rgba(210,200,184,0.35); border-radius: 4px; overflow: hidden; }
  .pbar-fill { height: 100%; border-radius: 4px; transition: width 0.8s var(--ease); }
  .pbar-gold   { background: linear-gradient(90deg, ${T.gold}, ${T.goldBright}); }
  .pbar-teal   { background: linear-gradient(90deg, ${T.teal}, #1A9EB8); }
  .pbar-green  { background: linear-gradient(90deg, ${T.green}, #22A864); }
  .pbar-red    { background: linear-gradient(90deg, ${T.red}, #E83333); }
  .pbar-forest { background: linear-gradient(90deg, ${T.forest}, ${T.forestLight}); }

  /* ═══════════════════════════════════════════════════════════════════════════
     HEALTH SCORE RING
  ═══════════════════════════════════════════════════════════════════════════ */
  .ring-wrap { position: relative; flex-shrink: 0; }
  .ring-svg  { transform: rotate(-90deg); display: block; }
  .ring-bg   { fill: none; stroke: rgba(210,200,184,0.3); }
  .ring-fg   { fill: none; stroke-linecap: round; transition: stroke-dashoffset 1s var(--ease); }
  .ring-text {
    position: absolute; inset: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
  }
  .ring-num  { font-family: 'Cormorant Garamond', serif; font-weight: 400; line-height: 1; }
  .ring-unit { font-size: 9px; color: ${T.textLight}; letter-spacing: 0.06em; margin-top: 1px; }

  /* ═══════════════════════════════════════════════════════════════════════════
     INSIGHT / QUOTE / COMPANY BANNER
  ═══════════════════════════════════════════════════════════════════════════ */
  .insight-box {
    background: linear-gradient(145deg, ${T.forest} 0%, #0A1A10 100%);
    border-radius: var(--r16); padding: 26px; color: ${T.white};
    box-shadow: var(--sh4); position: relative; overflow: hidden;
    border: 1px solid rgba(255,255,255,0.04); min-width: 0;
  }
  .insight-box::before {
    content: ''; position: absolute; top: -20%; right: -10%; width: 80%; height: 100%;
    background: radial-gradient(ellipse, rgba(184,151,90,0.12) 0%, transparent 60%); pointer-events: none;
  }
  .insight-tag  { font-size: 9px; letter-spacing: 0.26em; text-transform: uppercase; color: ${T.goldBright}; margin-bottom: 12px; font-weight: 700; position: relative; }
  .insight-text { font-size: var(--fs-md); line-height: var(--lh-loose); color: rgba(255,255,255,0.8); position: relative; overflow-wrap: break-word; }

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
  .quote-text { font-family: 'Cormorant Garamond', serif; font-size: var(--fs-serif-xl); font-weight: 300; font-style: italic; color: ${T.goldBright}; position: relative; }
  .quote-attr { font-size: var(--fs-xs); color: rgba(255,255,255,0.28); margin-top: 10px; letter-spacing: 0.18em; text-transform: uppercase; position: relative; }

  .company-banner {
    background: linear-gradient(145deg, ${T.forest} 0%, #0D2218 55%, #070E0A 100%);
    border-radius: var(--r24); padding: 28px 32px;
    position: relative; overflow: hidden;
    box-shadow: var(--sh4); border: 1px solid rgba(255,255,255,0.04); min-width: 0;
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
    font-size: 72px; color: rgba(184,151,90,0.05); pointer-events: none; font-family: serif;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     MILESTONE / PRIORITY / ACTION
  ═══════════════════════════════════════════════════════════════════════════ */
  .milestone-row { display: flex; align-items: flex-start; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(210,200,184,0.32); }
  .milestone-row:last-child { border-bottom: none; }
  .m-icon { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; margin-top: 2px; }
  .m-done   { background: rgba(21,128,61,0.15); color: ${T.green}; }
  .m-prog   { background: ${T.goldPale}; color: ${T.gold}; }
  .m-future { background: rgba(161,161,170,0.1); color: ${T.textLight}; }
  .m-title  { font-weight: 500; font-size: var(--fs-base); color: ${T.text}; overflow-wrap: break-word; }
  .m-sub    { font-size: var(--fs-sm); color: ${T.textLight}; margin-top: 1px; }

  .priority-item { display: flex; align-items: flex-start; gap: 11px; padding: 11px 0; border-bottom: 1px solid rgba(210,200,184,0.35); }
  .priority-item:last-child { border-bottom: none; }
  .p-dot { width: 7px; height: 7px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; }
  .p-dot-gold  { background: ${T.gold};        box-shadow: 0 0 6px rgba(184,151,90,0.45); }
  .p-dot-green { background: ${T.forestLight}; box-shadow: 0 0 6px rgba(45,90,61,0.45); }
  .p-title { font-weight: 600; font-size: var(--fs-base); color: ${T.text}; overflow-wrap: break-word; }
  .p-desc  { font-size: var(--fs-sm); color: ${T.textMid}; margin-top: 2px; line-height: var(--lh-snug); overflow-wrap: break-word; }

  .action-card {
    background: var(--glass-bg); backdrop-filter: var(--glass-blr); -webkit-backdrop-filter: var(--glass-blr);
    border: 1px solid var(--glass-bd); border-radius: var(--r12);
    padding: var(--sp14) var(--sp16); margin-bottom: 8px;
    transition: all var(--t2); box-shadow: var(--sh1); min-width: 0;
  }
  .action-card:hover { box-shadow: var(--sh2); transform: translateY(-1px); }

  /* ═══════════════════════════════════════════════════════════════════════════
     DOCUMENT CARDS
  ═══════════════════════════════════════════════════════════════════════════ */
  .doc-card {
    background: var(--glass-bg); backdrop-filter: var(--glass-blr); -webkit-backdrop-filter: var(--glass-blr);
    border: 1px solid var(--glass-bd); border-radius: var(--r12);
    padding: var(--sp16); display: flex; align-items: flex-start; gap: 14px;
    box-shadow: var(--sh1); transition: all var(--t2); cursor: pointer; min-width: 0;
  }
  .doc-card:hover { box-shadow: var(--sh3); transform: translateY(-1px); border-color: rgba(184,151,90,0.22); }
  .doc-icon {
    width: 42px; height: 42px; border-radius: 10px;
    background: linear-gradient(145deg, rgba(184,151,90,0.2), rgba(184,151,90,0.08));
    display: flex; align-items: center; justify-content: center;
    font-size: 19px; flex-shrink: 0; box-shadow: var(--sh1);
  }
  .doc-name { font-weight: 600; font-size: var(--fs-base); color: ${T.forest}; overflow-wrap: break-word; }
  .doc-meta { font-size: var(--fs-sm); color: ${T.textLight}; margin-top: 3px; overflow-wrap: break-word; }

  .doc-drop-zone {
    border: 2px dashed rgba(210,200,184,0.6); border-radius: var(--r16);
    padding: 44px 24px; text-align: center; cursor: pointer;
    transition: all var(--t2); background: rgba(255,255,255,0.25);
    min-height: 140px; display: flex; flex-direction: column; align-items: center; justify-content: center;
  }
  .doc-drop-zone:hover, .doc-drop-zone.over {
    border-color: ${T.gold}; background: rgba(255,255,255,0.5);
    box-shadow: 0 0 0 4px rgba(184,151,90,0.1);
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     BUSINESS PROGRESS
  ═══════════════════════════════════════════════════════════════════════════ */
  .bp-hero {
    background: linear-gradient(145deg, ${T.forest} 0%, #0D2018 70%, #060E08 100%);
    padding: 26px var(--page-pad); display: flex; align-items: center; justify-content: space-between;
    gap: var(--sp20); flex-wrap: wrap; position: relative; overflow: hidden;
    border-bottom: 1px solid rgba(255,255,255,0.04);
  }
  .bp-hero::before {
    content: ''; position: absolute; top: -40%; right: 0; width: 50%; height: 200%;
    background: radial-gradient(ellipse, rgba(184,151,90,0.07) 0%, transparent 60%); pointer-events: none;
  }
  .bp-title { font-family: 'Cormorant Garamond', serif; font-size: var(--fs-serif-xl); font-weight: 300; color: ${T.white}; line-height: 1; }
  .bp-sub   { font-size: var(--fs-sm); letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.35); margin-top: 5px; overflow-wrap: break-word; }
  .bp-pct   { font-family: 'Cormorant Garamond', serif; font-size: var(--fs-5xl); font-weight: 300; color: ${T.goldBright}; line-height: 1; }
  .bp-pct-lbl { font-size: var(--fs-xs); letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.35); margin-top: 3px; }
  .bp-pbar    { width: 180px; height: 3px; background: rgba(255,255,255,0.1); border-radius: 3px; margin-top: 10px; overflow: hidden; }
  .bp-pbar-f  { height: 100%; background: linear-gradient(90deg, ${T.gold}, ${T.goldBright}); transition: width 0.9s var(--ease); }

  .bp-filters {
    display: flex; align-items: center; gap: 7px;
    padding: 12px var(--page-pad);
    background: rgba(255,255,255,0.5); backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(210,200,184,0.4);
    /* Touch-friendly: allow horizontal scroll, never wrap */
    overflow-x: auto; flex-wrap: nowrap;
    -webkit-overflow-scrolling: touch; scrollbar-width: none;
  }
  .bp-filters::-webkit-scrollbar { display: none; }
  .bp-flabel { font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; color: ${T.textLight}; font-weight: 700; margin-right: 2px; white-space: nowrap; flex-shrink: 0; }
  .bp-fbtn {
    padding: 0 12px; min-height: 32px;
    display: inline-flex; align-items: center;
    border-radius: 20px; border: 1px solid rgba(210,200,184,0.5);
    background: transparent; font-size: var(--fs-sm);
    font-family: 'Inter', sans-serif; color: ${T.textMid};
    cursor: pointer; transition: all var(--t1); font-weight: 500;
    white-space: nowrap; flex-shrink: 0;
  }
  .bp-fbtn:hover  { border-color: ${T.gold}; color: ${T.forest}; }
  .bp-fbtn.active { background: ${T.forest}; color: ${T.goldBright}; border-color: ${T.forest}; box-shadow: var(--sh1); }

  .bp-section { margin-bottom: 24px; }
  .bp-sec-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid rgba(210,200,184,0.38);
    gap: var(--sp12); flex-wrap: wrap;
  }
  .bp-sec-title { font-family: 'Cormorant Garamond', serif; font-size: var(--fs-serif-lg); font-weight: 400; color: ${T.forest}; flex: 1; min-width: 0; }
  .bp-sec-meta  { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
  .bp-sec-count { font-size: var(--fs-sm); color: ${T.textLight}; white-space: nowrap; }
  .bp-minibar   { width: 90px; height: 3px; background: rgba(210,200,184,0.38); border-radius: 3px; overflow: hidden; }
  .bp-minibar-fill { height: 100%; background: linear-gradient(90deg, ${T.gold}, ${T.goldBright}); border-radius: 3px; }
  .bp-sec-pct   { font-family: 'Cormorant Garamond', serif; font-size: var(--fs-serif-base); color: ${T.gold}; min-width: 32px; text-align: right; }

  .bp-task {
    background: var(--glass-bg); backdrop-filter: var(--glass-blr); -webkit-backdrop-filter: var(--glass-blr);
    border: 1px solid var(--glass-bd); border-radius: var(--r8);
    padding: var(--sp12) var(--sp16); margin-bottom: 7px;
    transition: all var(--t2); min-width: 0;
  }
  .bp-task:hover { box-shadow: var(--sh2); transform: translateY(-1px); }
  .bp-task-top  { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; min-width: 0; }
  .bp-task-left { display: flex; align-items: flex-start; gap: 11px; flex: 1; min-width: 0; }
  .bp-chk {
    width: 18px; height: 18px; border-radius: 5px; border: 1.5px solid rgba(210,200,184,0.6);
    cursor: pointer; background: transparent; flex-shrink: 0; margin-top: 2px;
    display: flex; align-items: center; justify-content: center; transition: all var(--t1);
    font-size: 10px; color: ${T.white};
  }
  .bp-chk.done { background: ${T.green};  border-color: ${T.green};  box-shadow: 0 0 8px rgba(21,128,61,0.3); }
  .bp-chk.prog { background: ${T.gold};   border-color: ${T.gold};   box-shadow: 0 0 8px rgba(184,151,90,0.3); }
  .bp-tname { font-size: var(--fs-base); font-weight: 500; color: ${T.text}; line-height: var(--lh-snug); overflow-wrap: break-word; min-width: 0; }
  .bp-tname.done { text-decoration: line-through; color: ${T.textLight}; }
  .bp-tright { display: flex; align-items: center; gap: 6px; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end; }
  .bp-tmeta  { display: flex; align-items: center; gap: 12px; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(210,200,184,0.3); flex-wrap: wrap; }
  .bp-tmi    { display: flex; align-items: center; gap: 4px; font-size: var(--fs-sm); color: ${T.textLight}; }
  .bp-tml    { font-weight: 600; color: ${T.textMid}; }
  .bp-expand { background: none; border: none; font-size: var(--fs-sm); color: ${T.gold}; cursor: pointer; padding: 0; font-family: 'Inter', sans-serif; margin-left: auto; font-weight: 600; white-space: nowrap; }
  .bp-detail { margin-top: 11px; padding-top: 11px; border-top: 1px solid rgba(210,200,184,0.3); display: grid; grid-template-columns: 1fr 1fr; gap: 11px; }
  .bp-ssel {
    padding: 0 9px; min-height: 28px;
    display: inline-flex; align-items: center;
    border-radius: 20px; border: 1px solid rgba(210,200,184,0.5);
    font-size: var(--fs-xs); font-family: 'Inter', sans-serif; font-weight: 500;
    cursor: pointer; outline: none; background: rgba(255,255,255,0.6); transition: all var(--t1);
    white-space: nowrap;
  }
  .bp-ssel.done { background: ${T.greenPale}; color: ${T.green}; border-color: rgba(21,128,61,0.2); }
  .bp-ssel.prog { background: ${T.goldPale};  color: #92650A;    border-color: rgba(184,151,90,0.25); }
  .bp-ssel.not  { background: rgba(161,161,170,0.08); color: ${T.textMid}; border-color: rgba(161,161,170,0.15); }

  .bp-sum-row  { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 24px; }
  .bp-sum-card {
    background: var(--glass-bg); backdrop-filter: var(--glass-blr); -webkit-backdrop-filter: var(--glass-blr);
    border: 1px solid var(--glass-bd); border-radius: var(--r12); padding: 15px 17px; text-align: center; box-shadow: var(--sh1); transition: all var(--t2); min-width: 0;
  }
  .bp-sum-card:hover { box-shadow: var(--sh2); transform: translateY(-2px); }
  .bp-sum-num { font-family: 'Cormorant Garamond', serif; font-size: var(--fs-serif-2xl); font-weight: 300; line-height: 1; margin-bottom: 4px; }
  .bp-sum-lbl { font-size: var(--fs-xs); letter-spacing: 0.14em; text-transform: uppercase; color: ${T.textLight}; font-weight: 600; }

  /* ═══════════════════════════════════════════════════════════════════════════
     STRATEGY / FOUNDERS / SETTINGS
  ═══════════════════════════════════════════════════════════════════════════ */
  .strategy-pillar {
    border-left: 2px solid ${T.gold}; padding: 15px 20px;
    background: var(--glass-bg); backdrop-filter: var(--glass-blr); -webkit-backdrop-filter: var(--glass-blr);
    border-radius: 0 var(--r8) var(--r8) 0;
    margin-bottom: 10px; box-shadow: var(--sh1); transition: all var(--t2); min-width: 0;
  }
  .strategy-pillar:hover { box-shadow: var(--sh2); transform: translateX(2px); }
  .sp-title { font-family: 'Cormorant Garamond', serif; font-size: var(--fs-serif-md); font-weight: 400; color: ${T.forest}; margin-bottom: 5px; overflow-wrap: break-word; }
  .sp-body  { font-size: var(--fs-base); color: ${T.textMid}; line-height: var(--lh-relaxed); overflow-wrap: break-word; }

  .fc-card {
    background: var(--glass-bg); backdrop-filter: var(--glass-blr); -webkit-backdrop-filter: var(--glass-blr);
    border: 1px solid var(--glass-bd); border-radius: var(--r16);
    padding: var(--sp20); position: relative; overflow: hidden;
    box-shadow: var(--sh2); transition: all var(--t2); min-width: 0;
  }
  .fc-card:hover { box-shadow: var(--sh3); transform: translateY(-2px); }
  .fc-card::before { content: '✦'; position: absolute; top: 14px; right: 14px; color: ${T.goldLight}; font-size: 11px; opacity: 0.6; }
  .fc-name { font-family: 'Cormorant Garamond', serif; font-size: var(--fs-serif-md); font-weight: 400; color: ${T.forest}; margin-bottom: 3px; padding-right: 20px; overflow-wrap: break-word; }
  .fc-cat  { font-size: var(--fs-xs); letter-spacing: 0.12em; text-transform: uppercase; color: ${T.gold}; margin-bottom: 14px; font-weight: 600; }
  .fc-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; }
  .fc-metric  { background: rgba(228,221,208,0.45); border-radius: 8px; padding: 9px 11px; }
  .fc-mlabel  { font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: ${T.textLight}; font-weight: 600; }
  .fc-mvalue  { font-family: 'Cormorant Garamond', serif; font-size: var(--fs-serif-md); color: ${T.forestLight}; margin-top: 2px; }

  .settings-section {
    background: var(--glass-bg); backdrop-filter: var(--glass-blr); -webkit-backdrop-filter: var(--glass-blr);
    border: 1px solid var(--glass-bd); border-radius: var(--r12); padding: 22px; margin-bottom: 16px; box-shadow: var(--sh1); min-width: 0;
  }
  .settings-title { font-family: 'Cormorant Garamond', serif; font-size: var(--fs-xl); font-weight: 400; color: ${T.forest}; margin-bottom: 16px; overflow-wrap: break-word; }
  .settings-row {
    display: flex; justify-content: space-between; align-items: center; gap: var(--sp12);
    padding: 10px 0; border-bottom: 1px solid rgba(210,200,184,0.32); font-size: var(--fs-base);
    flex-wrap: wrap; /* allow wrap on small screens */
  }
  .settings-row:last-child { border-bottom: none; }
  .settings-key { color: ${T.textMid}; font-weight: 500; overflow-wrap: break-word; }
  .settings-val { color: ${T.forest}; font-family: 'Cormorant Garamond', serif; font-size: var(--fs-serif-base); text-align: right; overflow-wrap: break-word; max-width: 55%; }

  /* ═══════════════════════════════════════════════════════════════════════════
     CALC / SCENARIO
  ═══════════════════════════════════════════════════════════════════════════ */
  .calc-section { background: rgba(228,221,208,0.4); border: 1px solid rgba(210,200,184,0.4); border-radius: var(--r12); padding: 18px; margin-bottom: 14px; min-width: 0; }
  .calc-stitle  { font-size: var(--fs-xs); letter-spacing: 0.2em; text-transform: uppercase; color: ${T.gold}; font-weight: 700; margin-bottom: 12px; }
  .calc-result  { background: linear-gradient(145deg, ${T.forest}, #08120C); border-radius: var(--r12); padding: 24px; color: ${T.white}; box-shadow: var(--sh4); min-width: 0; }
  .calc-row     { display: flex; justify-content: space-between; align-items: baseline; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); gap: 8px; }
  .calc-row:last-child { border-bottom: none; }
  .calc-rl { font-size: var(--fs-sm); color: rgba(255,255,255,0.52); flex: 1; overflow-wrap: break-word; }
  .calc-rv { font-family: 'Cormorant Garamond', serif; font-size: var(--fs-serif-lg); color: ${T.goldBright}; white-space: nowrap; }
  .calc-rv.hi  { font-size: var(--fs-serif-xl); color: ${T.white}; }
  .scenario-out { background: linear-gradient(145deg, ${T.forest}, ${T.forestMid}); border-radius: var(--r12); padding: 24px; color: ${T.white}; box-shadow: var(--sh4); min-width: 0; }
  .sc-metric    { text-align: center; padding: 14px; }
  .sc-val       { font-family: 'Cormorant Garamond', serif; font-size: var(--fs-serif-2xl); font-weight: 300; color: ${T.goldBright}; line-height: 1; margin-bottom: 5px; overflow-wrap: break-word; }
  .sc-lbl       { font-size: var(--fs-xs); letter-spacing: 0.16em; text-transform: uppercase; color: rgba(255,255,255,0.42); font-weight: 600; }

  /* ═══════════════════════════════════════════════════════════════════════════
     UTILITY / LAYOUT HELPERS
  ═══════════════════════════════════════════════════════════════════════════ */
  .divider   { height: 1px; background: linear-gradient(90deg,transparent,rgba(210,200,184,0.6),transparent); margin: 20px 0; }
  .empty-st  { text-align: center; padding: 52px 20px; color: ${T.textLight}; }
  .empty-ic  { font-size: 38px; margin-bottom: 10px; opacity: 0.32; }
  .flex      { display: flex; }
  .flex-col  { display: flex; flex-direction: column; }
  .ic  { align-items: center; }
  .jb  { justify-content: space-between; }
  /* Spacing utilities */
  .mb12 { margin-bottom: var(--sp12); } .mb16 { margin-bottom: var(--sp16); }
  .mb20 { margin-bottom: var(--sp20); } .mb24 { margin-bottom: var(--sp24); }
  .mt12 { margin-top:    var(--sp12); } .mt16 { margin-top:    var(--sp16); }
  /* Layout guard utilities */
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
    background: linear-gradient(90deg, rgba(228,221,208,0.4) 25%, rgba(228,221,208,0.72) 50%, rgba(228,221,208,0.4) 75%);
    background-size: 200% 100%; animation: shimmer 1.6s infinite; border-radius: 8px;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     MOBILE FAB
  ═══════════════════════════════════════════════════════════════════════════ */
  .mob-btn {
    position: fixed; bottom: max(22px, env(safe-area-inset-bottom, 22px)); right: 22px;
    z-index: 300; width: 52px; height: 52px; border-radius: 50%;
    background: linear-gradient(145deg, ${T.forestLight}, ${T.forest});
    color: ${T.goldBright}; border: none; font-size: 21px;
    display: none; align-items: center; justify-content: center;
    box-shadow: var(--sh4); cursor: pointer; transition: all var(--t2);
  }
  .mob-btn:hover { transform: scale(1.06); }
  .mob-overlay { display: none; }

  /* ═══════════════════════════════════════════════════════════════════════════
     RESPONSIVE BREAKPOINTS

     Samsung Tab S8 Ultra:
       Portrait:  screen width ≈ 924px CSS pixels  (1848px / 2)
       Landscape: screen width ≈ 1480px CSS pixels (2960px / 2)

     Breakpoints:
       phone:            < 600px
       tablet-portrait:  600px – 959px
       tablet-landscape: 960px – 1399px
       desktop:          ≥ 1400px
  ═══════════════════════════════════════════════════════════════════════════ */

  /* ── Desktop (≥1400px) — full layout, wider spacing ── */
  @media (min-width: 1400px) {
    :root {
      --page-pad: 48px;
      --card-pad: 26px;
      --section-gap: 28px;
    }
    .page-title { font-size: 34px; }
    .stat-value { font-size: 30px; }
    .mob-btn { display: none !important; }
  }

  /* ── Tablet landscape (960–1399px) — Samsung Tab S8 Ultra landscape ── */
  @media (min-width: 960px) and (max-width: 1399px) {
    :root { --page-pad: 28px; --card-pad: 18px; }
    .sidebar { width: 228px; }
    :root { --sw: 228px; }
    .main { margin-left: 228px; }
    .page-title { font-size: 26px; }
    .stat-value { font-size: 22px; }
    .grid-5 { grid-template-columns: repeat(3,1fr); }
    .grid-4 { grid-template-columns: repeat(3,1fr); }
    .company-banner { padding: 22px 24px; }
    .mob-btn { display: none !important; }
  }

  /* ── Tablet portrait (600–959px) — Samsung Tab S8 Ultra portrait ── */
  @media (min-width: 600px) and (max-width: 959px) {
    :root { --sw: 0px; --page-pad: 20px; --card-pad: 16px; }
    .sidebar { width: 0; overflow: hidden; transition: width var(--t3); }
    .sidebar.open { width: 260px; }
    .main { margin-left: 0; }
    .page-header { padding: 16px var(--page-pad); position: sticky; top: 0; }
    .page-content { padding: var(--sp20) var(--page-pad); }
    .page-title { font-size: 24px; }
    .page-subtitle { font-size: 10px; }
    .grid-5, .grid-4 { grid-template-columns: repeat(2,1fr); }
    .grid-3 { grid-template-columns: repeat(2,1fr); }
    .grid-2 { grid-template-columns: repeat(2,1fr); }
    /* Form: 2 columns still works on 600px+ */
    .form-grid { grid-template-columns: 1fr 1fr; }
    .form-grid-3 { grid-template-columns: 1fr 1fr; }
    .bp-hero { flex-direction: row; padding: 20px var(--page-pad); }
    .bp-pct  { font-size: 40px; }
    .bp-sum-row { grid-template-columns: repeat(4,1fr); }
    .bp-detail { grid-template-columns: 1fr 1fr; }
    .company-banner .banner-gem { display: none; }
    .stat-value { font-size: 20px; }
    .mob-btn { display: flex; }
    .mob-overlay.show { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 199; backdrop-filter: blur(3px); }
    /* Modal: full-width on tablet portrait */
    .modal { border-radius: var(--r24); padding: 22px; width: 95vw; }
    .modal-lg, .modal-xl { width: 95vw; }
    /* Table: always show horizontal scroll on tablet */
    .table-wrap { border-radius: var(--r8); }
  }

  /* ── Phone (<600px) ── */
  @media (max-width: 599px) {
    :root { --sw: 0px; --page-pad: 14px; --card-pad: 14px; }
    .sidebar { width: 0; overflow: hidden; transition: width var(--t3); }
    .sidebar.open { width: 280px; }
    .main { margin-left: 0; }
    .page-header { padding: 14px var(--page-pad); position: static; flex-direction: column; align-items: flex-start; }
    .page-header-right { width: 100%; }
    .page-content { padding: 14px var(--page-pad); }
    .page-title   { font-size: 22px; }
    .page-subtitle { font-size: 10px; }
    /* All grids → single column */
    .grid-5, .grid-4, .grid-3, .grid-2 { grid-template-columns: 1fr; }
    /* Forms → single column */
    .form-grid, .form-grid-3 { grid-template-columns: 1fr; }
    .form-field.full { grid-column: 1; }
    /* Progress */
    .bp-hero { flex-direction: column; align-items: flex-start; padding: 18px var(--page-pad); }
    .bp-overall { text-align: left; }
    .bp-pct { font-size: 36px; }
    .bp-pbar { width: 100%; margin-left: 0; }
    .bp-sum-row { grid-template-columns: repeat(2,1fr); }
    .bp-detail { grid-template-columns: 1fr; }
    .bp-filters { padding: 10px var(--page-pad); }
    .bp-tright { flex-direction: column; align-items: flex-end; gap: 4px; }
    /* Company banner */
    .company-banner { padding: 18px 20px; border-radius: var(--r16); }
    .company-banner .banner-gem { display: none; }
    /* Stat/KPI */
    .stat-value { font-size: 20px; }
    /* Modals */
    .modal { border-radius: var(--r16); padding: 16px; max-height: 98vh; border-radius: 16px 16px 0 0; align-self: flex-end; width: 100%; }
    .modal-overlay { padding: 0; align-items: flex-end; }
    .modal-lg, .modal-xl { width: 100%; }
    /* Tabs */
    .tab { padding: 0 12px; font-size: 12px; }
    /* Buttons: full width in some contexts */
    .page-header-right .btn { font-size: 12px; padding: 0 12px; }
    /* Settings */
    .settings-val { font-size: 13px; max-width: 50%; }
    /* FAB */
    .mob-btn { display: flex; }
    .mob-overlay.show { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 199; backdrop-filter: blur(3px); }
    /* Founders: single col */
    .fc-card { break-inside: avoid; }
  }

  /* ── Desktop: never show mobile FAB ── */
  @media (min-width: 960px) {
    .mob-btn    { display: none !important; }
    .mob-overlay { display: none !important; }
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     LEGACY ALIASES — backward compatibility with older pages
  ═══════════════════════════════════════════════════════════════════════════ */
  .section-label   { font-size: var(--fs-xs); letter-spacing:0.22em; text-transform:uppercase; color:${T.gold}; font-weight:700; margin-bottom:14px; display:block; }
  .empty-state     { text-align:center; padding:52px 20px; color:${T.textLight}; }
  .empty-icon      { font-size:38px; margin-bottom:10px; opacity:0.32; }
  .items-center    { align-items:center; }
  .justify-between { justify-content:space-between; }
  .gap-8  { gap: var(--sp8)  !important; }
  .gap-12 { gap: var(--sp12) !important; }
  .gap-16 { gap: var(--sp16) !important; }
  .gap-20 { gap: var(--sp20) !important; }
  .gap-24 { gap: var(--sp24) !important; }
  .mb-16  { margin-bottom: var(--sp16); }
  .mb-20  { margin-bottom: var(--sp20); }
  .mb-24  { margin-bottom: var(--sp24); }
  .mt-16  { margin-top: var(--sp16); }
  .mt-20  { margin-top: var(--sp20); }
  .card { background:var(--glass-bg); backdrop-filter:var(--glass-blr); -webkit-backdrop-filter:var(--glass-blr); border:1px solid var(--glass-bd); border-radius:var(--r16); padding:var(--card-pad); box-shadow:var(--sh2); min-width:0; }
  .bp-filter-btn { padding:0 12px; min-height:32px; display:inline-flex; align-items:center; border-radius:20px; border:1px solid rgba(210,200,184,0.5); background:transparent; font-size:var(--fs-sm); font-family:'Inter',sans-serif; color:${T.textMid}; cursor:pointer; transition:all 0.14s; font-weight:500; white-space:nowrap; flex-shrink:0; }
  .bp-filter-btn:hover  { border-color:${T.gold}; color:${T.forest}; }
  .bp-filter-btn.active { background:${T.forest}; color:${T.goldBright}; border-color:${T.forest}; }
  .progress-bar { height:4px; background:rgba(210,200,184,0.35); border-radius:4px; overflow:hidden; }
  .progress-fill { height:100%; border-radius:4px; background:linear-gradient(90deg,${T.gold},${T.goldBright}); transition:width 0.8s var(--ease); }
  .insight-label { font-size:9px; letter-spacing:0.26em; text-transform:uppercase; color:${T.goldBright}; margin-bottom:12px; font-weight:700; }
  .insight-text  { font-size:var(--fs-md); line-height:var(--lh-loose); color:rgba(255,255,255,0.8); overflow-wrap:break-word; }
`

export default css
