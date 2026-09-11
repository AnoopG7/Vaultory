-- ============================================================================
-- VAULTORY — Migration 2026-09-11: auto-assign sale_number on INSERT
-- ============================================================================
-- Purpose:
--   sales.sale_number is NOT NULL UNIQUE but has no DEFAULT. Callers (the
--   sales store) omit it and rely on the database to generate it, so inserts
--   failed before this trigger existed.
--
-- Requirement: generate_sale_number() (and sale_number_seq) must already be
-- present — they ship in schema.sql under "SEQUENCES & HELPER FUNCTIONS".
-- Idempotent — safe to re-run.
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_sales_assign_sale_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sale_number IS NULL THEN
    NEW.sale_number := generate_sale_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sales_assign_sale_number ON sales;

CREATE TRIGGER sales_assign_sale_number
  BEFORE INSERT ON sales
  FOR EACH ROW EXECUTE FUNCTION trigger_sales_assign_sale_number();