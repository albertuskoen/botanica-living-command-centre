// ProductRefLibrary.jsx — v1.0
// Internal botanical inspiration and knowledge library.
// Pinterest + Encyclopedia + Moodboard for Botanica Living.
// Completely separate from Supplier Zone, inventory and pricing.
import { useState, useMemo, useRef, useCallback } from 'react'
import { T } from '../utils/tokens.js'
import { nextId, safeStr, truncate } from '../utils/format.js'
import Modal from '../components/Modal.jsx'

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
