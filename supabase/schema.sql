-- ============================================================
-- BOTANICA LIVING GROUP — SUPABASE SCHEMA v1.7
-- Project: Botanica Living
-- Bucket:  Botanica living - Documents
--
-- INSTRUCTIONS:
--   Supabase Dashboard → SQL Editor → New query → paste → Run
--
-- Run this ONCE. Safe to re-run (IF NOT EXISTS guards).
-- ============================================================

-- Required extension for UUID primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. DOCUMENTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_name             TEXT NOT NULL,
  file_type             TEXT NOT NULL,
  file_size_bytes       BIGINT,
  file_size_display     TEXT,
  category              TEXT NOT NULL DEFAULT 'General',
  storage_path          TEXT NOT NULL UNIQUE,
  public_url            TEXT,
  notes                 TEXT,
  supplier_name         TEXT,
  linked_transaction_id UUID,
  date_uploaded         DATE DEFAULT CURRENT_DATE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. TRANSACTIONS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date               DATE NOT NULL,
  type               TEXT NOT NULL
                       CHECK (type IN (
                         'Owner Investment',
                         'Business Income',
                         'Business Expense'
                       )),
  amount             NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  category           TEXT NOT NULL,
  description        TEXT NOT NULL,
  supplier_payee     TEXT,
  payment_method     TEXT NOT NULL DEFAULT 'EFT',
  notes              TEXT,
  invoice_number     TEXT,
  vat_amount         NUMERIC(14,2) NOT NULL DEFAULT 0,
  source             TEXT NOT NULL DEFAULT 'manual'
                       CHECK (source IN ('manual','import','ocr','tesseract')),
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  source_file        TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. FOREIGN KEY: documents → transactions ─────────────────
-- Add AFTER both tables exist to avoid ordering issues
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_documents_linked_transaction'
  ) THEN
    ALTER TABLE documents
      ADD CONSTRAINT fk_documents_linked_transaction
      FOREIGN KEY (linked_transaction_id)
      REFERENCES transactions(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ── 4. DOCUMENT EXTRACTIONS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS document_extractions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id           UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  raw_text              TEXT,
  extracted_supplier    TEXT,
  extracted_invoice_num TEXT,
  extracted_date        DATE,
  extracted_total       NUMERIC(14,2),
  extracted_vat         NUMERIC(14,2),
  extracted_currency    TEXT DEFAULT 'ZAR',
  suggested_type        TEXT,
  suggested_category    TEXT,
  suggested_description TEXT,
  confidence            TEXT CHECK (confidence IN ('High Confidence','Medium Confidence','Needs Review')),
  ocr_method            TEXT,   -- 'pdfjs' | 'tesseract' | 'ai'
  status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','approved','rejected')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 5. INDEXES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_docs_category     ON documents(category);
CREATE INDEX IF NOT EXISTS idx_docs_created      ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_docs_linked_txn   ON documents(linked_transaction_id);
CREATE INDEX IF NOT EXISTS idx_txn_date          ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_txn_type          ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_txn_source_doc    ON transactions(source_document_id);
CREATE INDEX IF NOT EXISTS idx_ext_document      ON document_extractions(document_id);
CREATE INDEX IF NOT EXISTS idx_ext_status        ON document_extractions(status);

-- ── 6. UPDATED_AT TRIGGER ─────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_documents_updated    ON documents;
DROP TRIGGER IF EXISTS trg_transactions_updated ON transactions;
DROP TRIGGER IF EXISTS trg_extractions_updated  ON document_extractions;

CREATE TRIGGER trg_documents_updated
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_transactions_updated
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_extractions_updated
  BEFORE UPDATE ON document_extractions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 7. ROW LEVEL SECURITY ─────────────────────────────────────
-- Single-owner app uses anon key with full access.
-- These policies allow the anon key (from VITE_SUPABASE_ANON_KEY) to
-- read/write everything. Tighten if you add authentication later.

ALTER TABLE documents            ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_extractions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to avoid conflicts on re-run
DROP POLICY IF EXISTS "anon_all_documents"   ON documents;
DROP POLICY IF EXISTS "anon_all_transactions" ON transactions;
DROP POLICY IF EXISTS "anon_all_extractions" ON document_extractions;

CREATE POLICY "anon_all_documents"   ON documents            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_transactions" ON transactions         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_extractions" ON document_extractions FOR ALL USING (true) WITH CHECK (true);

-- ── 8. STORAGE POLICIES ───────────────────────────────────────
-- Bucket name: "Botanica living - Documents" (exact, created in dashboard)
-- Run these to allow anon key to upload/read/delete files.

DROP POLICY IF EXISTS "anon_upload_docs"  ON storage.objects;
DROP POLICY IF EXISTS "anon_read_docs"    ON storage.objects;
DROP POLICY IF EXISTS "anon_update_docs"  ON storage.objects;
DROP POLICY IF EXISTS "anon_delete_docs"  ON storage.objects;

CREATE POLICY "anon_upload_docs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'Botanica living - Documents');

CREATE POLICY "anon_read_docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'Botanica living - Documents');

CREATE POLICY "anon_update_docs"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'Botanica living - Documents');

CREATE POLICY "anon_delete_docs"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'Botanica living - Documents');

-- ── VERIFY ────────────────────────────────────────────────────
-- After running, check the output shows these tables:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('documents','transactions','document_extractions')
ORDER BY table_name;

-- ============================================================
-- SCHEMA v2.4 ADDITIONS — Financial Hub
-- Run after v1.7 schema is in place
-- ============================================================

-- ── QUOTES ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quotes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number           TEXT,
  date             DATE NOT NULL DEFAULT CURRENT_DATE,
  client           TEXT NOT NULL,
  contact_person   TEXT,
  project_name     TEXT,
  notes            TEXT,
  currency         TEXT DEFAULT 'ZAR',
  exchange_rate    NUMERIC(10,4) DEFAULT 18.60,
  status           TEXT NOT NULL DEFAULT 'Draft'
                     CHECK (status IN ('Draft','Sent','Accepted','Rejected','Expired')),
  discount         NUMERIC(14,2) DEFAULT 0,
  items            JSONB,
  total            NUMERIC(14,2) DEFAULT 0,
  source_quote_id  UUID REFERENCES quotes(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── INVOICES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number           TEXT,
  date             DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date         DATE,
  client           TEXT NOT NULL,
  contact_person   TEXT,
  project_name     TEXT,
  notes            TEXT,
  status           TEXT NOT NULL DEFAULT 'Draft'
                     CHECK (status IN ('Draft','Sent','Partially Paid','Paid','Overdue')),
  discount         NUMERIC(14,2) DEFAULT 0,
  items            JSONB,
  total            NUMERIC(14,2) DEFAULT 0,
  amount_paid      NUMERIC(14,2) DEFAULT 0,
  payment_date     DATE,
  payment_notes    TEXT,
  source_quote_id  UUID REFERENCES quotes(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── EXPENSES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date             DATE NOT NULL DEFAULT CURRENT_DATE,
  supplier         TEXT,
  category         TEXT NOT NULL DEFAULT 'Other',
  project_id       UUID,
  project_name     TEXT,
  description      TEXT NOT NULL,
  amount           NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  vat              NUMERIC(14,2) DEFAULT 0,
  payment_method   TEXT DEFAULT 'EFT',
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── PROJECTS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL,
  client           TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'Planning'
                     CHECK (status IN ('Planning','Active','On Hold','Completed','Cancelled')),
  start_date       DATE DEFAULT CURRENT_DATE,
  end_date         DATE,
  description      TEXT,
  revenue          NUMERIC(14,2) DEFAULT 0,
  costs            JSONB,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quotes_date    ON quotes(date DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_client  ON quotes(client);
CREATE INDEX IF NOT EXISTS idx_quotes_status  ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date  ON invoices(date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_due   ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_expenses_date  ON expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_cat   ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- Triggers
DROP TRIGGER IF EXISTS trg_quotes_updated    ON quotes;
DROP TRIGGER IF EXISTS trg_invoices_updated  ON invoices;
DROP TRIGGER IF EXISTS trg_expenses_updated  ON expenses;
DROP TRIGGER IF EXISTS trg_projects_updated  ON projects;

CREATE TRIGGER trg_quotes_updated    BEFORE UPDATE ON quotes    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_invoices_updated  BEFORE UPDATE ON invoices  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_expenses_updated  BEFORE UPDATE ON expenses  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_projects_updated  BEFORE UPDATE ON projects  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE quotes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices  ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_quotes"    ON quotes;
DROP POLICY IF EXISTS "anon_all_invoices"  ON invoices;
DROP POLICY IF EXISTS "anon_all_expenses"  ON expenses;
DROP POLICY IF EXISTS "anon_all_projects"  ON projects;

CREATE POLICY "anon_all_quotes"    ON quotes    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_invoices"  ON invoices  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_expenses"  ON expenses  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_projects"  ON projects  FOR ALL USING (true) WITH CHECK (true);
