// ── SEED DATA ─────────────────────────────────────────────────────────────────

export const INIT_SUPPLIERS = [
  { id:1, name:'Frank / Dongyi', contact:'Frank Chen', country:'China', email:'frank@dongyi.cn', whatsapp:'+86 138 0000 1234', terms:'FOB', notes:'Primary supplier. Fast samples. Excellent quality on Olive & Ficus range.', status:'Active' },
  { id:2, name:'Campion / Trustfloral', contact:'Sarah Campion', country:'China', email:'sarah@trustfloral.com', whatsapp:'+86 755 0000 5678', terms:'EXW', notes:'Specialist in hanging greenery and boxwood panels. Good for design range.', status:'Active' },
]

export const INIT_PRODUCTS = [
  { id:1, name:'Premium Olive Tree 180cm', category:'Trees', supplier:'Frank / Dongyi', sku:'DON-OLV-180', height:'180cm', moq:50, exwPrice:28, fobPrice:31, cifPrice:34, sampleCost:85, leadTime:'45 days', assembly:true,  foundersCollection:true,  sampleStatus:'Received' },
  { id:2, name:'Ficus Tree 180cm',         category:'Trees', supplier:'Frank / Dongyi', sku:'DON-FIC-180', height:'180cm', moq:50, exwPrice:24, fobPrice:27, cifPrice:30, sampleCost:75, leadTime:'45 days', assembly:true,  foundersCollection:true,  sampleStatus:'Received' },
  { id:3, name:'Palm Tree 180cm',          category:'Trees', supplier:'Frank / Dongyi', sku:'DON-PLM-180', height:'180cm', moq:50, exwPrice:22, fobPrice:25, cifPrice:28, sampleCost:70, leadTime:'50 days', assembly:true,  foundersCollection:false, sampleStatus:'Ordered'  },
  { id:4, name:'Designer Pot Plant',       category:'Pot Plants', supplier:'Frank / Dongyi', sku:'DON-POT-DES', height:'60cm', moq:100, exwPrice:12, fobPrice:14, cifPrice:16, sampleCost:45, leadTime:'35 days', assembly:false, foundersCollection:true,  sampleStatus:'Received' },
  { id:5, name:'Hanging Greenery',         category:'Hanging', supplier:'Campion / Trustfloral', sku:'TRF-HNG-001', height:'90cm drop', moq:200, exwPrice:6, fobPrice:7.5, cifPrice:8.5, sampleCost:30, leadTime:'30 days', assembly:false, foundersCollection:false, sampleStatus:'Pending' },
  { id:6, name:'Boxwood Panel 60×60',      category:'Panels', supplier:'Campion / Trustfloral', sku:'TRF-BOX-6060', height:'60×60cm', moq:100, exwPrice:18, fobPrice:20.5, cifPrice:22, sampleCost:55, leadTime:'40 days', assembly:false, foundersCollection:true,  sampleStatus:'Received' },
]

export const INIT_FINANCE = []

export const INIT_PROGRESS = [
  {
    id: 1,
    section: 'Supplier Development',
    tasks: [
      { id:101, name:'Schedule Dongyi video call — MOQ flexibility discussion', priority:'High',     status:'Not Started', dueDate:'', notes:'Discuss first order quantities and lead time for Olive and Ficus range.' },
      { id:102, name:'Request updated 2026 catalog from Frank / Dongyi',        priority:'Medium',   status:'Not Started', dueDate:'', notes:'New season pricing and new SKUs.' },
      { id:103, name:'Sample quality validation — Olive Tree 180cm',             priority:'High',     status:'In Progress', dueDate:'', notes:'Received. Checking stems, pot, foliage density.' },
      { id:104, name:'Sample quality validation — Ficus Tree 180cm',             priority:'High',     status:'In Progress', dueDate:'', notes:'Received. Comparing to competitor benchmarks.' },
      { id:105, name:'Negotiate payment terms for first container',              priority:'Critical', status:'Not Started', dueDate:'', notes:'Target: 30% deposit, 70% before shipping.' },
    ],
  },
  {
    id: 2,
    section: 'Compliance & Legal',
    tasks: [
      { id:201, name:'SARS eFiling — complete importer registration',            priority:'Critical', status:'In Progress', dueDate:'', notes:'Required before first shipment. ITAC registration also needed.' },
      { id:202, name:'Open Botanica Living business bank account',               priority:'Critical', status:'Not Started', dueDate:'', notes:'FNB Business or Investec. Waiting on registration documents.' },
      { id:203, name:'Register for VAT',                                         priority:'High',     status:'Not Started', dueDate:'', notes:'Required once turnover threshold is reached or proactively.' },
      { id:204, name:'Confirm customs tariff code for artificial greenery',      priority:'High',     status:'Not Started', dueDate:'', notes:'HS code determines import duty rate. Get ruling from SARS.' },
    ],
  },
  {
    id: 3,
    section: 'Retail Channel — Checkers Hyper',
    tasks: [
      { id:301, name:'Build Checkers Hyper pitch deck',                          priority:'Critical', status:'Not Started', dueDate:'', notes:'Financial model + visual concept + pilot store proposal.' },
      { id:302, name:'Financial model for Checkers pilot (unit economics)',      priority:'Critical', status:'Not Started', dueDate:'', notes:'Cost per unit, retail price, margin, sell-through rate, reorder model.' },
      { id:303, name:'Identify Non-Foods category buyer contact at Shoprite HQ', priority:'High',     status:'Not Started', dueDate:'', notes:'Brackenfell HQ. May need LinkedIn outreach or industry contact.' },
      { id:304, name:'Prepare product selection for Checkers range',             priority:'High',     status:'Not Started', dueDate:'', notes:'Curate 6-10 SKUs appropriate for mass retail. Simplified packaging.' },
    ],
  },
  {
    id: 4,
    section: 'Commercial Client Outreach',
    tasks: [
      { id:401, name:'Research Growthpoint facilities management contact',       priority:'High',     status:'Not Started', dueDate:'', notes:'Target: Property Management or Facilities department.' },
      { id:402, name:'Prepare commercial B2B pricing proposal',                  priority:'High',     status:'Not Started', dueDate:'', notes:'Volume pricing tiers, annual replacement pricing, installation options.' },
      { id:403, name:'Create healthcare-specific product selection',              priority:'Medium',   status:'Not Started', dueDate:'', notes:'Infection-control appropriate. No soil, no water, no pollen.' },
      { id:404, name:'Reach out to Village N Life — hospitality greenery brief', priority:'Medium',   status:'Not Started', dueDate:'', notes:'Premium boutique hotel group. Strong brand alignment.' },
    ],
  },
  {
    id: 5,
    section: 'Platform Development',
    tasks: [
      { id:501, name:'Client Database — populate contact details for all 13 accounts', priority:'High',   status:'Completed', dueDate:'', notes:'V1 dataset loaded. Phone, email, HQ address for all strategic accounts.' },
      { id:502, name:'Finance Centre — enter all startup expenses',              priority:'Critical', status:'In Progress', dueDate:'', notes:'All business costs since registration must be captured for tax purposes.' },
      { id:503, name:'Invoicing module — create first quote template',           priority:'Medium',   status:'Not Started', dueDate:'', notes:'Standard Botanica Living quote format with payment terms.' },
      { id:504, name:'Supplier Zone — add Frank Dongyi full profile',            priority:'Medium',   status:'Not Started', dueDate:'', notes:'Full contact details, payment terms, lead times.' },
    ],
  },
]
export const INIT_TASKS = [
  { id:1, name:'Schedule Dongyi video call', priority:'High', status:'Not Started', dueDate:'', notes:'Discuss MOQ flexibility on first order.', category:'Suppliers' },
  { id:2, name:'Complete importer registration on SARS eFiling', priority:'Critical', status:'In Progress', dueDate:'', notes:'Required before first shipment.', category:'Compliance' },
  { id:3, name:'Open business bank account', priority:'Critical', status:'Not Started', dueDate:'', notes:'Waiting on name change to complete.', category:'Finance' },
  { id:4, name:'Build Checkers Hyper pitch deck', priority:'Critical', status:'Not Started', dueDate:'', notes:'Financial model + visual concept + pilot proposal.', category:'Sales' },
]

export const INIT_DOCUMENTS = []

export const MILESTONES_COMPLETED = [
  { label:'Company Registered', date:'2026' },
  { label:'SARS Registered', date:'2026' },
  { label:'Domain Registered', date:'2026' },
  { label:'Business Email Active', date:'2026' },
  { label:'Command Centre Live', date:'2026' },
  { label:'Name Change Completed', date:'2026' },
]

export const MILESTONES_UPCOMING = [
  { label:'Importer Registration', status:'In Progress' },
  { label:'First Sample Order', status:'Not Started' },
  { label:'First Sample Received', status:'Not Started' },
  { label:'First Supplier Agreement', status:'Not Started' },
  { label:'First Sale', status:'Not Started' },
  { label:'First Container', status:'Not Started' },
]

export const NAV = [
  // Core
  { id:'dashboard',    icon:'⬡', label:'Dashboard',         group:'Core' },
  // Suppliers
  { id:'supplierzone', icon:'◎', label:'Supplier Zone',     group:'Suppliers' },
  { id:'products',     icon:'❧', label:'Product Database',  group:'Suppliers' },
  // Clients
  { id:'clients',      icon:'◉', label:'Client Database',   group:'Clients' },
  // Finance
  { id:'financialhub', icon:'⊞', label:'Invoicing',         group:'Finance' },
  { id:'finance',      icon:'₩', label:'Finance Centre',    group:'Finance' },
  // Operations
  { id:'progress',     icon:'▸', label:'Business Progress', group:'Operations' },
  { id:'actions',      icon:'✓', label:'Action Centre',     group:'Operations' },
  // Knowledge
  { id:'documents',    icon:'◻', label:'Documents',         group:'Knowledge' },
  { id:'strategy',     icon:'⊟', label:'Strategy',          group:'Knowledge' },
  // System
  { id:'settings',     icon:'⚙', label:'Settings',          group:'System' },
]

// ── CLIENT DATABASE ────────────────────────────────────────────────────────────
// Preloaded prospects. Scalable to hundreds of organisations.
export const CLIENT_SECTORS = [
  'Healthcare', 'Education', 'Property', 'Hospitality',
  'Retail', 'Corporate', 'Government', 'Designers & Architects',
  'Developers', 'Other',
]

export const CLIENT_TYPES = [
  'Strategic Account', 'Prospect', 'Existing Client',
  'Designer', 'Developer', 'Hospitality', 'Government', 'Corporate', 'Other',
]

export const CLIENT_STATUSES = [
  'Not Contacted', 'Researching', 'First Contact Made',
  'Meeting Scheduled', 'Proposal Sent', 'Active Client', 'On Hold', 'Not Interested',
]

export const CLIENT_PRIORITIES = ['Critical', 'High', 'Medium', 'Low']

export const INIT_CLIENTS = [

  // ── HEALTHCARE ──────────────────────────────────────────────────────────────
  {
    id:101, company:'Mediclinic Southern Africa', sector:'Healthcare', type:'Strategic Account',
    priority:'Critical', status:'Not Contacted',
    website:'https://www.mediclinic.co.za',
    phone:'+27 21 809 6500', altPhone:'+27 86 532 2557', whatsapp:'087 240 6367',
    email:'engage@mediclinic.co.za', altEmail:'help@mediclinic.co.za',
    hqAddress:'25 Du Toit Street, Stellenbosch, 7600, South Africa', postalAddress:'',
    contactPerson:'', position:'', department:'',
    targetDepartments:'Facilities, Procurement, Property Development, Projects, Corporate Services',
    notes:'Large private hospital group with multiple facilities across SA. High volume opportunity for reception, waiting area and corridor greenery. Low maintenance requirement is a key advantage over live plants in clinical environments.',
    followUpDate:'',
  },
  {
    id:102, company:'Netcare Group', sector:'Healthcare', type:'Strategic Account',
    priority:'Critical', status:'Not Contacted',
    website:'https://www.netcare.co.za',
    phone:'0860 638 2273', altPhone:'', whatsapp:'',
    email:'customer.service@netcare.co.za', altEmail:'',
    hqAddress:'76 Maude Street, Sandton, 2196, South Africa', postalAddress:'',
    contactPerson:'', position:'', department:'',
    targetDepartments:'Facilities, Procurement, Property Development, Capital Projects, Workplace Experience',
    notes:'Second largest private hospital operator in SA. National footprint across all major cities. Facilities management team controls greening budget. Annual replacement cycles create recurring revenue.',
    followUpDate:'',
  },
  {
    id:103, company:'Life Healthcare', sector:'Healthcare', type:'Strategic Account',
    priority:'High', status:'Not Contacted',
    website:'https://www.lifehealthcare.co.za',
    phone:'+27 11 219 9000', altPhone:'+27 11 219 9111', whatsapp:'',
    email:'customer.service@lifehealthcare.co.za', altEmail:'',
    hqAddress:'Oxford Parks, 203 Oxford Road, Dunkeld, Johannesburg, South Africa', postalAddress:'',
    contactPerson:'', position:'', department:'',
    targetDepartments:'Facilities Management, Procurement, Property Projects, Capital Projects',
    notes:'Third major private hospital group. Strong presence in Gauteng and Western Cape. Capital projects pipeline includes new hospital builds — early engagement is ideal.',
    followUpDate:'',
  },

  // ── EDUCATION ───────────────────────────────────────────────────────────────
  {
    id:201, company:'Curro Holdings', sector:'Education', type:'Strategic Account',
    priority:'High', status:'Not Contacted',
    website:'https://www.curro.co.za',
    phone:'+27 21 979 1204', altPhone:'+27 21 979 1205', whatsapp:'',
    email:'engage@curro.co.za', altEmail:'InstitutionalInvestors@curro.co.za',
    hqAddress:'9 Parc du Cap, Mispel Street, Bellville, Cape Town, South Africa', postalAddress:'',
    contactPerson:'', position:'', department:'',
    targetDepartments:'Facilities, Procurement, New Campus Development',
    notes:'Private school group with 60+ campuses nationally. Reception areas, admin blocks and common areas across the network. New campus development pipeline creates ongoing opportunity.',
    followUpDate:'',
  },
  {
    id:202, company:'ADvTECH Group', sector:'Education', type:'Strategic Account',
    priority:'High', status:'Not Contacted',
    website:'https://www.groupadvtech.com',
    phone:'+27 11 676 8000', altPhone:'', whatsapp:'',
    email:'info@groupadvtech.com', altEmail:'',
    hqAddress:'Inanda Greens Office Park, Sandton, Johannesburg, South Africa', postalAddress:'',
    contactPerson:'', position:'', department:'',
    targetDepartments:'Facilities, Procurement, Property, Operations',
    notes:'Owns Varsity College, Rosebank College, Crawford Schools and The Independent Institute of Education. Multiple campuses with corporate-standard reception and communal areas.',
    followUpDate:'',
  },

  // ── PROPERTY ────────────────────────────────────────────────────────────────
  {
    id:301, company:'Growthpoint Properties', sector:'Property', type:'Strategic Account',
    priority:'Critical', status:'Not Contacted',
    website:'https://www.growthpoint.co.za',
    phone:'+27 11 944 6000', altPhone:'+27 21 673 8400', whatsapp:'',
    email:'info@growthpoint.co.za', altEmail:'',
    hqAddress:'The Place, 1 Sandton Drive, Sandton, Johannesburg, South Africa', postalAddress:'',
    contactPerson:'', position:'', department:'Property Management',
    targetDepartments:'Property Management, Developments, Facilities',
    notes:'Largest SA REIT. Owns major office parks, retail centres and industrial properties. Facilities management team controls interior greening for all managed buildings. Durban office: +27 31 584 5100. Annual or biennial replacement cycles create significant recurring revenue.',
    followUpDate:'',
  },
  {
    id:302, company:'Redefine Properties', sector:'Property', type:'Strategic Account',
    priority:'High', status:'Not Contacted',
    website:'https://www.redefine.co.za',
    phone:'+27 11 283 0000', altPhone:'', whatsapp:'',
    email:'investorenquiries@redefine.co.za', altEmail:'',
    hqAddress:'155 West Street, Sandton, Johannesburg, South Africa', postalAddress:'',
    contactPerson:'', position:'', department:'',
    targetDepartments:'Property Management, Developments, Facilities',
    notes:'Major JSE-listed property fund. Large Gauteng office and retail portfolio. Facilities management handles interior environments — direct relationship needed with property management team.',
    followUpDate:'',
  },
  {
    id:303, company:'Attacq Limited', sector:'Property', type:'Strategic Account',
    priority:'High', status:'Not Contacted',
    website:'https://www.attacq.co.za',
    phone:'+27 10 549 1050', altPhone:'', whatsapp:'',
    email:'reception@attacq.co.za', altEmail:'brenda@attacq.co.za',
    hqAddress:'Nexus Waterfall, Waterfall City, Midrand, South Africa', postalAddress:'',
    contactPerson:'', position:'', department:'Leasing',
    targetDepartments:'Leasing, Developments, Facilities',
    notes:'Waterfall City developer. Premium lifestyle and commercial precinct — strong brand alignment with Botanica Living. Tenant fitout specifications and communal area greening are key entry points.',
    followUpDate:'',
  },

  // ── HOSPITALITY ─────────────────────────────────────────────────────────────
  {
    id:401, company:'Village N Life', sector:'Hospitality', type:'Strategic Account',
    priority:'High', status:'Not Contacted',
    website:'https://www.villagenlife.com',
    phone:'+27 21 430 4000', altPhone:'+27 21 430 4080', whatsapp:'+27 82 494 2154',
    email:'enquiries@villagenlife.events', altEmail:'chairmansoffice@villagenlife.com',
    hqAddress:'Camps Bay, Cape Town, South Africa', postalAddress:'',
    contactPerson:'', position:"Chairman's Office", department:'Operations',
    targetDepartments:'Operations, Procurement, Property, Guest Experience',
    notes:'Cape-based boutique hospitality group. Hotels and resorts across Western Cape. Premium positioning aligns directly with Botanica Living brand. Guest experience team influences lobby and room greening decisions.',
    followUpDate:'',
  },
  {
    id:402, company:'Southern Sun', sector:'Hospitality', type:'Strategic Account',
    priority:'High', status:'Not Contacted',
    website:'https://www.southernsun.com',
    phone:'+27 11 461 9744', altPhone:'0861 44 77 44', whatsapp:'',
    email:'companysecretary@southernsun.com', altEmail:'',
    hqAddress:'Montecasino Boulevard, Johannesburg, South Africa', postalAddress:'',
    contactPerson:'', position:'Company Secretary', department:'Procurement',
    targetDepartments:'Procurement, Property, Refurbishments',
    notes:'Major SA hotel group with properties across the country. Lobby, restaurant and conference area greening across the portfolio. Refurbishment cycles create periodic large orders.',
    followUpDate:'',
  },
  {
    id:403, company:'Tsogo Sun Hotels', sector:'Hospitality', type:'Strategic Account',
    priority:'High', status:'Not Contacted',
    website:'https://www.tsogosun.com',
    phone:'+27 11 510 7700', altPhone:'+27 10 595 9149', whatsapp:'',
    email:'tsogosun.contactus@tsogosun.com', altEmail:'rewards@tsogosun.com',
    hqAddress:'Montecasino Boulevard, Fourways, Johannesburg, South Africa', postalAddress:'',
    contactPerson:'', position:'', department:'Procurement',
    targetDepartments:'Procurement, Property, Facilities',
    notes:'One of the largest hotel groups in Africa. Operates InterContinental, Radisson Blu and own-brand hotels. High-volume opportunity across lobby, conference and F&B spaces. Centralised procurement team in Johannesburg.',
    followUpDate:'',
  },
  {
    id:404, company:'City Lodge Hotel Group', sector:'Hospitality', type:'Strategic Account',
    priority:'Medium', status:'Not Contacted',
    website:'https://citylodgehotels.com',
    phone:'+27 11 557 2600', altPhone:'0800 11 37 90', whatsapp:'',
    email:'info@citylodgehotels.com', altEmail:'groups@citylodgehotels.com',
    hqAddress:'Bryanston Gate Office Park, Johannesburg, South Africa', postalAddress:'',
    contactPerson:'', position:'', department:'Procurement',
    targetDepartments:'Procurement, Facilities, Refurbishments',
    notes:'Listed hotel group with 60+ properties across SA and rest of Africa. Budget to mid-market positioning. Reception, lobby and corridor greening across large portfolio. Privacy email: privacy@citylodgehotels.com. Volume-based contract potential.',
    followUpDate:'',
  },

  // ── RETAIL ──────────────────────────────────────────────────────────────────
  {
    id:501, company:'Shoprite / Checkers Hyper', sector:'Retail', type:'Strategic Account',
    priority:'Critical', status:'Researching',
    website:'https://www.checkers.co.za',
    phone:'', altPhone:'', whatsapp:'',
    email:'', altEmail:'',
    hqAddress:'Brackenfell Boulevard, Brackenfell, Cape Town, 7560, South Africa', postalAddress:'',
    contactPerson:'', position:'Category Buyer', department:'Non-Foods / Home',
    targetDepartments:'Non-Foods, Home Category, Store Development, Property',
    notes:'Priority anchor retail opportunity. Shop-in-shop concept for Checkers Hyper stores nationally. Requires: pitch deck, pilot proposal, direct contact with Category Buyer in Non-Foods/Home at Shoprite Holdings, Brackenfell HQ. This is the single highest-impact strategic opportunity.',
    followUpDate:'',
  },
]

// ── FINANCIAL HUB SEED DATA ────────────────────────────────────────────────────
export const INIT_QUOTES    = []
export const INIT_INVOICES  = []
export const INIT_EXPENSES  = []

export const QUOTE_STATUSES   = ['Draft','Sent','Accepted','Rejected','Expired']
export const INVOICE_STATUSES = ['Draft','Sent','Partially Paid','Paid','Overdue']
export const EXPENSE_CATEGORIES = [
  'Samples','Freight','Customs & Clearing','Transport (SA)',
  'Marketing','Website & Digital','Travel','Office & Admin',
  'Compliance','Banking Fees','Other',
]

export const VAT_RATE = 0.15   // 15% SA VAT


export const FINANCE_CATEGORIES = {
  'Owner Investment': ['Owner Capital','Reimbursement','Other Investment'],
  'Business Income':  ['Product Sales','Deposits','Project Income','Other Income'],
  'Business Expense': ['CIPC / Compliance','SARS / Tax','Domain & Email','Website & Digital','Supplier Samples','Freight & Courier','Customs & Clearing','Marketing','Product Development','Assembly & Packaging','Travel','Banking Fees','Other Expense'],
}

export const PAYMENT_METHODS = ['EFT','Cash','Card','PayPal','Wise','Other']
