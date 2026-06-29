// ProductRefLibrary.jsx — v1.0
// Internal botanical inspiration and knowledge library.
// Pinterest + Encyclopedia + Moodboard for Botanica Living.
// Completely separate from Supplier Zone, inventory and pricing.
import { useState, useMemo, useRef, useCallback } from 'react'
import { T } from '../utils/tokens.js'
import { nextId, safeStr, truncate } from '../utils/format.js'
import Modal from '../components/Modal.jsx'
import { OCR_AVAILABLE } from '../lib/ocr.js'
import { SUPABASE_CONFIGURED, uploadDocument } from '../lib/supabase.js'

// ── Reference plant data ──────────────────────────────────────────────────────
const CATEGORIES = [
  'Indoor Trees','Olive Trees','Fiddle Leaf Figs','Kentia Palms','Areca Palms',
  'Bird of Paradise','Monstera','Snake Plants','Succulents','Flowering Plants',
  'Orchids','Bouquets','Reception Arrangements','Hanging Plants','Trailing Plants',
  'Vines','Garlands','Green Walls','Vertical Gardens','Artificial Hedges',
  'Outdoor Plants','Topiaries','Large Statement Trees','Commercial Installations',
  'Hospitality Styling','Healthcare Styling','Office Styling','Retail Styling',
  'Restaurant Styling','Planters & Pots','Custom Installations',
]
const APPLICATIONS = ['Healthcare','Hospitality','Corporate','Residential','Retail','Commercial','Reception','Outdoor','Luxury']
const STYLE_TAGS   = ['Minimalist','Tropical','Mediterranean','Coastal','Contemporary','Classic','Botanical','Zen','Industrial','Luxury','Scandinavian']
const SIZE_LABELS  = ['Small (under 60cm)','Medium (60–120cm)','Large (120–200cm)','Statement (200cm+)']

// ── Seed reference library — 24 canonical plant types ────────────────────────
const SEED_REFS = [
  // Indoor Trees
  { id:1,  category:'Olive Trees',          name:'Artificial Olive Tree', altNames:'Mediterranean Olive, Olea europaea', tags:['Mediterranean','Statement','Luxury','Reception'], height:'120–300cm', width:'80–150cm', style:'Mediterranean, Rustic, Contemporary', indoor:true, outdoor:true, premium:true, hospitality:true, healthcare:false, corporate:true, residential:true, retail:true, commercial:true, notes:'One of the most versatile statement trees. Works equally well in lobbies, restaurants and residential spaces. KD (knock-down) versions allow flat-pack shipping and easy transport.', applications:'Hotel lobbies, restaurant entrances, corporate receptions, luxury residences', imageUrl:'', favourite:false },
  { id:2,  category:'Fiddle Leaf Figs',     name:'Artificial Fiddle Leaf Fig', altNames:'Ficus lyrata', tags:['Designer Favourite','Trending','Residential','Contemporary'], height:'90–200cm', width:'40–80cm', style:'Contemporary, Designer, Minimalist', indoor:true, outdoor:false, premium:true, hospitality:true, healthcare:false, corporate:true, residential:true, retail:true, commercial:true, notes:'Currently one of the most requested plants in interior design. Large dramatic leaves. Works best in light, airy spaces. Very popular in hospitality and premium residential.', applications:'Designer showrooms, boutique hotels, premium offices, luxury apartments', imageUrl:'', favourite:false },
  { id:3,  category:'Kentia Palms',         name:'Artificial Kentia Palm', altNames:'Howea forsteriana, Paradise Palm', tags:['Classic','Tropical','Luxury','Hotel'], height:'150–350cm', width:'100–200cm', style:'Classic, Tropical, Luxury', indoor:true, outdoor:false, premium:true, hospitality:true, healthcare:true, corporate:true, residential:true, retail:false, commercial:true, notes:'The quintessential luxury hotel palm. Full, graceful fronds. Excellent for large lobbies and healthcare waiting areas. Low-maintenance alternative to real Kentia which is notoriously difficult to keep alive.', applications:'Hotel lobbies, healthcare waiting areas, airport lounges, corporate atriums', imageUrl:'', favourite:false },
  { id:4,  category:'Areca Palms',          name:'Artificial Areca Palm', altNames:'Chrysalidocarpus lutescens, Butterfly Palm, Golden Cane Palm', tags:['Tropical','Reception','Commercial','Lush'], height:'120–300cm', width:'80–160cm', style:'Tropical, Contemporary', indoor:true, outdoor:false, premium:false, hospitality:true, healthcare:true, corporate:true, residential:true, retail:true, commercial:true, notes:'Full, lush appearance. Multiple stems create a bushy, tropical look. Very popular for healthcare settings due to calming effect. Cheaper alternative to Kentia for volume commercial applications.', applications:'Healthcare facilities, shopping centres, office receptions, restaurants', imageUrl:'', favourite:false },
  { id:5,  category:'Bird of Paradise',     name:'Artificial Bird of Paradise', altNames:'Strelitzia reginae, Strelitzia nicolai', tags:['Statement','Designer Favourite','Tropical','Bold'], height:'120–250cm', width:'80–140cm', style:'Tropical, Bold, Designer', indoor:true, outdoor:false, premium:true, hospitality:true, healthcare:false, corporate:true, residential:true, retail:true, commercial:true, notes:'Large dramatic leaves with tropical appeal. Strelitzia nicolai (white flower) is the tall architectural variety preferred for commercial. Bold statement piece.', applications:'Boutique hotels, high-end retail, premium offices, photography studios', imageUrl:'', favourite:false },
  { id:6,  category:'Monstera',             name:'Artificial Monstera', altNames:'Monstera deliciosa, Swiss Cheese Plant', tags:['Trending','Designer Favourite','Tropical','Instagram'], height:'60–180cm', width:'60–120cm', style:'Tropical, Contemporary, Trending', indoor:true, outdoor:false, premium:false, hospitality:true, healthcare:false, corporate:true, residential:true, retail:true, commercial:false, notes:'Iconic split leaves. Hugely popular on social media. Strong with younger audiences and creative industries. Available in single stem, multi-stem and climbing varieties.', applications:'Co-working spaces, creative agencies, cafes, boutique retail, millennial hospitality', imageUrl:'', favourite:false },
  { id:7,  category:'Snake Plants',         name:'Artificial Snake Plant', altNames:'Sansevieria, Dracaena trifasciata, Mother-in-Laws Tongue', tags:['Modern','Minimalist','Compact','Office'], height:'30–150cm', width:'20–60cm', style:'Minimalist, Contemporary, Zen', indoor:true, outdoor:false, premium:false, hospitality:false, healthcare:true, corporate:true, residential:true, retail:true, commercial:true, notes:'Architectural, upright growth habit. Low maintenance association makes it believable as artificial. Excellent for corporate corridors and healthcare spaces. Wide size range.', applications:'Corporate offices, healthcare corridors, retail display, residential', imageUrl:'', favourite:false },
  { id:8,  category:'Olive Trees',          name:'Artificial Olive Tree (KD)', altNames:'Knock-down Olive Tree', tags:['Flat Pack','Commercial','Value','Versatile'], height:'180–300cm', width:'100–160cm', style:'Mediterranean, Commercial', indoor:true, outdoor:true, premium:false, hospitality:true, healthcare:false, corporate:true, residential:false, retail:true, commercial:true, notes:'Knock-down (KD) construction allows flat-pack shipping — significantly reduces freight costs per unit. Essential consideration for container imports. Assembly time approximately 30–45 minutes.', applications:'Shopping centres, commercial lobbies, restaurants, outdoor events', imageUrl:'', favourite:false },
  // Palms
  { id:9,  category:'Kentia Palms',         name:'Artificial Kentia — XL Statement', altNames:'Howea forsteriana XL', tags:['Statement','Luxury','Hotel','Large'], height:'250–400cm', width:'180–280cm', style:'Luxury, Classic', indoor:true, outdoor:false, premium:true, hospitality:true, healthcare:false, corporate:false, residential:false, retail:false, commercial:true, notes:'Extra-large statement versions for grand hotel lobbies and airport terminals. Typically require two-person installation. Premium pricing justified by visual impact.', applications:'5-star hotels, airport lounges, luxury retail flagship stores, grand civic buildings', imageUrl:'', favourite:false },
  // Green Walls
  { id:10, category:'Green Walls',          name:'Artificial Green Wall Panel', altNames:'Living Wall, Vertical Garden, Moss Wall', tags:['Green Wall','Statement','Commercial','Trending'], height:'Standard panel: 50×50cm', width:'Modular', style:'Contemporary, Biophilic, Statement', indoor:true, outdoor:true, premium:false, hospitality:true, healthcare:true, corporate:true, residential:true, retail:true, commercial:true, notes:'Modular panels allow scalable green wall installations. Mix of foliage types within one panel creates realistic appearance. Suitable for both interior accent walls and exterior facades (UV-treated versions).', applications:'Office feature walls, retail backdrops, restaurant decor, healthcare waiting areas, photography backgrounds', imageUrl:'', favourite:false },
  { id:11, category:'Vertical Gardens',     name:'Artificial Vertical Garden Planter', altNames:'Tower Planter, Living Wall Planter', tags:['Compact','Retail','Reception','Small Space'], height:'120–200cm', width:'40–60cm', style:'Contemporary, Minimal footprint', indoor:true, outdoor:false, premium:false, hospitality:true, healthcare:true, corporate:true, residential:true, retail:true, commercial:true, notes:'Freestanding vertical garden on a slim planter base. Excellent for spaces where floor area is limited. Single unit makes a significant visual statement.', applications:'Reception desks, lift lobbies, corridor ends, retail POS areas', imageUrl:'', favourite:false },
  // Statement Trees
  { id:12, category:'Large Statement Trees', name:'Artificial Cherry Blossom Tree', altNames:'Sakura Tree, Flowering Statement Tree', tags:['Statement','Flowering','Event','Luxury','Seasonal'], height:'200–500cm', width:'180–400cm', style:'Luxury, Event, Theatrical', indoor:true, outdoor:false, premium:true, hospitality:true, healthcare:false, corporate:false, residential:false, retail:true, commercial:true, notes:'Dramatic flowering statement tree. Extremely high visual impact. Used for luxury events, hotel lobbies and high-end retail. White and pink varieties available. Very photogenic.', applications:'Luxury hotel lobbies, high-end retail, wedding venues, luxury events, flagship stores', imageUrl:'', favourite:false },
  { id:13, category:'Large Statement Trees', name:'Artificial Baobab Tree', altNames:'Boab, Adansonia', tags:['African','Statement','Unique','Commercial'], height:'200–600cm', width:'200–500cm', style:'African, Natural, Statement', indoor:true, outdoor:false, premium:true, hospitality:true, healthcare:false, corporate:false, residential:false, retail:false, commercial:true, notes:'Highly unique. Large textured trunk with sparse canopy. Strong African aesthetic. Excellent for South African hospitality and corporate environments wanting an indigenous feel.', applications:'South African hospitality, game lodges, corporate boardrooms, airport terminals', imageUrl:'', favourite:false },
  // Healthcare specific
  { id:14, category:'Healthcare Styling',   name:'Healthcare Reception Planting Scheme', altNames:'Medical Facility Greening', tags:['Healthcare','Calming','Infection Control','Reception'], height:'Mixed heights', width:'Various', style:'Calming, Clean, Professional', indoor:true, outdoor:false, premium:false, hospitality:false, healthcare:true, corporate:false, residential:false, retail:false, commercial:true, notes:'Artificial plants are uniquely suited to healthcare — no soil, no water, no pollen, no allergies, no infection risk. Recommended species: Kentia palms, Areca palms, Snake plants, succulents. Avoid flowers in clinical areas.', applications:'Hospital waiting areas, GP surgeries, clinics, medical suites, pharmacy waiting areas', imageUrl:'', favourite:false },
  // Hospitality
  { id:15, category:'Hospitality Styling',  name:'Hotel Lobby Statement Arrangement', altNames:'Hospitality Feature Installation', tags:['Hotel','Lobby','Statement','5-star'], height:'180–500cm', width:'Various', style:'Luxury, Classic, Grand', indoor:true, outdoor:false, premium:true, hospitality:true, healthcare:false, corporate:false, residential:false, retail:false, commercial:true, notes:'Grand lobby arrangements typically combine a statement tree (Kentia, Olive, Baobab) with surrounding lower planting (succulents, ornamental grasses, trailing plants) in large decorative pots. The complete installation creates the impression of a curated botanical garden.', applications:'5-star hotel lobbies, boutique hotel entrances, luxury guesthouses', imageUrl:'', favourite:false },
  // Succulents
  { id:16, category:'Succulents',           name:'Artificial Succulent Collection', altNames:'Desert Plants, Cacti', tags:['Low Profile','Desk','Reception Counter','Trending'], height:'5–40cm', width:'5–30cm', style:'Minimalist, Contemporary, Desert', indoor:true, outdoor:true, premium:false, hospitality:true, healthcare:true, corporate:true, residential:true, retail:true, commercial:false, notes:'Extremely popular for desk-level arrangements and reception counters. Can be arranged in clusters or terrariums. UV-treated versions suitable for outdoor use. Very believable as artificial.', applications:'Reception counters, boardroom tables, office desks, retail display, café tables', imageUrl:'', favourite:false },
  // Orchids
  { id:17, category:'Orchids',              name:'Artificial Phalaenopsis Orchid', altNames:'Moth Orchid, Phalaenopsis', tags:['Luxury','Flowering','Feminine','Premium'], height:'40–90cm', width:'30–60cm', style:'Luxury, Feminine, Classic', indoor:true, outdoor:false, premium:true, hospitality:true, healthcare:true, corporate:true, residential:true, retail:true, commercial:false, notes:'The premium artificial flower. Excellent quality artificial orchids are now virtually indistinguishable from real. Multiple colour options. Used in premium hotel rooms, executive offices and healthcare private suites.', applications:'Hotel rooms, executive offices, healthcare private suites, luxury spas, fine dining restaurants', imageUrl:'', favourite:false },
  // Reception
  { id:18, category:'Reception Arrangements', name:'Corporate Reception Feature', altNames:'Office Entry Statement', tags:['Corporate','Reception','Statement','Professional'], height:'100–200cm', width:'60–120cm', style:'Professional, Contemporary', indoor:true, outdoor:false, premium:false, hospitality:false, healthcare:false, corporate:true, residential:false, retail:false, commercial:true, notes:'Typically a statement tree (Fiddle Leaf, Snake Plant, Kentia) flanked by two lower accents (succulents, trailing plants) in matching planters. Branded by choosing pot colours that match company identity.', applications:'Corporate reception areas, boardrooms, CEO offices, professional service firms', imageUrl:'', favourite:false },
  // Topiaries
  { id:19, category:'Topiaries',            name:'Artificial Ball Topiary', altNames:'Boxwood Ball, Shaped Topiary', tags:['Formal','Outdoor','Entrance','Symmetrical'], height:'30–120cm', width:'30–120cm', style:'Formal, Classic, Symmetrical', indoor:true, outdoor:true, premium:false, hospitality:true, healthcare:false, corporate:false, residential:true, retail:true, commercial:true, notes:'Classic formal garden shapes. Highly realistic artificial boxwood or bay topiary. Often placed in pairs at entrances. UV-treated for outdoor durability. Very popular for retail shop entrances.', applications:'Shop entrances, hotel doorways, outdoor dining, residential gardens, event decor', imageUrl:'', favourite:false },
  // Hanging
  { id:20, category:'Hanging Plants',       name:'Artificial Trailing Pothos', altNames:'Epipremnum, Devils Ivy', tags:['Trailing','Hanging','Cafe','Trending'], height:'30–200cm trail', width:'30–60cm', style:'Casual, Tropical, Trending', indoor:true, outdoor:false, premium:false, hospitality:true, healthcare:false, corporate:true, residential:true, retail:true, commercial:false, notes:'Very popular for café and co-working aesthetics. Trails from shelves, suspended pots and wall fixtures. Works well in clusters. Creates jungle-like density when multiple plants are grouped.', applications:'Cafes, co-working spaces, restaurants, boutique retail, creative offices', imageUrl:'', favourite:false },
  // Planters
  { id:21, category:'Planters & Pots',      name:'Fibreglass Planter — Round', altNames:'Resin Planter, Lightweight Planter', tags:['Planter','Lightweight','Commercial','Premium'], height:'20–80cm', width:'20–80cm', style:'Contemporary, Minimal', indoor:true, outdoor:true, premium:false, hospitality:true, healthcare:true, corporate:true, residential:true, retail:true, commercial:true, notes:'Fibreglass planters are ideal for artificial plants — lightweight, durable, available in any RAL colour. Critical to match planter to plant scale and space aesthetic. Premium brushed concrete or stone-effect finishes widely used in commercial spaces.', applications:'All commercial applications — consider planter as part of the total installation', imageUrl:'', favourite:false },
  // Office
  { id:22, category:'Office Styling',       name:'Open-Plan Office Botanical Zoning', altNames:'Workplace Greenery, Office Planting', tags:['Office','Wellness','Zoning','Corporate'], height:'Various', width:'Various', style:'Biophilic, Contemporary, Wellness', indoor:true, outdoor:false, premium:false, hospitality:false, healthcare:false, corporate:true, residential:false, retail:false, commercial:true, notes:'Biophilic design is a growing corporate trend. Botanical zones create visual separation between workspaces without solid partitions. Recommended mix: 1-2 tall trees (120–180cm) + medium plants + desktop succulents. Creates a nature-immersive office feel.', applications:'Open-plan offices, tech companies, financial services, professional services firms', imageUrl:'', favourite:false },
  // Restaurant
  { id:23, category:'Restaurant Styling',   name:'Restaurant Botanical Installation', altNames:'Dining Greenery, Restaurant Plants', tags:['Restaurant','Dining','Ambience','Feature'], height:'Various', width:'Various', style:'Various — depends on restaurant concept', indoor:true, outdoor:false, premium:false, hospitality:true, healthcare:false, corporate:false, residential:false, retail:false, commercial:true, notes:'Restaurant greening serves multiple purposes: ambient lighting diffusion, noise reduction (psychological), privacy between tables, brand differentiation. Trailing plants from ceiling, statement trees in corners, green walls as backdrops.', applications:'Restaurants, cafes, wine bars, hotel dining rooms, food courts', imageUrl:'', favourite:false },
  { id:24, category:'Green Walls',          name:'Artificial Hedge Panel', altNames:'Boxwood Hedge, Privacy Hedge, Garden Hedge', tags:['Outdoor','Privacy','Event','Retail'], height:'Panel: 50×50cm or 100×100cm', width:'Modular', style:'Formal, Natural, Clean', indoor:true, outdoor:true, premium:false, hospitality:true, healthcare:false, corporate:false, residential:true, retail:true, commercial:true, notes:'Flat boxwood-style hedge panels in modular format. UV-treated for outdoor use. Very popular for event backdrops, retail photo ops and outdoor dining privacy screens. Available in multiple shades of green.', applications:'Outdoor event backdrops, restaurant outdoor dividers, retail photo walls, residential garden screening', imageUrl:'', favourite:false },
]

// ── Build a search query for a reference item ────────────────────────────────
function buildSearchQuery(item) {
  const name = safeStr(item.name)
  const base = name.toLowerCase().includes('artificial') ? name : 'Artificial ' + name
  const ctx  = item.hospitality ? 'hotel interior' : item.healthcare ? 'healthcare interior' : item.corporate ? 'office interior' : 'indoor'
  return (base + ' ' + ctx).trim()
}

// ── Search for images via /api/extract ────────────────────────────────────────
async function searchImages(query) {
  const fd = new FormData()
  fd.append('extractionType', 'image_search')
  fd.append('query', query)
  fd.append('max', '6')
  try {
    const res  = await fetch('/api/extract', { method:'POST', body:fd })
    const data = await res.json()
    return { images: data.images || [], engine: data.engine || 'unknown', note: data.note || '', error: data.error || '' }
  } catch (e) {
    return { images:[], error: e.message }
  }
}

// ── Upload image from URL to Supabase (shared with harvest mode) ──────────────
async function uploadRefImage(imageUrl, itemName) {
  try {
    const fd = new FormData()
    fd.append('extractionType', 'fetch_image')
    fd.append('imageUrl', imageUrl)
    const res = await fetch('/api/extract', { method:'POST', body:fd })
    if (!res.ok) throw new Error('Proxy ' + res.status)
    const blob = await res.blob()
    if (blob.size < 500) throw new Error('Too small')
    if (SUPABASE_CONFIGURED) {
      const ext  = imageUrl.split('.').pop().split('?')[0].toLowerCase().replace(/[^a-z]/g,'') || 'jpg'
      const safe = (itemName||'ref').replace(/[^a-z0-9]/gi,'-').slice(0,40)
      const file = new File([blob], safe + '-' + Date.now() + '.' + ext, { type:blob.type||'image/jpeg' })
      const up   = await uploadDocument(file, { category:'Reference Library', notes:'Reference image — internal use only' })
      if (up?.public_url) return { url:up.public_url, savedToCloud:true }
    }
    return { url:imageUrl, savedToCloud:false }
  } catch { return { url:imageUrl, savedToCloud:false } }
}

// ── FindImage modal — search + select + save for one item ────────────────────
function FindImage({ item, onSave, onClose }) {
  const [query,     setQuery]     = useState(buildSearchQuery(item))
  const [results,   setResults]   = useState(null)   // { images, engine, note, error }
  const [selected,  setSelected]  = useState(null)
  const [manualUrl, setManualUrl] = useState('')
  const [saving,    setSaving]    = useState(false)
  const [saveMsg,   setSaveMsg]   = useState('')

  const search = async () => {
    setResults(null); setSelected(null); setSaveMsg('')
    const r = await searchImages(query)
    setResults(r)
  }

  const approve = async (imgUrl, sourceUrl) => {
    setSaving(true); setSaveMsg('Uploading to cloud storage…')
    const { url, savedToCloud } = await uploadRefImage(imgUrl, item.name)
    onSave({
      imageUrl:           url,
      imageSourceUrl:     sourceUrl || imgUrl,
      imageSavedToCloud:  savedToCloud,
      imageSearchQuery:   query,
      _referenceOnly:     true,
    })
    setSaveMsg(savedToCloud ? '✓ Saved to cloud storage' : '✓ Saved (external URL)')
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:20, width:'min(96vw,780px)', maxHeight:'90vh', overflow:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.18)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'22px 26px', borderBottom:`1px solid rgba(210,200,184,0.5)`, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, color:T.forest, marginBottom:3 }}>
              Find Reference Image
            </div>
            <div style={{ fontSize:12, color:T.textMid }}>{safeStr(item.name)} · {item.category}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:T.textLight }}>✕</button>
        </div>

        <div style={{ padding:'18px 26px' }}>
          {/* Disclaimer */}
          <div style={{ padding:'8px 14px', background:'rgba(184,151,90,0.08)', border:`1px solid rgba(184,151,90,0.2)`, borderRadius:8, fontSize:11, color:'#7A5A20', marginBottom:16, lineHeight:1.6 }}>
            <strong>Reference Image Only</strong> — Images are saved for internal inspiration and product education. Not stock, not supplier data, not pricing, not commercial affiliation.
          </div>

          {/* Search bar */}
          <div style={{ display:'flex', gap:10, marginBottom:16 }}>
            <input value={query} onChange={e=>setQuery(e.target.value)} style={{ flex:1 }}
              onKeyDown={e=>e.key==='Enter'&&search()} placeholder="Search query…"/>
            <button className="btn btn-primary" onClick={search}>Search Images</button>
          </div>

          {/* Engine note */}
          {results?.note && (
            <div style={{ fontSize:11, color:T.gold, padding:'6px 10px', background:T.goldPale, borderRadius:8, marginBottom:14 }}>
              ⚑ {results.note}
            </div>
          )}
          {results?.error && (
            <div style={{ fontSize:11, color:T.danger, marginBottom:12 }}>Search error: {results.error}</div>
          )}

          {/* Image grid */}
          {results && results.images.length > 0 && (
            <div>
              <div style={{ fontSize:12, color:T.textMid, marginBottom:10 }}>
                {results.images.length} images · {results.engine} · Click to select
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
                {results.images.map((img, i) => (
                  <div key={i} onClick={()=>setSelected(img)}
                    style={{ borderRadius:10, overflow:'hidden', cursor:'pointer', border:`2px solid ${selected===img?T.gold:'rgba(210,200,184,0.4)'}`, position:'relative', boxShadow:selected===img?'0 4px 16px rgba(184,151,90,0.3)':'none' }}>
                    <img src={img.thumbUrl||img.url} alt={img.title} style={{ width:'100%', height:140, objectFit:'cover', display:'block' }}
                      onError={e=>{ e.target.src=img.url; e.target.onerror=()=>e.target.style.display='none' }}/>
                    {selected===img && (
                      <div style={{ position:'absolute', top:6, right:6, background:T.gold, color:'#fff', borderRadius:'50%', width:22, height:22, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700 }}>✓</div>
                    )}
                    {img.isUnsplash && (
                      <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'rgba(0,0,0,0.5)', color:'#fff', fontSize:9, padding:'2px 6px', textAlign:'center' }}>Unsplash — public reference</div>
                    )}
                  </div>
                ))}
              </div>
              {selected && (
                <div style={{ display:'flex', gap:10, alignItems:'center', padding:'12px 14px', background:T.greenPale, borderRadius:10, marginBottom:14 }}>
                  <img src={selected.thumbUrl||selected.url} alt="selected" style={{ width:50, height:50, objectFit:'cover', borderRadius:8 }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:T.forest, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{selected.title}</div>
                    <div style={{ fontSize:10, color:T.textMid }}>Source: {selected.sourceUrl||'image search'}</div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={()=>approve(selected.url, selected.sourceUrl)} disabled={saving}>
                    {saving ? 'Saving…' : 'Use This Image →'}
                  </button>
                </div>
              )}
            </div>
          )}

          {results && results.images.length === 0 && !results.error && (
            <div style={{ textAlign:'center', padding:'24px 0', color:T.textMid, fontSize:13 }}>
              No images found for that search. Try a different query or paste a URL below.
            </div>
          )}

          {/* Manual URL fallback */}
          <div style={{ borderTop:`1px solid rgba(210,200,184,0.4)`, paddingTop:14, marginTop:results?4:0 }}>
            <div style={{ fontSize:12, fontWeight:600, color:T.textMid, marginBottom:8 }}>Or paste an image URL directly:</div>
            <div style={{ display:'flex', gap:8 }}>
              <input value={manualUrl} onChange={e=>setManualUrl(e.target.value)} placeholder="https://…" style={{ flex:1 }}/>
              <button className="btn btn-outline btn-sm" onClick={()=>approve(manualUrl, '')} disabled={!manualUrl||saving}>
                {saving ? 'Saving…' : 'Use URL'}
              </button>
            </div>
            {manualUrl && <img src={manualUrl} alt="preview" style={{ marginTop:8, maxWidth:'100%', maxHeight:160, objectFit:'contain', borderRadius:8 }} onError={e=>e.target.style.display='none'}/>}
          </div>

          {saveMsg && <div style={{ marginTop:12, fontSize:12, color:T.green, fontWeight:600 }}>{saveMsg}</div>}
        </div>
      </div>
    </div>
  )
}

const BLANK_REF = {
  category:'Indoor Trees', name:'', altNames:'', tags:[], style:'',
  height:'', width:'', notes:'', applications:'', examples:'',
  indoor:true, outdoor:false, premium:false,
  hospitality:false, healthcare:false, corporate:false,
  residential:false, retail:false, commercial:false,
  imageUrl:'', favourite:false, bookmarked:false,
  collections:[], moodboards:[],
}

const FILTER_TAGS = [
  'All','Trees','Palms','Green Walls','Outdoor','Indoor','Healthcare','Hospitality',
  'Reception','Office','Luxury','Commercial','Small','Large','Statement Piece',
  'Designer Favourite','Trending',
]

// Map filter labels to logic
function matchesFilter(item, f) {
  if (f==='All') return true
  const t = (JSON.stringify(item)+' '+item.name+' '+item.category+' '+(item.tags||[]).join(' ')).toLowerCase()
  const map = {
    'Trees':          ()=>['tree','palm','fig','baobab','olive','monstera','bird of paradise'].some(k=>t.includes(k)),
    'Palms':          ()=>t.includes('palm'),
    'Green Walls':    ()=>t.includes('wall')||t.includes('hedge')||t.includes('vertical'),
    'Outdoor':        ()=>item.outdoor,
    'Indoor':         ()=>item.indoor,
    'Healthcare':     ()=>item.healthcare||t.includes('healthcare'),
    'Hospitality':    ()=>item.hospitality||t.includes('hospitality')||t.includes('hotel'),
    'Reception':      ()=>t.includes('reception')||t.includes('lobby'),
    'Office':         ()=>item.corporate||t.includes('office')||t.includes('corporate'),
    'Luxury':         ()=>item.premium||t.includes('luxury')||t.includes('5-star'),
    'Commercial':     ()=>item.commercial,
    'Small':          ()=>t.includes('small')||t.includes('desk')||t.includes('under 60'),
    'Large':          ()=>t.includes('large')||t.includes('statement')||t.includes('200cm'),
    'Statement Piece':()=>(item.tags||[]).some(tg=>tg.toLowerCase().includes('statement')),
    'Designer Favourite':()=>(item.tags||[]).some(tg=>tg.toLowerCase().includes('designer')),
    'Trending':       ()=>(item.tags||[]).some(tg=>tg.toLowerCase().includes('trending')),
  }
  return (map[f]?.() ?? true)
}

// ── Image placeholder ─────────────────────────────────────────────────────────
function PlantImage({ item, size = 'card' }) {
  const [err, setErr] = useState(false)
  const ht = size === 'card' ? 180 : 260
  const cat = item.category || ''
  // Pick an emoji icon based on category
  const icon = cat.includes('Palm')||cat.includes('Kentia')||cat.includes('Areca') ? '🌴'
    : cat.includes('Wall')||cat.includes('Hedge')||cat.includes('Vertical') ? '🌿'
    : cat.includes('Orchid') ? '🌸'
    : cat.includes('Succulent') ? '🌵'
    : cat.includes('Hanging')||cat.includes('Trailing') ? '🌱'
    : cat.includes('Topiar') ? '🌲'
    : cat.includes('Planter') ? '🪴'
    : '🌳'
  if (item.imageUrl && !err) {
    return (
      <img src={item.imageUrl} alt={item.name} onError={()=>setErr(true)}
        style={{ width:'100%', height:ht, objectFit:'cover', display:'block' }}/>
    )
  }
  return (
    <div style={{ width:'100%', height:ht, background:`linear-gradient(135deg,rgba(45,90,61,0.12) 0%,rgba(184,151,90,0.08) 100%)`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 }}>
      <div style={{ fontSize:ht/3.5, lineHeight:1 }}>{icon}</div>
      <div style={{ fontSize:10, color:T.textLight, letterSpacing:'0.1em', textTransform:'uppercase' }}>Add Image</div>
    </div>
  )
}

// ── Product card ──────────────────────────────────────────────────────────────
function RefCard({ item, onClick, onFavourite, onEdit, onFindImage }) {
  return (
    <div style={{
      background:'#fff', borderRadius:16, overflow:'hidden',
      boxShadow:'0 2px 12px rgba(15,35,24,0.08)', cursor:'pointer',
      border:'1px solid rgba(210,200,184,0.4)',
      transition:'box-shadow 0.15s,transform 0.15s',
    }}
    onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 6px 24px rgba(15,35,24,0.14)';e.currentTarget.style.transform='translateY(-2px)'}}
    onMouseLeave={e=>{e.currentTarget.style.boxShadow='0 2px 12px rgba(15,35,24,0.08)';e.currentTarget.style.transform='none'}}
    onClick={()=>onClick(item)}
    >
      {/* Image */}
      <div style={{ position:'relative' }}>
        <PlantImage item={item} />
        {/* Favourite toggle */}
        <button
          onClick={e=>{e.stopPropagation();onFavourite(item.id)}}
          style={{ position:'absolute',top:8,right:8,background:'rgba(255,255,255,0.9)',border:'none',borderRadius:999,width:30,height:30,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:14,boxShadow:'0 1px 4px rgba(0,0,0,0.15)' }}
        >
          {item.favourite ? '♥' : '♡'}
        </button>
        {/* Premium badge */}
        {item.premium && (
          <div style={{ position:'absolute',top:8,left:8,background:'rgba(184,151,90,0.9)',color:'#fff',fontSize:9,fontWeight:700,padding:'2px 7px',borderRadius:20,letterSpacing:'0.1em' }}>PREMIUM</div>
        )}
      </div>
      {/* Info */}
      <div style={{ padding:'12px 14px 14px' }}>
        <div style={{ fontSize:10,color:T.gold,letterSpacing:'0.12em',textTransform:'uppercase',fontWeight:600,marginBottom:3 }}>{item.category}</div>
        <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:16,color:T.forest,marginBottom:4,lineHeight:1.3 }}>{item.name}</div>
        {item.height && <div style={{ fontSize:11,color:T.textMid,marginBottom:6 }}>↕ {item.height}</div>}
        {!item.imageUrl && (
          <button onClick={e=>{e.stopPropagation();onFindImage&&onFindImage(item)}} className="btn btn-outline btn-xs" style={{ color:T.gold,borderColor:T.gold,marginBottom:6 }}>
            ⊕ Find Image
          </button>
        )}
        {item.imageSavedToCloud===false && item.imageUrl && (
          <div style={{ fontSize:9,color:T.textLight,marginBottom:3 }}>⚑ External URL</div>
        )}
        {/* Application dots */}
        <div style={{ display:'flex',gap:4,flexWrap:'wrap' }}>
          {item.hospitality && <span style={{ fontSize:9,padding:'2px 6px',borderRadius:20,background:T.tealPale,color:T.teal,fontWeight:600 }}>Hotel</span>}
          {item.healthcare  && <span style={{ fontSize:9,padding:'2px 6px',borderRadius:20,background:T.greenPale,color:T.green,fontWeight:600 }}>Healthcare</span>}
          {item.corporate   && <span style={{ fontSize:9,padding:'2px 6px',borderRadius:20,background:T.goldPale,color:T.gold,fontWeight:600 }}>Corporate</span>}
          {item.outdoor     && <span style={{ fontSize:9,padding:'2px 6px',borderRadius:20,background:'rgba(161,161,170,0.12)',color:T.textMid,fontWeight:600 }}>Outdoor</span>}
          {item.premium     && <span style={{ fontSize:9,padding:'2px 6px',borderRadius:20,background:'rgba(124,58,237,0.08)',color:'#7C3AED',fontWeight:600 }}>Premium</span>}
        </div>
      </div>
    </div>
  )
}

// ── Detail panel / lightbox ───────────────────────────────────────────────────
function RefDetail({ item, onClose, onFavourite, onEdit }) {
  if (!item) return null
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div style={{ background:'#fff',borderRadius:20,width:'min(96vw,820px)',maxHeight:'92vh',overflow:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',minHeight:300 }}>
          {/* Left — image */}
          <div style={{ borderRadius:'20px 0 0 20px',overflow:'hidden' }}>
            <PlantImage item={item} size="detail" />
          </div>
          {/* Right — info */}
          <div style={{ padding:'28px 28px 24px',overflowY:'auto' }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16 }}>
              <div>
                <div style={{ fontSize:10,color:T.gold,letterSpacing:'0.15em',textTransform:'uppercase',fontWeight:700,marginBottom:4 }}>{item.category}</div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:T.forest,lineHeight:1.2 }}>{item.name}</div>
                {item.altNames && <div style={{ fontSize:12,color:T.textMid,marginTop:4,fontStyle:'italic' }}>{item.altNames}</div>}
              </div>
              <button onClick={onClose} style={{ background:'none',border:'none',fontSize:18,cursor:'pointer',color:T.textLight,padding:'0 0 0 12px' }}>✕</button>
            </div>

            {/* Tags */}
            <div style={{ display:'flex',gap:5,flexWrap:'wrap',marginBottom:16 }}>
              {(item.tags||[]).map(t=>(
                <span key={t} style={{ fontSize:10,padding:'3px 8px',borderRadius:20,background:'rgba(210,200,184,0.3)',color:T.textMid,fontWeight:500 }}>{t}</span>
              ))}
            </div>

            {/* Specs */}
            {[
              ['Height',      item.height],
              ['Width',       item.width],
              ['Style',       item.style],
              ['Applications',item.applications],
            ].filter(([,v])=>v).map(([k,v])=>(
              <div key={k} style={{ marginBottom:8 }}>
                <div style={{ fontSize:9,color:T.gold,letterSpacing:'0.14em',textTransform:'uppercase',fontWeight:700,marginBottom:2 }}>{k}</div>
                <div style={{ fontSize:12,color:T.textMid,lineHeight:1.6 }}>{v}</div>
              </div>
            ))}

            {/* Suitable for */}
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:9,color:T.gold,letterSpacing:'0.14em',textTransform:'uppercase',fontWeight:700,marginBottom:6 }}>Suitable For</div>
              <div style={{ display:'flex',gap:5,flexWrap:'wrap' }}>
                {[['Indoor',item.indoor,'#15803D'],['Outdoor',item.outdoor,'#0E7490'],['Premium',item.premium,'#7C3AED'],['Healthcare',item.healthcare,'#15803D'],['Hospitality',item.hospitality,'#0E7490'],['Corporate',item.corporate,'#B8975A'],['Residential',item.residential,'#52525B'],['Retail',item.retail,'#B91C1C'],['Commercial',item.commercial,'#0F2318']].filter(([,v])=>v).map(([l,,col])=>(
                  <span key={l} style={{ fontSize:10,padding:'3px 8px',borderRadius:20,background:`${col}18`,color:col,fontWeight:600 }}>{l}</span>
                ))}
              </div>
            </div>

            {/* Notes */}
            {item.notes && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:9,color:T.gold,letterSpacing:'0.14em',textTransform:'uppercase',fontWeight:700,marginBottom:4 }}>Notes</div>
                <div style={{ fontSize:12,color:T.textMid,lineHeight:1.7 }}>{item.notes}</div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display:'flex',gap:8,marginTop:16,flexWrap:'wrap' }}>
              <button onClick={()=>onFavourite(item.id)} className="btn btn-outline btn-sm" style={{ color:item.favourite?T.danger:T.textMid }}>
                {item.favourite?'♥ Saved':'♡ Save'}
              </button>
              <button onClick={()=>onEdit(item)} className="btn btn-outline btn-sm">
                ✎ Edit / Add Image
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Add/Edit modal ─────────────────────────────────────────────────────────────
function EditModal({ item, onSave, onClose }) {
  const [form, setForm] = useState({...BLANK_REF,...item})
  const F = k => e => setForm(f=>({...f,[k]:e.target.value}))
  const T2 = k => e => setForm(f=>({...f,[k]:e.target.checked}))
  return (
    <Modal open title={item?.id?'Edit Reference Entry':'Add Reference Entry'} onClose={onClose}
      footer={<><button className="btn btn-outline" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={()=>onSave(form)}>Save</button></>}
    >
      <div className="form-grid">
        <div className="form-field full"><label>Common Name *</label><input value={form.name||''} onChange={F('name')} placeholder="e.g. Artificial Olive Tree"/></div>
        <div className="form-field full"><label>Alternative / Botanical Names</label><input value={form.altNames||''} onChange={F('altNames')} placeholder="Olea europaea, Mediterranean Olive"/></div>
        <div className="form-field">
          <label>Category</label>
          <select value={form.category} onChange={F('category')}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
        </div>
        <div className="form-field"><label>Style</label><input value={form.style||''} onChange={F('style')} placeholder="Mediterranean, Contemporary…"/></div>
        <div className="form-field"><label>Typical Height</label><input value={form.height||''} onChange={F('height')} placeholder="e.g. 120–300cm"/></div>
        <div className="form-field"><label>Typical Width</label><input value={form.width||''} onChange={F('width')} placeholder="e.g. 80–150cm"/></div>
        <div className="form-field full"><label>Image URL (optional)</label><input value={form.imageUrl||''} onChange={F('imageUrl')} placeholder="https://… or leave blank for emoji placeholder"/></div>
        <div className="form-field full"><label>Tags (comma separated)</label>
          <input value={(form.tags||[]).join(', ')} onChange={e=>setForm(f=>({...f,tags:e.target.value.split(',').map(t=>t.trim()).filter(Boolean)}))} placeholder="Mediterranean, Statement, Luxury…"/>
        </div>
        <div className="form-field full"><label>Applications</label><input value={form.applications||''} onChange={F('applications')} placeholder="Hotel lobbies, corporate receptions…"/></div>
        <div className="form-field full"><label>Notes</label><textarea value={form.notes||''} onChange={F('notes')} placeholder="Design notes, commercial tips, sourcing notes…"/></div>
        {/* Toggles */}
        <div className="form-field full">
          <label>Suitable For</label>
          <div style={{ display:'flex',gap:16,flexWrap:'wrap',marginTop:6 }}>
            {[['indoor','Indoor'],['outdoor','Outdoor'],['premium','Premium'],['hospitality','Hospitality'],['healthcare','Healthcare'],['corporate','Corporate'],['residential','Residential'],['retail','Retail'],['commercial','Commercial']].map(([k,l])=>(
              <label key={k} style={{ display:'flex',alignItems:'center',gap:6,fontSize:13,color:T.textMid,cursor:'pointer' }}>
                <input type="checkbox" checked={!!form[k]} onChange={T2(k)} style={{ accentColor:T.gold,width:15,height:15 }}/>{l}
              </label>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// HARVEST MODE — rebuilt with full debug pipeline + server-side image extraction
// ═════════════════════════════════════════════════════════════════════════════

// ── Resolve an image URL against a base URL ───────────────────────────────────
function resolveImgUrl(raw, origin, baseUrl) {
  if (!raw || raw.startsWith('data:')) return ''
  if (raw.startsWith('http')) return raw
  if (raw.startsWith('//')) return 'https:' + raw
  if (raw.startsWith('/')) return origin + raw
  return baseUrl + raw
}

// ── Upload image to Supabase via server proxy ─────────────────────────────────
async function serverUploadImage(imageUrl, name) {
  const debug = {
    step: 'upload',
    imageUrl,
    downloadAttempted: true,
    downloadSuccess: false,
    supabaseAttempted: false,
    supabaseSuccess: false,
    supabaseUrl: '',
    error: '',
  }
  if (!imageUrl) { debug.error = 'No image URL'; return { url:'', debug } }

  // 1. Download via server proxy
  try {
    const fd = new FormData()
    fd.append('extractionType', 'fetch_image')
    fd.append('imageUrl', imageUrl)
    const res = await fetch('/api/extract', { method:'POST', body:fd })
    if (!res.ok) throw new Error('Proxy HTTP ' + res.status)
    const blob = await res.blob()
    if (blob.size < 500) throw new Error('Blob too small — likely blocked (' + blob.size + ' bytes)')
    debug.downloadSuccess = true

    // 2. Upload to Supabase
    if (SUPABASE_CONFIGURED) {
      debug.supabaseAttempted = true
      const ext = imageUrl.split('.').pop().split('?')[0].toLowerCase().replace(/[^a-z]/g,'') || 'jpg'
      const safeName = (name||'ref').replace(/[^a-z0-9]/gi,'-').slice(0,40)
      const file = new File([blob], safeName + '-' + Date.now() + '.' + ext, { type: blob.type || 'image/jpeg' })
      try {
        const uploaded = await uploadDocument(file, { category:'Reference Library', notes:'Harvested reference image — internal use only' })
        const url = uploaded?.public_url || ''
        if (url) {
          debug.supabaseSuccess = true
          debug.supabaseUrl = url
          return { url, debug }
        } else {
          debug.error = 'Supabase returned no public_url'
        }
      } catch (e) {
        debug.error = 'Supabase upload failed: ' + e.message
      }
    } else {
      debug.error = 'Supabase not configured — keeping external URL'
    }
    // Fallback: keep external URL for this session
    return { url: imageUrl, debug }
  } catch (e) {
    debug.error = 'Download failed: ' + e.message
    return { url:'', debug }
  }
}

// ── Build draft cards from server fetch response ──────────────────────────────
function buildDraftsFromFetchResult(result, url, mode) {
  const { images = [], productTitles = [], linkTitles = [], html = '', origin = '', baseUrl = '' } = result
  const domain = (() => { try { return new URL(url).hostname.replace('www.','') } catch { return url } })()
  const today  = new Date().toISOString().split('T')[0]
  const allTitles = [...productTitles, ...linkTitles].filter(Boolean)

  if (mode === 'single') {
    // Single product: use page title + first good image
    const pageTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || domain
    const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1]?.replace(/<[^>]*>/g,'').trim() || ''
    const name = h1 || pageTitle
    const img  = images[0] || null
    const kw   = (name + ' ' + (html.slice(0,3000))).toLowerCase()
    const cat  = guessCategory(kw)
    return [{
      _draftId: 1, title: name, category: cat, qualityScore: 'Medium',
      indoor: true, outdoor: false, tags: guessTags(kw),
      imageUrl: img?.best || '',
      _imgDebug: img ? {
        rawSrc: img.src, rawDataSrc: img.dataSrc, rawDataLazy: img.dataLazy,
        rawSrcset: img.srcset, resolvedBest: img.best, isLazyLoaded: img.isLazyLoaded,
      } : { error: 'No images found on page' },
      _sourceUrl: url, _sourceDomain: domain, _harvestDate: today,
    }]
  }

  // Category page: pair titles with images
  const drafts = []
  const usedImgs = new Set()
  const usedTitles = new Set()

  // Strategy: zip product titles with product images
  const productImages = images.filter(i => !usedImgs.has(i.best))
  allTitles.forEach((title, idx) => {
    if (usedTitles.has(title)) return
    usedTitles.add(title)
    const img = productImages[idx] || null
    if (img) usedImgs.add(img.best)
    const kw = title.toLowerCase()
    drafts.push({
      _draftId: idx + 1, title, category: guessCategory(kw),
      qualityScore: 'Medium', indoor: true, outdoor: false, tags: guessTags(kw),
      imageUrl: img?.best || '',
      _imgDebug: img ? {
        rawSrc: img.src, rawDataSrc: img.dataSrc, rawDataLazy: img.dataLazy,
        rawSrcset: img.srcset, resolvedBest: img.best, isLazyLoaded: img.isLazyLoaded,
      } : { error: 'No image matched for this product' },
      _sourceUrl: url, _sourceDomain: domain, _harvestDate: today,
    })
  })

  // If no titles found, create one draft per image
  if (drafts.length === 0) {
    images.slice(0, 12).forEach((img, idx) => {
      const name = img.alt || (domain + ' product ' + (idx+1))
      const kw   = name.toLowerCase()
      drafts.push({
        _draftId: idx + 1, title: name, category: guessCategory(kw),
        qualityScore: 'Low', indoor: true, outdoor: false, tags: guessTags(kw),
        imageUrl: img.best,
        _imgDebug: { rawSrc: img.src, rawDataSrc: img.dataSrc, resolvedBest: img.best, isLazyLoaded: img.isLazyLoaded },
        _sourceUrl: url, _sourceDomain: domain, _harvestDate: today,
      })
    })
  }
  return drafts.slice(0, 20)
}

function guessCategory(kw) {
  if (kw.includes('olive')) return 'Olive Trees'
  if (kw.includes('fiddle')||kw.includes('ficus lyrata')) return 'Fiddle Leaf Figs'
  if (kw.includes('kentia')) return 'Kentia Palms'
  if (kw.includes('areca')||kw.includes('golden cane')) return 'Areca Palms'
  if (kw.includes('bird of paradise')||kw.includes('strelitzia')) return 'Bird of Paradise'
  if (kw.includes('monstera')) return 'Monstera'
  if (kw.includes('snake')||kw.includes('sansev')) return 'Snake Plants'
  if (kw.includes('succulent')||kw.includes('cactus')) return 'Succulents'
  if (kw.includes('orchid')) return 'Orchids'
  if (kw.includes('wall')||kw.includes('hedge')||kw.includes('vertical')) return 'Green Walls'
  if (kw.includes('palm')) return 'Areca Palms'
  if (kw.includes('topiar')||kw.includes('boxwood')) return 'Topiaries'
  if (kw.includes('hang')||kw.includes('trail')||kw.includes('pothos')||kw.includes('ivy')) return 'Hanging Plants'
  if (kw.includes('planter')||kw.includes('pot')||kw.includes('vase')) return 'Planters & Pots'
  if (kw.includes('small')||kw.includes('desk')||kw.includes('mini')) return 'Succulents'
  return 'Indoor Trees'
}

function guessTags(kw) {
  const tags = []
  if (kw.includes('luxury')||kw.includes('premium')) tags.push('Premium','Luxury')
  if (kw.includes('hotel')||kw.includes('hospitality')) tags.push('Hospitality')
  if (kw.includes('office')||kw.includes('corporate')) tags.push('Corporate')
  if (kw.includes('reception')) tags.push('Reception')
  if (kw.includes('healthcare')||kw.includes('hospital')||kw.includes('clinic')) tags.push('Healthcare')
  if (kw.includes('outdoor')) tags.push('Outdoor')
  if (kw.includes('statement')) tags.push('Statement Piece')
  if (kw.includes('small')) tags.push('Small')
  if (kw.includes('large')||kw.includes('big')||kw.includes('tall')) tags.push('Large')
  return [...new Set(tags)]
}

// ── Duplicate check ───────────────────────────────────────────────────────────
function findDuplicate(draft, existing) {
  const norm = s => (s||'').toLowerCase().replace(/\s+/g,' ').trim()
  return existing.find(e =>
    (norm(e.name) === norm(draft.title) && norm(e.name).length > 3) ||
    (e.imageUrl && e.imageUrl === draft.imageUrl && draft.imageUrl) ||
    (e._sourceUrl && e._sourceUrl === draft._sourceUrl && draft._sourceUrl)
  )
}

// ── Debug panel for a single draft ────────────────────────────────────────────
function DebugPanel({ draft, uploadResult }) {
  const [open, setOpen] = useState(false)
  const d = draft._imgDebug || {}
  const u = uploadResult || {}
  const steps = [
    ['Title detected',       draft.title || '(none)', !!draft.title],
    ['Source URL',           draft._sourceUrl || '(none)', !!draft._sourceUrl],
    ['Raw img src',          d.rawSrc || '(none)', !!d.rawSrc],
    ['Raw data-src',         d.rawDataSrc || '(none)', !!d.rawDataSrc],
    ['Raw srcset',           d.rawSrcset ? d.rawSrcset.slice(0,60)+'…' : '(none)', !!d.rawSrcset],
    ['Lazy-loaded?',         d.isLazyLoaded ? 'Yes (used data-src)' : 'No', true],
    ['Resolved image URL',   d.resolvedBest || d.error || '(none)', !!d.resolvedBest],
    ['Download attempted',   u.downloadAttempted ? 'Yes' : 'No', true],
    ['Download success',     u.downloadSuccess ? 'Yes' : ('No — ' + (u.error||'')), !!u.downloadSuccess],
    ['Supabase attempted',   u.supabaseAttempted ? 'Yes' : 'No', true],
    ['Supabase success',     u.supabaseSuccess ? 'Yes' : ('No — ' + (u.error||'')), !!u.supabaseSuccess],
    ['Supabase public URL',  u.supabaseUrl || '(not stored)', !!u.supabaseUrl],
    ['Saved imageUrl field', draft._savedImageUrl || draft.imageUrl || '(not saved yet)', !!(draft._savedImageUrl||draft.imageUrl)],
    ['Card renders from',    draft._savedImageUrl ? 'Supabase cloud' : draft.imageUrl ? 'External URL' : 'Emoji placeholder', true],
  ]
  return (
    <div style={{ marginTop:6 }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ fontSize:10, background:'none', border:`1px solid rgba(210,200,184,0.5)`, borderRadius:6, padding:'2px 8px', cursor:'pointer', color:T.textMid }}>
        {open ? '▲ Hide Debug' : '▼ Debug Report'}
      </button>
      {open && (
        <div style={{ marginTop:6, background:'rgba(15,35,24,0.04)', border:`1px solid rgba(210,200,184,0.5)`, borderRadius:8, padding:'10px 12px', fontSize:10, fontFamily:'monospace' }}>
          {steps.map(([label, value, ok]) => (
            <div key={label} style={{ display:'flex', gap:8, padding:'3px 0', borderBottom:`1px solid rgba(210,200,184,0.2)` }}>
              <span style={{ color:ok?T.green:T.textLight, width:12, flexShrink:0 }}>{ok?'✓':'○'}</span>
              <span style={{ color:T.textMid, width:160, flexShrink:0 }}>{label}</span>
              <span style={{ color:T.forest, wordBreak:'break-all' }}>{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── HarvestMode main component ────────────────────────────────────────────────
function HarvestMode({ allItems, onSave, onClose }) {
  const [mode,       setMode]       = useState('category')
  const [url,        setUrl]        = useState('')
  const [status,     setStatus]     = useState('idle')
  const [msg,        setMsg]        = useState('')
  const [drafts,     setDrafts]     = useState([])
  const [approved,   setApproved]   = useState(new Set())
  const [uploadResults, setUploadResults] = useState({}) // draftId → debug obj
  const [saving,     setSaving]     = useState(false)
  const [fetchResult, setFetchResult] = useState(null)

  // Manual fallback
  const [manName,  setManName]  = useState('')
  const [manImg,   setManImg]   = useState('')
  const [manCat,   setManCat]   = useState('Indoor Trees')
  const [manNotes, setManNotes] = useState('')

  const domain = (() => { try { return new URL(url).hostname.replace('www.','') } catch { return '' } })()

  // ── Analyse URL ─────────────────────────────────────────────────────────────
  const analyse = async () => {
    if (!url.trim()) return
    setStatus('fetching'); setMsg('Fetching page via server…'); setDrafts([]); setApproved(new Set()); setUploadResults({})
    try {
      const fd = new FormData()
      fd.append('extractionType', 'fetch_url')
      fd.append('targetUrl', url)
      const res = await fetch('/api/extract', { method:'POST', body:fd })
      const result = await res.json()
      setFetchResult(result)

      if (result.error && !result.html) {
        setStatus('error')
        setMsg('Page fetch failed: ' + result.error + '. Use manual entry below.')
        return
      }
      if (!result.fetchOk) {
        setMsg('Server returned HTTP ' + result.httpStatus + ' — site may block crawlers. Images extracted: ' + (result.images?.length||0))
      }

      setMsg(OCR_AVAILABLE && result.html?.length > 100 ? 'Running AI extraction…' : 'Parsing images and titles…')

      let extracted = []
      // Try AI first if available
      if (OCR_AVAILABLE && result.html?.length > 100) {
        try {
          const aifd = new FormData()
          aifd.append('extractionType', 'reference_harvest')
          aifd.append('rawText', result.html.slice(0, 10000))
          aifd.append('sourceUrl', url)
          const aiFd2 = new FormData()
          aiFd2.append('extractionType', 'reference_harvest')
          aiFd2.append('rawText', (result.productTitles||[]).join('\n') + '\n' + result.html.slice(0,8000))
          aiFd2.append('sourceUrl', url)
          aiFd2.append('prompt',
            'Extract reference cards from this page for Botanica Living, an artificial greenery company.\n' +
            'Product titles found: ' + JSON.stringify(result.productTitles||[]) + '\n' +
            'Image URLs found: ' + JSON.stringify((result.images||[]).map(i=>i.best).filter(Boolean).slice(0,10)) + '\n\n' +
            'Return JSON array. Fields: title, category (Indoor Trees/Olive Trees/etc), tags (array), indoor (bool), outdoor (bool), qualityScore (High/Medium/Low), notes.\n' +
            'DO NOT include prices. Max 15 items. Return [] if nothing relevant found.'
          )
          const aiRes = await fetch('/api/extract', { method:'POST', body:aiFd2 })
          const aiData = await aiRes.json()
          const aiText = aiData.text || (Array.isArray(aiData.content) ? aiData.content.map(b=>b.text||'').join('') : '') || ''
          const clean = aiText.replace(/```json|```/g,'').trim()
          if (clean.startsWith('[')) {
            const parsed = JSON.parse(clean)
            if (Array.isArray(parsed) && parsed.length > 0) {
              // Pair AI titles with server-extracted images
              extracted = parsed.map((item, i) => ({
                ...item,
                _draftId: i+1,
                imageUrl: (result.images||[])[i]?.best || '',
                _imgDebug: (result.images||[])[i] ? {
                  rawSrc: result.images[i].src,
                  rawDataSrc: result.images[i].dataSrc,
                  rawSrcset: result.images[i].srcset,
                  resolvedBest: result.images[i].best,
                  isLazyLoaded: result.images[i].isLazyLoaded,
                } : { error: 'No image for this item' },
                _sourceUrl: url, _sourceDomain: domain,
                _harvestDate: new Date().toISOString().split('T')[0],
              }))
            }
          }
        } catch {}
      }

      // Fallback: build from server-extracted images + titles
      if (!extracted.length) {
        extracted = buildDraftsFromFetchResult(result, url, mode)
      }

      // Duplicate check
      const stamped = extracted.map(d => ({
        ...d,
        _duplicate: findDuplicate(d, allItems)?.name || null,
      }))

      setDrafts(stamped)
      setStatus('extracted')
      const imgCount = extracted.filter(d=>d.imageUrl).length
      setMsg(extracted.length + ' card(s) extracted · ' + imgCount + ' with images · ' + (result.images?.length||0) + ' image candidates found on page')
    } catch (err) {
      setStatus('error')
      setMsg('Harvest failed: ' + err.message)
    }
  }

  // ── Save approved cards ─────────────────────────────────────────────────────
  const saveApproved = async () => {
    const toSave = drafts.filter(d => approved.has(d._draftId))
    if (!toSave.length) return
    setSaving(true)

    const results = { ...uploadResults }
    const saved = []

    for (const draft of toSave) {
      setMsg('Processing: ' + draft.title + '…')
      let finalUrl = ''
      let uploadResult = { downloadAttempted:false, downloadSuccess:false, supabaseAttempted:false, supabaseSuccess:false, supabaseUrl:'', error:'' }

      if (draft.imageUrl) {
        const r = await serverUploadImage(draft.imageUrl, draft.title)
        finalUrl    = r.url
        uploadResult = r.debug
      } else {
        uploadResult.error = 'No image URL to upload'
      }

      results[draft._draftId] = uploadResult
      setUploadResults({ ...results })

      saved.push({
        ...BLANK_REF,
        name:           draft.title || draft.commonName || '',
        altNames:       draft.altNames || '',
        category:       draft.category || 'Indoor Trees',
        style:          draft.style || '',
        tags:           Array.isArray(draft.tags) ? draft.tags : [],
        height:         draft.height || '',
        applications:   draft.applications || '',
        indoor:         draft.indoor !== false,
        outdoor:        !!draft.outdoor,
        notes:          draft.notes || '',
        imageUrl:       finalUrl || draft.imageUrl || '',  // cloud URL preferred
        _sourceUrl:     draft._sourceUrl || url,
        _sourceDomain:  draft._sourceDomain || domain,
        _originalImgUrl:draft.imageUrl || '',
        _harvestDate:   draft._harvestDate || new Date().toISOString().split('T')[0],
        _referenceOnly: true,
        _uploadDebug:   uploadResult,
        _savedImageUrl: finalUrl,
        favourite:      false,
      })
    }

    // Update draft cards to show final saved state
    setDrafts(dd => dd.map(d => {
      const s = saved.find(s => s._sourceUrl === d._sourceUrl && s.name === (d.title||''))
      return s ? { ...d, _savedImageUrl: s.imageUrl } : d
    }))

    onSave(saved)
    setSaving(false)
    setStatus('done')
    setMsg('✓ Saved ' + saved.length + ' card(s) to Reference Library.')
  }

  const saveManual = () => {
    if (!manName.trim()) return
    onSave([{ ...BLANK_REF, name:manName, category:manCat, imageUrl:manImg, notes:manNotes,
      _sourceUrl:url||'', _sourceDomain:domain, _harvestDate:new Date().toISOString().split('T')[0], _referenceOnly:true }])
    setStatus('done'); setMsg('✓ Manual reference saved.')
  }

  const toggleApprove = id => setApproved(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n })
  const approveAll    = () => setApproved(new Set(drafts.map(d=>d._draftId)))
  const unapproveAll  = () => setApproved(new Set())

  return (
    <div style={{ maxWidth:860, margin:'0 auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, color:T.forest, marginBottom:3 }}>Harvest Reference</div>
          <div style={{ fontSize:12, color:T.textMid }}>Paste a URL — app extracts product titles and images server-side (bypasses CORS).</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>← Back to Library</button>
      </div>

      <div style={{ padding:'10px 16px', background:'rgba(184,151,90,0.08)', border:`1px solid rgba(184,151,90,0.2)`, borderRadius:10, fontSize:11, color:'#7A5A20', marginBottom:16, lineHeight:1.7 }}>
        <strong>Internal Reference Only</strong> — Harvested images are uploaded to Botanica Living Supabase Storage. No pricing or stock information is stored. Every card is marked Reference Only.
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {[['single','Single Product'],['category','Category Page'],['manual','Manual Entry']].map(([id,label])=>(
          <button key={id} className={`bp-fbtn ${mode===id?'active':''}`} onClick={()=>{setMode(id);setStatus('idle');setDrafts([]);setMsg('')}}>
            {label}
          </button>
        ))}
      </div>

      {mode !== 'manual' ? (
        <>
          <div style={{ display:'flex', gap:10, marginBottom:12 }}>
            <input value={url} onChange={e=>setUrl(e.target.value)}
              placeholder="https://distinctivespaces.co.za/shop/category/small-plants-pots"
              style={{ flex:1 }} onKeyDown={e=>e.key==='Enter'&&analyse()}/>
            <button className="btn btn-primary" onClick={analyse} disabled={!url||status==='fetching'}>
              {status==='fetching' ? '⟳ Fetching…' : 'Analyse URL'}
            </button>
          </div>

          {msg && (
            <div style={{ padding:'10px 14px', background:status==='error'?T.redPale:status==='done'?T.greenPale:T.tealPale,
              border:`1px solid ${status==='error'?'rgba(185,28,28,0.2)':status==='done'?'rgba(21,128,61,0.2)':T.tealGlow}`,
              borderRadius:10, fontSize:12, color:status==='error'?T.danger:status==='done'?T.green:T.teal, marginBottom:14 }}>
              {msg}
            </div>
          )}

          {/* Fetch result summary */}
          {fetchResult && (
            <div style={{ padding:'8px 12px', background:'rgba(228,221,208,0.3)', borderRadius:8, fontSize:11, color:T.textMid, marginBottom:14, fontFamily:'monospace' }}>
              Server fetch: HTTP {fetchResult.httpStatus} · {fetchResult.images?.length||0} images found
              {' · '}{fetchResult.productTitles?.length||0} product titles · {fetchResult.linkTitles?.length||0} link titles
              {fetchResult.images?.some(i=>i.isLazyLoaded) && ' · ⚑ Lazy-loaded images detected and extracted'}
            </div>
          )}

          {drafts.length > 0 && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <div style={{ fontSize:13, fontWeight:600, color:T.forest }}>
                  {drafts.length} draft card(s) from {domain}
                  <span style={{ fontSize:11, fontWeight:400, color:T.textMid, marginLeft:8 }}>
                    · {approved.size} selected
                  </span>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn btn-outline btn-sm" onClick={approved.size===drafts.length?unapproveAll:approveAll}>
                    {approved.size===drafts.length?'Deselect All':'Select All'}
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={saveApproved} disabled={approved.size===0||saving}>
                    {saving ? '⟳ Saving & uploading…' : `Save ${approved.size} to Library →`}
                  </button>
                </div>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {drafts.map(d => (
                  <div key={d._draftId} style={{
                    background:'#fff',
                    border:`1.5px solid ${approved.has(d._draftId)?T.gold:'rgba(210,200,184,0.5)'}`,
                    borderRadius:14, overflow:'hidden',
                    boxShadow: approved.has(d._draftId)?'0 4px 16px rgba(184,151,90,0.15)':'0 1px 4px rgba(0,0,0,0.05)',
                  }}>
                    <div style={{ display:'grid', gridTemplateColumns:'160px 1fr' }}>
                      {/* Image preview */}
                      <div style={{ background:'rgba(228,221,208,0.3)', display:'flex', alignItems:'center', justifyContent:'center', minHeight:140, position:'relative' }}>
                        {d._savedImageUrl || d.imageUrl ? (
                          <img src={d._savedImageUrl || d.imageUrl} alt={d.title}
                            style={{ width:'100%', height:140, objectFit:'cover' }}
                            onError={e=>{
                              e.target.style.display='none'
                              e.target.nextSibling && (e.target.nextSibling.style.display='flex')
                            }}/>
                        ) : null}
                        <div style={{ display: (d._savedImageUrl || d.imageUrl)?'none':'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:140, gap:4 }}>
                          <span style={{ fontSize:32 }}>🌿</span>
                          <span style={{ fontSize:9, color:T.textLight, textAlign:'center', padding:'0 8px' }}>
                            {d._imgDebug?.error || 'No image found'}
                          </span>
                        </div>
                        {d._savedImageUrl && d._savedImageUrl !== d.imageUrl && (
                          <div style={{ position:'absolute', bottom:4, right:4, background:T.green, color:'#fff', fontSize:8, padding:'2px 5px', borderRadius:10, fontWeight:700 }}>☁ Saved</div>
                        )}
                      </div>

                      {/* Info */}
                      <div style={{ padding:'14px 16px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                          <div style={{ flex:1, minWidth:0 }}>
                            <input
                              value={d.title||''} onChange={e=>setDrafts(dd=>dd.map(x=>x._draftId===d._draftId?{...x,title:e.target.value}:x))}
                              style={{ fontSize:14, fontFamily:"'Cormorant Garamond',serif", color:T.forest, border:'none', borderBottom:`1px solid rgba(210,200,184,0.5)`, width:'100%', background:'transparent', outline:'none', marginBottom:4 }}
                            />
                            <select value={d.category||'Indoor Trees'}
                              onChange={e=>setDrafts(dd=>dd.map(x=>x._draftId===d._draftId?{...x,category:e.target.value}:x))}
                              style={{ fontSize:11, color:T.gold, border:'none', background:'transparent', cursor:'pointer' }}>
                              {CATEGORIES.map(cat=><option key={cat}>{cat}</option>)}
                            </select>
                          </div>
                          <label style={{ display:'flex', alignItems:'center', gap:5, cursor:'pointer', flexShrink:0, marginLeft:10 }}>
                            <input type="checkbox" checked={approved.has(d._draftId)} onChange={()=>toggleApprove(d._draftId)} style={{ accentColor:T.gold, width:18, height:18 }}/>
                            <span style={{ fontSize:11, fontWeight:700, color:approved.has(d._draftId)?T.gold:T.textLight }}>
                              {approved.has(d._draftId)?'Approved':'Approve'}
                            </span>
                          </label>
                        </div>

                        <div style={{ fontSize:11, color:T.textMid, display:'flex', gap:8, flexWrap:'wrap', marginBottom:6 }}>
                          <span style={{ color:d.qualityScore==='High'?T.green:d.qualityScore==='Medium'?T.gold:T.textLight, fontWeight:600 }}>{d.qualityScore} relevance</span>
                          {d.indoor  && <span>Indoor</span>}
                          {d.outdoor && <span>Outdoor</span>}
                          {d._imgDebug?.isLazyLoaded && <span style={{ color:T.teal }}>⚑ Lazy-loaded img</span>}
                          {uploadResults[d._draftId]?.supabaseSuccess && <span style={{ color:T.green, fontWeight:600 }}>☁ Cloud saved</span>}
                        </div>

                        {d._duplicate && (
                          <div style={{ fontSize:11, color:T.gold, padding:'3px 8px', background:T.goldPale, borderRadius:6, marginBottom:6 }}>
                            ⚑ Similar: "{d._duplicate}"
                          </div>
                        )}

                        <div style={{ fontSize:10, color:T.textLight }}>
                          <span style={{ padding:'1px 5px', background:'rgba(161,161,170,0.1)', borderRadius:20, fontWeight:600 }}>Reference Only</span>
                          {' · '}{domain} · {d._harvestDate}
                        </div>

                        <DebugPanel draft={{...d, _savedImageUrl: d._savedImageUrl}} uploadResult={uploadResults[d._draftId]} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Manual fallback always visible if error or no results */}
          {(status === 'error' || (status === 'extracted' && drafts.length === 0)) && (
            <div style={{ marginTop:20, padding:18, background:'rgba(228,221,208,0.3)', borderRadius:12, border:`1px solid rgba(210,200,184,0.5)` }}>
              <div style={{ fontSize:13, fontWeight:600, color:T.forest, marginBottom:10 }}>
                Manual fallback — paste image URL directly
              </div>
              <div className="form-grid">
                <div className="form-field full"><label>Product Name</label><input value={manName} onChange={e=>setManName(e.target.value)}/></div>
                <div className="form-field full"><label>Image URL</label><input value={manImg} onChange={e=>setManImg(e.target.value)} placeholder="https://…"/></div>
                <div className="form-field"><label>Category</label><select value={manCat} onChange={e=>setManCat(e.target.value)}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
                <div className="form-field"><label>Notes</label><input value={manNotes} onChange={e=>setManNotes(e.target.value)}/></div>
              </div>
              {manImg && <img src={manImg} alt="preview" style={{ maxWidth:'100%', maxHeight:180, objectFit:'contain', borderRadius:8, marginTop:10 }} onError={e=>e.target.style.display='none'}/>}
              <button className="btn btn-primary btn-sm" style={{ marginTop:12 }} onClick={saveManual} disabled={!manName.trim()}>
                Save to Reference Library
              </button>
            </div>
          )}
        </>
      ) : (
        /* Manual entry mode */
        <div style={{ padding:20, background:'rgba(228,221,208,0.3)', borderRadius:12, border:`1px solid rgba(210,200,184,0.5)` }}>
          <div style={{ fontSize:12, color:T.textMid, marginBottom:14, lineHeight:1.7 }}>
            Paste a product name and image URL manually. Useful when automatic harvesting is blocked.
          </div>
          <div className="form-grid">
            <div className="form-field full"><label>Product Name *</label><input value={manName} onChange={e=>setManName(e.target.value)} placeholder="e.g. Artificial Olive Tree 240cm"/></div>
            <div className="form-field full"><label>Image URL</label><input value={manImg} onChange={e=>setManImg(e.target.value)} placeholder="https://…"/></div>
            <div className="form-field"><label>Category</label><select value={manCat} onChange={e=>setManCat(e.target.value)}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
            <div className="form-field"><label>Source URL</label><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="Original page URL"/></div>
            <div className="form-field full"><label>Notes</label><textarea value={manNotes} onChange={e=>setManNotes(e.target.value)}/></div>
          </div>
          {manImg && <img src={manImg} alt="preview" style={{ maxWidth:'100%', maxHeight:200, objectFit:'contain', borderRadius:8, marginTop:12 }} onError={e=>e.target.style.display='none'}/>}
          <button className="btn btn-primary" style={{ marginTop:14 }} onClick={saveManual} disabled={!manName.trim()}>
            Save to Reference Library
          </button>
          {status==='done' && <div style={{ marginTop:10, fontSize:12, color:T.green, fontWeight:600 }}>{msg}</div>}
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PRODUCT REFERENCE LIBRARY
// ═════════════════════════════════════════════════════════════════════════════
export default function ProductRefLibrary({ refItems, setRefItems }) {
  const [tab,        setTab]        = useState('browse')
  const [filter,     setFilter]     = useState('All')
  const [catFilter,  setCatFilter]  = useState('All')
  const [search,     setSearch]     = useState('')
  const [selected,   setSelected]   = useState(null)
  const [editing,    setEditing]    = useState(null)
  const [modal,      setModal]      = useState(false)
  const [showFavs,   setShowFavs]   = useState(false)
  const [harvesting,   setHarvesting]   = useState(false)
  const [findingImage, setFindingImage] = useState(null)  // item to find image for
  const [autoFinding,  setAutoFinding]  = useState(false)
  const [autoMsg,      setAutoMsg]      = useState('')

  // Merge seed with user additions (seed IDs are 1-24, user IDs are nextId based)
  const allItems = useMemo(() => {
    const safe = Array.isArray(refItems) ? refItems : []
    // Seed entries not yet in refItems
    const userIds = new Set(safe.map(r=>r.id))
    const merged  = [...SEED_REFS.filter(s=>!userIds.has(s.id)), ...safe]
    return merged
  }, [refItems])

  const toggleFavourite = useCallback(id => {
    const inUser = Array.isArray(refItems) ? refItems.find(r=>r.id===id) : null
    if (inUser) {
      setRefItems(rr=>rr.map(r=>r.id===id?{...r,favourite:!r.favourite}:r))
    } else {
      // Move seed to user store with favourite toggled
      const seed = SEED_REFS.find(s=>s.id===id)
      if (seed) setRefItems(rr=>[...(Array.isArray(rr)?rr:[]),{...seed,favourite:true}])
    }
    if (selected?.id===id) setSelected(prev=>prev?{...prev,favourite:!prev.favourite}:prev)
  }, [refItems, setRefItems, selected])

  const saveEdit = useCallback(form => {
    if (!form.name?.trim()) return
    const safe = Array.isArray(refItems) ? refItems : []
    if (form.id && safe.find(r=>r.id===form.id)) {
      setRefItems(rr=>rr.map(r=>r.id===form.id?form:r))
    } else if (form.id && SEED_REFS.find(s=>s.id===form.id)) {
      // Editing a seed entry — move to user store
      setRefItems(rr=>[...(Array.isArray(rr)?rr:[]).filter(r=>r.id!==form.id),form])
    } else {
      setRefItems(rr=>[...(Array.isArray(rr)?rr:[]),{...form,id:nextId(safe)}])
    }
    setModal(false); setEditing(null)
    if (selected?.id===form.id) setSelected(form)
  }, [refItems, setRefItems, selected])

  // Save multiple harvested cards at once
  const saveHarvested = useCallback(cards => {
    const safe = Array.isArray(refItems) ? refItems : []
    const next = nextId(safe)
    const stamped = cards.map((card, i) => ({ ...card, id: next + i }))
    setRefItems(rr => [...(Array.isArray(rr) ? rr : []), ...stamped])
    setHarvesting(false)
    setTab('browse')
  }, [refItems, setRefItems])

  // Save image fields to an existing item (seed or user)
  const saveImageToItem = useCallback((item, imageFields) => {
    const safe = Array.isArray(refItems) ? refItems : []
    const inUser = safe.find(r => r.id === item.id)
    if (inUser) {
      setRefItems(rr => rr.map(r => r.id === item.id ? { ...r, ...imageFields } : r))
    } else {
      // Seed entry — move to user store with image
      setRefItems(rr => [...(Array.isArray(rr) ? rr : []).filter(r => r.id !== item.id), { ...item, ...imageFields }])
    }
    setFindingImage(null)
  }, [refItems, setRefItems])

  // Auto-find images for all items without imageUrl
  const autoFindImages = useCallback(async () => {
    const missing = allItems.filter(i => !i.imageUrl)
    if (!missing.length) return
    setAutoFinding(true)
    let done = 0
    for (const item of missing) {
      setAutoMsg('Searching: ' + item.name + ' (' + (done+1) + '/' + missing.length + ')…')
      const q = buildSearchQuery(item)
      const result = await searchImages(q)
      if (result.images.length > 0) {
        const img = result.images[0]
        const { url, savedToCloud } = await uploadRefImage(img.url, item.name)
        const fields = { imageUrl:url, imageSourceUrl:img.sourceUrl||img.url, imageSavedToCloud:savedToCloud, imageSearchQuery:q, _referenceOnly:true }
        const safe = Array.isArray(refItems) ? refItems : []
        const inUser = safe.find(r => r.id === item.id)
        if (inUser) {
          setRefItems(rr => rr.map(r => r.id === item.id ? { ...r, ...fields } : r))
        } else {
          setRefItems(rr => [...(Array.isArray(rr) ? rr : []).filter(r => r.id !== item.id), { ...item, ...fields }])
        }
      }
      done++
    }
    setAutoFinding(false)
    setAutoMsg('Done — ' + done + ' items processed.')
    setTimeout(() => setAutoMsg(''), 4000)
  }, [allItems, refItems, setRefItems])

  const visible = useMemo(() => {
    const q = search.toLowerCase()
    return allItems.filter(item =>
      matchesFilter(item, filter) &&
      (catFilter==='All'||item.category===catFilter) &&
      (!showFavs||item.favourite) &&
      (!q||[item.name,item.altNames,item.category,(item.tags||[]).join(' '),item.notes].some(v=>(v||'').toLowerCase().includes(q)))
    )
  }, [allItems, filter, catFilter, search, showFavs])

  const favCount  = allItems.filter(i=>i.favourite).length
  const catCounts = useMemo(()=>{
    const m={}; allItems.forEach(i=>{m[i.category]=(m[i.category]||0)+1}); return m
  }, [allItems])

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Product Reference Library</div>
          <div className="page-subtitle">Botanical Inspiration · Design Knowledge · Internal Reference Only</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={()=>{setEditing({...BLANK_REF});setModal(true)}}>+ Add Reference</button>
      </div>

      {/* KPI strip */}
      <div style={{ background:'rgba(255,255,255,0.55)',backdropFilter:'blur(16px)',borderBottom:`1px solid rgba(210,200,184,0.5)`,padding:'14px 36px' }}>
        <div className="grid-4">
          {[
            { label:'Reference Entries', val:allItems.length,                  color:T.forest },
            { label:'Categories',        val:Object.keys(catCounts).length,     color:T.teal },
            { label:'Saved Favourites',  val:favCount,                          color:T.danger },
            { label:'User Added',        val:(Array.isArray(refItems)?refItems:[]).length, color:T.gold },
          ].map(k=>(
            <div key={k.label} className="stat-card">
              <div className="stat-label">{k.label}</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:24,color:k.color,lineHeight:1,marginTop:4 }}>{k.val}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="page-content">
        {/* Tab navigation */}
        {!harvesting && (
          <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
            {[
              {id:'browse',   label:'Browse Library'},
              {id:'favs',     label:`Favourites (${allItems.filter(i=>i.favourite).length})`},
            ].map(t=>(
              <button key={t.id} className={`bp-fbtn ${tab===t.id?'active':''}`} onClick={()=>{setTab(t.id);setShowFavs(t.id==='favs')}}>
                {t.label}
              </button>
            ))}
            <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
              {autoMsg && <span style={{ fontSize:11, color:T.green, fontWeight:600 }}>{autoMsg}</span>}
              {allItems.filter(i=>!i.imageUrl).length > 0 && (
                <button className="btn btn-outline btn-sm" style={{ color:T.gold, borderColor:T.gold }} onClick={autoFindImages} disabled={autoFinding}>
                  {autoFinding ? '⟳ Searching…' : ('⊕ Auto-find images (' + allItems.filter(i=>!i.imageUrl).length + ')')}
                </button>
              )}
              <button className="btn btn-primary btn-sm" onClick={()=>setHarvesting(true)}>
                ⟳ Harvest Reference
              </button>
            </div>
          </div>
        )}

        {/* Harvest mode */}
        {harvesting && (
          <HarvestMode
            allItems={allItems}
            onSave={saveHarvested}
            onClose={()=>setHarvesting(false)}
          />
        )}

        {harvesting ? null : (
        <>
        {/* Filter bar */}
        <div style={{ display:'flex',gap:10,marginBottom:16,flexWrap:'wrap',alignItems:'center' }}>
          <div style={{ position:'relative',flex:1,minWidth:200 }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search plants, categories, applications…" style={{paddingLeft:32}}/>
            <span style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:T.textLight,fontSize:14,pointerEvents:'none' }}>⊙</span>
          </div>
          <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={{fontSize:12,padding:'8px 10px',minWidth:160}}>
            <option value="All">All Categories</option>
            {CATEGORIES.map(c=><option key={c}>{c}</option>)}
          </select>
          <button
            className={`btn btn-sm ${showFavs?'btn-primary':'btn-outline'}`}
            onClick={()=>setShowFavs(f=>!f)}
          >
            ♥ Saved ({favCount})
          </button>
          <div style={{ fontSize:12,color:T.textMid }}>{visible.length} entries</div>
        </div>

        {/* Filter tag pills */}
        <div style={{ display:'flex',gap:5,marginBottom:20,flexWrap:'wrap' }}>
          {FILTER_TAGS.map(f=>(
            <button key={f} className={`bp-fbtn ${filter===f?'active':''}`} onClick={()=>setFilter(filter===f&&f!=='All'?'All':f)} style={{ fontSize:11 }}>
              {f}
            </button>
          ))}
        </div>

        {/* Grid */}
        {visible.length===0 ? (
          <div className="empty-st">
            <div className="empty-ic">🌿</div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:T.forest,marginBottom:8 }}>No entries match</div>
            <div style={{ fontSize:13,color:T.textMid }}>Try a different filter or add a new reference entry.</div>
          </div>
        ) : (
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:20,marginBottom:40 }}>
            {visible.map(item=>(
              <RefCard key={item.id} item={item} onClick={setSelected} onFavourite={toggleFavourite} onEdit={i=>{setEditing(i);setModal(true)}} onFindImage={setFindingImage} />
            ))}
          </div>
        )}

        </>
        )}
        {/* Disclaimer */}
        <div style={{ borderTop:`1px solid rgba(210,200,184,0.4)`,paddingTop:20,textAlign:'center',paddingBottom:20 }}>
          <div style={{ fontSize:11,fontWeight:700,color:T.gold,letterSpacing:'0.14em',textTransform:'uppercase',marginBottom:6 }}>Reference Purpose Only</div>
          <div style={{ fontSize:12,color:T.textLight,maxWidth:620,margin:'0 auto',lineHeight:1.8 }}>
            This section serves as a visual inspiration and botanical knowledge library. Images and references do not imply supplier relationships, stock availability, ownership, pricing or commercial affiliation. This module exists solely for education, design inspiration and market familiarisation.
          </div>
        </div>
      </div>

      {/* Detail lightbox */}
      {selected && (
        <RefDetail item={selected} onClose={()=>setSelected(null)} onFavourite={toggleFavourite} onEdit={i=>{setEditing(i);setModal(true);setSelected(null)}} />
      )}

      {/* Find Image modal */}
      {findingImage && (
        <FindImage item={findingImage} onSave={fields=>saveImageToItem(findingImage,fields)} onClose={()=>setFindingImage(null)} />
      )}

      {/* Edit modal */}
      {modal && editing && (
        <EditModal item={editing} onSave={saveEdit} onClose={()=>{setModal(false);setEditing(null)}} />
      )}
    </div>
  )
}
