import { Router } from 'express'
import { z } from 'zod'
import { supabase } from '../../config/index.js'
import { AppError, asyncHandler, requireAuth, validate } from '../../middleware/index.js'

const router = Router()

/**
 * Reference data endpoints backing the sales & dashboard UIs:
 *  - GET /api/stores     — active stores (store selector on sales form, exec dashboard)
 *  - GET /api/products   — active products (line-item selector on sales form)
 *
 * These are lightweight dropdown/list sources; detailed CRUD lives in the
 * products/inventory modules (VAU-017..019).
 */

// ---------------------------------------------------------------------------
// GET /api/stores — list active stores
// ---------------------------------------------------------------------------
router.get(
  '/stores',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const { data, error } = await supabase
      .from('stores')
      .select('id, name, code, city, status')
      .eq('status', 'active')
      .order('name', { ascending: true })
    if (error) throw new AppError(500, 'Failed to load stores', 'DB_ERROR')
    res.json({ stores: data })
  }),
)

// ---------------------------------------------------------------------------
// GET /api/products — list active products (for sales line-item picker)
// ---------------------------------------------------------------------------
const productQuerySchema = z.object({
  search: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(200),
})

router.get(
  '/products',
  requireAuth,
  validate(productQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { search, limit } = req.query as unknown as z.infer<typeof productQuerySchema>

    // cost_price is MASKED at the app layer — never returned to any role here.
    let query = supabase
      .from('products')
      .select(
        'id, sku_code, name, category_id, unit_id, sale_price, default_safety_stock, default_reorder_point, default_target_level, status, categories(name), units(name)',
      )
      .eq('status', 'active')
      .order('name', { ascending: true })
      .limit(limit)

    if (search) {
      query = query.or(`name.ilike.%${search}%,sku_code.ilike.%${search}%`)
    }

    const { data, error } = await query
    if (error) throw new AppError(500, 'Failed to load products', 'DB_ERROR')

    res.json({
      products: (data ?? []).map((p) => ({
        id: p.id,
        sku_code: p.sku_code,
        name: p.name,
        sale_price: p.sale_price,
        unit: (p.units as { name?: string } | null)?.name,
        category: (p.categories as { name?: string } | null)?.name,
      })),
    })
  }),
)

export default router
