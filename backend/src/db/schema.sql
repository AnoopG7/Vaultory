-- ============================================================================
-- VAULTORY — Production Database Schema  (v1.5 — integrity hardening)
-- ============================================================================
-- Project:   Vaultory — Small Business Inventory & Sales App (SBISA)
-- Database:  PostgreSQL 15+ (Supabase-hosted)
-- Version:   1.5.0
-- Date:      31 Aug 2026
-- Author:    Anoop Gupta (Solutions Architect)
-- Docs:      BRD v3.4 §14 · SRS v1.1 §6 · Sprint Planner v2.2
--
-- CONVENTIONS:
--   • All tables live in the `public` schema.
--   • Auth is managed by Supabase Auth (auth.users); the `profiles` table
--     is the application-side user record linked to auth.uid().
--   • UUIDs for all primary keys (gen_random_uuid()).
--   • snake_case for all identifiers.
--   • Soft deletes (status = 'archived' / 'inactive') — never hard delete.
--   • created_at / updated_at on every mutable table with an auto-trigger.
--   • Explicit CHECK, FK, UNIQUE constraints for data integrity.
--   • All monetary values as NUMERIC(14,2) for precision.
--   • All quantities as NUMERIC(12,3) — supports fractional units (kg, L, g).
--   • Sensitive fields (cost_price, margin, supplier finance) are stored in
--     plain text in the DB; masking is enforced at the application/API layer
--     (SRS §7.2). See §MASKING_STANDARD at end for centralization rules.
--   • stock_movements and audit_logs are IMMUTABLE — triggers block
--     UPDATE and DELETE.
--   • Stock mutations MUST go through fn_mutate_stock() for atomicity.
-- ============================================================================


-- ============================================================================
-- 0. EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- fuzzy search (GIN trigram)
CREATE EXTENSION IF NOT EXISTS "citext";     -- case-insensitive text for SKUs/codes


-- ============================================================================
-- 0a. AUTH SHIM (deployment-compatible)  [F6]
-- ============================================================================
-- `profiles.id` must reference `auth.users(id)` (Supabase Auth owns the
-- password). In a real Supabase project `auth.users` already exists and the
-- `auth` schema is owned by Supabase (roles cannot write to it), so the shim
-- below is a no-op there. In a bare/local Postgres (or CI) it creates a
-- minimal shim purely so the FK resolves and the rest of the schema can be
-- loaded and validated.
--
-- Implementation: `to_regclass('auth.users')` detects whether the table
-- already exists. On Supabase it does, so nothing is created. If a role has
-- no visibility/permission on `auth`, any attempt to create is swallowed by
-- the EXCEPTION block rather than aborting the whole migration.
DO $$
BEGIN
  IF to_regclass('auth.users') IS NULL THEN
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE TABLE auth.users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid()
    );
  END IF;
EXCEPTION
  WHEN insufficient_privilege THEN
    NULL; -- Supabase-managed `auth` schema; table already exists — skip.
END $$;


-- ============================================================================
-- 1. ENUM TYPES
-- ============================================================================

-- User roles (BRD §12 — 4 roles)
CREATE TYPE user_role AS ENUM (
  'admin',
  'store_staff',
  'sales_personnel',
  'senior_stakeholder'
);

-- Entity status (used by most master tables)
CREATE TYPE entity_status AS ENUM ('active', 'archived');

-- Location type (stores vs warehouses)
CREATE TYPE location_type AS ENUM ('store', 'warehouse');

-- Gender (optional identity field on profiles)
CREATE TYPE gender AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');

-- Stock status badges (SRS §4.1.3) — computed at query time
CREATE TYPE stock_status AS ENUM ('out_of_stock', 'low', 'in_stock', 'over_stock');

-- Stock movement types (SRS §4.1.3 — audit trail)
CREATE TYPE movement_type AS ENUM (
  'stock_in',
  'stock_out',
  'transfer_out',
  'transfer_in',
  'adjustment',
  'sale',
  'sale_void',
  'sale_return',
  'po_receipt'
);

-- Purchase order statuses (SRS §4.4.3)
CREATE TYPE po_status AS ENUM (
  'draft',
  'sent',
  'partially_received',
  'received',
  'closed',
  'cancelled'
);

-- Purchase order source
CREATE TYPE po_source AS ENUM ('manual', 'ai_auto');

-- Sale statuses (SRS §4.2.1)
CREATE TYPE sale_status AS ENUM ('active', 'voided');

-- Alert types
CREATE TYPE alert_type AS ENUM (
  'low_stock',
  'out_of_stock',
  'over_stock',
  'po_created',
  'po_received',
  'po_overdue',
  'ai_recommendation',
  'no_supplier',
  'missing_lead_time',
  'expiry_warning',
  'system'
);

-- Alert priority
CREATE TYPE alert_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- AI recommendation types (SRS §8)
CREATE TYPE ai_recommendation_type AS ENUM (
  'reorder_quantity',
  'warehouse_stock_level',
  'safety_stock_suggest',
  'demand_forecast'
);

-- AI recommendation acceptance status
CREATE TYPE ai_recommendation_status AS ENUM (
  'pending',
  'accepted',
  'modified',
  'rejected',
  'expired'
);

-- Audit log action categories
CREATE TYPE audit_action AS ENUM (
  'user_login', 'user_logout', 'user_created', 'user_updated',
  'user_deactivated', 'user_reactivated', 'password_reset',
  'product_created', 'product_updated', 'product_archived', 'product_restored',
  'stock_in', 'stock_out', 'stock_transfer', 'stock_adjustment',
  'sale_created', 'sale_voided', 'sale_returned',
  'po_created', 'po_updated', 'po_sent', 'po_received',
  'po_partially_received', 'po_closed', 'po_cancelled',
  'safety_stock_updated', 'auto_order_toggled',
  'supplier_created', 'supplier_updated', 'supplier_archived',
  'supplier_product_mapped', 'supplier_product_unmapped',
  'ai_recommendation_created', 'ai_recommendation_accepted',
  'ai_recommendation_modified', 'ai_recommendation_rejected',
  'ai_auto_po_created',
  'alert_created', 'alert_read', 'alert_dismissed',
  'category_created', 'category_updated', 'category_archived',
  'unit_created', 'unit_updated',
  'bulk_import', 'bulk_export',
  'setting_updated',
  'sensitive_data_accessed'
);


-- ============================================================================
-- 2. UTILITY FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at on row modification.
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- [H1] Immutability guard — blocks UPDATE and DELETE on append-only tables.
CREATE OR REPLACE FUNCTION trigger_immutable_guard()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION '% on %.% is forbidden — table is append-only',
    TG_OP, TG_TABLE_SCHEMA, TG_TABLE_NAME;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 3. TABLES
-- ============================================================================


-- --------------------------------------------------------------------------
-- 3.1  STORES (business store master)
-- --------------------------------------------------------------------------
-- Business-level store entity (BRD: 3 stores). Each store has ONE physical
-- store-location in `locations` (linked via locations.store_id). Staff map to
-- stores via profiles.store_id; warehouses are NOT stores (store_id = NULL).

CREATE TABLE stores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(120)    NOT NULL,
  code        CITEXT          UNIQUE NOT NULL,                    -- [M2] case-insensitive short code
  city        VARCHAR(100),
  state       VARCHAR(100),
  address     TEXT,
  phone       VARCHAR(20),
  email       CITEXT,
  status      entity_status   NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE stores IS 'Business store master. One physical store-location per store lives in locations (locations.store_id → stores.id).';

CREATE TRIGGER stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- --------------------------------------------------------------------------
-- 3.2  LOCATIONS
-- --------------------------------------------------------------------------
-- Unified physical location master (stores + warehouses).

CREATE TABLE locations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        location_type   NOT NULL,
  store_id    UUID            REFERENCES stores(id) ON DELETE SET NULL,  -- the owning store (NULL for warehouses)
  name        VARCHAR(120)    NOT NULL,
  code        CITEXT          UNIQUE NOT NULL,                   -- [M2] case-insensitive short code
  city        VARCHAR(100),
  address     TEXT,
  phone       VARCHAR(20),
  email       VARCHAR(255),
  is_default  BOOLEAN         NOT NULL DEFAULT FALSE,
  status      entity_status   NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE locations IS 'Physical location master: store-locations + warehouses. stores and warehouses are NOT stores.';
COMMENT ON COLUMN locations.store_id IS 'Owning store for a store-location; NULL for warehouses.';
COMMENT ON COLUMN locations.is_default IS 'If TRUE, this warehouse is the default destination for AI auto-POs.';
COMMENT ON COLUMN locations.code IS 'Case-insensitive short identifier (CITEXT). E.g. STORE-A, WH-CENTRAL.';

-- [M6] Enforce exactly ONE default warehouse.
CREATE UNIQUE INDEX uq_locations_default_warehouse
  ON locations (is_default)
  WHERE is_default = TRUE AND type = 'warehouse';

CREATE TRIGGER locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- [F5] A location's semantic type (store vs warehouse) is immutable once
-- created — changing it would silently invalidate existing stock/sales scope.
CREATE OR REPLACE FUNCTION trigger_guard_location_type()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.type IS DISTINCT FROM NEW.type THEN
    RAISE EXCEPTION 'location type cannot be changed from % to %', OLD.type, NEW.type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER locations_type_guard
  BEFORE UPDATE OF type ON locations
  FOR EACH ROW EXECUTE FUNCTION trigger_guard_location_type();


-- --------------------------------------------------------------------------
-- 3.2  PROFILES (application users)
-- --------------------------------------------------------------------------

CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,  -- [F6] = auth.users.id
  email           CITEXT          NOT NULL,                      -- [M2] case-insensitive
  full_name       VARCHAR(200)    NOT NULL,
  role            user_role       NOT NULL DEFAULT 'store_staff',
  store_id        UUID            REFERENCES stores(id) ON DELETE SET NULL,  -- staff → store
  gender          gender,                                        -- optional identity field
  address         TEXT,                                          -- optional street address
  avatar_url      TEXT,
  phone           VARCHAR(20),
  status          entity_status   NOT NULL DEFAULT 'active',
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE profiles IS 'Application user profiles (staff). Auth (incl. hashed password) lives in Supabase auth.users; this stores role/RBAC + identity.';
COMMENT ON COLUMN profiles.id IS 'Must equal auth.users.id (auth.uid()). Set on signup.';
COMMENT ON COLUMN profiles.store_id IS 'Staff→store mapping. NULL for Admin/Senior (global access); set for Store Staff/Sales as their assigned store.';
COMMENT ON COLUMN profiles.gender IS 'Optional gender identity (male|female|other|prefer_not_to_say).';
COMMENT ON COLUMN profiles.address IS 'Optional staff street address.';

-- [H4] Enforce: store_id must reference a real store (not a warehouse/location).
CREATE OR REPLACE FUNCTION trigger_check_profile_store_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.store_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM stores WHERE id = NEW.store_id
    ) THEN
      RAISE EXCEPTION 'profiles.store_id must reference an existing store, got id=%', NEW.store_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_check_store_type
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_check_profile_store_type();

CREATE INDEX idx_profiles_role       ON profiles(role);
CREATE INDEX idx_profiles_store_id   ON profiles(store_id) WHERE store_id IS NOT NULL;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- --------------------------------------------------------------------------
-- 3.3  CATEGORIES (product classification tree)
-- --------------------------------------------------------------------------

CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        CITEXT          NOT NULL,                          -- [M2] case-insensitive
  parent_id   UUID            REFERENCES categories(id) ON DELETE SET NULL,
  sort_order  INT             NOT NULL DEFAULT 0,
  status      entity_status   NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_category_name_parent UNIQUE (name, parent_id),
  -- [F8] A category cannot be its own parent.
  CONSTRAINT chk_category_parent_not_self CHECK (parent_id IS NULL OR parent_id <> id)
);

COMMENT ON TABLE categories IS 'Hierarchical product categories (self-referencing tree).';

-- [F8] Reject cycles longer than self-reference (A→B→C→A is invalid).
CREATE OR REPLACE FUNCTION trigger_prevent_category_cycle()
RETURNS TRIGGER AS $$
DECLARE
  v_cur UUID := NEW.parent_id;
  v_steps INT := 0;
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  -- Walk up the ancestor chain; if we ever return to NEW.id we have a cycle.
  LOOP
    IF v_cur IS NULL THEN
      EXIT;                                   -- reached root: no cycle
    END IF;
    IF v_cur = NEW.id THEN
      RAISE EXCEPTION 'category cycle detected involving id %', NEW.id;
    END IF;
    v_steps := v_steps + 1;
    IF v_steps > 100 THEN                     -- defensive: never unbounded
      RAISE EXCEPTION 'category ancestor chain too deep';
    END IF;
    SELECT parent_id INTO v_cur FROM categories WHERE id = v_cur;
    IF NOT FOUND THEN
      v_cur := NULL;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER categories_cycle_guard
  BEFORE INSERT OR UPDATE OF parent_id ON categories
  FOR EACH ROW EXECUTE FUNCTION trigger_prevent_category_cycle();

CREATE INDEX idx_categories_parent ON categories(parent_id) WHERE parent_id IS NOT NULL;

-- [N4] UNIQUE(name, parent_id) can't dedupe top-level rows (NULL parent is
-- distinct in Postgres). Enforce unique top-level category names explicitly.
CREATE UNIQUE INDEX uq_categories_name_top
  ON categories (name) WHERE parent_id IS NULL;

CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- --------------------------------------------------------------------------
-- 3.4  UNITS OF MEASURE
-- --------------------------------------------------------------------------

CREATE TABLE units (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         CITEXT       NOT NULL UNIQUE,                     -- [M2] case-insensitive
  abbreviation VARCHAR(10),
  status       entity_status NOT NULL DEFAULT 'active',
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE units IS 'Units of measure. Configurable list (not free-text on products).';

CREATE TRIGGER units_updated_at
  BEFORE UPDATE ON units
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- --------------------------------------------------------------------------
-- 3.5  PRODUCTS (SKU Master)
-- --------------------------------------------------------------------------
-- cost_price is MASKED at the application/API layer (SRS §7).

CREATE TABLE products (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_code              CITEXT          NOT NULL UNIQUE,         -- [M2] case-insensitive, [M1] UNIQUE already indexes
  name                  VARCHAR(200)    NOT NULL,
  description           TEXT,
  category_id           UUID            NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  unit_id               UUID            NOT NULL REFERENCES units(id) ON DELETE RESTRICT,

  -- Pricing (cost_price is MASKED — app layer enforces visibility)
  cost_price            NUMERIC(14,2)   NOT NULL DEFAULT 0.00,  -- ⚠️ MASKED field
  sale_price            NUMERIC(14,2)   NOT NULL DEFAULT 0.00,

  -- Default safety stock values (overridable per-location in safety_stock_rules)
  default_safety_stock    NUMERIC(12,3) NOT NULL DEFAULT 0     CHECK (default_safety_stock >= 0),
  default_reorder_point   NUMERIC(12,3) NOT NULL DEFAULT 0     CHECK (default_reorder_point >= 0),
  default_target_level    NUMERIC(12,3) NOT NULL DEFAULT 0     CHECK (default_target_level >= 0),

  -- Perishable handling (BRD: FR-EXP flag-level, no batch/lot)
  is_perishable         BOOLEAN         NOT NULL DEFAULT FALSE,
  shelf_life_days       INT,

  -- Metadata
  image_url             TEXT,
  barcode               VARCHAR(50),
  weight                NUMERIC(10,3),
  weight_unit           VARCHAR(10),
  notes                 TEXT,

  status                entity_status   NOT NULL DEFAULT 'active',
  created_by            UUID            REFERENCES profiles(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  -- Business rules
  CONSTRAINT chk_product_stock_levels CHECK (
    default_target_level >= default_reorder_point
    AND default_reorder_point >= default_safety_stock
  ),
  CONSTRAINT chk_product_cost_price   CHECK (cost_price >= 0),
  CONSTRAINT chk_product_sale_price   CHECK (sale_price >= 0),
  -- [H6] Perishable ↔ shelf_life consistency
  CONSTRAINT chk_product_shelf_life   CHECK (
    (is_perishable = TRUE  AND shelf_life_days > 0)
    OR (is_perishable = FALSE)
  ),
  -- [M7] weight ↔ weight_unit consistency
  CONSTRAINT chk_product_weight CHECK (
    (weight IS NULL AND weight_unit IS NULL)
    OR (weight IS NOT NULL AND weight_unit IS NOT NULL)
  )
);

COMMENT ON TABLE products IS 'Product/SKU master. cost_price is MASKED (SRS §7). Soft delete via status=archived.';
COMMENT ON COLUMN products.cost_price IS '⚠️ MASKED — visible only to Admin at the API layer.';

-- [M1] Removed duplicate idx_products_sku — UNIQUE constraint already creates an index.
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_name     ON products USING gin (name gin_trgm_ops);  -- fuzzy search

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- --------------------------------------------------------------------------
-- 3.6  SUPPLIERS
-- --------------------------------------------------------------------------

CREATE TABLE suppliers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(200)    NOT NULL,
  code            CITEXT          UNIQUE,                       -- [M2] case-insensitive
  contact_person  VARCHAR(200),
  phone           VARCHAR(20),
  email           CITEXT,                                       -- [M2]
  address         TEXT,
  city            VARCHAR(100),
  lead_time_days  INT             NOT NULL DEFAULT 7   CHECK (lead_time_days > 0),

  -- Finance fields (MASKED per SRS §7.1)
  payment_terms   VARCHAR(100),                                 -- ⚠️ MASKED
  credit_limit    NUMERIC(14,2),                                -- ⚠️ MASKED

  -- Cached performance metrics (updated by app on PO receipt)
  total_pos           INT           NOT NULL DEFAULT 0,
  on_time_deliveries  INT           NOT NULL DEFAULT 0,
  avg_lead_time_days  NUMERIC(5,1),

  notes           TEXT,
  status          entity_status   NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  -- [F9] Financial / operational sanity bounds
  CONSTRAINT chk_supplier_credit_limit CHECK (credit_limit IS NULL OR credit_limit >= 0),
  CONSTRAINT chk_supplier_metrics CHECK (
       total_pos          >= 0
   AND on_time_deliveries >= 0
   AND on_time_deliveries <= total_pos
   AND (avg_lead_time_days IS NULL OR avg_lead_time_days >= 0)
  )
);

COMMENT ON TABLE suppliers IS 'Supplier master. Finance fields (payment_terms, credit_limit) are MASKED at app layer.';

CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- --------------------------------------------------------------------------
-- 3.7  SUPPLIER ↔ PRODUCT MAPPING (many-to-many)
-- --------------------------------------------------------------------------

CREATE TABLE supplier_products (
  supplier_id   UUID NOT NULL REFERENCES suppliers(id)  ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id)   ON DELETE CASCADE,
  unit_cost     NUMERIC(14,2) CHECK (unit_cost IS NULL OR unit_cost >= 0),  -- ⚠️ MASKED
  lead_time_override INT       CHECK (lead_time_override IS NULL OR lead_time_override > 0),
  is_preferred  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (supplier_id, product_id)
);

COMMENT ON TABLE supplier_products IS 'M:N product↔supplier. is_preferred drives auto-PO supplier selection.';

CREATE INDEX idx_supplier_products_product ON supplier_products(product_id);

-- [F7] Exactly one preferred supplier per product (drives deterministic auto-PO).
CREATE UNIQUE INDEX uq_supplier_products_preferred
  ON supplier_products (product_id)
  WHERE is_preferred = TRUE;


-- --------------------------------------------------------------------------
-- 3.8  INVENTORY (Stock on Hand)
-- --------------------------------------------------------------------------
-- One row per (product, location). qty_on_hand is the source of truth.
-- ALL mutations MUST go through fn_mutate_stock() — see §4.

CREATE TABLE inventory (
  product_id          UUID NOT NULL REFERENCES products(id)   ON DELETE RESTRICT,
  location_id         UUID NOT NULL REFERENCES locations(id)  ON DELETE RESTRICT,
  qty_on_hand         NUMERIC(12,3)  NOT NULL DEFAULT 0,      -- [H2] supports fractional
  -- [H6] Basic expiry tracking (no batch model per BRD scope)
  earliest_expiry_date DATE,                                   -- set by app on perishable stock-in
  last_counted_at     TIMESTAMPTZ,
  last_movement_at    TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (product_id, location_id),
  CONSTRAINT chk_inventory_qty CHECK (qty_on_hand >= 0)       -- [D2] no negative stock
);

COMMENT ON TABLE inventory IS 'Stock per (product, location). Mutate ONLY via fn_mutate_stock(). qty_on_hand >= 0 enforced.';
COMMENT ON COLUMN inventory.earliest_expiry_date IS 'Earliest known expiry for this stock (set by app on perishable stock-in). No batch/lot model.';

CREATE INDEX idx_inventory_location ON inventory(location_id);
-- [M1] Removed low-selectivity idx_inventory_qty.

CREATE TRIGGER inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- --------------------------------------------------------------------------
-- 3.9  SAFETY STOCK RULES
-- --------------------------------------------------------------------------

CREATE TABLE safety_stock_rules (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          UUID NOT NULL REFERENCES products(id)   ON DELETE CASCADE,
  location_id         UUID REFERENCES locations(id)           ON DELETE CASCADE,  -- NULL = global default
  safety_stock        NUMERIC(12,3) NOT NULL DEFAULT 0     CHECK (safety_stock >= 0),
  reorder_point       NUMERIC(12,3) NOT NULL DEFAULT 0     CHECK (reorder_point >= 0),
  target_level        NUMERIC(12,3) NOT NULL DEFAULT 0     CHECK (target_level >= 0),
  auto_order_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  auto_approve        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_ssr_levels CHECK (
    target_level >= reorder_point AND reorder_point >= safety_stock
  )
);

COMMENT ON TABLE safety_stock_rules IS 'Safety stock config per product/location. location_id=NULL is the global fallback.';

-- [C3] Fix: standard UNIQUE allows multiple (product, NULL) rows.
-- Use two separate indexes to enforce uniqueness correctly.
CREATE UNIQUE INDEX uq_ssr_product_location
  ON safety_stock_rules(product_id, location_id)
  WHERE location_id IS NOT NULL;

CREATE UNIQUE INDEX uq_ssr_product_global
  ON safety_stock_rules(product_id)
  WHERE location_id IS NULL;

CREATE INDEX idx_ssr_auto ON safety_stock_rules(auto_order_enabled) WHERE auto_order_enabled = TRUE;

CREATE TRIGGER safety_stock_rules_updated_at
  BEFORE UPDATE ON safety_stock_rules
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- --------------------------------------------------------------------------
-- 3.10  PURCHASE ORDERS (header)
-- --------------------------------------------------------------------------

CREATE TABLE purchase_orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number         CITEXT        NOT NULL UNIQUE,              -- [M2] case-insensitive
  supplier_id       UUID          NOT NULL REFERENCES suppliers(id)  ON DELETE RESTRICT,
  destination_id    UUID          NOT NULL REFERENCES locations(id)  ON DELETE RESTRICT,
  source            po_source     NOT NULL DEFAULT 'manual',
  status            po_status     NOT NULL DEFAULT 'draft',

  -- Dates
  order_date        DATE          NOT NULL DEFAULT CURRENT_DATE,
  expected_date     DATE,
  received_date     DATE,

  -- Totals (denormalized — maintained by trigger on po_lines changes) [H3]
  total_items       INT           NOT NULL DEFAULT 0,
  total_qty_ordered NUMERIC(12,3) NOT NULL DEFAULT 0,           -- [H2]
  total_qty_received NUMERIC(12,3) NOT NULL DEFAULT 0,          -- [H2]
  total_cost        NUMERIC(14,2) NOT NULL DEFAULT 0.00,        -- ⚠️ MASKED

  -- People
  created_by        UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by       UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at       TIMESTAMPTZ,
  cancelled_by      UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  cancelled_at      TIMESTAMPTZ,
  cancel_reason     TEXT,

  -- [C1] AI reference — FK added via ALTER TABLE after ai_recommendations table
  ai_recommendation_id UUID,

  notes             TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- [H7] State-transition timestamp constraints
  CONSTRAINT chk_po_void_timestamps CHECK (
    (status != 'cancelled' OR cancelled_at IS NOT NULL)
    AND (status = 'cancelled' OR (cancelled_at IS NULL AND cancelled_by IS NULL))
  ),
  CONSTRAINT chk_po_approval_timestamps CHECK (
    (approved_at IS NULL AND approved_by IS NULL)
    OR (approved_at IS NOT NULL AND approved_by IS NOT NULL)
  ),
  CONSTRAINT chk_po_received_date CHECK (
    (status NOT IN ('received', 'closed') OR received_date IS NOT NULL)
  )
);

COMMENT ON TABLE purchase_orders IS 'PO headers. Lifecycle: draft→sent→partially_received→received→closed. Any→cancelled.';

CREATE INDEX idx_po_supplier      ON purchase_orders(supplier_id);
CREATE INDEX idx_po_destination   ON purchase_orders(destination_id);
-- [M1] Removed low-selectivity idx_po_status.
CREATE INDEX idx_po_order_date    ON purchase_orders(order_date);
CREATE INDEX idx_po_expected_date ON purchase_orders(expected_date);
CREATE INDEX idx_po_open ON purchase_orders(supplier_id, destination_id)
  WHERE status NOT IN ('received', 'closed', 'cancelled');

-- [H4] Enforce: destination_id must be a store or warehouse (no constraint on type for POs —
-- goods can go to either). No additional trigger needed here.

CREATE TRIGGER purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- --------------------------------------------------------------------------
-- 3.11  PURCHASE ORDER LINES
-- --------------------------------------------------------------------------

CREATE TABLE po_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id           UUID          NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id      UUID          NOT NULL REFERENCES products(id)       ON DELETE RESTRICT,
  qty_ordered     NUMERIC(12,3) NOT NULL CHECK (qty_ordered > 0),      -- [H2]
  qty_received    NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (qty_received >= 0), -- [H2]
  unit_cost       NUMERIC(14,2) NOT NULL DEFAULT 0.00,                 -- ⚠️ MASKED
  line_total      NUMERIC(14,2) GENERATED ALWAYS AS (qty_ordered * unit_cost) STORED,
  notes           TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_po_line_received CHECK (qty_received <= qty_ordered),
  CONSTRAINT uq_po_line_product UNIQUE (po_id, product_id),
  -- [B] Composite uniqueness so po_receipt_lines can FK to (id, po_id)
  CONSTRAINT uq_po_lines_id_po UNIQUE (id, po_id)
);

CREATE INDEX idx_po_lines_po      ON po_lines(po_id);
CREATE INDEX idx_po_lines_product ON po_lines(product_id);

CREATE TRIGGER po_lines_updated_at
  BEFORE UPDATE ON po_lines
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- [H3] Trigger: recompute PO header totals when lines change.
CREATE OR REPLACE FUNCTION trigger_po_recompute_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_po_id UUID;
BEGIN
  v_po_id := COALESCE(NEW.po_id, OLD.po_id);
  UPDATE purchase_orders SET
    total_items       = (SELECT COUNT(*)         FROM po_lines WHERE po_id = v_po_id),
    total_qty_ordered = (SELECT COALESCE(SUM(qty_ordered), 0)  FROM po_lines WHERE po_id = v_po_id),
    total_qty_received= (SELECT COALESCE(SUM(qty_received), 0) FROM po_lines WHERE po_id = v_po_id),
    total_cost        = (SELECT COALESCE(SUM(line_total), 0)   FROM po_lines WHERE po_id = v_po_id)
  WHERE id = v_po_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER po_lines_recompute
  AFTER INSERT OR UPDATE OR DELETE ON po_lines
  FOR EACH ROW EXECUTE FUNCTION trigger_po_recompute_totals();

-- [F10] A PO line permanently belongs to its PO — moving it between POs
-- would leave the previous header's totals stale.
CREATE OR REPLACE FUNCTION trigger_guard_po_line_parent()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.po_id IS DISTINCT FROM NEW.po_id THEN
    RAISE EXCEPTION 'po_lines.po_id cannot be changed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER po_lines_parent_guard
  BEFORE UPDATE OF po_id ON po_lines
  FOR EACH ROW EXECUTE FUNCTION trigger_guard_po_line_parent();


-- --------------------------------------------------------------------------
-- 3.12  PO RECEIPTS (per-delivery history) [H5]
-- --------------------------------------------------------------------------
-- Each time goods are received against a PO, a receipt is recorded.

CREATE TABLE po_receipts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id           UUID          NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  received_by     UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  received_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  notes           TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- [B] Composite target for the receipt-line FK (ties receipt to its PO)
  CONSTRAINT uq_po_receipts_id_po UNIQUE (id, po_id)
);

COMMENT ON TABLE po_receipts IS 'Per-delivery receipt events for a PO. Each receipt contains lines for what was actually received.';

CREATE INDEX idx_po_receipts_po ON po_receipts(po_id);


CREATE TABLE po_receipt_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id      UUID          NOT NULL REFERENCES po_receipts(id) ON DELETE CASCADE,
  po_line_id      UUID          NOT NULL REFERENCES po_lines(id)    ON DELETE CASCADE,
  po_id           UUID          NOT NULL,                            -- [B] denormalized copy of the receipt's PO, used by composite FK
  product_id      UUID          NOT NULL REFERENCES products(id)    ON DELETE RESTRICT,
  qty_received    NUMERIC(12,3) NOT NULL CHECK (qty_received > 0),  -- [H2]
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- [B] Cross-PO integrity: the po_line must belong to the SAME PO as the receipt.
  CONSTRAINT fk_prl_receipt_po FOREIGN KEY (receipt_id, po_id)
    REFERENCES po_receipts(id, po_id) ON DELETE CASCADE,
  CONSTRAINT fk_prl_po_line_po FOREIGN KEY (po_line_id, po_id)
    REFERENCES po_lines(id, po_id)   ON DELETE CASCADE
);

COMMENT ON TABLE po_receipt_lines IS 'What was received in each delivery. Updates po_lines.qty_received and inventory via app/fn.';

CREATE INDEX idx_po_receipt_lines_receipt ON po_receipt_lines(receipt_id);
CREATE INDEX idx_po_receipt_lines_poline  ON po_receipt_lines(po_line_id);


-- --------------------------------------------------------------------------
-- 3.13  SALES (header)
-- --------------------------------------------------------------------------

CREATE TABLE sales (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number     CITEXT        NOT NULL UNIQUE,                -- [M2]
  store_id        UUID          NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  sale_datetime   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- Totals (denormalized — maintained by trigger on sale_lines changes) [H3]
  total_items     INT           NOT NULL DEFAULT 0,
  total_qty       NUMERIC(12,3) NOT NULL DEFAULT 0,             -- [H2]
  subtotal        NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  discount        NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),  -- [M8]
  total           NUMERIC(14,2) NOT NULL DEFAULT 0.00,

  status          sale_status   NOT NULL DEFAULT 'active',

  -- Void metadata
  voided_by       UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  voided_at       TIMESTAMPTZ,
  void_reason     TEXT,

  created_by      UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- [H7] State-transition constraints
  CONSTRAINT chk_sale_void_timestamps CHECK (
    (status = 'active'  AND voided_at IS NULL AND voided_by IS NULL AND void_reason IS NULL)
    OR (status = 'voided' AND voided_at IS NOT NULL AND voided_by IS NOT NULL AND void_reason IS NOT NULL)
  ),
  -- [M8] total consistency
  CONSTRAINT chk_sale_total CHECK (total >= 0 AND subtotal >= 0 AND total = subtotal - discount)
);

COMMENT ON TABLE sales IS 'Sale transactions. Immutable after save except void (Admin). Stock auto-deducted.';

-- [H4] Enforce: store_id must reference a real store.
CREATE OR REPLACE FUNCTION trigger_check_sale_store_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM stores WHERE id = NEW.store_id
  ) THEN
    RAISE EXCEPTION 'sales.store_id must reference an existing store, got id=%', NEW.store_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sales_check_store_type
  BEFORE INSERT OR UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION trigger_check_sale_store_type();

CREATE INDEX idx_sales_store_datetime ON sales(store_id, sale_datetime);
-- [M5] Timezone-safe date index: store the UTC date for consistent daily reports.
-- NOTE: must use CAST(... AS date) — the ::DATE shorthand fails inside an index
-- expression that contains AT TIME ZONE (PostgreSQL parser quirk).
CREATE INDEX idx_sales_date_utc ON sales(CAST(sale_datetime AT TIME ZONE 'UTC' AS DATE));
-- [M1] Removed redundant idx_sales_store, idx_sales_datetime, idx_sales_status, idx_sales_date_only.

CREATE TRIGGER sales_updated_at
  BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- --------------------------------------------------------------------------
-- 3.14  SALE LINES
-- --------------------------------------------------------------------------

CREATE TABLE sale_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id         UUID          NOT NULL REFERENCES sales(id)    ON DELETE CASCADE,
  product_id      UUID          NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  qty             NUMERIC(12,3) NOT NULL CHECK (qty > 0),       -- [H2]
  unit_price      NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
  line_total      NUMERIC(14,2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sale_lines_sale    ON sale_lines(sale_id);
CREATE INDEX idx_sale_lines_product ON sale_lines(product_id);

-- [H3] Trigger: recompute sale header totals when lines change.
CREATE OR REPLACE FUNCTION trigger_sale_recompute_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_sale_id UUID;
  v_subtotal NUMERIC(14,2);
  v_discount NUMERIC(14,2);
BEGIN
  v_sale_id := COALESCE(NEW.sale_id, OLD.sale_id);
  SELECT COALESCE(SUM(line_total), 0) INTO v_subtotal FROM sale_lines WHERE sale_id = v_sale_id;
  SELECT discount INTO v_discount FROM sales WHERE id = v_sale_id;
  UPDATE sales SET
    total_items = (SELECT COUNT(*)              FROM sale_lines WHERE sale_id = v_sale_id),
    total_qty   = (SELECT COALESCE(SUM(qty), 0) FROM sale_lines WHERE sale_id = v_sale_id),
    subtotal    = v_subtotal,
    total       = v_subtotal - COALESCE(v_discount, 0)
  WHERE id = v_sale_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sale_lines_recompute
  AFTER INSERT OR UPDATE OR DELETE ON sale_lines
  FOR EACH ROW EXECUTE FUNCTION trigger_sale_recompute_totals();

-- [F10] A sale line permanently belongs to its sale — moving it between
-- sales would leave the previous header's totals stale.
CREATE OR REPLACE FUNCTION trigger_guard_sale_line_parent()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.sale_id IS DISTINCT FROM NEW.sale_id THEN
    RAISE EXCEPTION 'sale_lines.sale_id cannot be changed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sale_lines_parent_guard
  BEFORE UPDATE OF sale_id ON sale_lines
  FOR EACH ROW EXECUTE FUNCTION trigger_guard_sale_line_parent();

-- [A] Keep total in sync when discount changes directly on the header.
-- chk_sale_total requires total = subtotal - discount, so a bare UPDATE of
-- discount (or an INSERT with discount set before lines exist) would otherwise
-- fail / leave total stale.
CREATE OR REPLACE FUNCTION trigger_sale_recompute_total_on_discount()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total := NEW.subtotal - COALESCE(NEW.discount, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sales_recompute_total_on_discount
  BEFORE INSERT OR UPDATE OF discount ON sales
  FOR EACH ROW EXECUTE FUNCTION trigger_sale_recompute_total_on_discount();


-- --------------------------------------------------------------------------
-- 3.15  SALE RETURNS [M9]
-- --------------------------------------------------------------------------

CREATE TABLE sale_returns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id         UUID          NOT NULL REFERENCES sales(id)    ON DELETE RESTRICT,
  store_id        UUID          NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  return_datetime TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  reason          TEXT          NOT NULL,
  refund_amount   NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (refund_amount >= 0),
  created_by      UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE sale_returns IS 'Structured return records linked to original sale. Lines detail which products/qtys returned.';

CREATE INDEX idx_sale_returns_sale ON sale_returns(sale_id);

-- [N1] Enforce: store_id must be a real store AND match the sale's store.
CREATE OR REPLACE FUNCTION trigger_check_return_store()
RETURNS TRIGGER AS $$
DECLARE
  v_sale_store UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM stores WHERE id = NEW.store_id
  ) THEN
    RAISE EXCEPTION 'sale_returns.store_id must reference an existing store, got id=%', NEW.store_id;
  END IF;
  SELECT store_id INTO v_sale_store FROM sales WHERE id = NEW.sale_id;
  IF v_sale_store IS NULL THEN
    RAISE EXCEPTION 'sale_returns.sale_id % does not exist', NEW.sale_id;
  END IF;
  IF v_sale_store <> NEW.store_id THEN
    RAISE EXCEPTION 'sale_returns.store_id (%) must match the sale''s store (%)', NEW.store_id, v_sale_store;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sale_returns_check_store
  BEFORE INSERT OR UPDATE ON sale_returns
  FOR EACH ROW EXECUTE FUNCTION trigger_check_return_store();


CREATE TABLE sale_return_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id       UUID          NOT NULL REFERENCES sale_returns(id)  ON DELETE CASCADE,
  product_id      UUID          NOT NULL REFERENCES products(id)     ON DELETE RESTRICT,
  sale_line_id    UUID          NOT NULL REFERENCES sale_lines(id)   ON DELETE RESTRICT,  -- [N2]
  qty_returned    NUMERIC(12,3) NOT NULL CHECK (qty_returned > 0),   -- [H2]
  unit_price      NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
  line_refund     NUMERIC(14,2) GENERATED ALWAYS AS (qty_returned * unit_price) STORED,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_sale_return_line_product UNIQUE (return_id, sale_line_id)
);

COMMENT ON TABLE sale_return_lines IS 'Line items of a sale return. product_id must match the referenced sale_line''s product; total returned per sale_line cannot exceed what was sold.';

CREATE INDEX idx_sale_return_lines_return ON sale_return_lines(return_id);
CREATE INDEX idx_sale_return_lines_saleline ON sale_return_lines(sale_line_id);

-- [N2] Cross-checks on a return line:
--   • product_id must equal the sale_line's product
--   • total qty returned for a sale_line (incl. this row) cannot exceed sold qty
CREATE OR REPLACE FUNCTION trigger_check_sale_return_line()
RETURNS TRIGGER AS $$
DECLARE
  v_line_product UUID;
  v_sold_qty     NUMERIC(12,3);
  v_total_returned NUMERIC(12,3);
BEGIN
  SELECT product_id, qty INTO v_line_product, v_sold_qty
    FROM sale_lines WHERE id = NEW.sale_line_id;
  IF v_line_product IS NULL THEN
    RAISE EXCEPTION 'sale_line % does not exist', NEW.sale_line_id;
  END IF;
  IF v_line_product <> NEW.product_id THEN
    RAISE EXCEPTION 'sale_return_lines.product_id (%) must match sale_line''s product (%)', NEW.product_id, v_line_product;
  END IF;
  SELECT COALESCE(SUM(qty_returned), 0) INTO v_total_returned
    FROM sale_return_lines WHERE sale_line_id = NEW.sale_line_id;
  -- In a BEFORE trigger NEW isn't committed yet (and on UPDATE OLD already is),
  -- so exclude OLD's contribution and add the NEW row's qty explicitly.
  v_total_returned := v_total_returned - COALESCE(OLD.qty_returned, 0) + NEW.qty_returned;
  IF v_total_returned > v_sold_qty THEN
    RAISE EXCEPTION 'total returned (%) exceeds sold qty (%) for sale_line %',
      v_total_returned, v_sold_qty, NEW.sale_line_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sale_return_lines_check
  BEFORE INSERT OR UPDATE ON sale_return_lines
  FOR EACH ROW EXECUTE FUNCTION trigger_check_sale_return_line();

-- [N3] Recompute the return's refund_amount from its lines so the header
-- cannot diverge from actual returned value.
CREATE OR REPLACE FUNCTION trigger_return_recompute_refund()
RETURNS TRIGGER AS $$
DECLARE
  v_return_id UUID;
BEGIN
  v_return_id := COALESCE(NEW.return_id, OLD.return_id);
  UPDATE sale_returns SET
    refund_amount = (SELECT COALESCE(SUM(line_refund), 0)
                     FROM sale_return_lines WHERE return_id = v_return_id)
  WHERE id = v_return_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sale_return_lines_recompute
  AFTER INSERT OR UPDATE OR DELETE ON sale_return_lines
  FOR EACH ROW EXECUTE FUNCTION trigger_return_recompute_refund();


-- --------------------------------------------------------------------------
-- 3.16  STOCK MOVEMENTS (immutable audit trail)
-- --------------------------------------------------------------------------
-- Append-only. UPDATE/DELETE blocked by trigger. [H1]

CREATE TABLE stock_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID          NOT NULL REFERENCES products(id)   ON DELETE RESTRICT,
  location_id     UUID          NOT NULL REFERENCES locations(id)  ON DELETE RESTRICT,
  type            movement_type NOT NULL,
  qty             NUMERIC(12,3) NOT NULL,                           -- [H2] positive=increase, negative=decrease
  qty_before      NUMERIC(12,3),                                    -- snapshot before
  qty_after       NUMERIC(12,3),                                    -- snapshot after

  -- References (set based on type — constrained below) [H8]
  sale_id         UUID          REFERENCES sales(id)            ON DELETE SET NULL,
  sale_line_id    UUID          REFERENCES sale_lines(id)       ON DELETE SET NULL,
  po_id           UUID          REFERENCES purchase_orders(id)  ON DELETE SET NULL,
  po_line_id      UUID          REFERENCES po_lines(id)         ON DELETE SET NULL,
  return_id       UUID          REFERENCES sale_returns(id)     ON DELETE SET NULL,
  transfer_ref    UUID,

  reason          TEXT,
  notes           TEXT,
  created_by      UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- [H8] Sign constraints: certain types MUST have specific sign
  CONSTRAINT chk_movement_sign CHECK (
    CASE type
      WHEN 'stock_in'     THEN qty > 0
      WHEN 'po_receipt'   THEN qty > 0
      WHEN 'transfer_in'  THEN qty > 0
      WHEN 'sale_void'    THEN qty > 0
      WHEN 'sale_return'  THEN qty > 0
      WHEN 'stock_out'    THEN qty < 0
      WHEN 'transfer_out' THEN qty < 0
      WHEN 'sale'         THEN qty < 0
      WHEN 'adjustment'   THEN TRUE     -- can be +/-
    END
  ),
  -- [H8] Reference constraints: types must reference correct entities
  CONSTRAINT chk_movement_sale_ref CHECK (
    (type IN ('sale', 'sale_void') AND sale_id IS NOT NULL)
    OR (type NOT IN ('sale', 'sale_void') AND sale_id IS NULL)
  ),
  CONSTRAINT chk_movement_po_ref CHECK (
    (type = 'po_receipt' AND po_id IS NOT NULL AND po_line_id IS NOT NULL)
    OR (type = 'stock_in' AND po_id IS NOT NULL AND po_line_id IS NOT NULL)
    OR (type NOT IN ('po_receipt', 'stock_in') AND po_id IS NULL AND po_line_id IS NULL)
  ),
  CONSTRAINT chk_movement_return_ref CHECK (
    (type = 'sale_return' AND return_id IS NOT NULL)
    OR (type != 'sale_return' AND return_id IS NULL)
  ),
  CONSTRAINT chk_movement_transfer_ref CHECK (
    (type IN ('transfer_in', 'transfer_out') AND transfer_ref IS NOT NULL)
    OR (type NOT IN ('transfer_in', 'transfer_out') AND transfer_ref IS NULL)
  )
);

COMMENT ON TABLE stock_movements IS 'IMMUTABLE audit trail. UPDATE/DELETE blocked by trigger. Use fn_mutate_stock() to write.';

CREATE INDEX idx_movements_product_loc ON stock_movements(product_id, location_id, created_at);
CREATE INDEX idx_movements_type        ON stock_movements(type);
CREATE INDEX idx_movements_created_at  ON stock_movements(created_at);
CREATE INDEX idx_movements_sale        ON stock_movements(sale_id)       WHERE sale_id IS NOT NULL;
CREATE INDEX idx_movements_po          ON stock_movements(po_id)         WHERE po_id IS NOT NULL;
CREATE INDEX idx_movements_transfer    ON stock_movements(transfer_ref)  WHERE transfer_ref IS NOT NULL;

-- [H1] Immutability guard — block UPDATE and DELETE.
CREATE TRIGGER stock_movements_immutable
  BEFORE UPDATE OR DELETE ON stock_movements
  FOR EACH ROW EXECUTE FUNCTION trigger_immutable_guard();


-- --------------------------------------------------------------------------
-- 3.17  ALERTS
-- --------------------------------------------------------------------------

CREATE TABLE alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            alert_type      NOT NULL,
  priority        alert_priority  NOT NULL DEFAULT 'medium',
  title           VARCHAR(200)    NOT NULL,
  message         TEXT            NOT NULL,

  -- Context references (all optional)
  product_id      UUID            REFERENCES products(id)   ON DELETE SET NULL,
  location_id     UUID            REFERENCES locations(id)  ON DELETE SET NULL,
  po_id           UUID            REFERENCES purchase_orders(id) ON DELETE SET NULL,
  -- [C1] ai_recommendation_id FK deferred to ALTER TABLE
  ai_recommendation_id UUID,

  target_roles    user_role[]     NOT NULL DEFAULT '{admin}',

  is_resolved     BOOLEAN         NOT NULL DEFAULT FALSE,
  resolved_at     TIMESTAMPTZ,
  resolved_by     UUID            REFERENCES profiles(id) ON DELETE SET NULL,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE alerts IS 'System alerts. Targeted to roles via target_roles array.';

CREATE INDEX idx_alerts_type          ON alerts(type);
CREATE INDEX idx_alerts_resolved      ON alerts(is_resolved) WHERE is_resolved = FALSE;
CREATE INDEX idx_alerts_created_at    ON alerts(created_at);
CREATE INDEX idx_alerts_target_roles  ON alerts USING GIN (target_roles);


-- --------------------------------------------------------------------------
-- 3.18  ALERT READS (per-user read tracking)
-- --------------------------------------------------------------------------

CREATE TABLE alert_reads (
  alert_id    UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dismissed   BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (alert_id, user_id)
);

CREATE INDEX idx_alert_reads_user ON alert_reads(user_id);


-- --------------------------------------------------------------------------
-- 3.19  ALERT PREFERENCES
-- --------------------------------------------------------------------------

CREATE TABLE alert_preferences (
  user_id               UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  notify_low_stock      BOOLEAN NOT NULL DEFAULT TRUE,
  notify_out_of_stock   BOOLEAN NOT NULL DEFAULT TRUE,
  notify_po_created     BOOLEAN NOT NULL DEFAULT TRUE,
  notify_po_received    BOOLEAN NOT NULL DEFAULT TRUE,
  notify_po_overdue     BOOLEAN NOT NULL DEFAULT FALSE,
  notify_ai_recommendation BOOLEAN NOT NULL DEFAULT TRUE,
  notify_expiry_warning BOOLEAN NOT NULL DEFAULT FALSE,
  email_enabled         BOOLEAN NOT NULL DEFAULT FALSE,
  email_address         VARCHAR(255),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER alert_preferences_updated_at
  BEFORE UPDATE ON alert_preferences
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- --------------------------------------------------------------------------
-- 3.20  AI RECOMMENDATIONS
-- --------------------------------------------------------------------------

CREATE TABLE ai_recommendations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type                ai_recommendation_type    NOT NULL,
  status              ai_recommendation_status  NOT NULL DEFAULT 'pending',

  product_id          UUID        NOT NULL REFERENCES products(id)  ON DELETE CASCADE,
  location_id         UUID        REFERENCES locations(id)          ON DELETE SET NULL,

  -- [M3] Value constraints
  recommended_value   NUMERIC(12,3) NOT NULL CHECK (recommended_value >= 0),
  current_value       NUMERIC(12,3) CHECK (current_value IS NULL OR current_value >= 0),

  reasoning           TEXT        NOT NULL,
  model_used          VARCHAR(100),
  confidence          NUMERIC(3,2) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),  -- [M3]

  input_data          JSONB,

  -- Outcome
  accepted_value      NUMERIC(12,3),
  acted_on_by         UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  acted_on_at         TIMESTAMPTZ,
  rejection_reason    TEXT,

  resulting_po_id     UUID,       -- FK deferred to ALTER TABLE

  expires_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE ai_recommendations IS 'All AI recommendations with inputs, reasoning, and outcome. Audit trail.';

CREATE INDEX idx_ai_rec_product    ON ai_recommendations(product_id);
CREATE INDEX idx_ai_rec_type       ON ai_recommendations(type);
CREATE INDEX idx_ai_rec_status     ON ai_recommendations(status);
CREATE INDEX idx_ai_rec_created_at ON ai_recommendations(created_at);

CREATE TRIGGER ai_recommendations_updated_at
  BEFORE UPDATE ON ai_recommendations
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- --------------------------------------------------------------------------
-- 3.20a  DEFERRED FOREIGN KEYS (circular references) [C1]
-- --------------------------------------------------------------------------

ALTER TABLE purchase_orders
  ADD CONSTRAINT fk_po_ai_recommendation
  FOREIGN KEY (ai_recommendation_id) REFERENCES ai_recommendations(id) ON DELETE SET NULL;

ALTER TABLE ai_recommendations
  ADD CONSTRAINT fk_ai_rec_resulting_po
  FOREIGN KEY (resulting_po_id) REFERENCES purchase_orders(id) ON DELETE SET NULL;

ALTER TABLE alerts
  ADD CONSTRAINT fk_alert_ai_recommendation
  FOREIGN KEY (ai_recommendation_id) REFERENCES ai_recommendations(id) ON DELETE SET NULL;


-- --------------------------------------------------------------------------
-- 3.21  AUDIT LOGS (immutable)
-- --------------------------------------------------------------------------
-- UPDATE/DELETE blocked by trigger. [H1]

CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id        UUID            REFERENCES profiles(id) ON DELETE SET NULL,
  actor_email     VARCHAR(255),
  actor_role      user_role,
  action          audit_action    NOT NULL,
  entity          VARCHAR(50)     NOT NULL,
  entity_id       UUID,
  detail          JSONB,
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE audit_logs IS 'IMMUTABLE audit trail. UPDATE/DELETE blocked by trigger. Sensitive values MASKED in detail JSONB.';

CREATE INDEX idx_audit_actor      ON audit_logs(actor_id);
CREATE INDEX idx_audit_action     ON audit_logs(action);
CREATE INDEX idx_audit_entity     ON audit_logs(entity, entity_id);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at);

-- [H1] Immutability guard.
CREATE TRIGGER audit_logs_immutable
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION trigger_immutable_guard();


-- --------------------------------------------------------------------------
-- 3.22  APP SETTINGS
-- --------------------------------------------------------------------------

CREATE TABLE app_settings (
  key           VARCHAR(100) PRIMARY KEY,
  value         JSONB        NOT NULL,
  description   TEXT,
  updated_by    UUID         REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE app_settings IS 'Global key-value settings.';

INSERT INTO app_settings (key, value, description) VALUES
  ('fast_mover_threshold',       '30',    'Min units sold per 90-day rolling window → Fast mover'),
  ('slow_mover_threshold',       '5',     'Max units sold per 90-day rolling window → Slow mover'),
  ('mover_window_days',          '90',    'Rolling window for mover classification'),
  ('ai_forecast_window_days',    '90',    'Sales history window for AI forecasting'),
  ('ai_forecast_min_days',       '14',    'Minimum days of history for AI forecasting'),
  ('ai_safety_buffer_pct',       '0.20',  'Safety buffer % for warehouse AI recommendations'),
  ('ai_default_lead_time_days',  '7',     'Default lead time if supplier is unknown'),
  ('max_import_rows',            '5000',  'Max rows per CSV import'),
  ('max_import_file_mb',         '10',    'Max import file size in MB'),
  ('session_timeout_minutes',    '60',    'Session timeout'),
  ('max_failed_logins',          '5',     'Max failed logins before lockout'),
  ('expiry_warning_days',        '14',    'Days before expiry to fire expiry_warning alert')
ON CONFLICT (key) DO NOTHING;

-- [M4] Removed dead po_number_prefix / sale_number_prefix keys. Prefixes are
-- hardcoded in the generate functions below. If configurable prefixes are needed
-- in the future, the app layer can read app_settings and pass to the function.

CREATE TRIGGER app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- --------------------------------------------------------------------------
-- 3.23  ONBOARDING PROGRESS
-- --------------------------------------------------------------------------

CREATE TABLE onboarding_progress (
  user_id         UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  is_completed    BOOLEAN     NOT NULL DEFAULT FALSE,
  current_step    INT         NOT NULL DEFAULT 1 CHECK (current_step >= 1 AND current_step <= 6),
  step1_locations BOOLEAN     NOT NULL DEFAULT FALSE,
  step2_users     BOOLEAN     NOT NULL DEFAULT FALSE,
  step3_products  BOOLEAN     NOT NULL DEFAULT FALSE,
  step4_suppliers BOOLEAN     NOT NULL DEFAULT FALSE,
  step5_stock     BOOLEAN     NOT NULL DEFAULT FALSE,
  step6_safety    BOOLEAN     NOT NULL DEFAULT FALSE,
  skipped         BOOLEAN     NOT NULL DEFAULT FALSE,
  completed_at    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER onboarding_progress_updated_at
  BEFORE UPDATE ON onboarding_progress
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- ============================================================================
-- 4. SEQUENCES & HELPER FUNCTIONS
-- ============================================================================

CREATE SEQUENCE po_number_seq  START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE sale_number_seq START WITH 1 INCREMENT BY 1;

-- [M4] Hardcoded prefixes (no dead app_settings dependency)
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS VARCHAR(30) AS $$
BEGIN
  RETURN 'PO-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('po_number_seq')::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_sale_number()
RETURNS VARCHAR(30) AS $$
BEGIN
  RETURN 'SAL-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('sale_number_seq')::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Compute stock status badge (pure function, no side effects)
CREATE OR REPLACE FUNCTION compute_stock_status(
  p_qty       NUMERIC,
  p_reorder   NUMERIC,
  p_target    NUMERIC
)
RETURNS stock_status AS $$
BEGIN
  IF p_qty = 0 THEN RETURN 'out_of_stock';
  ELSIF p_qty <= p_reorder THEN RETURN 'low';
  ELSIF p_target > 0 AND p_qty > p_target THEN RETURN 'over_stock';
  ELSE RETURN 'in_stock';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ============================================================================
-- 5. ATOMIC STOCK MUTATION FUNCTION [C4]
-- ============================================================================
-- ALL stock changes MUST go through this function.
-- It atomically: updates inventory, inserts stock_movement, updates timestamps.
-- Call via Supabase RPC or from backend.

CREATE OR REPLACE FUNCTION fn_mutate_stock(
  p_product_id   UUID,
  p_location_id  UUID,
  p_type         movement_type,
  p_qty          NUMERIC(12,3),        -- signed: positive for in, negative for out
  p_created_by   UUID DEFAULT NULL,
  p_reason       TEXT DEFAULT NULL,
  p_notes        TEXT DEFAULT NULL,
  p_sale_id      UUID DEFAULT NULL,
  p_sale_line_id UUID DEFAULT NULL,
  p_po_id        UUID DEFAULT NULL,
  p_po_line_id   UUID DEFAULT NULL,
  p_return_id    UUID DEFAULT NULL,
  p_transfer_ref UUID DEFAULT NULL,
  p_earliest_expiry_date DATE DEFAULT NULL   -- [N5] set on perishable stock-in
)
RETURNS UUID AS $$
DECLARE
  v_qty_before NUMERIC(12,3);
  v_qty_after  NUMERIC(12,3);
  v_movement_id UUID;
BEGIN
  -- Lock the inventory row (or create if not exists)
  INSERT INTO inventory (product_id, location_id, qty_on_hand)
    VALUES (p_product_id, p_location_id, 0)
    ON CONFLICT (product_id, location_id) DO NOTHING;

  -- Lock row for update (prevents concurrent mutations)
  SELECT qty_on_hand INTO v_qty_before
    FROM inventory
    WHERE product_id = p_product_id AND location_id = p_location_id
    FOR UPDATE;

  v_qty_after := v_qty_before + p_qty;

  -- Enforce no-negative
  IF v_qty_after < 0 THEN
    RAISE EXCEPTION 'Insufficient stock: product=%, location=%, on_hand=%, requested=%',
      p_product_id, p_location_id, v_qty_before, p_qty;
  END IF;

  -- [F2] Cross-reference validation: the stock ledger must never record a
  -- movement whose references disagree — e.g. a sale_line from a different
  -- product, or a po_line/return_line from a different document/product.
  IF p_sale_line_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM sale_lines
    WHERE id = p_sale_line_id
      AND (p_sale_id IS NULL OR sale_id = p_sale_id)
      AND product_id = p_product_id
  ) THEN
    RAISE EXCEPTION 'sale_line % does not match product % or sale %',
      p_sale_line_id, p_product_id, p_sale_id;
  END IF;

  IF p_po_line_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM po_lines
    WHERE id = p_po_line_id
      AND (p_po_id IS NULL OR po_id = p_po_id)
      AND product_id = p_product_id
  ) THEN
    RAISE EXCEPTION 'po_line % does not match product % or po %',
      p_po_line_id, p_product_id, p_po_id;
  END IF;

  IF p_return_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM sale_returns sr
    WHERE sr.id = p_return_id
      AND (p_sale_id IS NULL OR sr.sale_id = p_sale_id)
  ) THEN
    RAISE EXCEPTION 'return % does not exist or does not match sale %',
      p_return_id, p_sale_id;
  END IF;

  -- Update inventory
  UPDATE inventory SET
    qty_on_hand      = v_qty_after,
    last_movement_at = NOW(),
    earliest_expiry_date = COALESCE(p_earliest_expiry_date, earliest_expiry_date)
  WHERE product_id = p_product_id AND location_id = p_location_id;

  -- Insert movement record (immutable — trigger blocks update/delete)
  INSERT INTO stock_movements (
    product_id, location_id, type, qty, qty_before, qty_after,
    sale_id, sale_line_id, po_id, po_line_id, return_id, transfer_ref,
    reason, notes, created_by
  ) VALUES (
    p_product_id, p_location_id, p_type, p_qty, v_qty_before, v_qty_after,
    p_sale_id, p_sale_line_id, p_po_id, p_po_line_id, p_return_id, p_transfer_ref,
    p_reason, p_notes, p_created_by
  ) RETURNING id INTO v_movement_id;

  RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_mutate_stock IS 'Atomic stock mutation: updates inventory + inserts movement in one transaction. SELECT FOR UPDATE prevents races.';


-- ============================================================================
-- 5a. ATOMIC GOODS-IN [C]
-- ============================================================================
-- Receives goods against ONE po_line in a single transaction: creates the
-- receipt record, bumps po_lines.qty_received (guarded by the <= qty_ordered
-- CHECK), adds stock via fn_mutate_stock, and lets the po_lines_recompute
-- trigger refresh PO header totals. Call via Supabase RPC or from backend.
CREATE OR REPLACE FUNCTION fn_receive_po(
  p_po_id          UUID,
  p_po_line_id     UUID,
  p_product_id     UUID,
  p_location_id    UUID,
  p_qty_received   NUMERIC(12,3),
  p_received_by    UUID DEFAULT NULL,
  p_notes          TEXT DEFAULT NULL,
  p_earliest_expiry_date DATE DEFAULT NULL   -- [N5] required for perishable products
)
RETURNS UUID AS $$
DECLARE
  v_receipt_id     UUID;
  v_product_id     UUID;
  v_is_perishable  BOOLEAN;
  v_po_dest        UUID;
  v_line_po_id     UUID;
BEGIN
  IF p_qty_received IS NULL OR p_qty_received <= 0 THEN
    RAISE EXCEPTION 'qty_received must be > 0, got %', p_qty_received;
  END IF;

  -- [F3] Lock the PO line so concurrent receipts against the same line
  -- serialize on the row; validation runs while holding the lock.
  SELECT product_id, po_id INTO v_product_id, v_line_po_id
    FROM po_lines
    WHERE id = p_po_line_id
    FOR UPDATE;

  -- Guard: the receipt must target the passed PO's line.
  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'po_line % does not exist', p_po_line_id;
  END IF;
  IF v_line_po_id <> p_po_id THEN
    RAISE EXCEPTION 'po_line % belongs to po %, not %', p_po_line_id, v_line_po_id, p_po_id;
  END IF;
  IF v_product_id <> p_product_id THEN
    RAISE EXCEPTION 'product_id % does not match po_line % product %', p_product_id, p_po_line_id, v_product_id;
  END IF;

  -- [F4] Receipt location must be the PO's destination location — prevents a
  -- PO from inadvertently adding stock at a different warehouse/store.
  SELECT destination_id INTO v_po_dest FROM purchase_orders WHERE id = p_po_id;
  IF v_po_dest IS DISTINCT FROM p_location_id THEN
    RAISE EXCEPTION 'receipt location % does not match PO % destination %',
      p_location_id, p_po_id, v_po_dest;
  END IF;

  -- [N5] Perishable goods received without an expiry date would break expiry
  -- tracking (and the expiry_warning alert depends on earliest_expiry_date).
  SELECT is_perishable INTO v_is_perishable FROM products WHERE id = p_product_id;
  IF v_is_perishable AND p_earliest_expiry_date IS NULL THEN
    RAISE EXCEPTION 'earliest_expiry_date is required when receiving perishable product %', p_product_id;
  END IF;

  -- Create the receipt (its po_id is p_po_id; receipt-line FK ties to it).
  INSERT INTO po_receipts (po_id, received_by, notes)
    VALUES (p_po_id, p_received_by, p_notes)
    RETURNING id INTO v_receipt_id;

  -- Insert receipt line. Cross-PO integrity enforced by composite FKs.
  INSERT INTO po_receipt_lines (receipt_id, po_line_id, po_id, product_id, qty_received)
    VALUES (v_receipt_id, p_po_line_id, p_po_id, p_product_id, p_qty_received);

  -- Accumulate qty_received on the PO line (CHECK blocks over-receipt).
  UPDATE po_lines
    SET qty_received = qty_received + p_qty_received
    WHERE id = p_po_line_id;

  -- Actually put goods into stock (inventory + immutable movement).
  PERFORM fn_mutate_stock(
    p_product_id   => p_product_id,
    p_location_id  => p_location_id,
    p_type         => 'po_receipt',
    p_qty          => p_qty_received,
    p_created_by   => p_received_by,
    p_notes        => p_notes,
    p_po_id        => p_po_id,
    p_po_line_id   => p_po_line_id,
    p_earliest_expiry_date => p_earliest_expiry_date
  );

  -- Whether the PO is now fully received is left to the app/scheduler.
  RETURN v_receipt_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_receive_po IS 'Atomically records a PO receipt (header+line), increments po_lines.qty_received, and adds stock in one transaction.';


-- ============================================================================
-- 5b. ATOMIC STOCK TRANSFER [D]
-- ============================================================================
-- Transfers stock between two locations in a single transaction: decreases
-- source, increases destination, and writes two linked movements sharing one
-- transfer_ref. Prevents lost stock if a crash happened between two separate
-- fn_mutate_stock calls.
CREATE OR REPLACE FUNCTION fn_transfer_stock(
  p_product_id    UUID,
  p_source_loc_id UUID,
  p_dest_loc_id   UUID,
  p_qty           NUMERIC(12,3),
  p_created_by    UUID DEFAULT NULL,
  p_notes         TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_transfer_ref UUID;
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN
    RAISE EXCEPTION 'transfer qty must be > 0, got %', p_qty;
  END IF;
  IF p_source_loc_id = p_dest_loc_id THEN
    RAISE EXCEPTION 'source and destination locations must differ';
  END IF;

  v_transfer_ref := gen_random_uuid();

  -- Out of source (negative) — fn_mutate_stock enforces sufficient stock.
  PERFORM fn_mutate_stock(
    p_product_id  => p_product_id,
    p_location_id => p_source_loc_id,
    p_type        => 'transfer_out',
    p_qty         => -p_qty,
    p_created_by  => p_created_by,
    p_notes       => p_notes,
    p_transfer_ref=> v_transfer_ref
  );

  -- In to destination (positive).
  PERFORM fn_mutate_stock(
    p_product_id  => p_product_id,
    p_location_id => p_dest_loc_id,
    p_type        => 'transfer_in',
    p_qty         => p_qty,
    p_created_by  => p_created_by,
    p_notes       => p_notes,
    p_transfer_ref=> v_transfer_ref
  );

  RETURN v_transfer_ref;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_transfer_stock IS 'Atomically transfers stock between locations as transfer_out + transfer_in sharing one transfer_ref.';


-- ============================================================================
-- 6. VIEWS
-- ============================================================================

-- [C2] Fixed: uses LATERAL + LIMIT 1 to pick location-specific rule over global.
CREATE OR REPLACE VIEW inventory_status AS
SELECT
  i.product_id,
  i.location_id,
  i.qty_on_hand,
  i.earliest_expiry_date,
  i.last_movement_at,
  p.sku_code,
  p.name          AS product_name,
  p.sale_price,
  p.cost_price,                                               -- ⚠️ MASKED at app layer
  p.status        AS product_status,
  p.is_perishable,
  p.category_id,
  c.name          AS category_name,
  u.name          AS unit_name,
  l.name          AS location_name,
  l.type          AS location_type,
  COALESCE(ssr.safety_stock,   p.default_safety_stock)   AS safety_stock,
  COALESCE(ssr.reorder_point,  p.default_reorder_point)  AS reorder_point,
  COALESCE(ssr.target_level,   p.default_target_level)   AS target_level,
  COALESCE(ssr.auto_order_enabled, FALSE)                AS auto_order_enabled,
  compute_stock_status(
    i.qty_on_hand,
    COALESCE(ssr.reorder_point, p.default_reorder_point),
    COALESCE(ssr.target_level,  p.default_target_level)
  ) AS stock_status
FROM inventory i
JOIN products   p ON p.id = i.product_id
JOIN categories c ON c.id = p.category_id
JOIN units      u ON u.id = p.unit_id
JOIN locations  l ON l.id = i.location_id
LEFT JOIN LATERAL (
  SELECT s.safety_stock, s.reorder_point, s.target_level, s.auto_order_enabled
  FROM safety_stock_rules s
  WHERE s.product_id = i.product_id
    AND (s.location_id = i.location_id OR s.location_id IS NULL)
  ORDER BY s.location_id IS NULL ASC   -- location-specific first (FALSE < TRUE)
  LIMIT 1
) ssr ON TRUE;

COMMENT ON VIEW inventory_status IS 'Inventory with computed stock status. Prefers location-specific safety rule over global. cost_price MASKED at app layer.';


-- [M5] Timezone-safe daily sales summary — uses UTC.
CREATE OR REPLACE VIEW daily_sales_summary AS
SELECT
  (s.sale_datetime AT TIME ZONE 'UTC')::DATE AS sale_date,
  s.store_id,
  st.name AS store_name,
  sl.product_id,
  p.name AS product_name,
  p.sku_code,
  SUM(sl.qty)        AS units_sold,
  SUM(sl.line_total)  AS sales_value
FROM sales s
JOIN sale_lines sl ON sl.sale_id = s.id
JOIN products   p  ON p.id = sl.product_id
JOIN stores     st ON st.id = s.store_id
WHERE s.status = 'active'
GROUP BY (s.sale_datetime AT TIME ZONE 'UTC')::DATE, s.store_id, st.name, sl.product_id, p.name, p.sku_code;


-- ============================================================================
-- 7. RLS — DISABLED (app-layer RBAC via Express middleware)
-- ============================================================================
-- Per SRS §5.3 and documented architecture: RBAC + masking enforced by
-- backend middleware using the service_role key. Supabase RLS is prepared
-- but disabled. Enable if migrating to client-side Supabase queries.
--
-- MASKING STANDARD (D1):
-- All masked fields are documented with ⚠️ MASKED comment.
-- The backend MUST apply masking in a SINGLE centralized utility:
--   backend/src/lib/masking.ts → maskFields(data, role, entity)
-- This function is called in ALL response serializers.
-- Masked fields: products.cost_price, computed margin,
--   suppliers.payment_terms, suppliers.credit_limit,
--   supplier_products.unit_cost, po_lines.unit_cost,
--   purchase_orders.total_cost, any field in app_settings['masked_fields'].
-- Raw values NEVER appear in: API responses to unauthorized roles,
--   audit_logs.detail, exports, error messages, or logs.
-- Authorized roles (Admin + explicitly authorized) receive clear-text
--   via a LOGGED access path (audit_action = 'sensitive_data_accessed').


-- ============================================================================
-- SCHEMA COMPLETE — v1.5.0 (integrity hardening)
-- ============================================================================
-- Tables:     26 (incl. po_receipts, po_receipt_lines, sale_returns, sale_return_lines)
-- Enums:      14
-- Sequences:  2
-- Functions:  13 (see §4/§5)
-- Views:      2 (inventory_status, daily_sales_summary)
-- Indexes:    40+
-- Triggers:   30
--
-- AUDIT of all fixes applied:
--   C1 ✅  Deferred FKs for alerts + purchase_orders → ai_recommendations
--   C2 ✅  inventory_status view uses LATERAL + LIMIT 1 (no duplicate rows)
--   C3 ✅  Two partial unique indexes on safety_stock_rules (NULL-safe)
--   C4 ✅  fn_mutate_stock() with SELECT FOR UPDATE for atomic mutations
--   H1 ✅  trigger_immutable_guard on stock_movements + audit_logs
--   H2 ✅  All qty fields → NUMERIC(12,3)
--   H3 ✅  Triggers recompute PO + sale header totals from lines
--   H4 ✅  Type-check triggers on profiles.store_id + sales.store_id
--   H5 ✅  po_receipts + po_receipt_lines tables added
--   H6 ✅  earliest_expiry_date on inventory (no batch model)
--   H7 ✅  State-transition CHECKs on sales + purchase_orders
--   H8 ✅  Sign + reference CHECKs on stock_movements
--   M1 ✅  Removed duplicate/useless indexes
--   M2 ✅  CITEXT for sku_code, location.code, supplier.code, email, po/sale numbers
--   M3 ✅  CHECK constraints on recommended_value, current_value, confidence
--   M4 ✅  Removed dead prefix config keys; generators use hardcoded prefixes
--   M5 ✅  Timezone-safe DATE cast (AT TIME ZONE 'UTC') in view + index
--   M6 ✅  Partial unique index enforces exactly one default warehouse
--   M7 ✅  CHECK: weight ↔ weight_unit must both be set or both NULL
--   M8 ✅  CHECK: total = subtotal - discount; discount >= 0
--   M9 ✅  sale_returns + sale_return_lines tables added
--   D1 ✅  Masking standard documented in RLS section
--   D2 ✅  CHECK(qty_on_hand >= 0) + fn_mutate_stock() enforces
--
-- Round 2 (v1.2.0) additions:
--   A  ✅  sales discount: total recomputed on discount INSERT/UPDATE (chk_sale_total stays satisfiable)
--   B  ✅  po_receipt_lines cross-PO integrity via composite FKs (po_lines(id,po_id), po_receipts(id,po_id))
--   C  ✅  fn_receive_po() atomic goods-in (receipt + qty_received + stock in one transaction)
--   D  ✅  fn_transfer_stock() atomic two-location transfer with shared transfer_ref
--   E  ✅  chk_movement_po_ref relaxed to allow manual stock_in against a PO line
--
-- Round 3 (v1.3.0) additions:
--   N1 ✅  sale_returns.store_id must be a 'store' location and match the sale's store
--   N2 ✅  sale_return_lines.sale_line_id required; product must match; total returned <= sold
--   N3 ✅  sale_returns.refund_amount recomputed from return lines (no header/line divergence)
--   N4 ✅  Unique top-level category names (partial unique index for NULL-parent hierarchy)
--   N5 ✅  earliest_expiry_date threaded through fn_mutate_stock / fn_receive_po (perishable goods-in)
--
-- Round 4 (v1.4.0) additions:
--   P1 ✅  New `stores` business master table (name, code, city, state, address, phone, email, status)
--   P2 ✅  locations.store_id → stores: each store-location links to its owning store (NULL for warehouses)
--   P3 ✅  Business refs re-pointed to stores: profiles.store_id (staff→store), sales.store_id, sale_returns.store_id;
--          staff identity extended with gender + address; password remains hashed in Supabase auth.users
--
-- Round 5 (v1.5.0) additions — integrity hardening (audit fix list):
--   F2 ✅  fn_mutate_stock() cross-reference validation: sale_line/po_line/return must agree on
--          product + owning document before a movement is recorded
--   F3 ✅  fn_receive_po() locks the PO line (SELECT ... FOR UPDATE) — concurrent receipts serialize
--   F4 ✅  fn_receive_po() requires p_location_id = purchase_orders.destination_id (PO can't add stock elsewhere)
--   F5 ✅  Trigger: locations.type immutable after creation (store ↔ warehouse cannot flip)
--   F6 ✅  profiles.id → auth.users(id) FK (retention-safe RESTRICT); auth.users shim added (no-op on Supabase)
--   F7 ✅  Partial unique index: exactly one is_preferred supplier per product
--   F8 ✅  categories: CHECK parent_id <> id + cycle-prevention trigger (ancestor walk)
--   F9 ✅  Supplier financial/operational sanity CHECKs (unit_cost, credit_limit, metrics)
--   F10✅  Triggers: sale_lines.sale_id / po_lines.po_id immutable after insert
-- ============================================================================
