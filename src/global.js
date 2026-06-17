const T = {
  forest:      '#1C3028',
  forestMid:   '#2D4A3A',
  forestLight: '#3D6B52',
  cream:       '#F7F3EC',
  beige:       '#EDE8DF',
  beigeDeep:   '#D9D0C1',
  gold:        '#B8975A',
  goldLight:   '#D4B278',
  goldPale:    '#F0E4C8',
  text:        '#2A2A2A',
  textMid:     '#5A5A5A',
  textLight:   '#8A8A8A',
  white:       '#FFFFFF',
  danger:      '#8B3A3A',
}

export { T }

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Inter:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${T.cream}; color: ${T.text}; font-family: 'Inter', sans-serif; font-size: 14px; line-height: 1.6; }
  .app { display: flex; min-height: 100vh; }

  /* SIDEBAR */
  .sidebar { width: 240px; min-height: 100vh; background: ${T.forest}; display: flex; flex-direction: column; position: fixed; top: 0; left: 0; bottom: 0; z-index: 100; padding: 0 0 24px; }
  .sidebar-logo { padding: 32px 24px 28px; border-bottom: 1px solid rgba(255,255,255,0.08); }
  .sidebar-logo .wordmark { font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 600; color: ${T.goldLight}; letter-spacing: 0.04em; line-height: 1.2; }
  .sidebar-logo .sub { font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.35); margin-top: 4px; }
  .sidebar-nav { flex: 1; padding: 16px 0; overflow-y: auto; }
  .nav-section-label { font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(255,255,255,0.28); padding: 16px 24px 6px; }
  .nav-item { display: flex; align-items: center; gap: 12px; padding: 10px 24px; cursor: pointer; color: rgba(255,255,255,0.55); font-size: 13px; font-weight: 400; transition: all 0.15s; border-left: 2px solid transparent; }
  .nav-item:hover { color: ${T.goldLight}; background: rgba(255,255,255,0.04); }
  .nav-item.active { color: ${T.goldLight}; background: rgba(184,151,90,0.12); border-left-color: ${T.gold}; font-weight: 500; }
  .nav-icon { font-size: 16px; width: 20px; text-align: center; }
  .sidebar-footer { padding: 16px 24px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 11px; color: rgba(255,255,255,0.22); }

  /* MAIN */
  .main { margin-left: 240px; flex: 1; min-height: 100vh; background: ${T.cream}; }
  .page-header { background: ${T.white}; border-bottom: 1px solid ${T.beigeDeep}; padding: 28px 40px 24px; display: flex; align-items: flex-end; justify-content: space-between; }
  .page-title { font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 300; color: ${T.forest}; letter-spacing: -0.01em; line-height: 1; }
  .page-subtitle { font-size: 12px; color: ${T.textLight}; letter-spacing: 0.06em; text-transform: uppercase; margin-top: 6px; }
  .page-content { padding: 32px 40px; }

  /* CARDS */
  .card { background: ${T.white}; border: 1px solid ${T.beigeDeep}; border-radius: 12px; padding: 24px; }
  .card-label { font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: ${T.textLight}; margin-bottom: 8px; }
  .card-value { font-family: 'Cormorant Garamond', serif; font-size: 36px; font-weight: 300; color: ${T.forest}; line-height: 1; }
  .card-desc { font-size: 12px; color: ${T.textMid}; margin-top: 6px; }
  .stat-card { background: ${T.white}; border: 1px solid ${T.beigeDeep}; border-radius: 12px; padding: 20px 24px; position: relative; overflow: hidden; }
  .stat-card::after { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, ${T.gold}, ${T.goldLight}); }

  /* GRID */
  .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
  .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
  .gap-24 { gap: 24px !important; }

  /* BADGES */
  .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 500; letter-spacing: 0.03em; }
  .badge-green { background: rgba(61,107,82,0.12); color: ${T.forestLight}; }
  .badge-gold  { background: ${T.goldPale}; color: ${T.gold}; }
  .badge-grey  { background: ${T.beige}; color: ${T.textMid}; }
  .badge-red   { background: rgba(139,58,58,0.1); color: ${T.danger}; }

  /* TABLE */
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: ${T.textLight}; padding: 10px 16px; border-bottom: 1px solid ${T.beigeDeep}; background: ${T.beige}; font-weight: 500; }
  th:first-child { border-radius: 8px 0 0 0; }
  th:last-child  { border-radius: 0 8px 0 0; }
  td { padding: 13px 16px; border-bottom: 1px solid ${T.beige}; font-size: 13px; color: ${T.text}; vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: rgba(247,243,236,0.6); }
  .td-name { font-weight: 500; color: ${T.forest}; }
  .td-mono { font-family: 'Cormorant Garamond', serif; font-size: 15px; color: ${T.forestMid}; }

  /* BUTTONS */
  .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; transition: all 0.15s; font-family: 'Inter', sans-serif; }
  .btn-primary { background: ${T.forest}; color: ${T.goldLight}; }
  .btn-primary:hover { background: ${T.forestMid}; }
  .btn-outline { background: transparent; border: 1px solid ${T.beigeDeep}; color: ${T.textMid}; }
  .btn-outline:hover { border-color: ${T.gold}; color: ${T.forest}; }
  .btn-sm { padding: 5px 12px; font-size: 12px; }

  /* FORMS */
  .form-grid   { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .form-field  { display: flex; flex-direction: column; gap: 6px; }
  .form-field.full { grid-column: 1 / -1; }
  label { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: ${T.textMid}; font-weight: 500; }
  input, select, textarea { padding: 9px 12px; border: 1px solid ${T.beigeDeep}; border-radius: 6px; font-size: 13px; font-family: 'Inter', sans-serif; background: ${T.white}; color: ${T.text}; outline: none; transition: border-color 0.15s; }
  input:focus, select:focus, textarea:focus { border-color: ${T.gold}; }
  textarea { resize: vertical; min-height: 72px; }

  /* MODAL */
  .modal-overlay { position: fixed; inset: 0; background: rgba(28,48,40,0.55); z-index: 200; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px); }
  .modal { background: ${T.white}; border-radius: 16px; width: 680px; max-width: 95vw; max-height: 90vh; overflow-y: auto; padding: 32px; }
  .modal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid ${T.beige}; }
  .modal-title { font-family: 'Cormorant Garamond', serif; font-size: 24px; font-weight: 400; color: ${T.forest}; }
  .modal-close { background: none; border: none; font-size: 20px; cursor: pointer; color: ${T.textLight}; padding: 4px 8px; border-radius: 4px; line-height: 1; }
  .modal-close:hover { color: ${T.text}; background: ${T.beige}; }
  .modal-footer { display: flex; justify-content: flex-end; gap: 12px; margin-top: 28px; padding-top: 20px; border-top: 1px solid ${T.beige}; }

  /* CALCULATOR */
  .calc-section { background: ${T.beige}; border-radius: 10px; padding: 20px; margin-bottom: 16px; }
  .calc-section-title { font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: ${T.gold}; font-weight: 600; margin-bottom: 14px; }
  .calc-result { background: ${T.forest}; border-radius: 12px; padding: 24px; color: ${T.white}; }
  .calc-result-row { display: flex; justify-content: space-between; align-items: baseline; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.08); }
  .calc-result-row:last-child { border-bottom: none; }
  .calc-result-label { font-size: 12px; color: rgba(255,255,255,0.6); }
  .calc-result-value { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 400; color: ${T.goldLight}; }
  .calc-result-value.highlight { font-size: 28px; color: ${T.white}; }

  /* SCENARIO */
  .scenario-output { background: linear-gradient(135deg, ${T.forest} 0%, ${T.forestMid} 100%); border-radius: 12px; padding: 28px; color: ${T.white}; }
  .scenario-metric { text-align: center; padding: 16px; }
  .scenario-metric-value { font-family: 'Cormorant Garamond', serif; font-size: 36px; font-weight: 300; color: ${T.goldLight}; line-height: 1; margin-bottom: 6px; }
  .scenario-metric-label { font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(255,255,255,0.5); }

  /* PRIORITIES */
  .priority-item { display: flex; align-items: flex-start; gap: 14px; padding: 14px 0; border-bottom: 1px solid ${T.beige}; }
  .priority-item:last-child { border-bottom: none; }
  .priority-dot { width: 8px; height: 8px; border-radius: 50%; background: ${T.gold}; margin-top: 5px; flex-shrink: 0; }
  .priority-dot.green { background: ${T.forestLight}; }
  .priority-title { font-weight: 500; font-size: 13px; color: ${T.text}; }
  .priority-desc  { font-size: 12px; color: ${T.textMid}; margin-top: 2px; }

  /* STRATEGY */
  .strategy-pillar { border-left: 3px solid ${T.gold}; padding: 16px 20px; background: ${T.white}; border-radius: 0 10px 10px 0; margin-bottom: 12px; }
  .strategy-pillar-title { font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 400; color: ${T.forest}; margin-bottom: 6px; }
  .strategy-pillar-body { font-size: 13px; color: ${T.textMid}; line-height: 1.7; }
  .quote-block { background: ${T.forest}; border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 28px; }
  .quote-text { font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 300; font-style: italic; color: ${T.goldLight}; letter-spacing: 0.02em; }
  .quote-attr { font-size: 11px; color: rgba(255,255,255,0.35); margin-top: 12px; letter-spacing: 0.12em; text-transform: uppercase; }

  /* FOUNDERS */
  .founder-card { background: ${T.white}; border: 1px solid ${T.beigeDeep}; border-radius: 12px; padding: 20px; position: relative; overflow: hidden; }
  .founder-card::before { content: '✦'; position: absolute; top: 16px; right: 16px; color: ${T.goldLight}; font-size: 14px; }
  .founder-card-name { font-family: 'Cormorant Garamond', serif; font-size: 18px; font-weight: 400; color: ${T.forest}; margin-bottom: 4px; padding-right: 24px; }
  .founder-card-cat { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: ${T.gold}; margin-bottom: 16px; }
  .founder-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px; }
  .founder-metric { background: ${T.beige}; border-radius: 6px; padding: 10px 12px; }
  .founder-metric-label { font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: ${T.textLight}; }
  .founder-metric-value { font-family: 'Cormorant Garamond', serif; font-size: 18px; color: ${T.forestMid}; margin-top: 2px; }

  /* UTILITY */
  .flex { display: flex; }
  .flex-col { display: flex; flex-direction: column; }
  .items-center { align-items: center; }
  .gap-8  { gap: 8px; }
  .gap-12 { gap: 12px; }
  .gap-16 { gap: 16px; }
  .mb-24 { margin-bottom: 24px; }
  .divider { height: 1px; background: ${T.beigeDeep}; margin: 24px 0; }
  .section-label { font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: ${T.gold}; font-weight: 600; margin-bottom: 16px; }
  .tabs { display: flex; gap: 0; border-bottom: 1px solid ${T.beigeDeep}; margin-bottom: 24px; }
  .tab { padding: 10px 20px; font-size: 13px; font-weight: 500; color: ${T.textMid}; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.15s; margin-bottom: -1px; }
  .tab:hover { color: ${T.forest}; }
  .tab.active { color: ${T.forest}; border-bottom-color: ${T.gold}; }
  .empty-state { text-align: center; padding: 60px 20px; color: ${T.textLight}; }
  .empty-icon  { font-size: 40px; margin-bottom: 12px; opacity: 0.4; }

  /* BUSINESS PROGRESS */
  .bp-hero { background: linear-gradient(135deg, ${T.forest} 0%, ${T.forestMid} 100%); padding: 28px 40px; display: flex; align-items: center; justify-content: space-between; gap: 32px; }
  .bp-hero-title { font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 300; color: ${T.white}; line-height: 1; }
  .bp-hero-sub { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.4); margin-top: 6px; }
  .bp-overall { text-align: right; flex-shrink: 0; }
  .bp-overall-pct { font-family: 'Cormorant Garamond', serif; font-size: 52px; font-weight: 300; color: ${T.goldLight}; line-height: 1; }
  .bp-overall-label { font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(255,255,255,0.4); margin-top: 4px; }
  .bp-overall-bar { width: 200px; height: 4px; background: rgba(255,255,255,0.15); border-radius: 2px; margin-top: 10px; margin-left: auto; overflow: hidden; }
  .bp-overall-bar-fill { height: 100%; background: linear-gradient(90deg, ${T.gold}, ${T.goldLight}); border-radius: 2px; transition: width 0.6s ease; }
  .bp-filters { display: flex; align-items: center; gap: 8px; padding: 20px 40px; background: ${T.white}; border-bottom: 1px solid ${T.beigeDeep}; flex-wrap: wrap; }
  .bp-filter-label { font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: ${T.textLight}; margin-right: 4px; }
  .bp-filter-btn { padding: 5px 14px; border-radius: 20px; border: 1px solid ${T.beigeDeep}; background: transparent; font-size: 12px; font-family: 'Inter', sans-serif; color: ${T.textMid}; cursor: pointer; transition: all 0.15s; }
  .bp-filter-btn:hover { border-color: ${T.gold}; color: ${T.forest}; }
  .bp-filter-btn.active { background: ${T.forest}; color: ${T.goldLight}; border-color: ${T.forest}; }
  .bp-section { margin-bottom: 28px; }
  .bp-section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid ${T.beigeDeep}; }
  .bp-section-title { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 400; color: ${T.forest}; }
  .bp-section-meta { display: flex; align-items: center; gap: 12px; }
  .bp-section-count { font-size: 11px; color: ${T.textLight}; }
  .bp-mini-bar { width: 100px; height: 4px; background: ${T.beige}; border-radius: 2px; overflow: hidden; }
  .bp-mini-bar-fill { height: 100%; background: linear-gradient(90deg, ${T.gold}, ${T.goldLight}); border-radius: 2px; }
  .bp-task { background: ${T.white}; border: 1px solid ${T.beigeDeep}; border-radius: 10px; padding: 16px 20px; margin-bottom: 10px; transition: box-shadow 0.15s; }
  .bp-task:hover { box-shadow: 0 2px 12px rgba(28,48,40,0.07); }
  .bp-task-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
  .bp-task-left { display: flex; align-items: flex-start; gap: 14px; flex: 1; }
  .bp-task-checkbox { width: 18px; height: 18px; border-radius: 4px; border: 1.5px solid ${T.beigeDeep}; cursor: pointer; background: transparent; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; transition: all 0.15s; font-size: 11px; color: ${T.white}; }
  .bp-task-checkbox.completed   { background: ${T.forestLight}; border-color: ${T.forestLight}; }
  .bp-task-checkbox.in-progress { background: ${T.gold}; border-color: ${T.gold}; }
  .bp-task-name { font-size: 14px; font-weight: 500; color: ${T.text}; line-height: 1.4; }
  .bp-task-name.completed { text-decoration: line-through; color: ${T.textLight}; }
  .bp-task-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .bp-task-bottom { display: flex; align-items: center; gap: 16px; margin-top: 10px; padding-top: 10px; border-top: 1px solid ${T.beige}; flex-wrap: wrap; }
  .bp-task-meta-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: ${T.textLight}; }
  .bp-task-meta-label { font-weight: 500; color: ${T.textMid}; }
  .bp-task-expand-btn { background: none; border: none; font-size: 11px; color: ${T.gold}; cursor: pointer; padding: 0; font-family: 'Inter', sans-serif; margin-left: auto; }
  .bp-task-detail { margin-top: 12px; padding-top: 12px; border-top: 1px solid ${T.beige}; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .pri-critical { background: rgba(139,58,58,0.12); color: ${T.danger}; }
  .pri-high     { background: rgba(184,151,90,0.15); color: #8B6914; }
  .pri-medium   { background: rgba(61,107,82,0.12); color: ${T.forestLight}; }
  .pri-low      { background: ${T.beige}; color: ${T.textMid}; }
  .bp-status-select { padding: 3px 8px; border-radius: 20px; border: 1px solid ${T.beigeDeep}; font-size: 11px; font-family: 'Inter', sans-serif; font-weight: 500; cursor: pointer; outline: none; background: ${T.white}; }
  .bp-status-select.completed   { background: rgba(61,107,82,0.1); color: ${T.forestLight}; border-color: transparent; }
  .bp-status-select.in-progress { background: ${T.goldPale}; color: #8B6914; border-color: transparent; }
  .bp-status-select.not-started { background: ${T.beige}; color: ${T.textMid}; border-color: transparent; }
  .bp-summary-row { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin-bottom: 28px; }
  .bp-summary-card { background: ${T.white}; border: 1px solid ${T.beigeDeep}; border-radius: 10px; padding: 16px 20px; text-align: center; }
  .bp-summary-num { font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 300; line-height: 1; margin-bottom: 4px; }
  .bp-summary-lbl { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: ${T.textLight}; }

  @media (max-width: 900px) {
    .sidebar { width: 200px; }
    .main { margin-left: 200px; }
    .page-content { padding: 24px; }
    .grid-4 { grid-template-columns: repeat(2, 1fr); }
    .grid-3 { grid-template-columns: repeat(2, 1fr); }
  }
`

export default css
