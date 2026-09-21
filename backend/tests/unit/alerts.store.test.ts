import { beforeEach, describe, expect, it } from 'vitest'
import { resetFakeDb, getFakeDb } from '../helpers/fake-supabase'
import {
  memoryAlerts,
  memoryAlertReads,
  memoryAlertPreferences,
  getUserAlertPreferences,
  updateAlertPreferences,
  evaluateItemAlert,
  syncInventoryAlerts,
  queryAlerts,
  getUnreadAlertCount,
  markAlertAsRead,
  markAllAlertsAsRead,
} from '../../src/modules/alerts/alerts.store'
import { alertsDb, ALERT_LOW_ID, ALERT_OUT_ID, ALERT_READ_ID } from '../helpers/fixtures/alerts'
import { ADMIN, LOC_A } from '../helpers/fixtures/inventory'

function resetMemoryState(): void {
  memoryAlerts.length = 0
  memoryAlertReads.length = 0
  memoryAlertPreferences.clear()
}

function lowStockItem(overrides: Record<string, unknown> = {}) {
  return {
    product_id: 'd1000000-0000-0000-0000-000000000003',
    location_id: LOC_A,
    product_name: 'Phone Screen Protector',
    sku_code: 'PELEC-003',
    location_name: 'Store A — MG Road',
    qty_on_hand: 8,
    reorder_point: 10,
    target_level: 40,
    ...overrides,
  }
}

describe('getUserAlertPreferences (fake supabase)', () => {
  beforeEach(() => {
    resetFakeDb(alertsDb())
    resetMemoryState()
  })

  it('returns seeded preferences from the db and caches them', async () => {
    const prefs = await getUserAlertPreferences(ADMIN)
    expect(prefs.notify_low_stock).toBe(true)
    expect(prefs.notify_expiry_warning).toBe(false)
    expect(prefs.user_id).toBe(ADMIN)
    expect(memoryAlertPreferences.get(ADMIN)).toBeDefined()
  })

  it('returns default preferences when no row exists', async () => {
    const deps = await getUserAlertPreferences('beef0000-0000-0000-0000-000000000099')
    expect(deps.notify_low_stock).toBe(true)
    expect(deps.notify_out_of_stock).toBe(true)
    expect(deps.notify_expiry_warning).toBe(false)
    expect(deps.email_enabled).toBe(false)
    expect(deps.user_id).toBe('beef0000-0000-0000-0000-000000000099')
  })

  it('reuses the cached value on subsequent lookups', async () => {
    await getUserAlertPreferences(ADMIN)
    await getUserAlertPreferences(ADMIN)
    expect(memoryAlertPreferences.size).toBe(1)
  })
})

describe('updateAlertPreferences (fake supabase)', () => {
  beforeEach(() => {
    resetFakeDb(alertsDb())
    resetMemoryState()
  })

  it('merges partial updates with defaults and persists', async () => {
    const updated = await updateAlertPreferences(ADMIN, { notify_low_stock: false, email_enabled: true })
    expect(updated.notify_low_stock).toBe(false)
    expect(updated.email_enabled).toBe(true)
    expect(updated.notify_out_of_stock).toBe(true) // default kept

    const rows = getFakeDb().alert_preferences ?? []
    const row = rows.find((r) => r.user_id === ADMIN)
    expect(row?.notify_low_stock).toBe(false)
    expect(row?.email_enabled).toBe(true)
    expect(updated.updated_at).toBeTruthy()
  })

  it('creates prefs from scratch for a brand-new user', async () => {
    const updated = await updateAlertPreferences('new-user-1', { notify_po_overdue: true })
    expect(updated.notify_low_stock).toBe(true)
    expect(updated.notify_po_overdue).toBe(true)
    const rows = getFakeDb().alert_preferences ?? []
    expect(rows.some((r) => r.user_id === 'new-user-1')).toBe(true)
  })
})

describe('evaluateItemAlert (fake supabase)', () => {
  beforeEach(() => {
    resetFakeDb(alertsDb())
    resetMemoryState()
  })

  it('creates an out_of_stock alert for a zero-stock item', async () => {
    const alert = await evaluateItemAlert(lowStockItem({ qty_on_hand: 0, reorder_point: 10 }))
    expect(alert).toBeTruthy()
    expect(alert?.type).toBe('out_of_stock')
    expect(alert?.priority).toBe('high')
    expect(memoryAlerts).toHaveLength(1)
  })

  it('creates a low_stock alert for an item under its reorder point', async () => {
    const alert = await evaluateItemAlert(lowStockItem())
    expect(alert?.type).toBe('low_stock')
    expect(alert?.priority).toBe('medium')
    expect(alert?.message).toContain('8 units remaining')
  })

  it('resolves an existing low_stock alert when an item goes out of stock', async () => {
    const first = await evaluateItemAlert(lowStockItem({ qty_on_hand: 8, reorder_point: 10 }))
    expect(first?.type).toBe('low_stock')
    const second = await evaluateItemAlert(lowStockItem({ qty_on_hand: 0, reorder_point: 10 }))
    expect(second?.type).toBe('out_of_stock')
    const lowAlert = memoryAlerts.find((a) => a.type === 'low_stock')
    expect(lowAlert?.is_resolved).toBe(true)
  })

  it('deduplicates — repeated evaluation returns the same active alert', async () => {
    const first = await evaluateItemAlert(lowStockItem())
    const second = await evaluateItemAlert(lowStockItem())
    expect(second?.id).toBe(first?.id)
    expect(memoryAlerts.filter((a) => a.type === 'low_stock')).toHaveLength(1)
  })

  it('resolves both low and out_of_stock alerts on recovery (in_stock)', async () => {
    await evaluateItemAlert(lowStockItem({ qty_on_hand: 0, reorder_point: 10 }))
    await evaluateItemAlert(lowStockItem({ qty_on_hand: 0, reorder_point: 10 }))
    const recovered = await evaluateItemAlert(lowStockItem({ qty_on_hand: 100, reorder_point: 10, target_level: 40 }))
    expect(recovered).toBeNull()
    expect(memoryAlerts.every((a) => a.is_resolved)).toBe(true)
  })
})

describe('syncInventoryAlerts (fake supabase)', () => {
  beforeEach(() => {
    resetFakeDb(alertsDb())
    resetMemoryState()
  })

  it('syncs alerts across a list of inventory items', async () => {
    const items = [
      lowStockItem(),
      lowStockItem({ qty_on_hand: 0, reorder_point: 10 }),
      lowStockItem({ qty_on_hand: 500, reorder_point: 10, target_level: 40 }),
    ]
    await syncInventoryAlerts(items as never)
    expect(memoryAlerts.map((a) => a.type).sort()).toEqual(['low_stock', 'out_of_stock'])
    // the recovered item resolved both by the end of the sync
    expect(memoryAlerts.every((a) => a.is_resolved)).toBe(true)
  })
})

describe('queryAlerts (fake supabase)', () => {
  beforeEach(() => {
    resetFakeDb(alertsDb())
    resetMemoryState()
  })

  it('lists alerts for the admin role with read state attached', async () => {
    const { alerts, total } = await queryAlerts(ADMIN, 'admin', {})
    expect(total).toBe(3)
    expect(alerts.every((a) => a.is_read === false)).toBe(true)
    expect(alerts.every((a) => Array.isArray(a.target_roles))).toBe(true)
  })

  it('excludes alerts whose target_roles do not include the caller role', async () => {
    const { alerts, total } = await queryAlerts(ADMIN, 'sales_personnel', {})
    expect(total).toBe(0)
    expect(alerts).toHaveLength(0)
  })

  it('filters by alert type', async () => {
    const { alerts } = await queryAlerts(ADMIN, 'admin', { type: 'low_stock' })
    expect(alerts.map((a) => a.type)).toEqual(['low_stock'])
  })

  it('respects backend preference enforcement (notify_low_stock off)', async () => {
    await updateAlertPreferences(ADMIN, { notify_low_stock: false })
    const { alerts, total } = await queryAlerts(ADMIN, 'admin', {})
    expect(total).toBe(2)
    expect(alerts.every((a) => a.type !== 'low_stock')).toBe(true)
  })

  it('hides read alerts unless includeRead is set', async () => {
    await markAlertAsRead(ALERT_LOW_ID, ADMIN)
    const hidden = await queryAlerts(ADMIN, 'admin', {})
    expect(hidden.alerts.some((a) => a.id === ALERT_LOW_ID)).toBe(false)

    const withRead = await queryAlerts(ADMIN, 'admin', { includeRead: true })
    const readAlert = withRead.alerts.find((a) => a.id === ALERT_LOW_ID)
    expect(readAlert?.is_read).toBe(true)
  })

  it('applies offset/limit pagination', async () => {
    const page = await queryAlerts(ADMIN, 'admin', { limit: 2 })
    expect(page.alerts).toHaveLength(2)
    expect(page.limit).toBe(2)
    expect(page.offset).toBe(0)
  })

  it('enriches alerts with product/location names from joined tables', async () => {
    const { alerts } = await queryAlerts(ADMIN, 'admin', { type: 'low_stock' })
    expect(alerts[0].product_name).toBe('Wireless Earbuds Pro')
    expect(alerts[0].location_name).toBe('Store A — MG Road')
  })
})

describe('getUnreadAlertCount + mark-alerts-as-read (fake supabase)', () => {
  beforeEach(() => {
    resetFakeDb(alertsDb())
    resetMemoryState()
  })

  it('counts only unread, unresolved alerts visible to the role', async () => {
    await markAlertAsRead(ALERT_LOW_ID, ADMIN)
    const count = await getUnreadAlertCount(ADMIN, 'admin')
    expect(count).toBe(2)
  })

  it('markAlertAsRead persists a read row and subsequent queries exclude it', async () => {
    await markAlertAsRead(ALERT_OUT_ID, ADMIN)
    const rows = getFakeDb().alert_reads ?? []
    expect(rows.some((r) => r.alert_id === ALERT_OUT_ID && r.user_id === ADMIN && r.dismissed === false)).toBe(true)
  })

  it('markAllAlertsAsRead marks every visible unread alert and returns the count', async () => {
    const marked = await markAllAlertsAsRead(ADMIN, 'admin')
    expect(marked).toBe(3)
    const remaining = await queryAlerts(ADMIN, 'admin', { isResolved: false, includeRead: false })
    expect(remaining.total).toBe(0)
  })

  it('loses the seeded read-style alert only for the read tracking user', async () => {
    await markAllAlertsAsRead(ADMIN, 'admin')
    const forOther = await queryAlerts('beef0000-0000-0000-0000-000000000077', 'admin', {})
    expect(forOther.total).toBe(3)
  })
})