-- ============================================================
-- BOTANICA LIVING GROUP — SUPABASE DATABASE SCHEMA
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── DOCUMENTS TABLE ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_name             TEXT NOT NULL,
  file_type             TEXT NOT NULL,          -- 'pdf', 'jpg', 'csv', 'xlsx', etc.
  file_size             BIGINT,                 -- bytes
  file_size_display     TEXT,                   -- '1.2 MB'
  category              TEXT NOT NULL DEFAULT 'General',
  storage_path          TEXT NOT NULL,          -- path in Supabase Storage bucket
  public_url            TEXT,                   -- permanent public URL if bucket is public
  notes                 TEXT,
  supplier_name         TEXT,
  linked_transaction_id UUID,                   -- FK to transactions (set after transaction created)
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ── TRANSACTIONS TABLE ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date              DATE NOT NULL,
  type              TEXT NOT NULL CHECK (type IN ('Owner Investment','Business Income','Business Expense')),
  amount            NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  category          TEXT NOT NULL,
  description       TEXT NOT NULL,
  supplier_payee    TEXT,
  payment_method    TEXT DEFAULT 'EFT',
  notes             TEXT,
  invoice_number    TEXT,
  vat_amount        NUMERIC(14,2) DEFAULT 0,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  source            TEXT DEFAULT 'manual',     -- 'manual' | 'import' | 'ocr'
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK from documents → transactions AFTER both tables exist
ALTER TABLE documents
  ADD CONSTRAINT fk_documents_transaction
  FOREIGN KEY (linked_transaction_id)
  REFERENCES transactions(id)
  ON DELETE SET NULL;

-- ── DOCUMENT EXTRACTIONS TABLE ──────────────────────────────
-- Stores raw OCR/AI output and review status
CREATE TABLE IF NOT EXISTS document_extractions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id           UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  raw_text              TEXT,                   -- full OCR text output
  extracted_supplier    TEXT,
  extracted_invoice_num TEXT,
  extracted_date        DATE,
  extracted_total       NUMERIC(14,2),
  extracted_vat         NUMERIC(14,2),
  extracted_line_items  JSONB,                  -- array of {description, qty, unit_price, total}
  extracted_currency    TEXT DEFAULT 'ZAR',
  suggested_type        TEXT,
  suggested_category    TEXT,
  suggested_description TEXT,
  confidence            TEXT CHECK (confidence IN ('High Confidence','Medium Confidence','Needs Review')),
  status                TEXT DEFAULT 'pending'
                        CHECK (status IN ('pending','reviewed','approved','rejected')),
  error_message         TEXT,                   -- if extraction failed, why
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ── INDEXES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_documents_category         ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_created          ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_linked_txn       ON documents(linked_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date          ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type          ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_source_doc    ON transactions(source_document_id);
CREATE INDEX IF NOT EXISTS idx_extractions_document       ON document_extractions(document_id);
CREATE INDEX IF NOT EXISTS idx_extractions_status         ON document_extractions(status);

-- ── UPDATED_AT TRIGGER ──────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_documents_updated
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_transactions_updated
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_extractions_updated
  BEFORE UPDATE ON document_extractions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── ROW LEVEL SECURITY (RLS) ────────────────────────────────
-- Enable RLS on all tables
ALTER TABLE documents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_extractions ENABLE ROW LEVEL SECURITY;

-- For single-owner app: allow anon key full access (adjust for multi-user later)
CREATE POLICY "Allow all for anon" ON documents
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon" ON transactions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon" ON document_extractions
  FOR ALL USING (true) WITH CHECK (true);

-- ── STORAGE BUCKET (run in Dashboard UI or via API) ─────────
-- Create bucket named: botanica-documents
-- Settings: Private (use signed URLs) or Public (simpler for single owner)
-- Max file size: 50MB
-- Allowed MIME types: application/pdf, image/*, text/csv, application/vnd.ms-excel,
--                     application/vnd.openxmlformats-officedocument.spreadsheetml.sheet

-- If using SQL to create bucket:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('botanica-documents', 'botanica-documents', false);

-- Storage policy (if private bucket):
-- CREATE POLICY "Allow anon uploads" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'botanica-documents');
-- CREATE POLICY "Allow anon reads" ON storage.objects
--   FOR SELECT USING (bucket_id = 'botanica-documents');
-- CREATE POLICY "Allow anon deletes" ON storage.objects
--   FOR DELETE USING (bucket_id = 'botanica-documents');
