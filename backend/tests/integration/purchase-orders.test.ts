import { beforeEach, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { createApp } from '../../src/app.js'
import {
  getFakeDb,
  resetFakeDb,
  setRpcHandler,
} from '../helpers/fake-supabase'
import {
  ADMIN_ID,
  LOC_A,
  LOC_B,
  LOC_WH,
  PO1,
  PO2,
  PO3,
  PO4,
  PO5,
  PO_L3,
  PO_L4,
  PO_L6,
  PO_REC_1,
  P1,
  P3,
  P4,
  P6,
  P7,
  SENIOR,
  STORE_A_STAFF,
  STORE_B_SALES,
  SUP_FRESH,
  SUP_TECH,
  poDb,
} from '../helpers/fixtures/purchase-orders'
import { DEV_ADMIN_TOKEN } from '../helpers/fixtures/inventory'

const app = createApp()

const ADMIN = { Authorization: `Bearer ${DEV_ADMIN_TOKEN}` }
const STAFF_A = { Authorization: `Bearer dev-token:${STORE_A_STAFF}` }
const SALES_B = { Authorization: `Bearer dev-token:${STORE_B_SALES}` }
const SENIOR_AUTH = { Authorization: `Bearer dev-token:${SENIOR}` }

let poSeq = 1

beforeEach(() => {
  resetFakeDb(poDb())
  poSeq = 1
  setRpcHandler('generate_po_number', () => `PO-2026-${String(poSeq++).padStart(4, '0')}`)
  setRpcHandler('fn_receive_po', (args) => {
    const a = args as {
      p_po_line_id: string
      p_po_id: string
      p_product_id: string
      p_location_id: string
      p_qty_received: number
      p_received_by: string | null
      p_notes: string | null
      p_earliest_expiry_date: string | null
    }
    const db = getFakeDb()
    const line = db.po_lines.find((l) => l.id === a.p_po_line_id)
    if (!line) return { success: false }
    line.qty_received = Number(line.qty_received) + a.p_qty_received
    const now = new Date().toISOString()
    const receiptId = randomUUID()
    db.po_receipts.push({
      id: receiptId,
      po_id: a.p_po_id,
      received_by: a.p_received_by ?? null,
      received_at: now,
      notes: a.p_notes ?? null,
      created_at: now,
    })
    db.po_receipt_lines.push({
      id: randomUUID(),
      receipt_id: receiptId,
      po_line_id: a.p_po_line_id,
      po_id: a.p_po_id,
      product_id: a.p_product_id,
      qty_received: a.p_qty_received,
      earliest_expiry_date: a.p_earliest_expiry_date ?? null,
      created_at: now,
    })
    const inventory = (db.inventory ??= [])
    const row = inventory.find(
      (r) => r.product_id === a.p_product_id && r.location_id === a.p_location_id,
    )
    if (row) row.qty_on_hand = Number(row.qty_on_hand) + a.p_qty_received
    else {
      inventory.push({
        id: randomUUID(),
        product_id: a.p_product_id,
        location_id: a.p_location_id,
        qty_on_hand: a.p_qty_received,
        earliest_expiry_date: a.p_earliest_expiry_date ?? null,
      })
    }
    const po = db.purchase_orders.find((candidate) => candidate.id === a.p_po_id)
    if (po) {
      const poLines = db.po_lines.filter((candidate) => candidate.po_id === a.p_po_id)
      po.total_qty_received = poLines.reduce((total, candidate) => total + Number(candidate.qty_received), 0)
      const allReceived = poLines.length > 0 && poLines.every((candidate) => Number(candidate.qty_received) >= Number(candidate.qty_ordered))
      po.status = allReceived ? 'received' : 'partially_received'
    }
    return { success: true }
  })
})

describe('GET /api/purchase-orders (list)', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/purchase-orders')
    expect(res.status).toBe(401)
  })

  it('returns all purchase orders enriched with supplier, destination, lines and summary', async () => {
    const res = await request(app).get('/api/purchase-orders').set(ADMIN)

    expect(res.status).toBe(200)
    expect(res.body.total).toBe(5)
    expect(res.body.limit).toBe(50)
    expect(res.body.offset).toBe(0)
    expect(res.body.purchase_orders).toHaveLength(5)

    const po2 = res.body.purchase_orders.find((p: Record<string, unknown>) => p.id === PO2)
    expect(po2?.supplier?.name).toBe('TechDistribute India Pvt. Ltd.')
    expect(po2?.supplier?.lead_time_days).toBe(5)
    expect(po2?.destination?.name).toBe('Store A — MG Road')
    expect(po2?.destination?.type).toBe('store')
    expect(po2?.lines).toHaveLength(2)
    expect(po2?.fulfillment_percentage).toBe(0)

    expect(res.body.summary).toEqual({
      total_pos: 5,
      draft: 1,
      sent: 2,
      partially_received: 0,
      received: 1,
      closed: 1,
      cancelled: 0,
      total_spend: 59700,
    })
  })

  it('paginates with limit/offset while keeping total', async () => {
    const page1 = await request(app).get('/api/purchase-orders?limit=3&offset=0').set(ADMIN)
    expect(page1.body.purchase_orders).toHaveLength(3)
    expect(page1.body.total).toBe(5)

    const page2 = await request(app).get('/api/purchase-orders?limit=3&offset=3').set(ADMIN)
    expect(page2.body.purchase_orders).toHaveLength(2)
    expect(page2.body.total).toBe(5)
  })

  it('filters by status (and normalizes the "partial" alias)', async () => {
    const sent = await request(app).get('/api/purchase-orders?status=sent').set(ADMIN)
    expect(sent.body.total).toBe(2)
    expect(sent.body.purchase_orders.every((p: Record<string, unknown>) => p.status === 'sent')).toBe(true)

    const partial = await request(app).get('/api/purchase-orders?status=partial').set(ADMIN)
    expect(partial.body.total).toBe(0)

    const draft = await request(app).get('/api/purchase-orders?status=draft').set(ADMIN)
    expect(draft.body.total).toBe(1)
    expect(draft.body.purchase_orders[0].id).toBe(PO3)
  })

  it('filters by supplierId, destinationId, source and search', async () => {
    const bySupplier = await request(app).get(`/api/purchase-orders?supplierId=${SUP_FRESH}`).set(ADMIN)
    expect(bySupplier.body.total).toBe(2)

    const byDestination = await request(app).get(`/api/purchase-orders?destinationId=${LOC_A}`).set(ADMIN)
    expect(byDestination.body.total).toBe(3)

    const bySource = await request(app).get('/api/purchase-orders?source=ai_auto').set(ADMIN)
    expect(bySource.body.total).toBe(1)
    expect(bySource.body.purchase_orders[0].id).toBe(PO3)

    const byNumber = await request(app).get('/api/purchase-orders?search=PO-2026-0003').set(ADMIN)
    expect(byNumber.body.total).toBe(1)
    expect(byNumber.body.purchase_orders[0].id).toBe(PO3)

    const byNotes = await request(app).get('/api/purchase-orders?search=bakery').set(ADMIN)
    expect(byNotes.body.total).toBe(1)
    expect(byNotes.body.purchase_orders[0].id).toBe(PO4)
  })

  it('scopes store_staff and sales_personnel to their own stores', async () => {
    const staff = await request(app).get('/api/purchase-orders').set(STAFF_A)
    expect(staff.body.total).toBe(3)
    expect(staff.body.purchase_orders.every((p: Record<string, unknown>) => p.destination_id === LOC_A)).toBe(true)
    expect(staff.body.summary.total_pos).toBe(3)
    expect(staff.body.summary.sent).toBe(2)
    expect(staff.body.summary.received).toBe(1)

    const sales = await request(app).get('/api/purchase-orders').set(SALES_B)
    expect(sales.body.total).toBe(1)
    expect(sales.body.purchase_orders[0].destination_id).toBe(LOC_B)
  })
})

describe('GET /api/purchase-orders/:id (detail)', () => {
  it('requires authentication', async () => {
    const res = await request(app).get(`/api/purchase-orders/${PO2}`)
    expect(res.status).toBe(401)
  })

  it('returns a PO with embedded supplier, destination, lines and receipts', async () => {
    const res = await request(app).get(`/api/purchase-orders/${PO2}`).set(ADMIN)

    expect(res.status).toBe(200)
    const po = res.body.purchase_order
    expect(po?.id).toBe(PO2)
    expect(po?.supplier?.name).toBe('TechDistribute India Pvt. Ltd.')
    expect(po?.destination?.name).toBe('Store A — MG Road')
    expect(po?.lines).toHaveLength(2)
    expect(po?.lines[0].products.name).toBe('USB-C Charging Cable 1m')
    expect(po?.lines[0].products.sku_code).toBe('PELEC-001')
    expect(po?.receipts).toHaveLength(0)
  })

  it('includes receipts history for a received PO', async () => {
    const res = await request(app).get(`/api/purchase-orders/${PO1}`).set(ADMIN)

    expect(res.status).toBe(200)
    const po = res.body.purchase_order
    expect(po?.receipts).toHaveLength(1)
    expect(po?.receipts[0].id).toBe(PO_REC_1)
    expect(po?.receipts[0].po_receipt_lines).toHaveLength(2)
  })

  it('blocks store-scoped roles from opening another store PO (404)', async () => {
    const res = await request(app).get(`/api/purchase-orders/${PO3}`).set(STAFF_A)
    expect(res.status).toBe(404)
    expect(res.body.code).toBe('NOT_FOUND')
  })

  it('returns 404 for unknown PO and 400 for an invalid id', async () => {
    const missing = await request(app)
      .get('/api/purchase-orders/0000aaaa-0000-0000-0000-00000000ffff')
      .set(ADMIN)
    expect(missing.status).toBe(404)
    expect(missing.body.code).toBe('NOT_FOUND')

    const invalid = await request(app).get('/api/purchase-orders/not-a-uuid').set(ADMIN)
    expect(invalid.status).toBe(400)
    expect(invalid.body.code).toBe('VALIDATION_ERROR')
  })
})

describe('POST /api/purchase-orders (create)', () => {
  it('requires auth and rejects non-admin/non-store_staff roles', async () => {
    const noAuth = await request(app).post('/api/purchase-orders').send({})
    expect(noAuth.status).toBe(401)

    const senior = await request(app)
      .post('/api/purchase-orders')
      .set(SENIOR_AUTH)
      .send({ supplierId: SUP_TECH, destinationId: LOC_A, lines: [{ productId: P3, qtyOrdered: 5 }] })
    expect(senior.status).toBe(403)
    expect(senior.body.code).toBe('FORBIDDEN')
  })

  it('validates the request body (400 on missing lines / supplier / bad qty)', async () => {
    const noLines = await request(app).post('/api/purchase-orders').set(ADMIN).send({ supplierId: SUP_TECH, destinationId: LOC_A })
    expect(noLines.status).toBe(400)
    expect(noLines.body.code).toBe('VALIDATION_ERROR')

    const noSupplier = await request(app)
      .post('/api/purchase-orders')
      .set(ADMIN)
      .send({ destinationId: LOC_A, lines: [{ productId: P3, qtyOrdered: 5 }] })
    expect(noSupplier.status).toBe(400)

    const zeroQty = await request(app)
      .post('/api/purchase-orders')
      .set(ADMIN)
      .send({ supplierId: SUP_TECH, destinationId: LOC_A, lines: [{ productId: P3, qtyOrdered: 0 }] })
    expect(zeroQty.status).toBe(400)
  })

  it('creates a draft PO with resolved unit cost from supplier_products (201)', async () => {
    const res = await request(app)
      .post('/api/purchase-orders')
      .set(ADMIN)
      .send({ supplierId: SUP_TECH, destinationId: LOC_A, lines: [{ productId: P3, qtyOrdered: 10 }] })

    expect(res.status).toBe(201)
    const po = res.body.purchase_order
    expect(po?.status).toBe('draft')
    expect(po?.po_number).toBe('PO-2026-0001')
    expect(po?.source).toBe('manual')
    expect(po?.supplier?.name).toBe('TechDistribute India Pvt. Ltd.')
    expect(po?.lines).toHaveLength(1)
    expect(po?.lines[0].unit_cost).toBe(40) // supplier_products SUP-TECH/P3
    expect(po?.lines[0].product_name).toBe('Phone Screen Protector')
    expect(res.body.message).toContain('created successfully')
  })

  it('honors an explicit unitCost override and falls back to product cost_price', async () => {
    const override = await request(app)
      .post('/api/purchase-orders')
      .set(ADMIN)
      .send({ supplierId: SUP_TECH, destinationId: LOC_A, lines: [{ productId: P3, qtyOrdered: 2, unitCost: 99 }] })
    expect(override.status).toBe(201)
    expect(override.body.purchase_order.lines[0].unit_cost).toBe(99)

    // P3 is not mapped to FreshFoods -> falls through to products.cost_price (40)
    const fallback = await request(app)
      .post('/api/purchase-orders')
      .set(ADMIN)
      .send({ supplier_id: SUP_FRESH, destination_id: LOC_A, lines: [{ product_id: P3, qty_ordered: 5 }] })
    expect(fallback.status).toBe(201)
    expect(fallback.body.purchase_order.lines[0].unit_cost).toBe(40)
  })

  it('rejects a duplicate open PO with overlapping products (409)', async () => {
    const res = await request(app)
      .post('/api/purchase-orders')
      .set(ADMIN)
      .send({ supplierId: SUP_TECH, destinationId: LOC_A, lines: [{ productId: P1, qtyOrdered: 5 }] })

    expect(res.status).toBe(409)
    expect(res.body.code).toBe('DUPLICATE_OPEN_PO')
    expect(res.body.message).toContain('PO-2026-0002')
    expect(res.body.message).toContain('USB-C Charging Cable 1m')
  })

  it('allows an intentional extra order when allowDuplicate is true', async () => {
    const res = await request(app)
      .post('/api/purchase-orders')
      .set(ADMIN)
      .send({
        supplierId: SUP_TECH,
        destinationId: LOC_A,
        allowDuplicate: true,
        lines: [{ productId: P1, qtyOrdered: 5 }, { productId: P4, qtyOrdered: 2 }],
      })

    expect(res.status).toBe(201)
    expect(res.body.purchase_order.lines).toHaveLength(2)
    expect(getFakeDb().purchase_orders).toHaveLength(6)
    expect(getFakeDb().po_lines).toHaveLength(10)
  })

  it('lets store_staff create POs (role allowed)', async () => {
    const res = await request(app)
      .post('/api/purchase-orders')
      .set(STAFF_A)
      .send({ supplierId: SUP_TECH, destinationId: LOC_A, lines: [{ productId: P3, qtyOrdered: 4 }] })
    expect(res.status).toBe(201)
  })
})

describe('POST /api/purchase-orders/auto-trigger', () => {
  it('dry-runs the full reorder scan (9 items, 3 groups)', async () => {
    const res = await request(app)
      .post('/api/purchase-orders/auto-trigger')
      .set(ADMIN)
      .send({ dryRun: true })

    expect(res.status).toBe(200)
    expect(res.body.dry_run).toBe(true)
    expect(res.body.scanned_items_count).toBe(9)
    expect(res.body.potential_pos_count).toBe(3)
    expect(res.body.skipped_duplicates).toHaveLength(0)
    expect(res.body.unmapped_products).toHaveLength(0)
  })

  it('dry-runs scoped to a single destination/location', async () => {
    const storeA = await request(app)
      .post('/api/purchase-orders/auto-trigger')
      .set(ADMIN)
      .send({ destinationId: LOC_A, dryRun: true })
    expect(storeA.body.scanned_items_count).toBe(5)
    expect(storeA.body.potential_pos_count).toBe(2)

    const wh = await request(app)
      .post('/api/purchase-orders/auto-trigger')
      .set(ADMIN)
      .send({ location_id: LOC_WH, dryRun: true })
    expect(wh.body.scanned_items_count).toBe(2)
    expect(wh.body.potential_pos_count).toBe(0)
  })

  it('creates ai_auto POs grouped by (supplier, location) on a real run', async () => {
    const res = await request(app)
      .post('/api/purchase-orders/auto-trigger')
      .set(ADMIN)
      .send({})

    expect(res.status).toBe(200)
    expect(res.body.total_pos_created).toBe(3)
    expect(res.body.created_pos).toHaveLength(3)
    expect(res.body.message).toContain('Created 3 auto-order purchase orders')
    for (const po of res.body.created_pos) {
      expect(po.source).toBe('ai_auto')
      expect(po.status).toBe('draft')
      expect(po.po_number).toMatch(/^PO-2026-\d{4}$/)
    }
  })
})

describe('PATCH /api/purchase-orders/:id/status', () => {
  it('requires auth and a write role', async () => {
    const noAuth = await request(app).patch(`/api/purchase-orders/${PO2}/status`).send({ status: 'received' })
    expect(noAuth.status).toBe(401)

    const senior = await request(app)
      .patch(`/api/purchase-orders/${PO2}/status`)
      .set(SENIOR_AUTH)
      .send({ status: 'received' })
    expect(senior.status).toBe(403)
    expect(senior.body.code).toBe('FORBIDDEN')
  })

  it('transitions draft -> sent', async () => {
    const res = await request(app)
      .patch(`/api/purchase-orders/${PO3}/status`)
      .set(ADMIN)
      .send({ status: 'sent' })

    expect(res.status).toBe(200)
    expect(res.body.message).toBe('Purchase order marked as sent')
    expect(res.body.purchase_order.status).toBe('sent')
    expect(res.body.purchase_order.approved_by).toBe(ADMIN_ID)
  })

  it('transitions sent -> partially_received using the "partial" alias', async () => {
    const res = await request(app)
      .patch(`/api/purchase-orders/${PO2}/status`)
      .set(ADMIN)
      .send({ status: 'partial' })

    expect(res.status).toBe(200)
    expect(res.body.purchase_order.status).toBe('partially_received')
  })

  it('transitions sent -> received and received -> closed', async () => {
    const received = await request(app)
      .patch(`/api/purchase-orders/${PO2}/status`)
      .set(ADMIN)
      .send({ status: 'received' })
    expect(received.status).toBe(200)
    expect(received.body.purchase_order.status).toBe('received')
    expect(received.body.purchase_order.received_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    const closed = await request(app)
      .patch(`/api/purchase-orders/${PO5}/status`)
      .set(ADMIN)
      .send({ status: 'closed' })
    expect(closed.status).toBe(200)
    expect(closed.body.purchase_order.status).toBe('closed')
    expect(closed.body.message).toBe('Purchase order closed and finalized')
  })

  it('is idempotent for the same state', async () => {
    const res = await request(app)
      .patch(`/api/purchase-orders/${PO1}/status`)
      .set(ADMIN)
      .send({ status: 'closed' })
    expect(res.status).toBe(200)
    expect(res.body.message).toBe('Purchase order is already in closed state')
  })

  it('rejects an invalid lifecycle transition (sent -> closed)', async () => {
    const res = await request(app)
      .patch(`/api/purchase-orders/${PO2}/status`)
      .set(ADMIN)
      .send({ status: 'closed' })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('INVALID_TRANSITION')
  })

  it('cancels a PO and then rejects re-cancelling it', async () => {
    const cancelled = await request(app)
      .patch(`/api/purchase-orders/${PO2}/status`)
      .set(ADMIN)
      .send({ status: 'cancelled', cancelReason: 'Damaged in transit' })

    expect(cancelled.status).toBe(200)
    expect(cancelled.body.purchase_order.status).toBe('cancelled')
    expect(cancelled.body.purchase_order.cancel_reason).toBe('Damaged in transit')
    expect(cancelled.body.purchase_order.cancelled_by).toBe(ADMIN_ID)

    const again = await request(app)
      .patch(`/api/purchase-orders/${PO2}/status`)
      .set(ADMIN)
      .send({ status: 'cancelled', cancelReason: 'Still damaged' })
    expect(again.status).toBe(400)
    expect(again.body.code).toBe('ALREADY_CANCELLED')
  })

  it('cannot cancel a closed PO and requires a cancel reason', async () => {
    const closed = await request(app)
      .patch(`/api/purchase-orders/${PO1}/status`)
      .set(ADMIN)
      .send({ status: 'cancelled', cancelReason: 'Nope' })
    expect(closed.status).toBe(400)
    expect(closed.body.code).toBe('INVALID_TRANSITION')
    expect(closed.body.message).toBe('Cannot cancel a closed purchase order')

    const noReason = await request(app)
      .patch(`/api/purchase-orders/${PO2}/status`)
      .set(ADMIN)
      .send({ status: 'cancelled' })
    expect(noReason.status).toBe(400)
    expect(noReason.body.code).toBe('CANCEL_REASON_REQUIRED')
  })

  it('returns 404 for an unknown PO', async () => {
    const res = await request(app)
      .patch('/api/purchase-orders/0000aaaa-0000-0000-0000-00000000ffff/status')
      .set(ADMIN)
      .send({ status: 'closed' })
    expect(res.status).toBe(404)
    expect(res.body.code).toBe('NOT_FOUND')
  })
})

describe('POST /api/purchase-orders/:id/receive (goods-in)', () => {
  it('requires auth and rejects a draft PO', async () => {
    const noAuth = await request(app)
      .post(`/api/purchase-orders/${PO2}/receive`)
      .send({ lines: [{ productId: P1, qty_received: 1 }] })
    expect(noAuth.status).toBe(401)

    const draft = await request(app)
      .post(`/api/purchase-orders/${PO3}/receive`)
      .set(ADMIN)
      .send({ lines: [{ productId: P6, qty_received: 5 }] })
    expect(draft.status).toBe(400)
    expect(draft.body.code).toBe('PO_NOT_SENT')
  })

  it('rejects goods-in on closed and cancelled POs', async () => {
    const closed = await request(app)
      .post(`/api/purchase-orders/${PO1}/receive`)
      .set(ADMIN)
      .send({ lines: [{ productId: P1, qty_received: 1 }] })
    expect(closed.status).toBe(400)
    expect(closed.body.code).toBe('PO_CLOSED')

    await request(app)
      .patch(`/api/purchase-orders/${PO2}/status`)
      .set(ADMIN)
      .send({ status: 'cancelled', cancelReason: 'Supplier short' })
    const cancelled = await request(app)
      .post(`/api/purchase-orders/${PO2}/receive`)
      .set(ADMIN)
      .send({ lines: [{ productId: P1, qty_received: 1 }] })
    expect(cancelled.status).toBe(400)
    expect(cancelled.body.code).toBe('PO_CANCELLED')
  })

  it('rejects an unknown line product and over-receipts', async () => {
    const mismatch = await request(app)
      .post(`/api/purchase-orders/${PO2}/receive`)
      .set(ADMIN)
      .send({ lines: [{ productId: P6, qty_received: 1 }] })
    expect(mismatch.status).toBe(400)
    expect(mismatch.body.code).toBe('PO_LINE_MISMATCH')

    const over = await request(app)
      .post(`/api/purchase-orders/${PO2}/receive`)
      .set(ADMIN)
      .send({ lines: [{ productId: P1, qty_received: 31 }] })
    expect(over.status).toBe(400)
    expect(over.body.code).toBe('OVER_RECEIPT')
  })

  it('records a partial receipt and progresses the lifecycle to partially_received', async () => {
    const res = await request(app)
      .post(`/api/purchase-orders/${PO2}/receive`)
      .set(ADMIN)
      .send({ notes: 'First drop', lines: [{ poLineId: PO_L3, qty_received: 10 }] })

    expect(res.status).toBe(201)
    expect(res.body.receipt.po_id).toBe(PO2)
    expect(res.body.receipt.po_receipt_lines).toHaveLength(1)
    expect(res.body.purchase_order.status).toBe('partially_received')
    expect(res.body.purchase_order.total_qty_received).toBe(10)
    expect(res.body.message).toContain('Current PO status: partially_received')

    const inv = getFakeDb().inventory.find((r) => r.product_id === P1 && r.location_id === LOC_A)
    expect(inv?.qty_on_hand).toBe(55)
    expect(getFakeDb().po_receipts).toHaveLength(2)
  })

  it('fully receives a PO across lines and marks it received', async () => {
    const res = await request(app)
      .post(`/api/purchase-orders/${PO2}/receive`)
      .set(ADMIN)
      .send({
        receivedBy: ADMIN_ID,
        lines: [
          { poLineId: PO_L3, qty_received: 30 },
          { poLineId: PO_L4, qty_received: 10 },
        ],
      })

    expect(res.status).toBe(201)
    expect(res.body.receipt.received_by).toBe(ADMIN_ID)
    expect(res.body.receipt.po_receipt_lines).toHaveLength(1)
    expect(res.body.purchase_order.status).toBe('received')
    expect(res.body.purchase_order.fulfillment_percentage).toBe(100)

    const receipts = await request(app).get(`/api/purchase-orders/${PO2}/receipts`).set(ADMIN)
    expect(receipts.status).toBe(200)
    expect(receipts.body.receipts).toHaveLength(2)
  })

  it('requires an expiry date for perishable products', async () => {
    const missing = await request(app)
      .post(`/api/purchase-orders/${PO4}/receive`)
      .set(ADMIN)
      .send({ lines: [{ productId: P7, qty_received: 20 }] })
    expect(missing.status).toBe(400)
    expect(missing.body.code).toBe('EXPIRY_DATE_REQUIRED')

    const withExpiry = await request(app)
      .post(`/api/purchase-orders/${PO4}/receive`)
      .set(ADMIN)
      .send({ lines: [{ poLineId: PO_L6, qty_received: 20, earliest_expiry_date: '2026-09-20' }] })
    expect(withExpiry.status).toBe(201)
    expect(withExpiry.body.purchase_order.status).toBe('received')
  })

  it('returns 404 for an unknown PO and 403 for the senior role', async () => {
    const missing = await request(app)
      .post('/api/purchase-orders/0000aaaa-0000-0000-0000-00000000ffff/receive')
      .set(ADMIN)
      .send({ lines: [{ productId: P1, qty_received: 1 }] })
    expect(missing.status).toBe(404)

    const senior = await request(app)
      .post(`/api/purchase-orders/${PO2}/receive`)
      .set(SENIOR_AUTH)
      .send({ lines: [{ productId: P1, qty_received: 1 }] })
    expect(senior.status).toBe(403)
  })
})

describe('GET /api/purchase-orders/:id/receipts', () => {
  it('requires authentication', async () => {
    const res = await request(app).get(`/api/purchase-orders/${PO1}/receipts`)
    expect(res.status).toBe(401)
  })

  it('returns receipts with linked product labels', async () => {
    const res = await request(app).get(`/api/purchase-orders/${PO1}/receipts`).set(ADMIN)

    expect(res.status).toBe(200)
    expect(res.body.receipts).toHaveLength(1)
    const lines = res.body.receipts[0].lines
    expect(lines).toHaveLength(2)
    expect(lines[0].product_name).toBe('USB-C Charging Cable 1m')
    expect(lines[0].sku_code).toBe('PELEC-001')
  })

  it('returns an empty list when the PO has no receipts', async () => {
    const res = await request(app).get(`/api/purchase-orders/${PO2}/receipts`).set(ADMIN)
    expect(res.status).toBe(200)
    expect(res.body.receipts).toEqual([])
  })
})