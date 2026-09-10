import type { Role } from '../../middleware/auth.js'
import type { EntityStatus, Gender } from '../../lib/schemas/enums.js'
import type { ListUsersQuery } from '../../lib/schemas/users.js'
import type { CreateAuditLogInput } from '../../lib/schemas/audit.js'
import { supabase } from '../../config/index.js'

export interface LocalUserProfile {
  id: string
  email: string
  full_name: string
  role: Role
  store_id: string | null
  gender: Gender | null
  address: string | null
  avatar_url: string | null
  phone: string | null
  status: EntityStatus
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface LocalAuditLog {
  id: string
  actor_id: string | null
  actor_email: string | null
  actor_role: Role | null
  action: string
  entity: string
  entity_id: string | null
  detail: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

// Seed initial users matching application architecture
export const memoryUsers: LocalUserProfile[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin@vaultory.internal',
    full_name: 'Admin User',
    role: 'admin',
    store_id: null,
    gender: 'prefer_not_to_say',
    address: 'HQ, Mumbai',
    avatar_url: null,
    phone: '+91 98200 00001',
    status: 'active',
    last_login_at: new Date().toISOString(),
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'staff.mumbai@vaultory.internal',
    full_name: 'Vikram Malhotra',
    role: 'store_staff',
    store_id: 'e1000000-0000-0000-0000-000000000001', // Store A — MG Road
    gender: 'male',
    address: '12 Colaba Causeway, Mumbai',
    avatar_url: null,
    phone: '+91 98200 88001',
    status: 'active',
    last_login_at: '2026-09-08T10:30:00.000Z',
    created_at: '2026-08-10T00:00:00.000Z',
    updated_at: '2026-08-10T00:00:00.000Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    email: 'sales.andheri@vaultory.internal',
    full_name: 'Ananya Roy',
    role: 'sales_personnel',
    store_id: 'e1000000-0000-0000-0000-000000000002', // Store B — Andheri
    gender: 'female',
    address: '55 Lokhandwala, Andheri West',
    avatar_url: null,
    phone: '+91 98200 88002',
    status: 'active',
    last_login_at: '2026-09-09T14:15:00.000Z',
    created_at: '2026-08-15T00:00:00.000Z',
    updated_at: '2026-08-15T00:00:00.000Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    email: 'stakeholder@vaultory.internal',
    full_name: 'Rohan Mehra',
    role: 'senior_stakeholder',
    store_id: null,
    gender: 'male',
    address: 'Bandra West, Mumbai',
    avatar_url: null,
    phone: '+91 98200 88003',
    status: 'active',
    last_login_at: '2026-09-07T09:00:00.000Z',
    created_at: '2026-08-20T00:00:00.000Z',
    updated_at: '2026-08-20T00:00:00.000Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000005',
    email: 'deactivated@vaultory.internal',
    full_name: 'Inactive Staff',
    role: 'store_staff',
    store_id: 'e1000000-0000-0000-0000-000000000003', // Store C — Thane
    gender: 'other',
    address: 'Thane West',
    avatar_url: null,
    phone: '+91 98200 88004',
    status: 'archived',
    last_login_at: '2026-08-25T11:00:00.000Z',
    created_at: '2026-08-05T00:00:00.000Z',
    updated_at: '2026-08-28T00:00:00.000Z',
  },
]

export const memoryAuditLogs: LocalAuditLog[] = []

export function getMemoryUserById(id: string): LocalUserProfile | null {
  return memoryUsers.find((u) => u.id === id) ?? null
}

export function getMemoryUserByEmail(email: string): LocalUserProfile | null {
  const norm = email.trim().toLowerCase()
  return memoryUsers.find((u) => u.email.toLowerCase() === norm) ?? null
}

export function queryMemoryUsers(params: ListUsersQuery): { users: LocalUserProfile[]; total: number } {
  let filtered = [...memoryUsers]

  // Status filtering: 'active' | 'archived' | 'all'
  if (params.status && params.status !== 'all') {
    filtered = filtered.filter((u) => u.status === params.status)
  }

  // Role filtering
  if (params.role && params.role !== 'all') {
    filtered = filtered.filter((u) => u.role === params.role)
  }

  // Store filtering
  if (params.store_id && params.store_id !== 'all') {
    if (params.store_id === 'none' || params.store_id === 'null') {
      filtered = filtered.filter((u) => u.store_id === null)
    } else {
      filtered = filtered.filter((u) => u.store_id === params.store_id)
    }
  }

  // Search matching full_name, email, or phone (case-insensitive partial match)
  if (params.search) {
    const q = params.search.toLowerCase()
    filtered = filtered.filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.toLowerCase().includes(q)),
    )
  }

  // Sort by created_at desc (newest first)
  filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const total = filtered.length
  const paginated = filtered.slice(params.offset, params.offset + params.limit)

  return { users: paginated, total }
}

export function insertMemoryUser(user: LocalUserProfile): LocalUserProfile {
  memoryUsers.unshift(user)
  return user
}

export function updateMemoryUser(id: string, updates: Partial<LocalUserProfile>): LocalUserProfile | null {
  const index = memoryUsers.findIndex((u) => u.id === id)
  if (index === -1) return null

  const updated: LocalUserProfile = {
    ...memoryUsers[index],
    ...updates,
    updated_at: new Date().toISOString(),
  }
  memoryUsers[index] = updated
  return updated
}

/**
 * Audit log recording with dual-mode persistence (Supabase + fallback list).
 */
export async function recordAuditLog(entry: CreateAuditLogInput): Promise<void> {
  const auditRow: LocalAuditLog = {
    id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    actor_id: entry.actorId ?? null,
    actor_email: entry.actorEmail ?? null,
    actor_role: entry.actorRole ?? null,
    action: entry.action,
    entity: entry.entity,
    entity_id: entry.entityId ?? null,
    detail: (entry.detail as Record<string, unknown>) ?? null,
    ip_address: entry.ipAddress ?? null,
    user_agent: entry.userAgent ?? null,
    created_at: new Date().toISOString(),
  }

  memoryAuditLogs.unshift(auditRow)

  try {
    await supabase.from('audit_logs').insert({
      actor_id: auditRow.actor_id,
      actor_email: auditRow.actor_email,
      actor_role: auditRow.actor_role,
      action: auditRow.action,
      entity: auditRow.entity,
      entity_id: auditRow.entity_id,
      detail: auditRow.detail,
      ip_address: auditRow.ip_address,
      user_agent: auditRow.user_agent,
    })
  } catch {
    // Non-blocking fallback; memoryAuditLogs already recorded
  }
}
