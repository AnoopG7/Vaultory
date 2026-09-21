import { beforeEach, describe, expect, it } from 'vitest'
import { resetFakeDb, getFakeDb } from '../helpers/fake-supabase'
import {
  memoryUsers,
  memoryAuditLogs,
  getMemoryUserById,
  getMemoryUserByEmail,
  queryMemoryUsers,
  insertMemoryUser,
  updateMemoryUser,
  recordAuditLog,
} from '../../src/modules/users/users.store'
import type { LocalUserProfile } from '../../src/modules/users/users.store'

const ADMIN_ID = '00000000-0000-0000-0000-000000000001'

function newUser(id: string): LocalUserProfile {
  return {
    id,
    email: `new-${id}@vaultory.internal`,
    full_name: `New User ${id}`,
    role: 'sales_personnel',
    store_id: null,
    gender: null,
    address: null,
    avatar_url: null,
    phone: '+91 90000 00000',
    status: 'active',
    last_login_at: null,
    created_at: '2026-09-15T08:00:00.000Z',
    updated_at: '2026-09-15T08:00:00.000Z',
  }
}

let usersBase: LocalUserProfile[]

beforeEach(() => {
  resetFakeDb({})
  usersBase ??= structuredClone(memoryUsers)
  memoryUsers.splice(0, memoryUsers.length, ...structuredClone(usersBase))
  memoryAuditLogs.length = 0
})

describe('getMemoryUserById / getMemoryUserByEmail', () => {
  it('finds a user by id', () => {
    expect(getMemoryUserById(ADMIN_ID)?.email).toBe('admin@vaultory.internal')
  })

  it('returns null for unknown ids', () => {
    expect(getMemoryUserById('00000000-0000-0000-0000-00000000zzzz')).toBeNull()
  })

  it('looks up by email case-insensitively and trims surrounding whitespace', () => {
    const user = getMemoryUserByEmail('  ADMIN@Vaultory.Internal  ')
    expect(user?.full_name).toBe('Admin User')
  })

  it('returns null for unknown emails', () => {
    expect(getMemoryUserByEmail('nobody@vaultory.internal')).toBeNull()
  })
})

describe('queryMemoryUsers', () => {
  it('lists all users newest-first with an exact total', () => {
    const { users, total } = queryMemoryUsers({ limit: 50, offset: 0 })
    expect(total).toBe(5)
    expect(users[0].id).toBe('00000000-0000-0000-0000-000000000004') // created 08-20, newest
    expect(users[users.length - 1].id).toBe(ADMIN_ID) // created 08-01, oldest
  })

  it('filters by status', () => {
    const active = queryMemoryUsers({ status: 'active', limit: 50, offset: 0 })
    expect(active.total).toBe(4)
    expect(active.users.every((u) => u.status === 'active')).toBe(true)

    const archived = queryMemoryUsers({ status: 'archived', limit: 50, offset: 0 })
    expect(archived.total).toBe(1)
    expect(archived.users[0].full_name).toBe('Inactive Staff')
  })

  it('filters by role and store', () => {
    const staff = queryMemoryUsers({ role: 'store_staff', limit: 50, offset: 0 })
    expect(staff.total).toBe(2)

    const headless = queryMemoryUsers({ store_id: 'none', limit: 50, offset: 0 })
    expect(headless.total).toBe(2)
    expect(headless.users.every((u) => u.store_id === null)).toBe(true)

    const mumbai = queryMemoryUsers({ store_id: 'e1000000-0000-0000-0000-000000000001', limit: 50, offset: 0 })
    expect(mumbai.total).toBe(1)
    expect(mumbai.users[0].full_name).toBe('Vikram Malhotra')
  })

  it('searches names, emails, and phones case-insensitively', () => {
    expect(queryMemoryUsers({ search: 'vikram', limit: 50, offset: 0 }).total).toBe(1)
    expect(queryMemoryUsers({ search: 'SALES.ANDHERI', limit: 50, offset: 0 }).total).toBe(1)
    expect(queryMemoryUsers({ search: '98200 88002', limit: 50, offset: 0 }).total).toBe(1)
    expect(queryMemoryUsers({ search: 'zzz', limit: 50, offset: 0 }).total).toBe(0)
  })

  it('paginates while keeping the full filtered total', () => {
    const page = queryMemoryUsers({ limit: 2, offset: 2 })
    expect(page.users).toHaveLength(2)
    expect(page.total).toBe(5)
    expect(page.users[0].id).toBe('00000000-0000-0000-0000-000000000002')
    expect(page.users[1].id).toBe('00000000-0000-0000-0000-000000000005')
  })
})

describe('insertMemoryUser / updateMemoryUser', () => {
  it('unshifts a new user to the front of the list', () => {
    const user = insertMemoryUser(newUser('abc'))
    expect(memoryUsers[0]).toBe(user)
    expect(queryMemoryUsers({ limit: 50, offset: 0 }).total).toBe(6)
  })

  it('merges partial updates and stamps updated_at', () => {
    const updated = updateMemoryUser(ADMIN_ID, { phone: '+91 99999 99999', gender: 'female' })
    expect(updated?.phone).toBe('+91 99999 99999')
    expect(updated?.gender).toBe('female')
    expect(updated?.full_name).toBe('Admin User') // untouched
    expect(updated?.updated_at).not.toBe('2026-08-01T00:00:00.000Z')
    expect(getMemoryUserById(ADMIN_ID)?.phone).toBe('+91 99999 99999')
  })

  it('returns null when updating an unknown user', () => {
    expect(updateMemoryUser('00000000-0000-0000-0000-00000000zzzz', { phone: 'x' })).toBeNull()
  })
})

describe('recordAuditLog', () => {
  it('records to memory and persists to the audit_logs table', async () => {
    await recordAuditLog({
      actorId: ADMIN_ID,
      actorEmail: 'admin@vaultory.internal',
      actorRole: 'admin',
      action: 'sale_created',
      entity: 'sale',
      entityId: 'sale-1',
      detail: { total: 100 },
      ipAddress: '10.0.0.1',
      userAgent: 'vitest',
    })

    expect(memoryAuditLogs).toHaveLength(1)
    const mem = memoryAuditLogs[0]
    expect(mem).toMatchObject({
      actor_id: ADMIN_ID,
      actor_email: 'admin@vaultory.internal',
      actor_role: 'admin',
      action: 'sale_created',
      entity: 'sale',
      entity_id: 'sale-1',
      detail: { total: 100 },
      ip_address: '10.0.0.1',
      user_agent: 'vitest',
    })
    expect(mem.id).toMatch(/^aud-/)

    const rows = getFakeDb().audit_logs
    expect(rows).toHaveLength(1)
    expect(rows[0].action).toBe('sale_created')
    expect(rows[0].detail).toEqual({ total: 100 })
  })

  it('writes null-safe rows for optional fields', async () => {
    await recordAuditLog({ actorId: null, actorEmail: null, actorRole: null, action: 'signed_in', entity: 'auth', entityId: null, detail: null })
    expect(memoryAuditLogs[0]).toMatchObject({
      actor_id: null,
      actor_email: null,
      actor_role: null,
      entity_id: null,
      detail: null,
      ip_address: null,
      user_agent: null,
    })
  })
})