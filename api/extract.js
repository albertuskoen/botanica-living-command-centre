// api/extract.js — Vercel Edge/Serverless Function
// ──────────────────────────────────────────────────────────────────────────────
// This function runs on Vercel's servers, NOT in the browser.
// The secret OCR/AI key (OCR_SECRET_KEY) is only available here.
//
// SETUP:
//   1. In Vercel → Project Settings → Environment Variables:
//      OCR_SECRET_KEY = your_api_key_here   (server-only, NOT prefixed with VITE_)
//   2. Deploy to Vercel.
//   3. Test: POST /api/extract with a multipart form containing "file" field.
//
// SUPPORTED PROVIDERS (configure whichever you want):
//   - Anthropic Claude (claude-3-haiku is cheapest, claude-3-5-sonnet most accurate)
//   - OpenAI GPT-4 Vision
//   - Google Document AI
//   - Azure Form Recognizer
//   This placeholder uses Anthropic Claude as the example.
//
// SECURITY: NEVER prefix this key with VITE_ — that would expose it to the browser.

export const config = { runtime: 'edge' }

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const secretKey = process.env.OCR_SECRET_KEY
  if (!secretKey) {
    return new Response(JSON.stringify({
      error: 'OCR_NOT_CONFIGURED',
      message: 'Server-side OCR key is not set. Add OCR_SECRET_KEY to Vercel environment variables.',
    }), { status: 503, headers: { 'Content-Type': 'application/json' } })
  }

  try {
    const formData  = await request.formData()
    const file      = formData.get('file')
    const rawText   = formData.get('rawText') || ''
    const extractionType = formData.get('extractionType') || 'invoice'

    // ── fetch_url: server-side fetch + full image extraction ─────────────────
    // NOTE: these handlers do NOT require a file — must come before the file guard
    if (extractionType === 'fetch_url') {
      const targetUrl = formData.get('targetUrl') || ''
      if (!targetUrl) {
        return new Response(JSON.stringify({ error:'No URL' }), { status:400, headers: { 'Content-Type':'application/json' } })
      }
      try {
        const pageRes = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-ZA,en;q=0.9',
          },
        })
        const html     = await pageRes.text()
        const baseUrl  = targetUrl.replace(/\/[^\/]*$/, '/')
        const origin   = (() => { try { const u = new URL(targetUrl); return u.origin } catch { return '' } })()

        // ── Server-side image extraction — all attribute types ──────────────
        function resolveUrl(u) {
          if (!u || u.startsWith('data:')) return ''
          if (u.startsWith('http')) return u
          if (u.startsWith('//')) return 'https:' + u
          if (u.startsWith('/')) return origin + u
          return baseUrl + u
        }
        function bestFromSrcset(srcset) {
          if (!srcset) return ''
          const parts = srcset.split(',').map(s => s.trim().split(/\s+/))
          // Sort by declared width (largest first), fall back to last entry
          const sorted = parts.sort((a, b) => {
            const wa = parseInt(a[1]) || 0
            const wb = parseInt(b[1]) || 0
            return wb - wa
          })
          return sorted[0]?.[0] || ''
        }
        // Extract all img tags with every possible lazy-load attribute
        const imgCandidates = []
        const imgTagRe = /<img[^>]*>/gi
        let imgMatch
        while ((imgMatch = imgTagRe.exec(html)) !== null) {
          const tag = imgMatch[0]
          const getAttr = (attr) => {
            const m = tag.match(new RegExp(attr + '=["\'`]([^"\'`>]+)["\'`]', 'i'))
            return m ? m[1].trim() : ''
          }
          const src        = resolveUrl(getAttr('src'))
          const dataSrc    = resolveUrl(getAttr('data-src'))
          const dataLazy   = resolveUrl(getAttr('data-lazy-src') || getAttr('data-lazy'))
          const dataWpSrc  = resolveUrl(getAttr('data-large_image') || getAttr('data-full-url'))
          const srcset     = resolveUrl(bestFromSrcset(getAttr('srcset') || getAttr('data-srcset')))
          const alt        = getAttr('alt')
          const best = dataWpSrc || dataLazy || dataSrc || srcset || src
          if (best && !best.includes('placeholder') && !best.includes('blank.gif') &&
              !best.includes('spinner') && best.match(/\.(jpg|jpeg|png|webp|avif)/i)) {
            imgCandidates.push({
              best, src, dataSrc, dataLazy, srcset: getAttr('srcset'), alt,
              isLazyLoaded: !!(dataSrc || dataLazy),
            })
          }
        }
        // Extract product titles from WooCommerce / Shopify patterns
        const productTitles = []
        const titleRe = /<(?:h2|h3)[^>]*class="[^"]*(?:product[_-]title|woocommerce-loop-product__title|product-item-title)[^"]*"[^>]*>([^<]+)</gi
        let titleMatch
        while ((titleMatch = titleRe.exec(html)) !== null) {
          productTitles.push(titleMatch[1].trim())
        }
        // Also try <a title=> on product links
        const linkTitles = []
        const linkRe = /class="[^"]*woocommerce-LoopProduct-link[^"]*"[^>]*title="([^"]+)"/gi
        let linkMatch
        while ((linkMatch = linkRe.exec(html)) !== null) {
          linkTitles.push(linkMatch[1].trim())
        }

        return new Response(JSON.stringify({
          html:           html.slice(0, 60000),
          images:         imgCandidates.slice(0, 40),  // top 40 candidates
          productTitles:  productTitles.slice(0, 20),
          linkTitles:     linkTitles.slice(0, 20),
          httpStatus:     pageRes.status,
          fetchOk:        pageRes.ok,
          origin,
          baseUrl,
        }), { headers: { 'Content-Type':'application/json' } })
      } catch (e) {
        return new Response(JSON.stringify({ html:'', images:[], error: e.message }), { headers: { 'Content-Type':'application/json' } })
      }
    }

    // ── fetch_image: server-side proxy download for Supabase upload ───────────
    if (extractionType === 'fetch_image') {
      const imageUrl = formData.get('imageUrl') || ''
      if (!imageUrl) return new Response(JSON.stringify({ error:'No imageUrl' }), { status:400, headers: { 'Content-Type':'application/json' } })
      try {
        const imgRes = await fetch(imageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': (() => { try { return new URL(imageUrl).origin } catch { return '' } })(),
          },
        })
        if (!imgRes.ok) throw new Error('HTTP ' + imgRes.status)
        const buf  = await imgRes.arrayBuffer()
        const type = imgRes.headers.get('content-type') || 'image/jpeg'
        return new Response(buf, { headers: { 'Content-Type': type, 'X-Image-Size': String(buf.byteLength) } })
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status:500, headers: { 'Content-Type':'application/json' } })
      }
    }

    // ── reference_harvest: AI extracts reference cards from page text ─────────
    if (extractionType === 'reference_harvest') {
      const harvestText  = formData.get('rawText')   || ''
      const sourceUrl    = formData.get('sourceUrl') || ''
      const harvestPrompt= formData.get('prompt')    || ''
      if (harvestText.trim().length > 20 && secretKey) {
        const result = await extractReferenceCards(harvestText, sourceUrl, harvestPrompt, secretKey)
        return new Response(JSON.stringify(result), { headers: { 'Content-Type':'application/json' } })
      }
      return new Response(JSON.stringify({ products:[], error:'Insufficient content' }), { headers: { 'Content-Type':'application/json' } })
    }
    // ── image_search: web image search for reference library ─────────────────
    if (extractionType === 'image_search') {
      const query    = formData.get('query') || ''
      const maxCount = parseInt(formData.get('max') || '6', 10)
      if (!query) return new Response(JSON.stringify({ images:[], error:'No query' }), { headers:{ 'Content-Type':'application/json' } })
      try {
        const serpKey = process.env.SERPAPI_KEY || ''
        const bingKey = process.env.BING_SEARCH_KEY || ''

        if (serpKey) {
          const params = new URLSearchParams({ engine:'google_images', q:query, num:String(maxCount), safe:'active', api_key:serpKey, ijn:'0' })
          const res  = await fetch('https://serpapi.com/search?' + params)
          const data = await res.json()
          const imgs = (data.images_results || []).slice(0, maxCount).map(img => ({ url:img.original||img.thumbnail, thumbUrl:img.thumbnail, sourceUrl:img.link||'', title:img.title||query }))
          return new Response(JSON.stringify({ images:imgs, query, engine:'serpapi' }), { headers:{ 'Content-Type':'application/json' } })
        }

        if (bingKey) {
          const params = new URLSearchParams({ q:query, count:String(maxCount), safeSearch:'Moderate', imageType:'Photo' })
          const res  = await fetch('https://api.bing.microsoft.com/v7.0/images/search?' + params, { headers:{ 'Ocp-Apim-Subscription-Key':bingKey } })
          const data = await res.json()
          const imgs = (data.value || []).slice(0, maxCount).map(img => ({ url:img.contentUrl, thumbUrl:img.thumbnailUrl, sourceUrl:img.hostPageUrl||'', title:img.name||query }))
          return new Response(JSON.stringify({ images:imgs, query, engine:'bing' }), { headers:{ 'Content-Type':'application/json' } })
        }

        // No API key — use Unsplash source (free, no auth, real photos)
        const imgs = buildFallbackImages(query)
        return new Response(JSON.stringify({ images:imgs, query, engine:'unsplash', note:'Add SERPAPI_KEY or BING_SEARCH_KEY to Vercel env for full image search.' }), { headers:{ 'Content-Type':'application/json' } })
      } catch (e) {
        return new Response(JSON.stringify({ images:[], error:e.message }), { headers:{ 'Content-Type':'application/json' } })
      }
    }

    // All remaining handlers require a file upload
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      })
    }

    const supplierName   = formData.get('supplierName')   || ''
    const customPrompt   = formData.get('prompt')         || ''

    // ── Supplier catalog extraction (returns JSON array of products) ──────────
    if (extractionType === 'supplier_catalog') {
      const textToUse = rawText || ''
      if (textToUse.trim().length > 20 || file) {
        const result = await extractCatalogWithClaude(textToUse, supplierName, base64OrNull(file), secretKey)
        return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } })
      }
    }

    // ── If we already have text (from pdf.js), use AI to extract structured data ──
    if (rawText && rawText.trim().length > 20) {
      const result = await extractWithClaudeText(rawText, secretKey)
      return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } })
    }

    // ── For images/scanned PDFs, use vision AI ────────────────────────────────
    const fileBytes = await file.arrayBuffer()
    const base64    = btoa(String.fromCharCode(...new Uint8Array(fileBytes)))
    const mediaType = file.type || 'application/pdf'

    const result = await extractWithClaudeVision(base64, mediaType, secretKey)
    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({
      error: 'EXTRACTION_FAILED',
      message: err.message,
    }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}

// ── Fallback images via Unsplash source (free, no key) ───────────────────────
function buildFallbackImages(query) {
  const q = query.toLowerCase()
  const kw =
    q.includes('olive')         ? 'olive+tree+indoor' :
    q.includes('fiddle')        ? 'fiddle+leaf+fig' :
    q.includes('kentia')        ? 'kentia+palm+indoor' :
    q.includes('areca')         ? 'areca+palm+plant' :
    q.includes('bird of para')  ? 'bird+of+paradise+plant' :
    q.includes('monstera')      ? 'monstera+plant' :
    q.includes('snake')         ? 'snake+plant+sansevieria' :
    q.includes('succulent')     ? 'succulent+plants' :
    q.includes('orchid')        ? 'orchid+white+flower' :
    q.includes('green wall')    ? 'green+wall+indoor+plants' :
    q.includes('vertical')      ? 'vertical+garden+wall' :
    q.includes('hedge')         ? 'boxwood+hedge+green' :
    q.includes('topiar')        ? 'topiary+garden+plants' :
    q.includes('hanging')       ? 'hanging+plants+indoor' :
    q.includes('pothos')        ? 'pothos+trailing+plant' :
    q.includes('cherry')        ? 'cherry+blossom+tree' :
    q.includes('baobab')        ? 'baobab+tree' :
    q.includes('palm')          ? 'palm+tree+indoor' :
    q.includes('planter')       ? 'indoor+planter+pot' :
    'artificial+plant+interior'
  return [1,2,3,4,5,6].map(i => ({
    url:       'https://source.unsplash.com/400x400/?' + kw + '&sig=' + i,
    thumbUrl:  'https://source.unsplash.com/200x200/?' + kw + '&sig=' + i,
    sourceUrl: 'https://unsplash.com',
    title:     query + ' — Unsplash reference',
    isUnsplash: true,
  }))
}

// ── Reference card extraction ─────────────────────────────────────────────────
async function extractReferenceCards(pageText, sourceUrl, customPrompt, apiKey) {
  const messages = [{
    role:'user',
    content: customPrompt || ('Extract reference cards from this page. Return JSON array only, no markdown.\n\nCONTENT:\n' + pageText.slice(0, 8000)),
  }]
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST',
    headers: { 'Content-Type':'application/json', 'x-api-key':apiKey, 'anthropic-version':'2023-06-01' },
    body: JSON.stringify({ model:'claude-opus-4-6', max_tokens:2048, messages }),
  })
  if (!response.ok) throw new Error('Claude API ' + response.status)
  const data = await response.json()
  const text = (data.content||[]).map(b=>b.text||'').join('')
  try {
    const clean = text.replace(/```json|```/g,'').trim()
    const parsed = JSON.parse(clean)
    const arr = Array.isArray(parsed) ? parsed : [parsed]
    return { products: arr }
  } catch { return { products:[], raw:text } }
}

// ── Helper: convert file to base64 if possible ───────────────────────────────
async function base64OrNull(file) {
  if (!file) return null
  try {
    const bytes = await file.arrayBuffer()
    return btoa(String.fromCharCode(...new Uint8Array(bytes)))
  } catch { return null }
}

// ── Claude catalog extraction (returns array of products) ─────────────────────
async function extractCatalogWithClaude(rawText, supplierName, base64Data, apiKey) {
  const messages = []

  if (base64Data && rawText.length < 100) {
    // Use vision for image/scanned catalogs
    messages.push({
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64Data } },
        { type: 'text', text: buildCatalogExtractionPrompt(supplierName, '') },
      ],
    })
  } else {
    messages.push({
      role: 'user',
      content: buildCatalogExtractionPrompt(supplierName, rawText),
    })
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      messages,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error('Claude API: ' + err)
  }

  const data = await response.json()
  const text = (data.content || []).map(b => b.text || '').join('')

  // Parse JSON array from response
  try {
    const clean   = text.replace(/```json|```/g, '').trim()
    const parsed  = JSON.parse(clean)
    const products = Array.isArray(parsed) ? parsed : (parsed.products || [])
    return { products, raw: text }
  } catch {
    return { products: [], raw: text, parseError: 'Could not parse product JSON from AI response' }
  }
}

function buildCatalogExtractionPrompt(supplierName, rawText) {
  const fields = [
    '"productName": ""', '"productCode": ""', '"category": ""',
    '"height": ""', '"width": ""', '"potSize": ""',
    '"colour": ""', '"material": ""', '"moq": ""',
    '"unitPrice": ""', '"exwPrice": ""', '"fobPrice": ""',
    '"cifPrice": ""', '"samplePrice": ""', '"currency": "USD"',
    '"leadTime": ""', '"packagingNotes": ""', '"notes": ""',
    '"confidence": 85',
  ].map(f => '  ' + f).join(',\n')

  return (
    'You are a product data extraction assistant for Botanica Living Group, ' +
    'a South African premium artificial greenery importer.\n\n' +
    'Supplier: ' + (supplierName || 'Unknown') + '\n\n' +
    'Extract ALL products from the catalog below. Return ONLY a valid JSON array. ' +
    'No explanation, no markdown, no preamble.\n\n' +
    'Each product object must have these fields (empty string if not found):\n' +
    '{\n' + fields + '\n}\n\n' +
    'CATALOG TEXT:\n' +
    rawText.slice(0, 8000)
  )
}


// ── Claude Vision (for images and scanned PDFs) ────────────────────────────────
async function extractWithClaudeVision(base64, mediaType, apiKey) {
  const prompt = `You are a financial document extraction assistant for Botanica Living Group (Pty) Ltd, a South African artificial greenery import company.

Extract the following from this invoice/receipt/document and return ONLY valid JSON:

{
  "supplierName": "company name on the invoice",
  "invoiceNumber": "invoice or reference number",
  "invoiceDate": "YYYY-MM-DD format",
  "totalAmount": 0.00,
  "vatAmount": 0.00,
  "currency": "ZAR",
  "description": "brief description of what was purchased",
  "lineItems": [
    { "description": "item", "qty": 1, "unitPrice": 0.00, "total": 0.00 }
  ],
  "suggestedType": "Business Expense",
  "suggestedCategory": "Other Expense",
  "confidence": "High Confidence"
}

Rules for suggestedType:
- "Owner Investment" if: capital, investment, founder contribution
- "Business Income" if: payment received, sales, customer deposit  
- "Business Expense" for all other invoices, receipts, payments

Rules for suggestedCategory (if type is Business Expense):
CIPC → "CIPC / Compliance"
SARS → "SARS / Tax"
domain/email → "Domain & Email"
Vercel/GitHub/hosting → "Website & Digital"
DHL/FedEx/courier → "Freight & Courier"
customs/clearing/duty → "Customs & Clearing"
samples → "Supplier Samples"
marketing/ads → "Marketing"
packaging/assembly/pot → "Assembly & Packaging"
bank fee → "Banking Fees"
otherwise → "Other Expense"

If you cannot read the document clearly, set confidence to "Needs Review".
Return ONLY the JSON object, no other text.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [{
        role:    'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text',  text: prompt },
        ],
      }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Claude API error: ${err}`)
  }

  const data     = await response.json()
  const content  = data.content?.[0]?.text || '{}'
  return parseExtractionJson(content)
}

// ── Claude Text (for text-based PDFs already parsed by pdf.js) ────────────────
async function extractWithClaudeText(text, apiKey) {
  const prompt = `Extract structured invoice data from this text and return ONLY valid JSON.

TEXT:
${text.substring(0, 4000)}

Return this exact JSON structure:
{
  "supplierName": "",
  "invoiceNumber": "",
  "invoiceDate": "YYYY-MM-DD",
  "totalAmount": 0.00,
  "vatAmount": 0.00,
  "currency": "ZAR",
  "description": "",
  "lineItems": [],
  "suggestedType": "Business Expense",
  "suggestedCategory": "Other Expense",
  "confidence": "High Confidence"
}

Use "Needs Review" confidence if data is uncertain. Return ONLY the JSON.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) throw new Error(`Claude API error: ${response.status}`)
  const data    = await response.json()
  const content = data.content?.[0]?.text || '{}'
  return parseExtractionJson(content)
}

function parseExtractionJson(text) {
  try {
    const clean = text.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return {
      supplierName:    '',
      invoiceNumber:   '',
      invoiceDate:     new Date().toISOString().split('T')[0],
      totalAmount:     0,
      vatAmount:       0,
      currency:        'ZAR',
      description:     '',
      lineItems:       [],
      suggestedType:   'Business Expense',
      suggestedCategory:'Other Expense',
      confidence:      'Needs Review',
      parseError:      'AI returned non-JSON response',
    }
  }
}
