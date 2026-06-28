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
function RefCard({ item, onClick, onFavourite, onEdit }) {
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
// HARVEST MODE — fetch URL, AI-extract reference cards, approve & save
// ═════════════════════════════════════════════════════════════════════════════

// ── Image upload: fetch external image → upload to Supabase ──────────────────
async function uploadImageFromUrl(imageUrl, name) {
  try {
    // Use a CORS proxy approach via our own API to avoid direct CORS block
    const proxyUrl = '/api/extract'
    const fd = new FormData()
    fd.append('extractionType', 'fetch_image')
    fd.append('imageUrl', imageUrl)
    const res = await fetch(proxyUrl, { method:'POST', body:fd })
    if (res.ok) {
      const blob = await res.blob()
      const ext  = imageUrl.split('.').pop().split('?')[0].toLowerCase() || 'jpg'
      const file = new File([blob], (name||'reference').replace(/\s+/g,'-') + '.' + ext, { type:blob.type || 'image/jpeg' })
      if (SUPABASE_CONFIGURED) {
        const uploaded = await uploadDocument(file, { category:'Reference Library', notes:'Harvested reference image' })
        return uploaded?.public_url || uploaded?.storage_path ? uploaded : null
      }
    }
  } catch {}
  return null
}

// ── AI harvest extraction via /api/extract ────────────────────────────────────
async function harvestWithAI(url, pageText) {
  const fd = new FormData()
  fd.append('extractionType', 'reference_harvest')
  fd.append('rawText', (pageText || '').slice(0, 10000))
  fd.append('sourceUrl', url)
  fd.append('prompt',
    'You are extracting VISUAL REFERENCE information from a webpage for Botanica Living Group, an artificial greenery company in South Africa.\n\n' +
    'This is for INTERNAL INSPIRATION ONLY — not inventory, not pricing, not resale.\n\n' +
    'Extract one or more reference cards from this page. Return ONLY a JSON array. No markdown, no preamble.\n\n' +
    'Each object must have these fields (empty string if not found):\n' +
    '{\n' +
    '  "title": "",\n' +
    '  "commonName": "",\n' +
    '  "altNames": "",\n' +
    '  "category": "Indoor Trees|Olive Trees|Fiddle Leaf Figs|Kentia Palms|Areca Palms|Bird of Paradise|Monstera|Snake Plants|Succulents|Flowering Plants|Orchids|Green Walls|Topiaries|Large Statement Trees|Healthcare Styling|Hospitality Styling|Office Styling|Other",\n' +
    '  "style": "",\n' +
    '  "height": "",\n' +
    '  "applications": "",\n' +
    '  "indoor": true,\n' +
    '  "outdoor": false,\n' +
    '  "imageUrl": "",\n' +
    '  "tags": ["tag1", "tag2"],\n' +
    '  "notes": "",\n' +
    '  "qualityScore": "High|Medium|Low"\n' +
    '}\n\n' +
    'DO NOT include: price, stock, add-to-cart, commercial terms, supplier name.\n\n' +
    'PAGE CONTENT:\n' + (pageText || '').slice(0, 8000)
  )
  const res = await fetch('/api/extract', { method:'POST', body:fd })
  if (!res.ok) throw new Error('API ' + res.status)
  const data = await res.json()
  const text = data.text || (Array.isArray(data.content) ? data.content.map(b=>b.text||'').join('') : '')
  const clean = text.replace(/```json|```/g,'').trim()
  const parsed = JSON.parse(clean)
  return Array.isArray(parsed) ? parsed : [parsed]
}

// ── Heuristic harvest (no AI) ─────────────────────────────────────────────────
function harvestHeuristic(url, pageText) {
  const domain = (() => { try { return new URL(url).hostname.replace('www.','') } catch { return url } })()
  const titleM = pageText.match(/<title[^>]*>([^<]+)<\/title>/i)
  const h1M    = pageText.match(/<h1[^>]*>([^<]+)<\/h1>/i)
  const imgM   = pageText.match(/https?:[^"' ]+\.(?:jpg|jpeg|png|webp)/gi) || []
  const name   = (h1M?.[1]||titleM?.[1]||domain).replace(/<[^>]*>/g,'').trim().slice(0,80)
  const kws    = (name + ' ' + pageText.slice(0,2000)).toLowerCase()
  const cat    = kws.includes('olive')?'Olive Trees':kws.includes('fiddle')?'Fiddle Leaf Figs':kws.includes('kentia')?'Kentia Palms':kws.includes('palm')?'Areca Palms':kws.includes('wall')||kws.includes('hedge')?'Green Walls':kws.includes('succul')?'Succulents':kws.includes('orchi')?'Orchids':kws.includes('monstera')?'Monstera':kws.includes('snake')||kws.includes('sansev')?'Snake Plants':kws.includes('bird of paradise')?'Bird of Paradise':kws.includes('topiar')?'Topiaries':'Indoor Trees'
  const tags   = []
  if (kws.includes('luxury')||kws.includes('premium')) tags.push('Luxury','Premium')
  if (kws.includes('hotel')||kws.includes('hospitality')) tags.push('Hospitality')
  if (kws.includes('office')||kws.includes('corporate')) tags.push('Corporate')
  if (kws.includes('reception')) tags.push('Reception')
  if (kws.includes('healthcare')||kws.includes('hospital')) tags.push('Healthcare')
  const sizeM = (name + pageText.slice(0,3000)).match(/(\d{2,3})\s*cm/i)
  return [{
    title: name, commonName: name, altNames: '', category: cat, style: '',
    height: sizeM ? sizeM[1] + 'cm' : '', applications: '', indoor: true, outdoor: false,
    imageUrl: imgM[0] || '', tags, notes: 'Heuristic extraction — review and edit.',
    qualityScore: 'Medium',
  }]
}

// ── Duplicate check ───────────────────────────────────────────────────────────
function findDuplicate(draft, existing) {
  const norm = s => (s||'').toLowerCase().replace(/\s+/g,' ').trim()
  return existing.find(e =>
    (norm(e.name)===norm(draft.title) && norm(e.name).length > 3) ||
    (e.imageUrl && e.imageUrl===draft.imageUrl) ||
    (e._sourceUrl && e._sourceUrl===draft._sourceUrl)
  )
}

// ── HarvestMode component ─────────────────────────────────────────────────────
function HarvestMode({ allItems, onSave, onClose }) {
  const [mode,      setMode]      = useState('single')  // single | category | manual
  const [url,       setUrl]       = useState('')
  const [status,    setStatus]    = useState('idle')    // idle | fetching | extracted | saving | done | error
  const [msg,       setMsg]       = useState('')
  const [drafts,    setDrafts]    = useState([])        // extracted draft cards
  const [approved,  setApproved]  = useState(new Set()) // ids of approved drafts
  const [saving,    setSaving]    = useState(false)

  // Manual fallback state
  const [manName,   setManName]   = useState('')
  const [manImg,    setManImg]    = useState('')
  const [manCat,    setManCat]    = useState('Indoor Trees')
  const [manNotes,  setManNotes]  = useState('')

  const domain = (() => { try { return new URL(url).hostname.replace('www.','') } catch { return '' } })()

  // ── Fetch and extract ───────────────────────────────────────────────────────
  const analyse = async () => {
    if (!url.trim()) return
    setStatus('fetching'); setMsg('Fetching page…'); setDrafts([]); setApproved(new Set())
    try {
      // Fetch via our API proxy to avoid CORS
      const fd = new FormData()
      fd.append('extractionType', 'fetch_url')
      fd.append('targetUrl', url)
      const proxyRes = await fetch('/api/extract', { method:'POST', body:fd })
      let pageText = ''
      if (proxyRes.ok) {
        const data = await proxyRes.json()
        pageText = data.html || data.text || ''
      }
      // If proxy failed, we only have the URL to work with
      if (!pageText) setMsg('Page could not be fetched — using URL-based analysis…')

      setMsg(OCR_AVAILABLE ? 'Running AI analysis…' : 'Analysing (heuristic mode)…')
      let extracted = []
      if (OCR_AVAILABLE && (pageText.length > 50 || url)) {
        try { extracted = await harvestWithAI(url, pageText) } catch { extracted = [] }
      }
      if (!extracted.length) {
        extracted = harvestHeuristic(url, pageText)
      }

      // Stamp with metadata, generate local ids, duplicate check
      const stamped = extracted.map((d,i) => {
        const dup = findDuplicate(d, allItems)
        return {
          ...d, _draftId: i + 1, _sourceUrl: url, _sourceDomain: domain,
          _harvestDate: new Date().toISOString().split('T')[0],
          _duplicate: dup ? dup.name : null,
          approved: false,
        }
      })
      setDrafts(stamped)
      setStatus('extracted')
      setMsg('')
    } catch (err) {
      setStatus('error')
      setMsg('Could not harvest: ' + err.message)
    }
  }

  // ── Approve and save ─────────────────────────────────────────────────────────
  const saveApproved = async () => {
    const toSave = drafts.filter(d => approved.has(d._draftId))
    if (!toSave.length) return
    setSaving(true); setMsg('Saving ' + toSave.length + ' card(s)…')

    const saved = []
    for (const draft of toSave) {
      let storedImageUrl = draft.imageUrl
      // Try to upload image to Supabase if it's an external URL
      if (draft.imageUrl && draft.imageUrl.startsWith('http') && SUPABASE_CONFIGURED) {
        setMsg('Uploading image for: ' + (draft.title||'card') + '…')
        const uploaded = await uploadImageFromUrl(draft.imageUrl, draft.title)
        if (uploaded?.public_url) storedImageUrl = uploaded.public_url
        else if (uploaded?.storage_path) storedImageUrl = draft.imageUrl // keep external if upload failed
      }
      const card = {
        ...BLANK_REF,
        name:          draft.title       || draft.commonName || '',
        altNames:      draft.altNames    || '',
        category:      draft.category    || 'Indoor Trees',
        style:         draft.style       || '',
        height:        draft.height      || '',
        applications:  draft.applications|| '',
        indoor:        draft.indoor      !== false,
        outdoor:       !!draft.outdoor,
        tags:          Array.isArray(draft.tags) ? draft.tags : [],
        notes:         draft.notes       || '',
        imageUrl:      storedImageUrl    || '',
        _sourceUrl:    draft._sourceUrl  || url,
        _sourceDomain: draft._sourceDomain || domain,
        _originalImgUrl: draft.imageUrl || '',
        _harvestDate:  draft._harvestDate || new Date().toISOString().split('T')[0],
        _referenceOnly: true,
        favourite:     false,
      }
      saved.push(card)
    }
    onSave(saved)
    setSaving(false)
    setStatus('done')
    setMsg(saved.length + ' reference card(s) saved to library.')
  }

  // ── Manual save ──────────────────────────────────────────────────────────────
  const saveManual = () => {
    if (!manName.trim()) return
    const card = {
      ...BLANK_REF,
      name:          manName,
      category:      manCat,
      imageUrl:      manImg,
      notes:         manNotes,
      _sourceUrl:    url || '',
      _sourceDomain: domain,
      _harvestDate:  new Date().toISOString().split('T')[0],
      _referenceOnly: true,
    }
    onSave([card])
    setStatus('done')
    setMsg('Manual reference saved to library.')
  }

  const toggleApprove = id => setApproved(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
  const approveAll   = () => setApproved(new Set(drafts.map(d=>d._draftId)))
  const unapproveAll = () => setApproved(new Set())

  return (
    <div style={{ maxWidth:800, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, color:T.forest, marginBottom:4 }}>Harvest Reference</div>
          <div style={{ fontSize:12, color:T.textMid }}>
            Paste a product or category URL. AI extracts reference cards for your inspiration library.
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>← Back to Library</button>
      </div>

      {/* Legal disclaimer */}
      <div style={{ padding:'10px 16px', background:'rgba(184,151,90,0.08)', border:`1px solid rgba(184,151,90,0.2)`, borderRadius:10, fontSize:11, color:'#7A5A20', marginBottom:20, lineHeight:1.7 }}>
        <strong>Internal Reference Only</strong> — Harvested content is saved for inspiration, market study and product education. No pricing, stock or supplier relationships are stored. Images are uploaded to Botanica Living cloud storage for internal use only.
      </div>

      {/* Mode selector */}
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {[['single','Single Product'],['category','Category Page'],['manual','Manual Entry']].map(([id,label])=>(
          <button key={id} className={`bp-fbtn ${mode===id?'active':''}`} onClick={()=>{setMode(id);setStatus('idle');setDrafts([]);setMsg('')}}>
            {label}
          </button>
        ))}
      </div>

      {mode !== 'manual' ? (
        <>
          {/* URL input */}
          <div style={{ display:'flex', gap:10, marginBottom:16 }}>
            <input
              value={url} onChange={e=>setUrl(e.target.value)}
              placeholder="https://distinctivespaces.co.za/product/..."
              style={{ flex:1 }}
              onKeyDown={e=>e.key==='Enter'&&analyse()}
            />
            <button className="btn btn-primary" onClick={analyse} disabled={!url||status==='fetching'}>
              {status==='fetching' ? 'Fetching…' : 'Analyse URL'}
            </button>
          </div>

          {msg && (
            <div style={{ padding:'10px 14px', background:status==='error'?T.redPale:T.tealPale, border:`1px solid ${status==='error'?'rgba(185,28,28,0.2)':T.tealGlow}`, borderRadius:10, fontSize:12, color:status==='error'?T.danger:T.teal, marginBottom:16 }}>
              {status==='fetching' || status==='extracted' ? '⟳ ' : status==='error' ? '✕ ' : '✓ '}{msg}
            </div>
          )}

          {/* Extracted drafts */}
          {drafts.length > 0 && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <div style={{ fontSize:13, fontWeight:600, color:T.forest }}>
                  {drafts.length} card{drafts.length!==1?'s':''} extracted from {domain}
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn btn-outline btn-sm" onClick={approved.size===drafts.length?unapproveAll:approveAll}>
                    {approved.size===drafts.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={saveApproved} disabled={approved.size===0||saving}>
                    {saving ? 'Saving…' : `Save ${approved.size} Selected →`}
                  </button>
                </div>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {drafts.map(d => (
                  <div key={d._draftId} style={{
                    background:'#fff', border:`1.5px solid ${approved.has(d._draftId)?T.gold:'rgba(210,200,184,0.5)'}`,
                    borderRadius:14, overflow:'hidden', display:'grid', gridTemplateColumns:'160px 1fr',
                    boxShadow: approved.has(d._draftId) ? '0 4px 16px rgba(184,151,90,0.15)' : '0 1px 4px rgba(0,0,0,0.06)',
                  }}>
                    {/* Image preview */}
                    <div style={{ background:'rgba(228,221,208,0.4)', display:'flex', alignItems:'center', justifyContent:'center', minHeight:120 }}>
                      {d.imageUrl ? (
                        <img src={d.imageUrl} alt={d.title} style={{ width:'100%', height:'100%', objectFit:'cover', minHeight:120 }}
                          onError={e=>{ e.target.style.display='none' }}/>
                      ) : (
                        <div style={{ fontSize:40 }}>🌿</div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ padding:'14px 16px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, color:T.forest, marginBottom:2 }}>{d.title||'(untitled)'}</div>
                          <div style={{ fontSize:11, color:T.gold, fontWeight:600 }}>{d.category}</div>
                        </div>
                        {/* Approve checkbox */}
                        <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', flexShrink:0, marginLeft:12 }}>
                          <input type="checkbox" checked={approved.has(d._draftId)} onChange={()=>toggleApprove(d._draftId)}
                            style={{ accentColor:T.gold, width:18, height:18 }}/>
                          <span style={{ fontSize:11, fontWeight:700, color:approved.has(d._draftId)?T.gold:T.textLight }}>
                            {approved.has(d._draftId)?'Approved':'Approve'}
                          </span>
                        </label>
                      </div>

                      {/* Metadata */}
                      <div style={{ fontSize:11, color:T.textMid, display:'flex', gap:10, flexWrap:'wrap', marginBottom:8 }}>
                        {d.height && <span>↕ {d.height}</span>}
                        {d.indoor && <span>Indoor</span>}
                        {d.outdoor && <span>Outdoor</span>}
                        <span style={{ color:d.qualityScore==='High'?T.green:d.qualityScore==='Medium'?T.gold:T.textLight, fontWeight:600 }}>
                          {d.qualityScore} relevance
                        </span>
                      </div>

                      {/* Tags */}
                      {d.tags?.length > 0 && (
                        <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:8 }}>
                          {d.tags.slice(0,5).map(t=>(
                            <span key={t} style={{ fontSize:9, padding:'2px 6px', borderRadius:20, background:'rgba(210,200,184,0.4)', color:T.textMid }}>{t}</span>
                          ))}
                        </div>
                      )}

                      {/* Duplicate warning */}
                      {d._duplicate && (
                        <div style={{ fontSize:11, color:T.gold, padding:'4px 8px', background:T.goldPale, borderRadius:6, marginBottom:6 }}>
                          ⚑ Similar entry exists: "{d._duplicate}"
                        </div>
                      )}

                      {/* Source */}
                      <div style={{ fontSize:10, color:T.textLight, marginTop:4 }}>
                        Source: {d._sourceDomain} · {d._harvestDate}
                        <span style={{ marginLeft:8, padding:'1px 6px', background:'rgba(161,161,170,0.12)', borderRadius:20, fontWeight:600 }}>Reference Only</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {status === 'done' && (
                <div style={{ marginTop:16, padding:'12px 16px', background:T.greenPale, border:`1px solid rgba(21,128,61,0.2)`, borderRadius:10, fontSize:13, color:T.green, fontWeight:600 }}>
                  ✓ {msg}
                </div>
              )}
            </div>
          )}

          {/* Harvest failed — manual fallback */}
          {status==='error' && (
            <div style={{ marginTop:20, padding:18, background:'rgba(228,221,208,0.3)', borderRadius:12, border:`1px solid rgba(210,200,184,0.5)` }}>
              <div style={{ fontSize:13, fontWeight:600, color:T.forest, marginBottom:12 }}>Manual fallback — paste image URL directly</div>
              <div className="form-grid">
                <div className="form-field full"><label>Product Name</label><input value={manName} onChange={e=>setManName(e.target.value)}/></div>
                <div className="form-field full"><label>Image URL</label><input value={manImg} onChange={e=>setManImg(e.target.value)} placeholder="https://…"/></div>
                <div className="form-field"><label>Category</label><select value={manCat} onChange={e=>setManCat(e.target.value)}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
                <div className="form-field"><label>Notes</label><input value={manNotes} onChange={e=>setManNotes(e.target.value)}/></div>
              </div>
              <button className="btn btn-primary btn-sm" style={{ marginTop:12 }} onClick={saveManual}>Save Manual Reference</button>
            </div>
          )}
        </>
      ) : (
        /* Manual entry mode */
        <div style={{ padding:20, background:'rgba(228,221,208,0.3)', borderRadius:12, border:`1px solid rgba(210,200,184,0.5)` }}>
          <div style={{ fontSize:13, color:T.textMid, marginBottom:16, lineHeight:1.7 }}>
            Paste a product name and image URL manually. Useful when automatic harvesting is blocked.
          </div>
          <div className="form-grid">
            <div className="form-field full"><label>Product Name *</label><input value={manName} onChange={e=>setManName(e.target.value)} placeholder="e.g. Artificial Olive Tree 240cm"/></div>
            <div className="form-field full"><label>Image URL</label><input value={manImg} onChange={e=>setManImg(e.target.value)} placeholder="https://…"/></div>
            <div className="form-field"><label>Category</label><select value={manCat} onChange={e=>setManCat(e.target.value)}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
            <div className="form-field"><label>Source URL (optional)</label><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="Original page URL"/></div>
            <div className="form-field full"><label>Notes</label><textarea value={manNotes} onChange={e=>setManNotes(e.target.value)} placeholder="Visual notes, style, typical use…"/></div>
          </div>
          {manImg && <img src={manImg} alt="preview" style={{ maxWidth:'100%', maxHeight:200, objectFit:'contain', borderRadius:8, marginTop:12 }} onError={e=>e.target.style.display='none'}/>}
          <button className="btn btn-primary" style={{ marginTop:14 }} onClick={saveManual} disabled={!manName.trim()}>
            Save to Reference Library
          </button>
          {status==='done' && <div style={{ marginTop:10, fontSize:12, color:T.green, fontWeight:600 }}>✓ {msg}</div>}
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
  const [harvesting, setHarvesting] = useState(false)

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
            <button
              className="btn btn-primary btn-sm"
              style={{ marginLeft:'auto' }}
              onClick={()=>setHarvesting(true)}
            >
              ⟳ Harvest Reference
            </button>
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
              <RefCard key={item.id} item={item} onClick={setSelected} onFavourite={toggleFavourite} onEdit={i=>{setEditing(i);setModal(true)}} />
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

      {/* Edit modal */}
      {modal && editing && (
        <EditModal item={editing} onSave={saveEdit} onClose={()=>{setModal(false);setEditing(null)}} />
      )}
    </div>
  )
}
