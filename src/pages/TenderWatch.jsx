// TenderWatch.jsx — v1.0
// AI-enabled tender monitoring and bid/no-bid decision support for Botanica Living.
// Data: bl_tenders (localStorage). Documents stay inside TenderWatch, not in bl_documents.
import { useState, useMemo, useRef, useCallback } from 'react'
import { T } from '../utils/tokens.js'
import { nextId, today, fmtDate, safeStr, truncate } from '../utils/format.js'
import Modal from '../components/Modal.jsx'
import { OCR_AVAILABLE, extractPdfText } from '../lib/ocr.js'
import { storeFile } from '../lib/fileStore.js'

// ── Constants ─────────────────────────────────────────────────────────────────
const TENDER_STATUSES   = ['Watching','Evaluating','Preparing Bid','Submitted','Awarded','Declined','Archived','Lost']
const TENDER_CATEGORIES = ['Healthcare','Hospitality','Education','Corporate','Government','Property','Facilities','Landscaping','Interior Design','Retail','Public Infrastructure','Other']
const RELEVANCE_CRITERIA = ['Healthcare','Hospitality','Facilities','Interior upgrades','Landscaping','Artificial plants','Green walls','Waiting areas','Reception areas','Public spaces','Offices','Education','Commercial property']
const DOC_REQUIREMENTS  = ['Tax Clearance','Company Registration','BBBEE Certificate','CIDB Registration','Financial Statements (3 years)','References','Product Samples','Catalogue / Product Brochure','Product Specifications','Technical Submission','Pricing Schedule','Method Statement','Insurance Certificate','Other']
const WATCH_SOURCES     = ['eTenders Portal','SA Tender Bulletin','Provincial Health Dept','Dept of Public Works','SANBI','ACSA','Municipal Portals','Universities & Colleges','Hospital Groups','Facilities Companies','Property Funds','LinkedIn / Direct','Other']
const COMPETITORS       = ['Distinctive Spaces','Plantr','Plantify','Green Walls SA','Generic Nurseries','Other']
const URGENCY_LEVELS    = [
  { key:'urgent',      label:'Urgent',       days:3,  color:T.danger,  bg:T.redPale },
  { key:'closingSoon', label:'Closing Soon',  days:7,  color:T.red,    bg:'rgba(185,28,28,0.08)' },
  { key:'thisWeek',    label:'This Week',    days:14, color:T.gold,   bg:T.goldPale },
  { key:'30days',      label:'30 Days',      days:30, color:T.teal,   bg:T.tealPale },
  { key:'longTerm',    label:'Long Term',    days:999,color:T.green,  bg:T.greenPale },
]
const BLANK_TENDER = {
  title:'', reference:'', client:'', department:'', source:'eTenders Portal',
  category:'Healthcare', status:'Watching', priority:'Medium',
  closingDate:'', briefingDate:'', siteVisitDate:'', clarificationDate:'',
  submissionMethod:'Email', estimatedValue:'', currency:'ZAR',
  description:'', scope:'', notes:'',
  // AI fields
  aiSummary:'', aiCategory:'', aiScope:'', aiClient:'', aiClosingDate:'',
  aiRequiredDocs:[], aiEstimatedValue:'', aiSubmissionMethod:'',
  relevanceScore:0, relevanceLabel:'', bidRecommendation:'', bidReason:'',
  opportunityScore:0, suggestedActions:[],
  urgency:'longTerm',
  // Documents
  documents:[], // [{id,name,size,uploadDate,type}]
  // Checklist
  docChecklist:{},
  // Competitors observed
  competitors:[],
  // Linked
  linkedClients:[], linkedProjects:[],
  addedDate: today(),
  _extractedAt:'',
}

// ── AI relevance scoring (local heuristic — enhanced by API if available) ────
function scoreRelevance(text) {
  const t = (text || '').toLowerCase()
  let score = 0
  const hits = []
  const kws = [
    { w:['plant','botanical','greenery','green wall','artificial','foliage','potted'], pts:20, label:'Plants/Greenery' },
    { w:['interior','decor','furnish','reception','waiting area','lobby','atrium'],    pts:15, label:'Interior spaces' },
    { w:['healthcare','hospital','clinic','medical','patient','ward'],                 pts:12, label:'Healthcare' },
    { w:['hospitality','hotel','resort','lodge','restaurant'],                         pts:12, label:'Hospitality' },
    { w:['education','school','campus','university','college'],                        pts:10, label:'Education' },
    { w:['facilities','maintenance','property','office','commercial'],                 pts:8,  label:'Facilities/Property' },
    { w:['landscape','outdoor','garden','horticulture'],                               pts:6,  label:'Landscaping' },
  ]
  const exclusions = [
    { w:['civil','road','tar','paving','construction','excavat','concrete','brickwork'], pts:-15 },
    { w:['plumb','electrical','hvac','mechanical','structural'],                         pts:-10 },
    { w:['it service','software','hardware','server','network'],                          pts:-12 },
    { w:['catering','food','beverage','cleaning','security guard'],                       pts:-8  },
  ]
  kws.forEach(({w,pts,label}) => {
    if (w.some(kw => t.includes(kw))) { score += pts; hits.push(label) }
  })
  exclusions.forEach(({w,pts}) => {
    if (w.some(kw => t.includes(kw))) score += pts
  })
  const final = Math.max(0, Math.min(100, score + 20)) // base 20 for being considered
  return {
    score: final,
    label: final >= 70 ? 'High Match' : final >= 40 ? 'Medium Match' : 'Low Match',
    hits,
  }
}

function bidRecommendation(score, text) {
  const t = (text || '').toLowerCase()
  if (score >= 70) return { rec:'Recommended', reason:'This tender aligns strongly with Botanica Living\'s product offering and target market segments.' }
  if (score >= 40) return { rec:'Investigate', reason:'Partial relevance detected. Review scope to determine if artificial greenery can be incorporated.' }
  return { rec:'Not Recommended', reason:'Low relevance to Botanica Living\'s core offering. Likely a civil, IT, or non-related category.' }
}

function urgencyFromDate(dateStr) {
  if (!dateStr) return 'longTerm'
  const days = Math.ceil((new Date(dateStr) - new Date()) / 86400000)
  if (days <= 3)  return 'urgent'
  if (days <= 7)  return 'closingSoon'
  if (days <= 14) return 'thisWeek'
  if (days <= 30) return '30days'
  return 'longTerm'
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000)
}

// ── AI extraction via /api/extract ────────────────────────────────────────────
async function extractTenderWithAI(file, rawText) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('rawText', rawText.slice(0, 10000))
  formData.append('extractionType', 'tender_document')
  formData.append('prompt',
    'You are analyzing a South African government or corporate tender document for Botanica Living Group, ' +
    'a premium artificial greenery supplier.\n\n' +
    'Extract the following fields from the tender document. Return ONLY valid JSON, no markdown.\n\n' +
    '{\n' +
    '  "title": "",\n' +
    '  "reference": "",\n' +
    '  "client": "",\n' +
    '  "department": "",\n' +
    '  "category": "Healthcare|Hospitality|Education|Corporate|Government|Property|Facilities|Landscaping|Interior Design|Retail|Public Infrastructure|Other",\n' +
    '  "closingDate": "YYYY-MM-DD",\n' +
    '  "briefingDate": "YYYY-MM-DD",\n' +
    '  "clarificationDate": "YYYY-MM-DD",\n' +
    '  "estimatedValue": "",\n' +
    '  "submissionMethod": "",\n' +
    '  "scope": "",\n' +
    '  "summary": "",\n' +
    '  "requiredDocuments": ["Tax Clearance", "..."],\n' +
    '  "suggestedActions": ["Contact facilities manager", "..."]\n' +
    '}'
  )

  const res = await fetch('/api/extract', { method:'POST', body:formData })
  if (!res.ok) throw new Error('API ' + res.status)
  const data = await res.json()
  const text = data.text || (Array.isArray(data.content) ? data.content.map(c=>c.text||'').join('') : '')
  try {
    const clean = text.replace(/```json|```/g,'').trim()
    return JSON.parse(clean)
  } catch { return null }
}

// ── Badge components ──────────────────────────────────────────────────────────
function RelevanceBadge({ score, label }) {
  const col = score>=70?T.green:score>=40?T.gold:T.textLight
  const bg  = score>=70?T.greenPale:score>=40?T.goldPale:'rgba(161,161,170,0.1)'
  return (
    <div style={{ display:'inline-flex',alignItems:'center',gap:6,padding:'3px 10px',borderRadius:20,background:bg }}>
      <span style={{ fontSize:13,fontWeight:800,color:col }}>{score}%</span>
      <span style={{ fontSize:10,fontWeight:600,color:col,letterSpacing:'0.08em' }}>{label}</span>
    </div>
  )
}

function BidBadge({ rec }) {
  const cfg = {
    'Recommended':     { bg:T.greenPale, color:T.green,  icon:'✓' },
    'Investigate':     { bg:T.goldPale,  color:T.gold,   icon:'⚑' },
    'Not Recommended': { bg:T.redPale,   color:T.danger, icon:'✕' },
  }
  const c = cfg[rec] || cfg['Investigate']
  return (
    <span style={{ fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20,background:c.bg,color:c.color }}>
      {c.icon} {rec}
    </span>
  )
}

function UrgencyBadge({ urgency }) {
  const u = URGENCY_LEVELS.find(u=>u.key===urgency) || URGENCY_LEVELS[4]
  return <span style={{ fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,background:u.bg,color:u.color,whiteSpace:'nowrap' }}>{u.label}</span>
}

function StatusBadge({ status }) {
  const col = status==='Awarded'?T.green:status==='Submitted'?T.teal:status==='Preparing Bid'?T.gold:status==='Declined'||status==='Lost'?T.textLight:T.textMid
  return <span style={{ fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:20,background:'rgba(161,161,170,0.1)',color:col,whiteSpace:'nowrap' }}>{status}</span>
}

// ── Add/Edit tender modal ─────────────────────────────────────────────────────
function TenderForm({ tender, onSave, onClose }) {
  const [form, setForm] = useState({ ...BLANK_TENDER, ...tender })
  const [tab, setTab]   = useState('basic')
  const F = k => e => setForm(f=>({...f,[k]:e.target.value}))
  const save = () => {
    if (!form.title?.trim()) return
    const urgency = urgencyFromDate(form.closingDate)
    onSave({ ...form, urgency })
  }
  return (
    <Modal open title={tender?.id ? 'Edit Tender' : 'Add Tender'} onClose={onClose}
      footer={<><button className="btn btn-outline" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}>Save Tender</button></>}
    >
      <div className="tabs" style={{ marginBottom:16 }}>
        {['basic','dates','ai','checklist'].map(t=>(
          <div key={t} className={`tab ${tab===t?'active':''}`} onClick={()=>setTab(t)}>
            {t==='basic'?'Details':t==='dates'?'Dates':t==='ai'?'AI Analysis':'Checklist'}
          </div>
        ))}
      </div>

      {tab==='basic' && (
        <div className="form-grid">
          <div className="form-field full"><label>Tender Title *</label><input value={form.title||''} onChange={F('title')} placeholder="e.g. Mediclinic Interior Upgrade — Reception Areas"/></div>
          <div className="form-field"><label>Reference / Bid Number</label><input value={form.reference||''} onChange={F('reference')}/></div>
          <div className="form-field"><label>Status</label><select value={form.status} onChange={F('status')}>{TENDER_STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
          <div className="form-field"><label>Client / Institution</label><input value={form.client||''} onChange={F('client')}/></div>
          <div className="form-field"><label>Department</label><input value={form.department||''} onChange={F('department')}/></div>
          <div className="form-field"><label>Category</label><select value={form.category} onChange={F('category')}>{TENDER_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
          <div className="form-field"><label>Source</label><select value={form.source} onChange={F('source')}>{WATCH_SOURCES.map(s=><option key={s}>{s}</option>)}</select></div>
          <div className="form-field"><label>Priority</label><select value={form.priority} onChange={F('priority')}><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></div>
          <div className="form-field"><label>Estimated Value</label><input value={form.estimatedValue||''} onChange={F('estimatedValue')} placeholder="e.g. R 250 000"/></div>
          <div className="form-field"><label>Submission Method</label><input value={form.submissionMethod||''} onChange={F('submissionMethod')} placeholder="Email / Physical / Portal"/></div>
          <div className="form-field full"><label>Scope / Description</label><textarea value={form.scope||''} onChange={F('scope')} placeholder="What is this tender for?"/></div>
          <div className="form-field full"><label>Notes</label><textarea value={form.notes||''} onChange={F('notes')}/></div>
        </div>
      )}

      {tab==='dates' && (
        <div className="form-grid">
          <div className="form-field"><label>Closing Date</label><input type="date" value={form.closingDate||''} onChange={F('closingDate')}/></div>
          <div className="form-field"><label>Briefing / Info Day</label><input type="date" value={form.briefingDate||''} onChange={F('briefingDate')}/></div>
          <div className="form-field"><label>Site Visit Date</label><input type="date" value={form.siteVisitDate||''} onChange={F('siteVisitDate')}/></div>
          <div className="form-field"><label>Clarification Deadline</label><input type="date" value={form.clarificationDate||''} onChange={F('clarificationDate')}/></div>
        </div>
      )}

      {tab==='ai' && (
        <div>
          <div style={{ padding:'12px 14px', background:T.goldPale, border:`1px solid rgba(184,151,90,0.25)`, borderRadius:10, fontSize:12, color:'#6B4E10', marginBottom:14 }}>
            AI analysis runs automatically on document upload. You can also set scores manually here.
          </div>
          <div className="form-grid">
            <div className="form-field"><label>Relevance Score (0–100)</label><input type="number" min="0" max="100" value={form.relevanceScore||0} onChange={e=>setForm(f=>({...f,relevanceScore:Number(e.target.value)}))}/></div>
            <div className="form-field"><label>Bid Recommendation</label><select value={form.bidRecommendation||'Investigate'} onChange={F('bidRecommendation')}><option>Recommended</option><option>Investigate</option><option>Not Recommended</option></select></div>
            <div className="form-field full"><label>AI Summary</label><textarea value={form.aiSummary||''} onChange={F('aiSummary')} placeholder="AI-generated or manual summary"/></div>
            <div className="form-field full"><label>Bid Reasoning</label><textarea value={form.bidReason||''} onChange={F('bidReason')} placeholder="Why bid or not bid?"/></div>
          </div>
        </div>
      )}

      {tab==='checklist' && (
        <div>
          <div style={{ fontSize:12, color:T.textMid, marginBottom:12, lineHeight:1.6 }}>
            Tick off documents as you prepare them for submission.
          </div>
          {DOC_REQUIREMENTS.map(req => (
            <div key={req} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0', borderBottom:`1px solid rgba(210,200,184,0.3)` }}>
              <input type="checkbox" checked={!!(form.docChecklist||{})[req]}
                onChange={e=>setForm(f=>({...f,docChecklist:{...(f.docChecklist||{}),[req]:e.target.checked}}))}
                style={{ accentColor:T.gold, width:16, height:16 }}/>
              <span style={{ fontSize:13, color:T.forest }}>{req}</span>
              {(form.docChecklist||{})[req] && <span style={{ fontSize:10, color:T.green, marginLeft:'auto', fontWeight:700 }}>✓ Ready</span>}
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN TENDER WATCH COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function TenderWatch({ tenders, setTenders, clients }) {
  const [tab,       setTab]       = useState('dashboard')
  const [modal,     setModal]     = useState(false)   // add/edit
  const [editing,   setEditing]   = useState(null)    // tender being edited
  const [selected,  setSelected]  = useState(null)    // detail view
  const [search,    setSearch]    = useState('')
  const [filterCat, setFilterCat] = useState('All')
  const [filterSt,  setFilterSt]  = useState('All')
  const [extracting, setExtracting] = useState(false)
  const [extractMsg, setExtractMsg] = useState('')
  const fileRef = useRef()
  const sc = Array.isArray(clients) ? clients : []
  const safe = Array.isArray(tenders) ? tenders : []

  const openNew  = () => { setEditing(null); setModal(true) }
  const openEdit = t  => { setEditing(t); setModal(true) }
  const del = id => {
    if (!window.confirm('Delete this tender?')) return
    setTenders(tt=>tt.filter(t=>t.id!==id))
    if (selected?.id===id) setSelected(null)
  }

  const save = useCallback(form => {
    const rec = { ...BLANK_TENDER, ...form, id: editing?.id ?? nextId(safe) }
    if (editing?.id) setTenders(tt=>tt.map(t=>t.id===editing.id?rec:t))
    else             setTenders(tt=>[...tt,rec])
    setModal(false)
    setEditing(null)
  }, [editing, safe, setTenders])

  // ── Upload tender document + AI extraction ───────────────────────────────
  const handleUpload = async e => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setExtracting(true)
    setExtractMsg('Reading document…')

    try {
      // Extract text
      let rawText = ''
      const ext = file.name.split('.').pop().toLowerCase()
      if (ext === 'pdf') {
        try { const r = await extractPdfText(file); rawText = r.text || '' } catch {}
      }

      // Score relevance locally
      const { score, label, hits } = scoreRelevance(rawText || file.name)
      const { rec, reason }        = bidRecommendation(score, rawText)
      const urgency                = 'longTerm'

      let aiData = null
      if (OCR_AVAILABLE && rawText.length > 50) {
        setExtractMsg('Running AI analysis…')
        try { aiData = await extractTenderWithAI(file, rawText) } catch {}
      }

      // Build new tender record
      const newTender = {
        ...BLANK_TENDER,
        id:              nextId(safe),
        title:           aiData?.title     || file.name.replace(/\.[^.]+$/,''),
        reference:       aiData?.reference || '',
        client:          aiData?.client    || '',
        department:      aiData?.department || '',
        category:        aiData?.category  || 'Other',
        closingDate:     aiData?.closingDate || '',
        briefingDate:    aiData?.briefingDate || '',
        clarificationDate: aiData?.clarificationDate || '',
        estimatedValue:  aiData?.estimatedValue || '',
        submissionMethod:aiData?.submissionMethod || '',
        scope:           aiData?.scope || rawText.slice(0, 300),
        aiSummary:       aiData?.summary || (rawText.slice(0, 400) + (rawText.length > 400 ? '…' : '')),
        aiRequiredDocs:  aiData?.requiredDocuments || [],
        suggestedActions:aiData?.suggestedActions  || ['Review tender scope','Prepare product list','Contact client'],
        relevanceScore:  score,
        relevanceLabel:  label,
        bidRecommendation: rec,
        bidReason:       reason,
        opportunityScore: score,
        urgency,
        status:          'Watching',
        addedDate:       today(),
        _extractedAt:    new Date().toISOString(),
        documents: [{ id:Date.now(), name:file.name, size:`${(file.size/1024).toFixed(0)} KB`, uploadDate:today(), type:ext }],
      }
      setTenders(tt=>[...tt, newTender])
      setSelected(newTender)
      setTab('tenders')
    } catch(err) {
      alert('Upload failed: ' + err.message)
    }
    setExtracting(false)
    setExtractMsg('')
  }

  // ── Filtered list ─────────────────────────────────────────────────────────
  const visible = useMemo(() => {
    const q = search.toLowerCase()
    return safe
      .filter(t =>
        (filterCat==='All'||t.category===filterCat) &&
        (filterSt==='All'||t.status===filterSt) &&
        (!q||[t.title,t.client,t.category,t.reference,t.department].some(v=>(v||'').toLowerCase().includes(q)))
      )
      .sort((a,b) => (b.relevanceScore||0)-(a.relevanceScore||0))
  }, [safe, filterCat, filterSt, search])

  // ── Dashboard stats ───────────────────────────────────────────────────────
  const openCount    = safe.filter(t=>!['Archived','Declined','Lost'].includes(t.status)).length
  const highMatch    = safe.filter(t=>t.relevanceScore>=70).length
  const closingSoon  = safe.filter(t=>{ const d=daysUntil(t.closingDate); return d!==null&&d<=7&&d>=0 }).length
  const submitted    = safe.filter(t=>t.status==='Submitted').length
  const avgScore     = safe.length>0 ? Math.round(safe.reduce((s,t)=>s+(t.relevanceScore||0),0)/safe.length) : 0

  const sel = selected ? safe.find(t=>t.id===selected.id) || selected : null

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Tender Watch</div>
          <div className="page-subtitle">AI Tender Monitoring · Bid/No-Bid Intelligence · Opportunity Scoring</div>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button className="btn btn-outline btn-sm" onClick={()=>fileRef.current?.click()} disabled={extracting}>
            {extracting ? extractMsg : '↑ Upload Tender PDF'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={openNew}>+ Add Tender</button>
          <input ref={fileRef} type="file" accept=".pdf,.docx,.doc" style={{display:'none'}} onChange={handleUpload}/>
        </div>
      </div>

      {/* AI status banner */}
      {!OCR_AVAILABLE && (
        <div style={{ margin:'0 36px 16px', padding:'10px 16px', background:T.goldPale, border:`1px solid rgba(184,151,90,0.25)`, borderRadius:10, fontSize:12, color:'#6B4E10' }}>
          ⚑ AI extraction requires <code>OCR_SECRET_KEY</code> + <code>VITE_OCR_API_KEY</code> in Vercel. Local relevance scoring and heuristic extraction are active.
        </div>
      )}

      {/* Tabs */}
      <div className="page-content">
        <div className="tabs" style={{ marginBottom:20 }}>
          {[
            {id:'dashboard', label:'Dashboard'},
            {id:'tenders',   label:`Tenders (${safe.length})`},
            {id:'competitors',label:'Competitor Watch'},
            {id:'sources',    label:'Watch Sources'},
          ].map(t=>(
            <div key={t.id} className={`tab ${tab===t.id?'active':''}`} onClick={()=>setTab(t.id)}>{t.label}</div>
          ))}
        </div>

        {/* ── DASHBOARD ─────────────────────────────────────────────────────── */}
        {tab==='dashboard' && (
          <div>
            {/* KPIs */}
            <div className="grid-5" style={{ marginBottom:20 }}>
              {[
                { label:'Open Tenders',    val:openCount,   color:T.forest },
                { label:'Closing Soon',    val:closingSoon, color:closingSoon>0?T.danger:T.green },
                { label:'AI High Match',   val:highMatch,   color:T.green },
                { label:'Submitted',       val:submitted,   color:T.teal },
                { label:'Avg Opp. Score',  val:`${avgScore}%`, color:T.gold },
              ].map(k=>(
                <div key={k.label} className="stat-card">
                  <div className="stat-label">{k.label}</div>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:26, color:k.color, lineHeight:1, marginTop:4 }}>{k.val}</div>
                </div>
              ))}
            </div>

            {safe.length===0 ? (
              <div className="empty-st">
                <div className="empty-ic">⚑</div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, color:T.forest, marginBottom:8 }}>
                  No tenders yet
                </div>
                <div style={{ fontSize:13, color:T.textMid, maxWidth:440, textAlign:'center', lineHeight:1.7, marginBottom:20 }}>
                  Upload a tender PDF to automatically extract details and score relevance, or add a tender manually.
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button className="btn btn-outline" onClick={()=>fileRef.current?.click()}>↑ Upload PDF</button>
                  <button className="btn btn-primary" onClick={openNew}>+ Add Manually</button>
                </div>
              </div>
            ) : (
              <div className="grid-3">
                {/* Top opportunities */}
                <div className="g-card" style={{ gridColumn:'1/3' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:T.forest }}>Top Opportunities by AI Score</div>
                    <button className="btn btn-ghost btn-xs" style={{color:T.gold}} onClick={()=>setTab('tenders')}>View all →</button>
                  </div>
                  {safe.sort((a,b)=>(b.relevanceScore||0)-(a.relevanceScore||0)).slice(0,5).map(t=>(
                    <div key={t.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 0', borderBottom:`1px solid rgba(210,200,184,0.3)`, cursor:'pointer' }} onClick={()=>{setSelected(t);setTab('tenders')}}>
                      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, color:t.relevanceScore>=70?T.green:t.relevanceScore>=40?T.gold:T.textLight, width:44, textAlign:'right', flexShrink:0, fontWeight:700 }}>{t.relevanceScore}%</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:T.forest, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</div>
                        <div style={{ fontSize:11, color:T.textMid }}>{t.client||t.category} {t.closingDate?'· Closes '+fmtDate(t.closingDate):''}</div>
                      </div>
                      <BidBadge rec={t.bidRecommendation||'Investigate'} />
                    </div>
                  ))}
                </div>

                {/* Deadlines */}
                <div className="g-card">
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:T.forest, marginBottom:14 }}>Upcoming Deadlines</div>
                  {safe.filter(t=>t.closingDate).sort((a,b)=>a.closingDate.localeCompare(b.closingDate)).slice(0,6).map(t=>{
                    const d = daysUntil(t.closingDate)
                    const u = URGENCY_LEVELS.find(u=>u.key===urgencyFromDate(t.closingDate))
                    return (
                      <div key={t.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:`1px solid rgba(210,200,184,0.3)`, gap:8 }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:600, color:T.forest, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{truncate(t.title,35)}</div>
                          <div style={{ fontSize:10, color:T.textMid }}>{fmtDate(t.closingDate)}</div>
                        </div>
                        <span style={{ fontSize:11, fontWeight:700, color:u?.color, whiteSpace:'nowrap' }}>
                          {d!==null?`${d}d`:''}
                        </span>
                      </div>
                    )
                  })}
                  {!safe.some(t=>t.closingDate) && <div style={{fontSize:12,color:T.textMid}}>No closing dates set yet.</div>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TENDERS LIST + DETAIL ─────────────────────────────────────────── */}
        {tab==='tenders' && (
          <div style={{ display:'grid', gridTemplateColumns:sel?'1fr 380px':'1fr', gap:16, alignItems:'start' }}>
            <div>
              {/* Filters */}
              <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
                <div style={{ position:'relative', flex:1, minWidth:200 }}>
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tenders…" style={{paddingLeft:32}}/>
                  <span style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:T.textLight,fontSize:14,pointerEvents:'none' }}>⊙</span>
                </div>
                <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{fontSize:12,padding:'8px 10px'}}>
                  <option value="All">All Categories</option>
                  {TENDER_CATEGORIES.map(c=><option key={c}>{c}</option>)}
                </select>
                <select value={filterSt} onChange={e=>setFilterSt(e.target.value)} style={{fontSize:12,padding:'8px 10px'}}>
                  <option value="All">All Statuses</option>
                  {TENDER_STATUSES.map(s=><option key={s}>{s}</option>)}
                </select>
                <div style={{ fontSize:12, color:T.textMid }}>{visible.length} results</div>
              </div>

              {visible.length===0 ? (
                <div className="empty-st">
                  <div className="empty-ic">⚑</div>
                  <div>No tenders match that filter.</div>
                  <button className="btn btn-primary btn-sm" style={{marginTop:12}} onClick={openNew}>+ Add Tender</button>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {visible.map(t => (
                    <div key={t.id} className="doc-card" style={{ border:sel?.id===t.id?`1.5px solid ${T.gold}`:undefined, cursor:'pointer', flexWrap:'wrap', gap:10 }} onClick={()=>setSelected(sel?.id===t.id?null:t)}>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, flexShrink:0, width:52 }}>
                        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, color:t.relevanceScore>=70?T.green:t.relevanceScore>=40?T.gold:T.textLight, fontWeight:700, lineHeight:1 }}>{t.relevanceScore||0}%</div>
                        <div style={{ fontSize:8, color:T.textLight, textTransform:'uppercase', letterSpacing:'0.08em', textAlign:'center' }}>{t.relevanceLabel||'Score'}</div>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:15, color:T.forest, marginBottom:2 }}>{safeStr(t.title)}</div>
                        <div style={{ fontSize:12, color:T.textMid }}>
                          {t.client&&<span style={{color:T.teal,fontWeight:600}}>{t.client}</span>}
                          {t.client&&t.category&&<span> · </span>}
                          {t.category}
                          {t.estimatedValue&&<span style={{color:T.green,fontWeight:600}}> · {t.estimatedValue}</span>}
                        </div>
                        {t.closingDate && (
                          <div style={{ fontSize:11, color:daysUntil(t.closingDate)<=7?T.danger:T.textMid, marginTop:2 }}>
                            Closes {fmtDate(t.closingDate)}
                            {daysUntil(t.closingDate)!==null&&<span style={{fontWeight:600}}> ({daysUntil(t.closingDate)}d)</span>}
                          </div>
                        )}
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:4, flexShrink:0, alignItems:'flex-end' }} onClick={e=>e.stopPropagation()}>
                        <StatusBadge status={t.status}/>
                        {t.bidRecommendation && <BidBadge rec={t.bidRecommendation}/>}
                        <div style={{ display:'flex', gap:4, marginTop:2 }}>
                          <button className="btn btn-outline btn-xs" onClick={()=>openEdit(t)}>Edit</button>
                          <button className="btn btn-xs btn-ghost" style={{color:T.textLight}} onClick={()=>del(t.id)}>✕</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Detail panel */}
            {sel && (
              <div className="g-card" style={{ position:'sticky', top:80, maxHeight:'calc(100vh - 120px)', overflow:'auto' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14, paddingBottom:12, borderBottom:`1px solid rgba(210,200,184,0.4)` }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:T.forest, lineHeight:1.2, overflowWrap:'break-word' }}>{sel.title}</div>
                    <div style={{ fontSize:11, color:T.teal, letterSpacing:'0.1em', textTransform:'uppercase', fontWeight:600, marginTop:4 }}>{sel.category}</div>
                    <div style={{ display:'flex', gap:6, marginTop:6, flexWrap:'wrap' }}>
                      <RelevanceBadge score={sel.relevanceScore||0} label={sel.relevanceLabel||''} />
                      {sel.bidRecommendation && <BidBadge rec={sel.bidRecommendation} />}
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-xs" onClick={()=>setSelected(null)}>✕</button>
                </div>

                {/* Core details */}
                {[
                  ['Client',      sel.client||'—'],
                  ['Department',  sel.department||'—'],
                  ['Reference',   sel.reference||'—'],
                  ['Est. Value',  sel.estimatedValue||'—'],
                  ['Submission',  sel.submissionMethod||'—'],
                  ['Status',      sel.status],
                  ['Source',      sel.source||'—'],
                  ['Closing',     sel.closingDate?fmtDate(sel.closingDate):'—'],
                  ['Briefing',    sel.briefingDate?fmtDate(sel.briefingDate):'—'],
                ].map(([k,v])=>(
                  <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:`1px solid rgba(210,200,184,0.22)`,fontSize:12,gap:8}}>
                    <span style={{color:T.textMid,fontWeight:500,flexShrink:0}}>{k}</span>
                    <span style={{color:T.forest,textAlign:'right',wordBreak:'break-all'}}>{v}</span>
                  </div>
                ))}

                {/* AI Summary */}
                {sel.aiSummary && (
                  <div style={{ marginTop:12 }}>
                    <div style={{ fontSize:9, color:T.gold, letterSpacing:'0.16em', textTransform:'uppercase', fontWeight:700, marginBottom:6 }}>AI Summary</div>
                    <div style={{ fontSize:12, color:T.textMid, lineHeight:1.7, padding:10, background:'rgba(228,221,208,0.4)', borderRadius:8 }}>{sel.aiSummary}</div>
                  </div>
                )}

                {/* Bid reason */}
                {sel.bidReason && (
                  <div style={{ marginTop:10, padding:'8px 12px', background:sel.bidRecommendation==='Recommended'?T.greenPale:sel.bidRecommendation==='Not Recommended'?T.redPale:T.goldPale, borderRadius:8, fontSize:12, color:T.textMid, lineHeight:1.6 }}>
                    {sel.bidReason}
                  </div>
                )}

                {/* Suggested actions */}
                {sel.suggestedActions?.length>0 && (
                  <div style={{ marginTop:12 }}>
                    <div style={{ fontSize:9, color:T.gold, letterSpacing:'0.16em', textTransform:'uppercase', fontWeight:700, marginBottom:6 }}>Suggested Actions</div>
                    {sel.suggestedActions.map((a,i)=>(
                      <div key={i} style={{ display:'flex', gap:8, padding:'5px 0', borderBottom:`1px solid rgba(210,200,184,0.22)`, fontSize:12, color:T.textMid }}>
                        <span style={{ color:T.gold, flexShrink:0 }}>→</span>{a}
                      </div>
                    ))}
                  </div>
                )}

                {/* Required docs */}
                {sel.aiRequiredDocs?.length>0 && (
                  <div style={{ marginTop:12 }}>
                    <div style={{ fontSize:9, color:T.gold, letterSpacing:'0.16em', textTransform:'uppercase', fontWeight:700, marginBottom:6 }}>Required Documents</div>
                    {sel.aiRequiredDocs.map((d,i)=>(
                      <div key={i} style={{ display:'flex', gap:8, padding:'4px 0', fontSize:12, color:T.textMid, alignItems:'center' }}>
                        <span style={{ color:(sel.docChecklist||{})[d]?T.green:T.textLight, flexShrink:0 }}>{(sel.docChecklist||{})[d]?'✓':'○'}</span>{d}
                      </div>
                    ))}
                  </div>
                )}

                {/* Documents */}
                {sel.documents?.length>0 && (
                  <div style={{ marginTop:12 }}>
                    <div style={{ fontSize:9, color:T.gold, letterSpacing:'0.16em', textTransform:'uppercase', fontWeight:700, marginBottom:6 }}>Attached Documents</div>
                    {sel.documents.map(doc=>(
                      <div key={doc.id} style={{ display:'flex', gap:8, alignItems:'center', padding:'5px 0', borderBottom:`1px solid rgba(210,200,184,0.22)`, fontSize:12 }}>
                        <span style={{ fontSize:16 }}>{doc.type==='pdf'?'📄':'📎'}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ color:T.forest, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{doc.name}</div>
                          <div style={{ fontSize:10, color:T.textLight }}>{doc.size} · {fmtDate(doc.uploadDate)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button className="btn btn-primary btn-sm" style={{ marginTop:14, width:'100%' }} onClick={()=>openEdit(sel)}>
                  Edit Tender
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── COMPETITOR WATCH ──────────────────────────────────────────────── */}
        {tab==='competitors' && (
          <div>
            <div style={{ marginBottom:16, fontSize:13, color:T.textMid, lineHeight:1.7 }}>
              Track competitor activity in the artificial greenery and interior landscape market.
            </div>
            <div className="grid-3">
              {COMPETITORS.filter(c=>c!=='Other').map(name => (
                <div key={name} className="g-card">
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:17, color:T.forest, marginBottom:8 }}>{name}</div>
                  <div style={{ fontSize:12, color:T.textMid, lineHeight:1.7 }}>
                    Add competitor intelligence: observed tenders, pricing, market segments, and product positioning.
                  </div>
                  <div style={{ marginTop:10, fontSize:11, color:T.textLight, borderTop:`1px solid rgba(210,200,184,0.3)`, paddingTop:8 }}>
                    No activity captured yet. Coming soon: AI-suggested competitor overlap.
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── WATCH SOURCES ─────────────────────────────────────────────────── */}
        {tab==='sources' && (
          <div>
            <div style={{ marginBottom:16, fontSize:13, color:T.textMid, lineHeight:1.7 }}>
              Monitor these sources for new tender opportunities relevant to Botanica Living.
            </div>
            <div className="grid-3">
              {WATCH_SOURCES.filter(s=>s!=='Other').map(src => (
                <div key={src} className="g-card">
                  <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:6 }}>
                    <span style={{ fontSize:18, color:T.gold }}>⚑</span>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:15, color:T.forest }}>{src}</div>
                  </div>
                  <div style={{ fontSize:11, color:T.textLight }}>
                    {src==='eTenders Portal'?'etenders.gov.za — national government tenders':
                     src==='SA Tender Bulletin'?'Official government gazette tenders':
                     src==='Provincial Health Dept'?'Provincial health department procurement':
                     src==='Dept of Public Works'?'dpw.gov.za — public infrastructure':
                     src==='Hospital Groups'?'Mediclinic, Netcare, Life Healthcare procurement':
                     src==='Property Funds'?'Growthpoint, Redefine, Attacq facilities budget':
                     'Monitor for relevant opportunities.'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit modal */}
      {modal && (
        <TenderForm
          tender={editing || {}}
          onSave={save}
          onClose={()=>{ setModal(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
