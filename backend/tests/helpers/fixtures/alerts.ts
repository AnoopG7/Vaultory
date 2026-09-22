import type { Database, Row } from '../fake-supabase'
import type { Role } from '../../../src/middleware/auth.js'
import { LOC_A, LOC_B, P1, P2, ADMIN, inventoryDb } from './inventory'

export const ALERT_LOW_ID = 'al-00000000-0000-0000-0000-000000000001'
export const ALERT_OUT_ID = 'al-00000000-0000-0000-0000-000000000002'
export const ALERT_READ_ID = 'al-00000000-0000-0000-0000-000000000003'

export interface AlertRow {
  id: string
  type: 'low_stock' | 'out_of_stock' | 'po_created' | 'po_received' | 'po_overdue' | 'ai_recommendation' | 'expiry_warning'
  priority: 'high' | 'medium' | 'low'
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
}

export function alertRows(): Row[] {
  return [
    {
      id: ALERT_LOW_ID,
      type: 'low_stock',
      priority: 'medium',
      title: 'Low Stock: Wireless Earbuds Pro',
      message: 'Low stock message',
      product_id: P2,
      location_id: LOC_A,
      po_id: null,
      ai_recommendation_id: null,
      target_roles: ['admin', 'store_staff'],
      is_resolved: false,
      resolved_at: null,
      resolved_by: null,
      expires_at: null,
      created_at: '2026-08-20T09:00:00Z',
    },
    {
      id: ALERT_OUT_ID,
      type: 'out_of_stock',
      priority: 'high',
      title: 'Out of Stock: Phone Screen Protector',
      message: 'Out of stock message',
      product_id: P1,
      location_id: LOC_B,
      po_id: null,
      ai_recommendation_id: null,
      target_roles: ['admin', 'store_staff'],
      is_resolved: false,
      resolved_at: null,
      resolved_by: null,
      expires_at: null,
      created_at: '2026-08-21T10:00:00Z',
    },
    {
      id: ALERT_READ_ID,
      type: 'po_overdue',
      priority: 'high',
      title: 'PO overdue: PO-2026-001',
      message: 'Purchase order is overdue',
      product_id: null,
      location_id: null,
      po_id: 'PO-2026-001',
      ai_recommendation_id: null,
      target_roles: ['admin'],
      is_resolved: false,
      resolved_at: null,
      resolved_by: null,
      expires_at: null,
      created_at: '2026-08-22T12:00:00Z',
    },
  ] as Row[]
}

export function alertsDb(): Database {
  const db = inventoryDb()
  db.alerts = alertRows()
  db.alert_preferences = [
    {
      user_id: ADMIN,
      notify_low_stock: true,
      notify_out_of_stock: true,
      notify_po_created: true,
      notify_po_received: true,
      notify_po_overdue: true,
      notify_ai_recommendation: true,
      notify_expiry_warning: false,
      email_enabled: false,
      email_address: null,
      updated_at: '2026-08-01T00:00:00Z',
    },
  ]
  db.alert_reads = []
  return db
}