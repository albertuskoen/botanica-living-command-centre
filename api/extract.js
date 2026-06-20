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

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400 })
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
