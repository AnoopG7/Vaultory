import { z } from 'zod'
import { EntityStatus } from './common.schema.js'

// ---------------------------------------------------------------------------
// Products — Request schemas
// ---------------------------------------------------------------------------

export const ListProductsQuery = z.object({
  search: z.string().max(200).optional(),
  category_id: z.string().uuid().optional(),
  status: EntityStatus.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})
export type ListProductsQuery = z.infer<typeof ListProductsQuery>

export const CreateProductRequest = z.object({
  sku_code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  category_id: z.string().uuid(),
  unit_id: z.string().uuid(),
  cost_price: z.number().min(0),
  sale_price: z.number().min(0),
  default_safety_stock: z.number().min(0).default(0),
  default_reorder_point: z.number().min(0).default(0),
  default_target_level: z.number().min(0).default(0),
  is_perishable: z.boolean().default(false),
  shelf_life_days: z.number().int().positive().nullable().optional(),
  image_url: z.string().url().nullable().optional(),
  barcode: z.string().max(50).nullable().optional(),
  weight: z.number().min(0).nullable().optional(),
  weight_unit: z.string().max(10).nullable().optional(),
  notes: z.string().optional(),
})
export type CreateProductRequest = z.infer<typeof CreateProductRequest>

export const UpdateProductRequest = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  category_id: z.string().uuid().optional(),
  unit_id: z.string().uuid().optional(),
  cost_price: z.number().min(0).optional(),
  sale_price: z.number().min(0).optional(),
  default_safety_stock: z.number().min(0).optional(),
  default_reorder_point: z.number().min(0).optional(),
  default_target_level: z.number().min(0).optional(),
  is_perishable: z.boolean().optional(),
  shelf_life_days: z.number().int().positive().nullable().optional(),
  image_url: z.string().url().nullable().optional(),
  barcode: z.string().max(50).nullable().optional(),
  weight: z.number().min(0).nullable().optional(),
  weight_unit: z.string().max(10).nullable().optional(),
  notes: z.string().optional(),
})
export type UpdateProductRequest = z.infer<typeof UpdateProductRequest>

export const ProductIdParam = z.object({
  id: z.string().uuid(),
})
export type ProductIdParam = z.infer<typeof ProductIdParam>

// ---------------------------------------------------------------------------
// Products — Response schemas
// ---------------------------------------------------------------------------

export const ProductResponse = z.object({
  id: z.string().uuid(),
  sku_code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  category_id: z.string().uuid(),
  unit_id: z.string().uuid(),
  cost_price: z.number(), // masked for non-admin
  sale_price: z.number(),
  default_safety_stock: z.number(),
  default_reorder_point: z.number(),
  default_target_level: z.number(),
  is_perishable: z.boolean(),
  shelf_life_days: z.number().int().nullable(),
  image_url: z.string().nullable(),
  barcode: z.string().nullable(),
  weight: z.number().nullable(),
  weight_unit: z.string().nullable(),
  notes: z.string().nullable(),
  status: EntityStatus,
  created_at: z.string(),
  updated_at: z.string(),
  // Joined fields
  category: z
    .object({ id: z.string().uuid(), name: z.string() })
    .nullable()
    .optional(),
  unit: z
    .object({ id: z.string().uuid(), name: z.string(), abbreviation: z.string().nullable() })
    .nullable()
    .optional(),
})
export type ProductResponse = z.infer<typeof ProductResponse>

export const ProductListResponse = z.object({
  products: z.array(ProductResponse),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
})
export type ProductListResponse = z.infer<typeof ProductListResponse>

export const ProductDetailResponse = z.object({
  product: ProductResponse,
})
export type ProductDetailResponse = z.infer<typeof ProductDetailResponse>

// ---------------------------------------------------------------------------
// Categories — Request schemas
// ---------------------------------------------------------------------------

export const ListCategoriesQuery = z.object({
  status: EntityStatus.optional(),
})
export type ListCategoriesQuery = z.infer<typeof ListCategoriesQuery>

export const CreateCategoryRequest = z.object({
  name: z.string().min(1).max(120),
  parent_id: z.string().uuid().nullable().optional(),
  sort_order: z.number().int().default(0),
})
export type CreateCategoryRequest = z.infer<typeof CreateCategoryRequest>

export const UpdateCategoryRequest = z.object({
  name: z.string().min(1).max(120).optional(),
  parent_id: z.string().uuid().nullable().optional(),
  sort_order: z.number().int().optional(),
  status: EntityStatus.optional(),
})
export type UpdateCategoryRequest = z.infer<typeof UpdateCategoryRequest>

export const CategoryIdParam = z.object({
  id: z.string().uuid(),
})
export type CategoryIdParam = z.infer<typeof CategoryIdParam>

// ---------------------------------------------------------------------------
// Categories — Response schemas
// ---------------------------------------------------------------------------

export const CategoryResponse = z.object({
  id: z.string().uuid(),
  name: z.string(),
  parent_id: z.string().uuid().nullable(),
  sort_order: z.number().int(),
  status: EntityStatus,
  created_at: z.string(),
  updated_at: z.string(),
})
export type CategoryResponse = z.infer<typeof CategoryResponse>

export const CategoryListResponse = z.object({
  categories: z.array(CategoryResponse),
})
export type CategoryListResponse = z.infer<typeof CategoryListResponse>

// Category tree uses a plain recursive type (Zod z.lazy has circular ref issues with extend)
export interface CategoryTreeNode extends CategoryResponse {
  children: CategoryTreeNode[]
}

export const CategoryTreeResponse = z.object({
  categories: z.array(z.record(z.string(), z.unknown())),
})
export type CategoryTreeResponse = z.infer<typeof CategoryTreeResponse>

// ---------------------------------------------------------------------------
// Units — Request schemas
// ---------------------------------------------------------------------------

export const ListUnitsQuery = z.object({
  status: EntityStatus.optional(),
})
export type ListUnitsQuery = z.infer<typeof ListUnitsQuery>

export const CreateUnitRequest = z.object({
  name: z.string().min(1).max(120),
  abbreviation: z.string().max(10).nullable().optional(),
})
export type CreateUnitRequest = z.infer<typeof CreateUnitRequest>

export const UpdateUnitRequest = z.object({
  name: z.string().min(1).max(120).optional(),
  abbreviation: z.string().max(10).nullable().optional(),
  status: EntityStatus.optional(),
})
export type UpdateUnitRequest = z.infer<typeof UpdateUnitRequest>

export const UnitIdParam = z.object({
  id: z.string().uuid(),
})
export type UnitIdParam = z.infer<typeof UnitIdParam>

// ---------------------------------------------------------------------------
// Units — Response schemas
// ---------------------------------------------------------------------------

export const UnitResponse = z.object({
  id: z.string().uuid(),
  name: z.string(),
  abbreviation: z.string().nullable(),
  status: EntityStatus,
  created_at: z.string(),
  updated_at: z.string(),
})
export type UnitResponse = z.infer<typeof UnitResponse>

export const UnitListResponse = z.object({
  units: z.array(UnitResponse),
})
export type UnitListResponse = z.infer<typeof UnitListResponse>

// ---------------------------------------------------------------------------
// Mover classification
// ---------------------------------------------------------------------------

export const MoverQuery = z.object({
  window_days: z.coerce.number().int().min(1).max(365).default(90),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})
export type MoverQuery = z.infer<typeof MoverQuery>

export const MoverItem = z.object({
  product_id: z.string().uuid(),
  product_name: z.string(),
  sku_code: z.string(),
  total_units_sold: z.number(),
  classification: z.enum(['fast', 'slow', 'normal']),
  sales_value: z.number(),
})
export type MoverItem = z.infer<typeof MoverItem>

export const MoverResponse = z.object({
  window_days: z.number().int(),
  items: z.array(MoverItem),
})
export type MoverResponse = z.infer<typeof MoverResponse>
