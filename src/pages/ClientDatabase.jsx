// ClientDatabase.jsx — v2.0
// Full V1 dataset support: altPhone, altEmail, whatsapp, postalAddress, targetDepartments
import { useState, useMemo, useCallback } from 'react'
import { T } from '../utils/tokens.js'
import { nextId, today, fmtDate, safeStr, truncate } from '../utils/format.js'
import Modal from '../components/Modal.jsx'
import { CLIENT_SECTORS, CLIENT_TYPES, CLIENT_STATUSES, CLIENT_PRIORITIES } from '../utils/data.js'

const BLANK = {
  company:'', sector:'Healthcare', type:'Strategic Account', priority:'High',
  status:'Not Contacted',
  website:'', phone:'', altPhone:'', whatsapp:'',
  email:'', altEmail:'',
  hqAddress:'', postalAddress:'',
  contactPerson:'', position:'', department:'',
  targetDepartments:'',
  notes:'', followUpDate:'',
}

const STATUS_COLORS = {
  'Not Contacted':      T.textLight,
  'Researching':        T.gold,
  'First Contact Made': T.teal,
  'Meeting Scheduled':  T.teal,
  'Proposal Sent':      T.blue,
  'Active Client':      T.green,
  'On Hold':            T.textMid,
  'Not Interested':     T.red,
}
const PRIORITY_COLORS = {
  Critical: T.danger, High: T.red, Medium: T.gold, Low: T.textLight,
}

function StatusBadge({ status }) {
  return <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:'rgba(161,161,170,0.12)', color:STATUS_COLORS[status]||T.textMid, whiteSpace:'nowrap' }}>{status}</span>
}
function PriorityDot({ priority }) {
  return <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:PRIORITY_COLORS[priority]||T.textMid, flexShrink:0 }} />
}
function InfoRow({ label, value, link, linkHref }) {
  if (!value || value === '—') return (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:`1px solid rgba(210,200,184,0.22)`, fontSize:12, gap:8 }}>
      <span style={{ color:T.textMid, fontWeight:500, flexShrink:0 }}>{label}</span>
      <span style={{ color:T.textMuted }}>—</span>
    </div>
  )
  return (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:`1px solid rgba(210,200,184,0.22)`, fontSize:12, gap:8 }}>
      <span style={{ color:T.textMid, fontWeight:500, flexShrink:0 }}>{label}</span>
      {link
        ? <a href={linkHref} target="_blank" rel="noreferrer" style={{ color:T.teal, textAlign:'right', wordBreak:'break-all', textDecoration:'none' }}>{value}</a>
        : <span style={{ color:T.forest, textAlign:'right', wordBreak:'break-all' }}>{value}</span>
      }
    </div>
  )
}

export default function ClientDatabase({ clients, setClients }) {
  const [modal,    setModal]    = useState(false)
  const [editing,  setEditing]  = useState(null)
  const [form,     setForm]     = useState(BLANK)
  const [selected, setSelected] = useState(null)
  const [search,   setSearch]   = useState('')
  const [filterSector, setFilterSector] = useState('All')
  const [filterType,   setFilterType]   = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [sortBy,   setSortBy]   = useState('priority')

  const F = k => e => setForm(f => ({...f,[k]:e.target.value}))
  const safe = Array.isArray(clients) ? clients : []

  const openNew  = () => { setEditing(null); setForm({...BLANK}); setModal(true) }
  const openEdit = c  => { setEditing(c.id); setForm({...c}); setModal(true) }
  const save = () => {
    if (!form.company?.trim()) return
    const rec = { ...BLANK, ...form, id: editing!=null?editing:nextId(safe) }
    if (editing!=null) setClients(cc=>cc.map(c=>c.id===editing?rec:c))
    else               setClients(cc=>[...cc,rec])
    setModal(false)
  }
  const del = id => {
    if (!window.confirm('Remove this client record?')) return
    setClients(cc=>cc.filter(c=>c.id!==id))
    if (selected===id) setSelected(null)
  }

  const sectorCounts = useMemo(() => {
    const m = {}
    safe.forEach(c => { m[c.sector]=(m[c.sector]||0)+1 })
    return m
  }, [safe])

  const visible = useMemo(() => {
    const PRIO = { Critical:0, High:1, Medium:2, Low:3 }
    return safe
      .filter(c => {
        const q = search.toLowerCase()
        return (filterSector==='All'||c.sector===filterSector) &&
               (filterType==='All'  ||c.type===filterType) &&
               (filterStatus==='All'||c.status===filterStatus) &&
               (!q||[c.company,c.sector,c.contactPerson,c.notes,c.status,c.targetDepartments,c.email,c.phone]
                   .some(v=>(v||'').toLowerCase().includes(q)))
      })
      .sort((a,b)=>{
        if (sortBy==='priority') return (PRIO[a.priority]||9)-(PRIO[b.priority]||9)
        if (sortBy==='company')  return a.company.localeCompare(b.company)
        if (sortBy==='status')   return a.status.localeCompare(b.status)
        if (sortBy==='followup') return (a.followUpDate||'9999').localeCompare(b.followUpDate||'9999')
        return 0
      })
  }, [safe, search, filterSector, filterType, filterStatus, sortBy])

  const sel = selected ? safe.find(c=>c.id===selected) : null

  // Stats
  const totalPhones = safe.reduce((n,c)=>{
    let count = 0
    if (c.phone)    count++
    if (c.altPhone) count++
    if (c.whatsapp) count++
    return n + count
  }, 0)
  const totalEmails = safe.reduce((n,c)=>{
    let count = 0
    if (c.email)    count++
    if (c.altEmail) count++
    return n + count
  }, 0)
  const totalAddresses = safe.filter(c=>c.hqAddress).length

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Client Database</div>
          <div className="page-subtitle">Strategic Accounts · Prospects · Designers · Developers · Hospitality</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Add Organisation</button>
      </div>

      {/* KPI */}
      <div style={{ background:'rgba(255,255,255,0.55)', backdropFilter:'blur(16px)', borderBottom:`1px solid rgba(210,200,184,0.5)`, padding:'14px 36px' }}>
        <div className="grid-5">
          {[
            { label:'Organisations',   val:safe.length,        color:T.forest },
            { label:'Critical / High', val:safe.filter(c=>c.priority==='Critical'||c.priority==='High').length, color:T.danger },
            { label:'Active Clients',  val:safe.filter(c=>c.status==='Active Client').length, color:T.green },
            { label:'Phone Numbers',   val:totalPhones,        color:T.teal },
            { label:'Email Addresses', val:totalEmails,        color:T.gold },
          ].map(k=>(
            <div key={k.label} className="stat-card">
              <div className="stat-label">{k.label}</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, color:k.color, lineHeight:1, marginTop:4 }}>{k.val}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="page-content">
        {/* Sector pills */}
        <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
          <button className={`bp-fbtn ${filterSector==='All'?'active':''}`} onClick={()=>setFilterSector('All')}>All ({safe.length})</button>
          {CLIENT_SECTORS.filter(s=>sectorCounts[s]>0).map(s=>(
            <button key={s} className={`bp-fbtn ${filterSector===s?'active':''}`} onClick={()=>setFilterSector(filterSector===s?'All':s)}>
              {s} ({sectorCounts[s]})
            </button>
          ))}
        </div>

        {/* Filter row */}
        <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ position:'relative', flex:1, minWidth:220 }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search company, contact, email, department…" style={{paddingLeft:36}}/>
            <span style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:14,color:T.textLight,pointerEvents:'none' }}>⊙</span>
          </div>
          <select value={filterType}   onChange={e=>setFilterType(e.target.value)}   style={{fontSize:12,padding:'8px 10px'}}>
            <option value="All">All Types</option>{CLIENT_TYPES.map(t=><option key={t}>{t}</option>)}
          </select>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{fontSize:12,padding:'8px 10px'}}>
            <option value="All">All Statuses</option>{CLIENT_STATUSES.map(s=><option key={s}>{s}</option>)}
          </select>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{fontSize:12,padding:'8px 10px'}}>
            <option value="priority">Sort: Priority</option>
            <option value="company">Sort: Company</option>
            <option value="status">Sort: Status</option>
            <option value="followup">Sort: Follow Up</option>
          </select>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:sel?'1fr 360px':'1fr', gap:16, alignItems:'start' }}>

          {/* List */}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {visible.length===0 && (
              <div className="empty-st"><div className="empty-ic">◉</div><div>No organisations match that filter.</div></div>
            )}
            {visible.map(c=>(
              <div key={c.id} className="doc-card"
                style={{ border:selected===c.id?`1.5px solid ${T.gold}`:undefined, cursor:'pointer' }}
                onClick={()=>setSelected(selected===c.id?null:c.id)}
              >
                <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:4,flexShrink:0,width:44 }}>
                  <PriorityDot priority={c.priority}/>
                  <div style={{ fontSize:9,color:PRIORITY_COLORS[c.priority]||T.textMid,fontWeight:700,letterSpacing:'0.08em',writingMode:'vertical-rl',transform:'rotate(180deg)',whiteSpace:'nowrap' }}>{c.priority}</div>
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:16,color:T.forest,marginBottom:2 }}>{safeStr(c.company)}</div>
                  <div style={{ fontSize:12,color:T.textMid }}>
                    <span style={{ color:T.teal,fontWeight:600 }}>{c.sector}</span> · {c.type}
                    {c.contactPerson && ` · ${c.contactPerson}`}
                  </div>
                  {/* Contact quick-view */}
                  <div style={{ display:'flex',gap:10,marginTop:3,flexWrap:'wrap' }}>
                    {c.phone    && <span style={{fontSize:11,color:T.textMid}}>📞 {c.phone}</span>}
                    {c.email    && <span style={{fontSize:11,color:T.textMid,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:180}}>✉ {c.email}</span>}
                  </div>
                  {c.targetDepartments && (
                    <div style={{fontSize:10,color:T.gold,marginTop:3}}>🎯 {c.targetDepartments}</div>
                  )}
                  {c.followUpDate && (
                    <div style={{fontSize:11,color:c.followUpDate<today()?T.danger:T.gold,marginTop:2}}>Follow up: {fmtDate(c.followUpDate)}</div>
                  )}
                </div>
                <div style={{ display:'flex',flexDirection:'column',gap:4,flexShrink:0,alignItems:'flex-end' }} onClick={e=>e.stopPropagation()}>
                  <StatusBadge status={c.status}/>
                  <button className="btn btn-outline btn-xs" onClick={()=>openEdit(c)}>Edit</button>
                  <button className="btn btn-xs btn-ghost" style={{color:T.textLight}} onClick={()=>del(c.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>

          {/* Detail panel */}
          {sel && (
            <div className="g-card" style={{position:'sticky',top:80,maxHeight:'calc(100vh - 120px)',overflow:'auto'}}>
              {/* Header */}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12,paddingBottom:10,borderBottom:`1px solid rgba(210,200,184,0.5)`}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:19,color:T.forest,lineHeight:1.2,overflowWrap:'break-word'}}>{sel.company}</div>
                  <div style={{fontSize:11,color:T.teal,letterSpacing:'0.1em',textTransform:'uppercase',fontWeight:600,marginTop:3}}>{sel.sector} · {sel.type}</div>
                  <div style={{marginTop:5,display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
                    <PriorityDot priority={sel.priority}/>
                    <span style={{fontSize:11,color:PRIORITY_COLORS[sel.priority],fontWeight:700}}>{sel.priority}</span>
                    <StatusBadge status={sel.status}/>
                  </div>
                </div>
                <button className="btn btn-ghost btn-xs" onClick={()=>setSelected(null)}>✕</button>
              </div>

              {/* Phones */}
              <div style={{fontSize:9,letterSpacing:'0.16em',textTransform:'uppercase',color:T.gold,fontWeight:700,marginTop:8,marginBottom:3}}>Contact Numbers</div>
              <InfoRow label="Main Phone"   value={sel.phone}    link linkHref={`tel:${sel.phone}`}/>
              <InfoRow label="Alt / Direct" value={sel.altPhone} link linkHref={`tel:${sel.altPhone}`}/>
              <InfoRow label="WhatsApp"     value={sel.whatsapp} link linkHref={`https://wa.me/${(sel.whatsapp||'').replace(/\D/g,'')}`}/>

              {/* Emails */}
              <div style={{fontSize:9,letterSpacing:'0.16em',textTransform:'uppercase',color:T.gold,fontWeight:700,marginTop:10,marginBottom:3}}>Email Addresses</div>
              <InfoRow label="Main Email"   value={sel.email}    link linkHref={`mailto:${sel.email}`}/>
              <InfoRow label="Alt Email"    value={sel.altEmail} link linkHref={`mailto:${sel.altEmail}`}/>

              {/* Web */}
              <div style={{fontSize:9,letterSpacing:'0.16em',textTransform:'uppercase',color:T.gold,fontWeight:700,marginTop:10,marginBottom:3}}>Web & Address</div>
              <InfoRow label="Website"      value={sel.website}  link linkHref={sel.website?.startsWith('http')?sel.website:`https://${sel.website}`}/>
              <InfoRow label="HQ Address"   value={sel.hqAddress}/>
              <InfoRow label="Postal"       value={sel.postalAddress}/>

              {/* Contact person */}
              {(sel.contactPerson || sel.position || sel.department) && (
                <>
                  <div style={{fontSize:9,letterSpacing:'0.16em',textTransform:'uppercase',color:T.gold,fontWeight:700,marginTop:10,marginBottom:3}}>Primary Contact</div>
                  <InfoRow label="Name"       value={sel.contactPerson}/>
                  <InfoRow label="Position"   value={sel.position}/>
                  <InfoRow label="Department" value={sel.department}/>
                </>
              )}

              {/* Target departments */}
              {sel.targetDepartments && (
                <>
                  <div style={{fontSize:9,letterSpacing:'0.16em',textTransform:'uppercase',color:T.gold,fontWeight:700,marginTop:10,marginBottom:5}}>Target Departments</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:8}}>
                    {sel.targetDepartments.split(',').map(d=>d.trim()).filter(Boolean).map(d=>(
                      <span key={d} style={{fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:20,background:T.tealPale,color:T.teal}}>{d}</span>
                    ))}
                  </div>
                </>
              )}

              {/* Follow up */}
              {sel.followUpDate && (
                <>
                  <div style={{fontSize:9,letterSpacing:'0.16em',textTransform:'uppercase',color:T.gold,fontWeight:700,marginTop:10,marginBottom:3}}>Follow Up</div>
                  <InfoRow label="Date" value={fmtDate(sel.followUpDate)}/>
                </>
              )}

              {/* Notes */}
              {sel.notes && (
                <div style={{marginTop:10,padding:10,background:'rgba(228,221,208,0.4)',borderRadius:8,fontSize:12,color:T.textMid,lineHeight:1.65,overflowWrap:'break-word'}}>
                  {sel.notes}
                </div>
              )}

              {/* Action buttons */}
              <div style={{display:'flex',gap:6,marginTop:14,flexWrap:'wrap'}}>
                {sel.phone    && <a href={`tel:${sel.phone}`}                className="btn btn-outline btn-sm">📞 Call</a>}
                {sel.whatsapp && <a href={`https://wa.me/${(sel.whatsapp||'').replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{color:T.green,borderColor:T.green}}>💬 WA</a>}
                {sel.email    && <a href={`mailto:${sel.email}`}             className="btn btn-outline btn-sm">✉ Email</a>}
                {sel.website  && <a href={sel.website?.startsWith('http')?sel.website:`https://${sel.website}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">🌐</a>}
                <button className="btn btn-primary btn-sm" style={{flex:1}} onClick={()=>openEdit(sel)}>Edit</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── ADD / EDIT MODAL ── */}
      <Modal open={modal} onClose={()=>setModal(false)} title={editing!=null?'Edit Organisation':'Add Organisation'}
        footer={<><button className="btn btn-outline" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}
      >
        <div className="form-grid">
          <div className="form-field full"><label>Company Name *</label><input value={form.company||''} onChange={F('company')} placeholder="e.g. Mediclinic"/></div>
          <div className="form-field">
            <label>Sector</label>
            <select value={form.sector} onChange={F('sector')}>{CLIENT_SECTORS.map(s=><option key={s}>{s}</option>)}</select>
          </div>
          <div className="form-field">
            <label>Type</label>
            <select value={form.type} onChange={F('type')}>{CLIENT_TYPES.map(t=><option key={t}>{t}</option>)}</select>
          </div>
          <div className="form-field">
            <label>Priority</label>
            <select value={form.priority} onChange={F('priority')}>{CLIENT_PRIORITIES.map(p=><option key={p}>{p}</option>)}</select>
          </div>
          <div className="form-field">
            <label>Status</label>
            <select value={form.status} onChange={F('status')}>{CLIENT_STATUSES.map(s=><option key={s}>{s}</option>)}</select>
          </div>

          {/* Phones */}
          <div className="form-field"><label>Main Phone</label><input value={form.phone||''} onChange={F('phone')} placeholder="+27 21 809 6500"/></div>
          <div className="form-field"><label>Alt / Direct Phone</label><input value={form.altPhone||''} onChange={F('altPhone')} placeholder="+27 86 532 2557"/></div>
          <div className="form-field"><label>WhatsApp</label><input value={form.whatsapp||''} onChange={F('whatsapp')} placeholder="087 240 6367"/></div>

          {/* Emails */}
          <div className="form-field"><label>Main Email</label><input type="email" value={form.email||''} onChange={F('email')}/></div>
          <div className="form-field"><label>Alt / Secondary Email</label><input type="email" value={form.altEmail||''} onChange={F('altEmail')}/></div>

          {/* Web & Address */}
          <div className="form-field full"><label>Website</label><input value={form.website||''} onChange={F('website')} placeholder="https://www.company.co.za"/></div>
          <div className="form-field full"><label>HQ / Physical Address</label><input value={form.hqAddress||''} onChange={F('hqAddress')} placeholder="25 Du Toit Street, Stellenbosch, 7600"/></div>
          <div className="form-field full"><label>Postal Address</label><input value={form.postalAddress||''} onChange={F('postalAddress')} placeholder="PO Box 456, Stellenbosch, 7599"/></div>

          {/* Contact person */}
          <div className="form-field"><label>Contact Person</label><input value={form.contactPerson||''} onChange={F('contactPerson')}/></div>
          <div className="form-field"><label>Position / Title</label><input value={form.position||''} onChange={F('position')}/></div>
          <div className="form-field full"><label>Target Departments <span style={{fontSize:10,color:T.textLight}}>(comma separated)</span></label>
            <input value={form.targetDepartments||''} onChange={F('targetDepartments')} placeholder="Facilities, Procurement, Property Development, Projects"/>
          </div>
          <div className="form-field"><label>Follow Up Date</label><input type="date" value={form.followUpDate||''} onChange={F('followUpDate')}/></div>
          <div className="form-field full"><label>Notes</label><textarea value={form.notes||''} onChange={F('notes')} placeholder="Key notes about this organisation…"/></div>
        </div>
      </Modal>
    </div>
  )
}
