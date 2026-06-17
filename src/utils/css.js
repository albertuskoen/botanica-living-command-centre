import { T } from './tokens.js'

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Inter:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background:${T.cream}; color:${T.text}; font-family:'Inter',sans-serif; font-size:14px; line-height:1.6; }
  .app { display:flex; min-height:100vh; }

  /* SIDEBAR */
  .sidebar { width:240px; min-height:100vh; background:${T.forest}; display:flex; flex-direction:column; position:fixed; top:0; left:0; bottom:0; z-index:100; padding:0 0 16px; overflow-y:auto; }
  .sidebar-logo { padding:24px 24px 20px; border-bottom:1px solid rgba(255,255,255,0.08); flex-shrink:0; }
  .sidebar-logo .wordmark { font-family:'Cormorant Garamond',serif; font-size:18px; font-weight:600; color:${T.goldLight}; letter-spacing:0.04em; line-height:1.2; }
  .sidebar-logo .sub { font-size:9px; letter-spacing:0.18em; text-transform:uppercase; color:rgba(255,255,255,0.35); margin-top:4px; }
  .sidebar-logo .reg { font-size:9px; color:rgba(255,255,255,0.2); margin-top:2px; }
  .sidebar-nav { flex:1; padding:12px 0; }
  .nav-section-label { font-size:9px; letter-spacing:0.2em; text-transform:uppercase; color:rgba(255,255,255,0.28); padding:14px 20px 5px; }
  .nav-item { display:flex; align-items:center; gap:10px; padding:9px 20px; cursor:pointer; color:rgba(255,255,255,0.55); font-size:13px; font-weight:400; transition:all 0.15s; border-left:2px solid transparent; }
  .nav-item:hover { color:${T.goldLight}; background:rgba(255,255,255,0.04); }
  .nav-item.active { color:${T.goldLight}; background:rgba(184,151,90,0.12); border-left-color:${T.gold}; font-weight:500; }
  .nav-icon { font-size:14px; width:18px; text-align:center; }
  .sidebar-footer { padding:14px 20px; border-top:1px solid rgba(255,255,255,0.08); font-size:10px; color:rgba(255,255,255,0.2); flex-shrink:0; }
  .sidebar-version { font-size:9px; color:rgba(255,255,255,0.15); margin-top:2px; }

  /* MAIN */
  .main { margin-left:240px; flex:1; min-height:100vh; background:${T.cream}; }
  .page-header { background:${T.white}; border-bottom:1px solid ${T.beigeDeep}; padding:24px 36px 20px; display:flex; align-items:flex-end; justify-content:space-between; gap:16px; flex-wrap:wrap; }
  .page-title { font-family:'Cormorant Garamond',serif; font-size:30px; font-weight:300; color:${T.forest}; letter-spacing:-0.01em; line-height:1; }
  .page-subtitle { font-size:11px; color:${T.textLight}; letter-spacing:0.06em; text-transform:uppercase; margin-top:5px; }
  .page-content { padding:28px 36px; }

  /* CARDS */
  .card { background:${T.white}; border:1px solid ${T.beigeDeep}; border-radius:12px; padding:20px; }
  .card-label { font-size:10px; letter-spacing:0.16em; text-transform:uppercase; color:${T.textLight}; margin-bottom:6px; }
  .card-value { font-family:'Cormorant Garamond',serif; font-size:32px; font-weight:300; color:${T.forest}; line-height:1; }
  .card-desc { font-size:12px; color:${T.textMid}; margin-top:5px; }
  .stat-card { background:${T.white}; border:1px solid ${T.beigeDeep}; border-radius:12px; padding:18px 20px; position:relative; overflow:hidden; }
  .stat-card::after { content:''; position:absolute; top:0; left:0; right:0; height:3px; background:linear-gradient(90deg,${T.gold},${T.goldLight}); }

  /* GRID */
  .grid-5 { display:grid; grid-template-columns:repeat(5,1fr); gap:14px; }
  .grid-4 { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
  .grid-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
  .grid-2 { display:grid; grid-template-columns:repeat(2,1fr); gap:16px; }
  .gap-16 { gap:16px !important; }
  .gap-20 { gap:20px !important; }

  /* BADGES */
  .badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:500; letter-spacing:0.03em; }
  .badge-green  { background:rgba(61,107,82,0.12); color:${T.forestLight}; }
  .badge-gold   { background:${T.goldPale}; color:${T.gold}; }
  .badge-grey   { background:${T.beige}; color:${T.textMid}; }
  .badge-red    { background:rgba(139,58,58,0.1); color:${T.danger}; }
  .badge-blue   { background:${T.blueLight}; color:${T.blue}; }
  .badge-teal   { background:${T.tealLight}; color:${T.teal}; }

  /* TABLE */
  .table-wrap { overflow-x:auto; }
  table { width:100%; border-collapse:collapse; }
  th { text-align:left; font-size:10px; letter-spacing:0.14em; text-transform:uppercase; color:${T.textLight}; padding:9px 14px; border-bottom:1px solid ${T.beigeDeep}; background:${T.beige}; font-weight:500; white-space:nowrap; }
  th:first-child { border-radius:8px 0 0 0; }
  th:last-child  { border-radius:0 8px 0 0; }
  td { padding:11px 14px; border-bottom:1px solid ${T.beige}; font-size:13px; color:${T.text}; vertical-align:middle; }
  tr:last-child td { border-bottom:none; }
  tr:hover td { background:rgba(247,243,236,0.6); }
  .td-name { font-weight:500; color:${T.forest}; }
  .td-mono { font-family:'Cormorant Garamond',serif; font-size:15px; color:${T.forestMid}; }

  /* BUTTONS */
  .btn { display:inline-flex; align-items:center; gap:6px; padding:8px 16px; border-radius:6px; font-size:13px; font-weight:500; cursor:pointer; border:none; transition:all 0.15s; font-family:'Inter',sans-serif; }
  .btn-primary { background:${T.forest}; color:${T.goldLight}; }
  .btn-primary:hover { background:${T.forestMid}; }
  .btn-outline { background:transparent; border:1px solid ${T.beigeDeep}; color:${T.textMid}; }
  .btn-outline:hover { border-color:${T.gold}; color:${T.forest}; }
  .btn-gold { background:${T.gold}; color:${T.white}; }
  .btn-danger { background:${T.danger}; color:${T.white}; }
  .btn-sm { padding:5px 12px; font-size:12px; }
  .btn-xs { padding:3px 8px; font-size:11px; }

  /* FORMS */
  .form-grid   { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .form-grid-3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; }
  .form-field  { display:flex; flex-direction:column; gap:5px; }
  .form-field.full { grid-column:1/-1; }
  label { font-size:11px; letter-spacing:0.1em; text-transform:uppercase; color:${T.textMid}; font-weight:500; }
  input,select,textarea { padding:9px 12px; border:1px solid ${T.beigeDeep}; border-radius:6px; font-size:13px; font-family:'Inter',sans-serif; background:${T.white}; color:${T.text}; outline:none; transition:border-color 0.15s; width:100%; }
  input:focus,select:focus,textarea:focus { border-color:${T.gold}; }
  textarea { resize:vertical; min-height:70px; }

  /* MODAL */
  .modal-overlay { position:fixed; inset:0; background:rgba(28,48,40,0.55); z-index:200; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(2px); padding:16px; }
  .modal { background:${T.white}; border-radius:16px; width:700px; max-width:100%; max-height:92vh; overflow-y:auto; padding:28px; }
  .modal-lg { width:860px; }
  .modal-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; padding-bottom:16px; border-bottom:1px solid ${T.beige}; }
  .modal-title { font-family:'Cormorant Garamond',serif; font-size:22px; font-weight:400; color:${T.forest}; }
  .modal-close { background:none; border:none; font-size:20px; cursor:pointer; color:${T.textLight}; padding:4px 8px; border-radius:4px; line-height:1; }
  .modal-close:hover { color:${T.text}; background:${T.beige}; }
  .modal-footer { display:flex; justify-content:flex-end; gap:10px; margin-top:24px; padding-top:18px; border-top:1px solid ${T.beige}; }

  /* UTILITY */
  .flex { display:flex; }
  .flex-col { display:flex; flex-direction:column; }
  .items-center { align-items:center; }
  .justify-between { justify-content:space-between; }
  .gap-8  { gap:8px; }
  .gap-12 { gap:12px; }
  .mb-16 { margin-bottom:16px; }
  .mb-20 { margin-bottom:20px; }
  .mb-24 { margin-bottom:24px; }
  .mt-16 { margin-top:16px; }
  .mt-20 { margin-top:20px; }
  .divider { height:1px; background:${T.beigeDeep}; margin:20px 0; }
  .section-label { font-size:10px; letter-spacing:0.2em; text-transform:uppercase; color:${T.gold}; font-weight:600; margin-bottom:14px; }
  .tabs { display:flex; gap:0; border-bottom:1px solid ${T.beigeDeep}; margin-bottom:20px; overflow-x:auto; }
  .tab { padding:9px 18px; font-size:13px; font-weight:500; color:${T.textMid}; cursor:pointer; border-bottom:2px solid transparent; transition:all 0.15s; margin-bottom:-1px; white-space:nowrap; }
  .tab:hover { color:${T.forest}; }
  .tab.active { color:${T.forest}; border-bottom-color:${T.gold}; }
  .empty-state { text-align:center; padding:48px 20px; color:${T.textLight}; }
  .empty-icon { font-size:36px; margin-bottom:10px; opacity:0.4; }
  .quote-block { background:${T.forest}; border-radius:12px; padding:28px; text-align:center; margin-bottom:24px; }
  .quote-text { font-family:'Cormorant Garamond',serif; font-size:24px; font-weight:300; font-style:italic; color:${T.goldLight}; }
  .quote-attr { font-size:10px; color:rgba(255,255,255,0.35); margin-top:10px; letter-spacing:0.12em; text-transform:uppercase; }
  .strategy-pillar { border-left:3px solid ${T.gold}; padding:14px 18px; background:${T.white}; border-radius:0 10px 10px 0; margin-bottom:10px; }
  .strategy-pillar-title { font-family:'Cormorant Garamond',serif; font-size:18px; font-weight:400; color:${T.forest}; margin-bottom:5px; }
  .strategy-pillar-body { font-size:13px; color:${T.textMid}; line-height:1.7; }
  .founder-card { background:${T.white}; border:1px solid ${T.beigeDeep}; border-radius:12px; padding:18px; position:relative; }
  .founder-card::before { content:'✦'; position:absolute; top:14px; right:14px; color:${T.goldLight}; font-size:12px; }
  .founder-card-name { font-family:'Cormorant Garamond',serif; font-size:17px; font-weight:400; color:${T.forest}; margin-bottom:3px; padding-right:20px; }
  .founder-card-cat { font-size:10px; letter-spacing:0.1em; text-transform:uppercase; color:${T.gold}; margin-bottom:14px; }
  .founder-metrics { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:12px; }
  .founder-metric { background:${T.beige}; border-radius:6px; padding:9px 11px; }
  .founder-metric-label { font-size:9px; letter-spacing:0.14em; text-transform:uppercase; color:${T.textLight}; }
  .founder-metric-value { font-family:'Cormorant Garamond',serif; font-size:17px; color:${T.forestMid}; margin-top:2px; }
  .priority-item { display:flex; align-items:flex-start; gap:12px; padding:12px 0; border-bottom:1px solid ${T.beige}; }
  .priority-item:last-child { border-bottom:none; }
  .priority-dot { width:7px; height:7px; border-radius:50%; background:${T.gold}; margin-top:5px; flex-shrink:0; }
  .priority-dot.green { background:${T.forestLight}; }
  .priority-title { font-weight:500; font-size:13px; color:${T.text}; }
  .priority-desc  { font-size:12px; color:${T.textMid}; margin-top:2px; }

  /* BUSINESS PROGRESS */
  .bp-hero { background:linear-gradient(135deg,${T.forest} 0%,${T.forestMid} 100%); padding:24px 36px; display:flex; align-items:center; justify-content:space-between; gap:24px; flex-wrap:wrap; }
  .bp-hero-title { font-family:'Cormorant Garamond',serif; font-size:28px; font-weight:300; color:${T.white}; line-height:1; }
  .bp-hero-sub { font-size:11px; letter-spacing:0.12em; text-transform:uppercase; color:rgba(255,255,255,0.4); margin-top:5px; }
  .bp-overall { text-align:right; }
  .bp-overall-pct { font-family:'Cormorant Garamond',serif; font-size:48px; font-weight:300; color:${T.goldLight}; line-height:1; }
  .bp-overall-label { font-size:10px; letter-spacing:0.16em; text-transform:uppercase; color:rgba(255,255,255,0.4); margin-top:3px; }
  .bp-overall-bar { width:180px; height:4px; background:rgba(255,255,255,0.15); border-radius:2px; margin-top:8px; margin-left:auto; overflow:hidden; }
  .bp-overall-bar-fill { height:100%; background:linear-gradient(90deg,${T.gold},${T.goldLight}); border-radius:2px; transition:width 0.6s ease; }
  .bp-filters { display:flex; align-items:center; gap:8px; padding:16px 36px; background:${T.white}; border-bottom:1px solid ${T.beigeDeep}; flex-wrap:wrap; }
  .bp-filter-label { font-size:10px; letter-spacing:0.14em; text-transform:uppercase; color:${T.textLight}; margin-right:3px; }
  .bp-filter-btn { padding:4px 12px; border-radius:20px; border:1px solid ${T.beigeDeep}; background:transparent; font-size:12px; font-family:'Inter',sans-serif; color:${T.textMid}; cursor:pointer; transition:all 0.15s; }
  .bp-filter-btn:hover { border-color:${T.gold}; color:${T.forest}; }
  .bp-filter-btn.active { background:${T.forest}; color:${T.goldLight}; border-color:${T.forest}; }
  .bp-section { margin-bottom:24px; }
  .bp-section-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; padding-bottom:10px; border-bottom:1px solid ${T.beigeDeep}; }
  .bp-section-title { font-family:'Cormorant Garamond',serif; font-size:20px; font-weight:400; color:${T.forest}; }
  .bp-section-meta { display:flex; align-items:center; gap:10px; }
  .bp-section-count { font-size:11px; color:${T.textLight}; }
  .bp-mini-bar { width:90px; height:3px; background:${T.beige}; border-radius:2px; overflow:hidden; }
  .bp-mini-bar-fill { height:100%; background:linear-gradient(90deg,${T.gold},${T.goldLight}); border-radius:2px; }
  .bp-task { background:${T.white}; border:1px solid ${T.beigeDeep}; border-radius:10px; padding:14px 18px; margin-bottom:8px; transition:box-shadow 0.15s; }
  .bp-task:hover { box-shadow:0 2px 12px rgba(28,48,40,0.07); }
  .bp-task-top { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
  .bp-task-left { display:flex; align-items:flex-start; gap:12px; flex:1; }
  .bp-task-checkbox { width:17px; height:17px; border-radius:4px; border:1.5px solid ${T.beigeDeep}; cursor:pointer; background:transparent; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:1px; transition:all 0.15s; font-size:10px; color:${T.white}; }
  .bp-task-checkbox.completed   { background:${T.forestLight}; border-color:${T.forestLight}; }
  .bp-task-checkbox.in-progress { background:${T.gold}; border-color:${T.gold}; }
  .bp-task-name { font-size:13px; font-weight:500; color:${T.text}; line-height:1.4; }
  .bp-task-name.completed { text-decoration:line-through; color:${T.textLight}; }
  .bp-task-right { display:flex; align-items:center; gap:6px; flex-shrink:0; }
  .bp-task-bottom { display:flex; align-items:center; gap:14px; margin-top:8px; padding-top:8px; border-top:1px solid ${T.beige}; flex-wrap:wrap; }
  .bp-task-meta-item { display:flex; align-items:center; gap:5px; font-size:11px; color:${T.textLight}; }
  .bp-task-meta-label { font-weight:500; color:${T.textMid}; }
  .bp-task-expand-btn { background:none; border:none; font-size:11px; color:${T.gold}; cursor:pointer; padding:0; font-family:'Inter',sans-serif; margin-left:auto; }
  .bp-task-detail { margin-top:10px; padding-top:10px; border-top:1px solid ${T.beige}; display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .pri-critical { background:rgba(139,58,58,0.12); color:${T.danger}; }
  .pri-high     { background:rgba(184,151,90,0.15); color:#8B6914; }
  .pri-medium   { background:rgba(61,107,82,0.12); color:${T.forestLight}; }
  .pri-low      { background:${T.beige}; color:${T.textMid}; }
  .bp-status-select { padding:3px 8px; border-radius:20px; border:1px solid ${T.beigeDeep}; font-size:11px; font-family:'Inter',sans-serif; font-weight:500; cursor:pointer; outline:none; background:${T.white}; }
  .bp-status-select.completed   { background:rgba(61,107,82,0.1); color:${T.forestLight}; border-color:transparent; }
  .bp-status-select.in-progress { background:${T.goldPale}; color:#8B6914; border-color:transparent; }
  .bp-status-select.not-started { background:${T.beige}; color:${T.textMid}; border-color:transparent; }
  .bp-summary-row { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:24px; }
  .bp-summary-card { background:${T.white}; border:1px solid ${T.beigeDeep}; border-radius:10px; padding:14px 18px; text-align:center; }
  .bp-summary-num { font-family:'Cormorant Garamond',serif; font-size:30px; font-weight:300; line-height:1; margin-bottom:3px; }
  .bp-summary-lbl { font-size:10px; letter-spacing:0.12em; text-transform:uppercase; color:${T.textLight}; }

  /* FINANCE */
  .fin-type-inv  { color:${T.teal}; }
  .fin-type-inc  { color:${T.green}; }
  .fin-type-exp  { color:${T.red}; }
  .fin-kpi-inv  { border-top:3px solid ${T.teal}; }
  .fin-kpi-inc  { border-top:3px solid ${T.green}; }
  .fin-kpi-exp  { border-top:3px solid ${T.red}; }
  .fin-kpi-rem  { border-top:3px solid ${T.gold}; }
  .fin-kpi-net  { border-top:3px solid ${T.forest}; }
  .insight-box { background:linear-gradient(135deg,${T.forest},${T.forestMid}); border-radius:12px; padding:24px; color:${T.white}; }
  .insight-text { font-size:14px; line-height:1.8; color:rgba(255,255,255,0.85); }
  .insight-label { font-size:10px; letter-spacing:0.2em; text-transform:uppercase; color:${T.goldLight}; margin-bottom:10px; }
  .progress-bar { height:6px; background:${T.beige}; border-radius:3px; overflow:hidden; margin-top:6px; }
  .progress-fill { height:100%; border-radius:3px; background:linear-gradient(90deg,${T.gold},${T.goldLight}); }

  /* MILESTONE */
  .milestone-row { display:flex; align-items:center; gap:14px; padding:12px 0; border-bottom:1px solid ${T.beige}; }
  .milestone-row:last-child { border-bottom:none; }
  .milestone-icon { width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0; }
  .milestone-done { background:rgba(61,107,82,0.15); color:${T.forestLight}; }
  .milestone-next { background:${T.goldPale}; color:${T.gold}; }
  .milestone-future { background:${T.beige}; color:${T.textLight}; }
  .milestone-title { font-weight:500; font-size:13px; }
  .milestone-subtitle { font-size:11px; color:${T.textLight}; margin-top:1px; }

  /* DOCUMENTS */
  .doc-card { background:${T.white}; border:1px solid ${T.beigeDeep}; border-radius:10px; padding:16px; display:flex; align-items:flex-start; gap:14px; }
  .doc-icon { width:38px; height:38px; border-radius:8px; background:${T.goldPale}; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; }
  .doc-name { font-weight:500; font-size:13px; color:${T.forest}; }
  .doc-meta { font-size:11px; color:${T.textLight}; margin-top:2px; }

  /* ACTION CENTRE */
  .action-card { background:${T.white}; border:1px solid ${T.beigeDeep}; border-radius:10px; padding:14px 18px; margin-bottom:8px; }
  .action-top { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
  .action-name { font-size:13px; font-weight:500; color:${T.text}; }
  .action-name.done { text-decoration:line-through; color:${T.textLight}; }
  .action-meta { display:flex; gap:10px; flex-wrap:wrap; margin-top:6px; }

  /* SETTINGS */
  .settings-section { background:${T.white}; border:1px solid ${T.beigeDeep}; border-radius:12px; padding:20px; margin-bottom:16px; }
  .settings-title { font-family:'Cormorant Garamond',serif; font-size:18px; font-weight:400; color:${T.forest}; margin-bottom:14px; }
  .settings-row { display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid ${T.beige}; font-size:13px; }
  .settings-row:last-child { border-bottom:none; }
  .settings-key { color:${T.textMid}; font-weight:500; }
  .settings-val { color:${T.forest}; font-family:'Cormorant Garamond',serif; font-size:15px; }

  /* CALC */
  .calc-section { background:${T.beige}; border-radius:10px; padding:18px; margin-bottom:14px; }
  .calc-section-title { font-size:10px; letter-spacing:0.2em; text-transform:uppercase; color:${T.gold}; font-weight:600; margin-bottom:12px; }
  .calc-result { background:${T.forest}; border-radius:12px; padding:22px; color:${T.white}; }
  .calc-result-row { display:flex; justify-content:space-between; align-items:baseline; padding:7px 0; border-bottom:1px solid rgba(255,255,255,0.08); }
  .calc-result-row:last-child { border-bottom:none; }
  .calc-result-label { font-size:12px; color:rgba(255,255,255,0.6); }
  .calc-result-value { font-family:'Cormorant Garamond',serif; font-size:20px; font-weight:400; color:${T.goldLight}; }
  .calc-result-value.highlight { font-size:26px; color:${T.white}; }
  .scenario-output { background:linear-gradient(135deg,${T.forest} 0%,${T.forestMid} 100%); border-radius:12px; padding:24px; color:${T.white}; }
  .scenario-metric { text-align:center; padding:14px; }
  .scenario-metric-value { font-family:'Cormorant Garamond',serif; font-size:32px; font-weight:300; color:${T.goldLight}; line-height:1; margin-bottom:5px; }
  .scenario-metric-label { font-size:10px; letter-spacing:0.16em; text-transform:uppercase; color:rgba(255,255,255,0.5); }

  /* RESPONSIVE / MOBILE */
  @media (max-width:768px) {
    .sidebar { width:0; overflow:hidden; transition:width 0.3s; }
    .sidebar.mobile-open { width:260px; }
    .main { margin-left:0; }
    .page-content { padding:16px; }
    .page-header { padding:16px; }
    .grid-5,.grid-4 { grid-template-columns:repeat(2,1fr); }
    .grid-3 { grid-template-columns:repeat(2,1fr); }
    .grid-2 { grid-template-columns:1fr; }
    .form-grid,.form-grid-3 { grid-template-columns:1fr; }
    .form-field.full { grid-column:1; }
    .bp-hero { flex-direction:column; }
    .bp-overall { text-align:left; }
    .bp-overall-bar { margin-left:0; }
    .bp-summary-row { grid-template-columns:repeat(2,1fr); }
    .mobile-menu-btn { display:flex; }
    .bp-filters { padding:12px 16px; }
  }
  @media (min-width:769px) {
    .mobile-menu-btn { display:none !important; }
  }

  /* MOBILE MENU BUTTON */
  .mobile-menu-btn { position:fixed; bottom:20px; right:20px; z-index:150; width:48px; height:48px; border-radius:50%; background:${T.forest}; color:${T.goldLight}; border:none; font-size:20px; cursor:pointer; align-items:center; justify-content:center; box-shadow:0 4px 16px rgba(28,48,40,0.4); }
  .mobile-overlay { display:none; }
  @media (max-width:768px) {
    .mobile-overlay.show { display:block; position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:99; }
  }
`

export default css
