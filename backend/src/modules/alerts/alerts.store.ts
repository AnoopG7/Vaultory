import { randomUUID } from 'node:crypto'
import { supabase, supabaseAdmin } from '../../config/index.js'
import type { Role } from '../../middleware/auth.js'
import type { AlertType, AlertPriority } from '../../lib/schemas/enums.js'
import { computeStockStatus, type LocalInventoryItem } from '../inventory/inventory.store.js'

const db = supabaseAdmin ?? supabase

export interface LocalAlert {
  id: string
  type: AlertType
  priority: AlertPriority
  title: string
  message: string
  product_id: string | null
  location_id: string | null
  po_id: string | null
  ai_recommendation_id: string | null
  target_roles: Role[]
  is_resolved: boolean
  resolved_at: string | null
  resolved_by: string | null
  expires_at: string | null
  created_at: string
  // Enriched fields
  is_read?: boolean
  read_at?: string | null
  product_name?: string
  sku_code?: string
  location_name?: string
}

export interface LocalAlertRead {
  alert_id: string
  user_id: string
  read_at: string
  dismissed: boolean
}

export interface LocalAlertPreferences {
  user_id: string
  notify_low_stock: boolean
  notify_out_of_stock: boolean
  notify_po_created: boolean
  notify_po_received: boolean
  notify_po_overdue: boolean
  notify_ai_recommendation: boolean
  notify_expiry_warning: boolean
  email_enabled: boolean
  email_address: string | null
  updated_at: string
}

// In-memory fallbacks
export const memoryAlerts: LocalAlert[] = []
export const memoryAlertReads: LocalAlertRead[] = []
export const memoryAlertPreferences = new Map<string, LocalAlertPreferences>()

/**
 * Fetch user alert preferences with sensible defaults.
 */
export async function getUserAlertPreferences(userId: string): Promise<LocalAlertPreferences> {
  const mem = memoryAlertPreferences.get(userId)
  if (mem) return mem

  try {
    const { data, error } = await db
      .from('alert_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (!error && data) {
      const prefs: LocalAlertPreferences = {
        user_id: data.user_id,
        notify_low_stock: Boolean(data.notify_low_stock ?? true),
        notify_out_of_stock: Boolean(data.notify_out_of_stock ?? true),
        notify_po_created: Boolean(data.notify_po_created ?? true),
        notify_po_received: Boolean(data.notify_po_received ?? true),
        notify_po_overdue: Boolean(data.notify_po_overdue ?? false),
        notify_ai_recommendation: Boolean(data.notify_ai_recommendation ?? true),
        notify_expiry_warning: Boolean(data.notify_expiry_warning ?? false),
        email_enabled: Boolean(data.email_enabled ?? false),
        email_address: data.email_address ?? null,
        updated_at: data.updated_at ?? new Date().toISOString(),
      }
      memoryAlertPreferences.set(userId, prefs)
      return prefs
    }
  } catch {
    // Fallback to memory
  }

  const existing = memoryAlertPreferences.get(userId)
  if (existing) return existing

  const defaultPrefs: LocalAlertPreferences = {
    user_id: userId,
    notify_low_stock: true,
    notify_out_of_stock: true,
    notify_po_created: true,
    notify_po_received: true,
    notify_po_overdue: false,
    notify_ai_recommendation: true,
    notify_expiry_warning: false,
    email_enabled: false,
    email_address: null,
    updated_at: new Date().toISOString(),
  }
  memoryAlertPreferences.set(userId, defaultPrefs)
  return defaultPrefs
}

/**
 * Upsert user alert preferences.
 */
export async function updateAlertPreferences(
  userId: string,
  updates: Partial<LocalAlertPreferences>
): Promise<LocalAlertPreferences> {
  const current = await getUserAlertPreferences(userId)
  const merged: LocalAlertPreferences = {
    ...current,
    ...updates,
    user_id: userId,
    updated_at: new Date().toISOString(),
  }

  try {
    await db.from('alert_preferences').upsert(
      {
        user_id: userId,
        notify_low_stock: merged.notify_low_stock,
        notify_out_of_stock: merged.notify_out_of_stock,
        notify_po_created: merged.notify_po_created,
        notify_po_received: merged.notify_po_received,
        notify_po_overdue: merged.notify_po_overdue,
        notify_ai_recommendation: merged.notify_ai_recommendation,
        notify_expiry_warning: merged.notify_expiry_warning,
        email_enabled: merged.email_enabled,
        email_address: merged.email_address,
        updated_at: merged.updated_at,
      },
      { onConflict: 'user_id' }
    )
  } catch {
    // Memory fallback handles state
  }

  memoryAlertPreferences.set(userId, merged)
  return merged
}

/**
 * Evaluate single inventory item and sync alert state:
 * - OUT_OF_STOCK -> generate out_of_stock alert (if none active), resolve low_stock
 * - LOW_STOCK    -> generate low_stock alert (if none active), resolve out_of_stock
 * - NORMAL       -> resolve any active low_stock or out_of_stock alerts (recovery)
 * Prevents duplicate alerts via idempotent active-alert check.
 */
export async function evaluateItemAlert(item: {
  product_id: string
  location_id: string
  product_name: string
  sku_code: string
  location_name: string
  qty_on_hand: number
  reorder_point: number
  target_level?: number
}): Promise<LocalAlert | null> {
  const status = computeStockStatus(item.qty_on_hand, item.reorder_point, item.target_level ?? 0)

  if (status === 'out_of_stock') {
    // 1. Resolve prior low_stock alert
    await resolveItemAlert(item.product_id, item.location_id, 'low_stock')

    // 2. Check existing active out_of_stock alert (Deduplication)
    const active = await findActiveAlert(item.product_id, item.location_id, 'out_of_stock')
    if (active) return active

    // 3. Create new out_of_stock alert
    return await createAlert({
      type: 'out_of_stock',
      priority: 'high',
      title: `Out of Stock: ${item.product_name}`,
      message: `Out of stock: ${item.product_name} (${item.sku_code}) currently has 0 units available at ${item.location_name}.`,
      product_id: item.product_id,
      location_id: item.location_id,
      product_name: item.product_name,
      sku_code: item.sku_code,
      location_name: item.location_name,
      target_roles: ['admin', 'store_staff'],
    })
  }

  if (status === 'low') {
    // 1. Resolve prior out_of_stock alert if any
    await resolveItemAlert(item.product_id, item.location_id, 'out_of_stock')

    // 2. Check existing active low_stock alert (Deduplication)
    const active = await findActiveAlert(item.product_id, item.location_id, 'low_stock')
    if (active) return active

    // 3. Create new low_stock alert
    return await createAlert({
      type: 'low_stock',
      priority: 'medium',
      title: `Low Stock: ${item.product_name}`,
      message: `Low stock: ${item.product_name} (${item.sku_code}) has ${item.qty_on_hand} units remaining at ${item.location_name}. Reorder point is ${item.reorder_point}.`,
      product_id: item.product_id,
      location_id: item.location_id,
      product_name: item.product_name,
      sku_code: item.sku_code,
      location_name: item.location_name,
      target_roles: ['admin', 'store_staff'],
    })
  }

  if (status === 'in_stock' || status === 'over_stock') {
    // Recovery! Resolve any lingering low_stock or out_of_stock alerts
    await resolveItemAlert(item.product_id, item.location_id, 'low_stock')
    await resolveItemAlert(item.product_id, item.location_id, 'out_of_stock')
    return null
  }

  return null
}

async function findActiveAlert(
  productId: string,
  locationId: string,
  type: AlertType
): Promise<LocalAlert | null> {
  try {
    const { data, error } = await db
      .from('alerts')
      .select('*')
      .eq('product_id', productId)
      .eq('location_id', locationId)
      .eq('type', type)
      .eq('is_resolved', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!error && data) {
      return {
        id: data.id,
        type: data.type,
        priority: data.priority,
        title: data.title,
        message: data.message,
        product_id: data.product_id,
        location_id: data.location_id,
        po_id: data.po_id,
        ai_recommendation_id: data.ai_recommendation_id,
        target_roles: data.target_roles,
        is_resolved: data.is_resolved,
        resolved_at: data.resolved_at,
        resolved_by: data.resolved_by,
        expires_at: data.expires_at,
        created_at: data.created_at,
      }
    }
  } catch {
    // Fallback to memory
  }

  const found = memoryAlerts.find(
    (a) =>
      a.product_id === productId &&
      a.location_id === locationId &&
      a.type === type &&
      !a.is_resolved
  )
  return found ?? null
}

async function resolveItemAlert(
  productId: string,
  locationId: string,
  type: AlertType
): Promise<void> {
  const now = new Date().toISOString()
  try {
    await db
      .from('alerts')
      .update({ is_resolved: true, resolved_at: now })
      .eq('product_id', productId)
      .eq('location_id', locationId)
      .eq('type', type)
      .eq('is_resolved', false)
  } catch {
    // Memory fallback handles
  }

  for (const a of memoryAlerts) {
    if (
      a.product_id === productId &&
      a.location_id === locationId &&
      a.type === type &&
      !a.is_resolved
    ) {
      a.is_resolved = true
      a.resolved_at = now
    }
  }
}

async function createAlert(params: {
  type: AlertType
  priority: AlertPriority
  title: string
  message: string
  product_id: string | null
  location_id: string | null
  product_name?: string
  sku_code?: string
  location_name?: string
  target_roles: Role[]
}): Promise<LocalAlert> {
  const newAlert: LocalAlert = {
    id: randomUUID(),
    type: params.type,
    priority: params.priority,
    title: params.title,
    message: params.message,
    product_id: params.product_id,
    location_id: params.location_id,
    po_id: null,
    ai_recommendation_id: null,
    target_roles: params.target_roles,
    is_resolved: false,
    resolved_at: null,
    resolved_by: null,
    expires_at: null,
    created_at: new Date().toISOString(),
    product_name: params.product_name,
    sku_code: params.sku_code,
    location_name: params.location_name,
  }

  try {
    const { data, error } = await db
      .from('alerts')
      .insert({
        id: newAlert.id,
        type: newAlert.type,
        priority: newAlert.priority,
        title: newAlert.title,
        message: newAlert.message,
        product_id: newAlert.product_id,
        location_id: newAlert.location_id,
        target_roles: newAlert.target_roles,
        is_resolved: false,
        created_at: newAlert.created_at,
      })
      .select()
      .single()

    if (!error && data) {
      newAlert.id = data.id
    }
  } catch {
    // Memory fallback holds state
  }

  memoryAlerts.unshift(newAlert)
  return newAlert
}

/**
 * Scan all current inventory items and ensure active alerts reflect reality.
 * Deduplicates automatically.
 */
export async function syncInventoryAlerts(items: LocalInventoryItem[]): Promise<void> {
  for (const item of items) {
    await evaluateItemAlert(item)
  }
}

/**
 * List alerts tailored for caller, strictly enforcing alert preferences.
 */
export async function queryAlerts(
  userId: string,
  userRole: Role,
  query: {
    type?: AlertType
    isResolved?: boolean
    includeRead?: boolean
    productId?: string
    limit?: number
    offset?: number
  }
): Promise<{ alerts: LocalAlert[]; total: number; limit: number; offset: number }> {
  // 1. Load preferences
  const prefs = await getUserAlertPreferences(userId)

  // 2. Fetch from Supabase or fallback
  let rawAlerts: LocalAlert[]

  try {
    let q = db
      .from('alerts')
      .select('*, products(name, sku_code), locations(name)')
      .order('created_at', { ascending: false })

    if (query.isResolved !== undefined) {
      q = q.eq('is_resolved', query.isResolved)
    }

    if (query.type) {
      q = q.eq('type', query.type)
    }

    if (query.productId) {
      q = q.eq('product_id', query.productId)
    }

    const { data, error } = await q
    const seenIds = new Set<string>()
    rawAlerts = []

    if (!error && data && data.length > 0) {
      for (const row of data) {
        seenIds.add(row.id)
        rawAlerts.push({
          id: row.id,
          type: row.type,
          priority: row.priority,
          title: row.title,
          message: row.message,
          product_id: row.product_id,
          location_id: row.location_id,
          po_id: row.po_id,
          ai_recommendation_id: row.ai_recommendation_id,
          target_roles: row.target_roles ?? ['admin'],
          is_resolved: row.is_resolved,
          resolved_at: row.resolved_at,
          resolved_by: row.resolved_by,
          expires_at: row.expires_at,
          created_at: row.created_at,
          product_name: row.products?.name ?? undefined,
          sku_code: row.products?.sku_code ?? undefined,
          location_name: row.locations?.name ?? undefined,
        })
      }
    }

    for (const a of memoryAlerts) {
      if (!seenIds.has(a.id)) {
        if (query.isResolved !== undefined && a.is_resolved !== query.isResolved) continue
        if (query.type && a.type !== query.type) continue
        if (query.productId && a.product_id !== query.productId) continue
        rawAlerts.push(a)
      }
    }
  } catch {
    rawAlerts = [...memoryAlerts]
  }

  // Fetch read tracking for this user
  const readAlertIds = new Set<string>()
  try {
    const { data: reads } = await db
      .from('alert_reads')
      .select('alert_id')
      .eq('user_id', userId)

    if (reads) {
      for (const r of reads) readAlertIds.add(r.alert_id)
    }
  } catch {
    // Non-blocking
  }
  for (const r of memoryAlertReads) {
    if (r.user_id === userId) readAlertIds.add(r.alert_id)
  }

  // 3. Filter by role, user preferences, and read state
  const filtered = rawAlerts.filter((alert) => {
    // Role matching
    const roleAllowed =
      userRole === 'admin' ||
      (Array.isArray(alert.target_roles) && alert.target_roles.includes(userRole))
    if (!roleAllowed) return false

    // Backend Preference Enforcement:
    // If low stock alerts disabled, exclude low_stock
    if (!prefs.notify_low_stock && alert.type === 'low_stock') {
      return false
    }
    // If out of stock alerts disabled, exclude out_of_stock
    if (!prefs.notify_out_of_stock && alert.type === 'out_of_stock') {
      return false
    }

    const isRead = readAlertIds.has(alert.id)
    if (!query.includeRead && isRead) {
      return false
    }

    return true
  })

  // Attach is_read flag
  const enriched = filtered.map((a) => ({
    ...a,
    is_read: readAlertIds.has(a.id),
  }))

  const offset = query.offset ?? 0
  const limit = query.limit ?? 50
  const paged = enriched.slice(offset, offset + limit)

  return {
    alerts: paged,
    total: enriched.length,
    limit,
    offset,
  }
}

/**
 * Get count of active unread alerts for the user, respecting preferences.
 */
export async function getUnreadAlertCount(userId: string, userRole: Role): Promise<number> {
  const result = await queryAlerts(userId, userRole, {
    isResolved: false,
    includeRead: false,
    limit: 100,
  })
  return result.total
}

/**
 * Mark single alert as read for user.
 */
export async function markAlertAsRead(alertId: string, userId: string): Promise<void> {
  const now = new Date().toISOString()
  try {
    await db.from('alert_reads').upsert(
      {
        alert_id: alertId,
        user_id: userId,
        read_at: now,
        dismissed: false,
      },
      { onConflict: 'alert_id,user_id' }
    )
  } catch {
    // Memory fallback
  }

  const existingIdx = memoryAlertReads.findIndex(
    (r) => r.alert_id === alertId && r.user_id === userId
  )
  if (existingIdx >= 0) {
    memoryAlertReads[existingIdx].read_at = now
  } else {
    memoryAlertReads.push({
      alert_id: alertId,
      user_id: userId,
      read_at: now,
      dismissed: false,
    })
  }
}

/**
 * Mark all unread alerts matching caller's view as read.
 */
export async function markAllAlertsAsRead(userId: string, userRole: Role): Promise<number> {
  const unread = await queryAlerts(userId, userRole, {
    isResolved: false,
    includeRead: false,
    limit: 200,
  })

  for (const alert of unread.alerts) {
    await markAlertAsRead(alert.id, userId)
  }

  return unread.alerts.length
}
