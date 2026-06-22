// ── SEED DATA v2.4 ────────────────────────────────────────────────────────────

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

export const INIT_PROGRESS = [
  { section:'Company Registration', icon:'◎', tasks:[
    { id:'cr1', name:'Company registered', status:'Completed', priority:'Critical', dueDate:'', notes:'Registration confirmed with CIPC.' },
    { id:'cr2', name:'CIPC name change submitted', status:'Completed', priority:'Critical', dueDate:'', notes:'Submitted. Awaiting approval.' },
    { id:'cr3', name:'Name change approved', status:'Completed', priority:'Critical', dueDate:'', notes:'Botanica Living Group (Pty) Ltd confirmed.' },
    { id:'cr4', name:'Company documents updated', status:'In Progress', priority:'High', dueDate:'', notes:'Update MOI, letterhead, and bank mandate.' },
  ]},
  { section:'SARS & Import Compliance', icon:'⊟', tasks:[
    { id:'sars1', name:'SARS income tax registration completed', status:'Completed', priority:'Critical', dueDate:'', notes:'' },
    { id:'sars2', name:'Importer registration submitted', status:'In Progress', priority:'Critical', dueDate:'', notes:'Busy with SARS eFiling registration as importer.' },
    { id:'sars3', name:'Customs code received', status:'Not Started', priority:'Critical', dueDate:'', notes:'Required before first shipment can be cleared.' },
  ]},
  { section:'Brand & Digital', icon:'✦', tasks:[
    { id:'bd1', name:'Logo created', status:'Completed', priority:'High', dueDate:'', notes:'Premium botanical mark finalised.' },
    { id:'bd2', name:'Domain registered: botanicaliving.co.za', status:'Completed', priority:'High', dueDate:'', notes:'' },
    { id:'bd3', name:'Email active: aldo@botanicaliving.co.za', status:'Completed', priority:'High', dueDate:'', notes:'' },
    { id:'bd4', name:'Website concept in progress', status:'In Progress', priority:'Medium', dueDate:'', notes:'Landing page to follow Founders Collection launch.' },
    { id:'bd5', name:'Email signature created', status:'Completed', priority:'Low', dueDate:'', notes:'' },
    { id:'bd6', name:'Command Centre live', status:'Completed', priority:'High', dueDate:'', notes:'v2.4 deployed.' },
  ]},
  { section:'Supplier Development', icon:'❧', tasks:[
    { id:'sd1', name:'Frank / Dongyi relationship active', status:'Completed', priority:'Critical', dueDate:'', notes:'Primary supplier confirmed.' },
    { id:'sd2', name:'Campion / Trustfloral relationship active', status:'Completed', priority:'High', dueDate:'', notes:'Specialist for hanging greenery and boxwood panels.' },
    { id:'sd3', name:'Supplier video meetings scheduled', status:'In Progress', priority:'High', dueDate:'', notes:'Schedule calls to discuss MOQ flexibility.' },
    { id:'sd4', name:'Catalogues received', status:'In Progress', priority:'Medium', dueDate:'', notes:'Catalogues from Dongyi received. Trustfloral pending.' },
    { id:'sd5', name:'Sample quotes confirmed', status:'In Progress', priority:'High', dueDate:'', notes:'Quotes received for Olive and Ficus. Palm pending.' },
    { id:'sd6', name:'Supplier comparison matrix completed', status:'Not Started', priority:'Medium', dueDate:'', notes:'' },
  ]},
  { section:'Product Development', icon:'◈', tasks:[
    { id:'pd1', name:'Founders Collection draft completed', status:'In Progress', priority:'Critical', dueDate:'', notes:'6 hero SKUs identified.' },
    { id:'pd2', name:'Samples ordered', status:'Not Started', priority:'Critical', dueDate:'', notes:'Waiting on customs code and bank account.' },
    { id:'pd3', name:'Product scoring sheet completed', status:'Not Started', priority:'High', dueDate:'', notes:'' },
    { id:'pd4', name:'Landed cost model completed', status:'In Progress', priority:'Critical', dueDate:'', notes:'Import calculator built.' },
  ]},
  { section:'Operations', icon:'⊞', tasks:[
    { id:'op1', name:'Paarl assembly location identified', status:'Completed', priority:'High', dueDate:'', notes:'Concept confirmed.' },
    { id:'op2', name:'Assembly SOP documented', status:'Not Started', priority:'High', dueDate:'', notes:'' },
    { id:'op3', name:'QC checklist created', status:'Not Started', priority:'High', dueDate:'', notes:'' },
    { id:'op4', name:'Storage and handling plan finalised', status:'Not Started', priority:'Medium', dueDate:'', notes:'' },
  ]},
  { section:'Retail Strategy', icon:'◉', tasks:[
    { id:'rs1', name:'Checkers Hyper identified as anchor opportunity', status:'Completed', priority:'Critical', dueDate:'', notes:'' },
    { id:'rs2', name:'Shop-in-shop concept defined', status:'Completed', priority:'High', dueDate:'', notes:'Visual merchandising concept drafted.' },
    { id:'rs3', name:'Pitch deck created', status:'Not Started', priority:'Critical', dueDate:'', notes:'' },
    { id:'rs4', name:'Checkers buyer contact established', status:'Not Started', priority:'Critical', dueDate:'', notes:'' },
    { id:'rs5', name:'Pilot proposal submitted', status:'Not Started', priority:'Critical', dueDate:'', notes:'' },
  ]},
  { section:'Finance', icon:'◈', tasks:[
    { id:'fi1', name:'Import cost model created', status:'Completed', priority:'Critical', dueDate:'', notes:'Full landed cost calculator built.' },
    { id:'fi2', name:'Pricing strategy in progress', status:'In Progress', priority:'Critical', dueDate:'', notes:'Sell-in and RRP matrix being finalised.' },
    { id:'fi3', name:'Business bank account opened', status:'Not Started', priority:'Critical', dueDate:'', notes:'Waiting on name change approval.' },
    { id:'fi4', name:'Funding / investor strategy defined', status:'Not Started', priority:'High', dueDate:'', notes:'' },
  ]},
]

export const INIT_FINANCE = []

export const INIT_TASKS = [
  { id:1, name:'Schedule Dongyi video call', priority:'High', status:'Not Started', dueDate:'', notes:'Discuss MOQ flexibility on first order.', category:'Suppliers' },
  { id:2, name:'Complete importer registration on SARS eFiling', priority:'Critical', status:'In Progress', dueDate:'', notes:'Required before first shipment.', category:'Compliance' },
  { id:3, name:'Open business bank account', priority:'Critical', status:'Not Started', dueDate:'', notes:'Waiting on name change to complete.', category:'Finance' },
  { id:4, name:'Build Checkers Hyper pitch deck', priority:'Critical', status:'Not Started', dueDate:'', notes:'Financial model + visual concept + pilot proposal.', category:'Sales' },
]

export const INIT_DOCUMENTS = []

// ── FINANCIAL HUB INIT DATA ───────────────────────────────────────────────────

export const INIT_QUOTES = []
export const INIT_INVOICES = []
export const INIT_EXPENSES = []
export const INIT_PROJECTS = []

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

// ── Navigation v2.4 ───────────────────────────────────────────────────────────
export const NAV = [
  { id:'dashboard',    icon:'⬡', label:'Dashboard',          group:'Overview' },
  // Supplier Zone
  { id:'supplierzone', icon:'◎', label:'Supplier Zone',       group:'Supply Chain' },
  { id:'products',     icon:'❧', label:'Product Database',    group:'Supply Chain' },
  // Client
  { id:'clients',      icon:'◉', label:'Client Database',     group:'Market' },
  { id:'founders',     icon:'✦', label:'Founders Collection', group:'Market' },
  // Financial Hub
  { id:'finance-hub',  icon:'◈', label:'Financial Hub',       group:'Finance' },
  { id:'quotes',       icon:'◻', label:'Quotes',              group:'Finance' },
  { id:'invoices',     icon:'▣', label:'Invoices',            group:'Finance' },
  { id:'expenses',     icon:'⊟', label:'Expenses',            group:'Finance' },
  // Projects
  { id:'projects',     icon:'⊞', label:'Projects',            group:'Operations' },
  { id:'progress',     icon:'▸', label:'Business Progress',   group:'Operations' },
  { id:'actions',      icon:'✓', label:'Action Centre',       group:'Operations' },
  // Other
  { id:'documents',    icon:'▤', label:'Documents',           group:'Resources' },
  { id:'strategy',     icon:'⊟', label:'Strategy',            group:'Resources' },
  { id:'settings',     icon:'⚙', label:'Settings',            group:'System' },
]

// ── CLIENT DATABASE ────────────────────────────────────────────────────────────
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
  { id:101, company:'Mediclinic Southern Africa', sector:'Healthcare', type:'Strategic Account', priority:'Critical', status:'Not Contacted', website:'https://www.mediclinic.co.za', email:'engage@mediclinic.co.za', phone:'+27 21 809 6500', altPhone:'+27 86 532 2557', whatsapp:'087 240 6367', hqAddress:'25 Du Toit Street, Stellenbosch, 7600', postalAddress:'PO Box 456, Stellenbosch, 7599', contactPerson:'', position:'', department:'Facilities / Procurement', notes:'Large private hospital group — reception, corridors, waiting areas across SA. Facilities and Procurement are key contacts. Targeting facilities management budget.', followUpDate:'' },
  { id:102, company:'Netcare Group', sector:'Healthcare', type:'Strategic Account', priority:'Critical', status:'Not Contacted', website:'https://www.netcare.co.za', email:'customer.service@netcare.co.za', phone:'0860 638 2273', altPhone:'', whatsapp:'', hqAddress:'76 Maude Street, Sandton, 2196', postalAddress:'', contactPerson:'', position:'', department:'Facilities / Procurement', notes:'Second largest private hospital operator in SA. National footprint — strong Gauteng presence. Target Capital Projects and Facilities Management.', followUpDate:'' },
  { id:103, company:'Life Healthcare', sector:'Healthcare', type:'Strategic Account', priority:'Critical', status:'Not Contacted', website:'https://www.lifehealthcare.co.za', email:'customer.service@lifehealthcare.co.za', phone:'+27 11 219 9000', altPhone:'+27 11 219 9111', whatsapp:'', hqAddress:'203 Oxford Road, Dunkeld, Johannesburg, 2196', postalAddress:'', contactPerson:'', position:'', department:'Facilities Management / Procurement', notes:'Third major private hospital group. Strong Gauteng and Western Cape presence. Multiple campuses — reception and communal areas.', followUpDate:'' },
  { id:201, company:'Curro Holdings', sector:'Education', type:'Strategic Account', priority:'High', status:'Not Contacted', website:'https://www.curro.co.za', email:'engage@curro.co.za', phone:'+27 21 979 1204', altPhone:'+27 21 979 1205', whatsapp:'', hqAddress:'9 Parc du Cap, Mispel Street, Bellville, Cape Town, 7530', postalAddress:'PO Box 2436, Durbanville, 7551', contactPerson:'', position:'', department:'Facilities / New Campus Development', notes:'Private school group with 60+ campuses. Reception and communal areas across network. Target Facilities and New Campus Development.', followUpDate:'' },
  { id:202, company:'ADvTECH Group', sector:'Education', type:'Strategic Account', priority:'High', status:'Not Contacted', website:'https://www.groupadvtech.com', email:'info@groupadvtech.com', phone:'+27 11 676 8000', altPhone:'', whatsapp:'', hqAddress:'Inanda Greens Office Park, 54 Wierda Road West, Sandton, 2196', postalAddress:'', contactPerson:'', position:'', department:'Facilities / Procurement', notes:'Owns Varsity College, Rosebank College, Crawford schools. Multiple campuses — strong national footprint.', followUpDate:'' },
  { id:301, company:'Growthpoint Properties', sector:'Property', type:'Strategic Account', priority:'Critical', status:'Not Contacted', website:'https://www.growthpoint.co.za', email:'info@growthpoint.co.za', phone:'+27 11 944 6000', altPhone:'+27 21 673 8400', whatsapp:'', hqAddress:'The Place, 1 Sandton Drive, Sandton', postalAddress:'', contactPerson:'', position:'', department:'Facilities / Property Management', notes:'Largest SA REIT. Offices, retail centres, industrial. Facilities budget driven. Cape Town: MontClare Place, Claremont. Durban: Lincoln on The Lake, Umhlanga.', followUpDate:'' },
  { id:302, company:'Redefine Properties', sector:'Property', type:'Strategic Account', priority:'Critical', status:'Not Contacted', website:'https://www.redefine.co.za', email:'', phone:'+27 11 283 0000', altPhone:'', whatsapp:'', hqAddress:'155 West Street, Sandown, Sandton, 2196', postalAddress:'', contactPerson:'', position:'', department:'Property Management / Tenant Installations', notes:'Major property fund — offices and retail. Strong Gauteng presence. Target Tenant Installations and Facilities.', followUpDate:'' },
  { id:303, company:'Attacq Limited', sector:'Property', type:'Strategic Account', priority:'Critical', status:'Not Contacted', website:'https://www.attacq.co.za', email:'reception@attacq.co.za', phone:'+27 10 549 1050', altPhone:'+27 12 010 3457', whatsapp:'', hqAddress:'Ground Floor, Nexus Waterfall, 44 Magwa Crescent, Waterfall City, 2090', postalAddress:'', contactPerson:'', position:'', department:'Leasing / Waterfall City Projects', notes:'Waterfall City developer. Premium lifestyle precinct — strong brand alignment. Target Leasing, Developments and Property Management.', followUpDate:'' },
  { id:401, company:'Village N Life', sector:'Hospitality', type:'Strategic Account', priority:'High', status:'Not Contacted', website:'https://www.villagenlife.com', email:'chairmansoffice@villagenlife.com', phone:'+27 21 430 4000', altPhone:'+27 82 494 2154', whatsapp:'', hqAddress:'7 Chilworth Road, Camps Bay, Cape Town, 8005', postalAddress:'', contactPerson:'', position:'', department:'Group Operations / Procurement', notes:'Cape-based hospitality group. Boutique hotels and resorts. Events: 69 Victoria Road, Camps Bay. Chairman direct line available.', followUpDate:'' },
  { id:402, company:'Southern Sun', sector:'Hospitality', type:'Strategic Account', priority:'High', status:'Not Contacted', website:'https://www.southernsun.com', email:'companysecretary@southernsun.com', phone:'0861 44 77 44', altPhone:'+27 11 461 9744', whatsapp:'', hqAddress:'Palazzo Towers West, Montecasino Boulevard, Johannesburg, 2055', postalAddress:'', contactPerson:'', position:'', department:'Procurement / Hotel Refurbishments', notes:'Major hotel group across SA. Large footprint — reception, lobby, restaurant greenery. Target Procurement and Hotel Refurbishments.', followUpDate:'' },
  { id:403, company:'Tsogo Sun', sector:'Hospitality', type:'Strategic Account', priority:'High', status:'Not Contacted', website:'https://www.tsogosun.com', email:'tsogosun.contactus@tsogosun.com', phone:'+27 11 510 7700', altPhone:'+27 10 595 9149', whatsapp:'', hqAddress:'Palazzo Towers East, Montecasino Boulevard, Fourways, 2055', postalAddress:'Private Bag X190, Bryanston, 2021', contactPerson:'', position:'', department:'Procurement / Casino & Hotel Refurbishments', notes:'Hospitality, entertainment and property group. Casino hotel network across SA — strong recurring refurbishment cycle.', followUpDate:'' },
  { id:404, company:'City Lodge Hotel Group', sector:'Hospitality', type:'Strategic Account', priority:'High', status:'Not Contacted', website:'https://citylodgehotels.com', email:'info@citylodgehotels.com', phone:'+27 11 557 2600', altPhone:'0800 11 37 90', whatsapp:'', hqAddress:'Bryanston Gate Office Park, Corner Homestead Avenue and Main Road, Bryanston', postalAddress:'', contactPerson:'', position:'', department:'Procurement / Facilities', notes:'Major hotel group — wide SA network. Target Procurement and Facilities for reception and communal area greenery.', followUpDate:'' },
  { id:501, company:'Shoprite / Checkers Hyper', sector:'Retail', type:'Strategic Account', priority:'Critical', status:'Researching', website:'https://www.checkers.co.za', email:'', phone:'', altPhone:'', whatsapp:'', hqAddress:'Brackenfell, Cape Town', postalAddress:'', contactPerson:'', position:'Category Buyer', department:'Non-Foods / Home', notes:'PRIORITY anchor retail opportunity. Shop-in-shop concept for Checkers Hyper stores nationally. Requires pitch deck, pilot proposal and buyer contact in Non-Foods/Home at Shoprite Holdings. Each store = showroom for designers and commercial referrals.', followUpDate:'' },
]


export const FINANCE_CATEGORIES = {
  'Owner Investment': ['Owner Capital','Reimbursement','Other Investment'],
  'Business Income':  ['Product Sales','Deposits','Project Income','Other Income'],
  'Business Expense': ['CIPC / Compliance','SARS / Tax','Domain & Email','Website & Digital','Supplier Samples','Freight & Courier','Customs & Clearing','Marketing','Product Development','Assembly & Packaging','Travel','Banking Fees','Other Expense'],
}

export const EXPENSE_CATEGORIES = [
  'Samples','Freight','Clearing & Duty','Transport','Marketing',
  'Website & Digital','Travel','Office','Salaries','Banking Fees',
  'CIPC / Compliance','SARS / Tax','Assembly & Packaging','Other',
]

export const PAYMENT_METHODS = ['EFT','Cash','Card','PayPal','Wise','Other']

export const QUOTE_STATUSES = ['Draft','Sent','Accepted','Rejected','Expired']
export const INVOICE_STATUSES = ['Draft','Sent','Partially Paid','Paid','Overdue']
export const PROJECT_STATUSES = ['Planning','Active','On Hold','Completed','Cancelled']
