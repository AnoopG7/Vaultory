import { randomUUID } from 'node:crypto'
import { supabase, env } from '../../config/index.js'
import { AppError } from '../../middleware/index.js'
import type { Role } from '../../middleware/auth.js'
import type { CreateStoreInput, UpdateStoreInput } from '../../lib/schemas/stores.js'
import type { UpdateLocationInput } from '../../lib/schemas/locations.js'
import { recordAuditLog, memoryUsers } from '../users/users.store.js'
import { memoryInventory } from '../inventory/inventory.store.js'

export interface LocalStore {
  id: string
  name: string
  code: string
  city: string | null
  state: string | null
  address: string | null
  phone: string | null
  email: string | null
  status: 'active' | 'inactive' | 'archived'
  created_at: string
  updated_at: string
}

export interface LocalLocation {
  id: string
  type: 'store' | 'warehouse'
  store_id: string | null
  name: string
  code: string
  city: string | null
  address: string | null
  phone: string | null
  email: string | null
  is_default: boolean
  status: 'active' | 'inactive' | 'archived'
  created_at: string
  updated_at: string
}

export interface StoreWithAggregates extends LocalStore {
  location_id?: string | null
  staff_count: number
  inventory_item_count: number
  total_inventory_units: number
  total_inventory_value: number
}

export interface StoreStaffSummary {
  id: string
  full_name: string
  email: string
  role: Role
  phone: string | null
  status: string
}

export interface StoreDetailResponse {
  store: LocalStore
  location: LocalLocation | null
  staff: StoreStaffSummary[]
  inventory: {
    item_count: number
    total_units: number
    total_value: number
  }
}

/** Check if Supabase connection is offline or mock */
const isMockSupabase = !env.SUPABASE_URL || env.SUPABASE_URL.includes('mock') || env.SUPABASE_URL.includes('localhost')

/** In-memory stores master seeded from seed.sql */
export const memoryStores: LocalStore[] = [
  {
    id: 'e1000000-0000-0000-0000-000000000001',
    name: 'Store A — MG Road',
    code: 'STORE-A',
    city: 'Mumbai',
    state: 'MH',
    address: '12, MG Road, Colaba, Mumbai 400001',
    phone: '+91 22 2204 1001',
    email: 'storea@vaultory.app',
    status: 'active',
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
  },
  {
    id: 'e1000000-0000-0000-0000-000000000002',
    name: 'Store B — Andheri',
    code: 'STORE-B',
    city: 'Mumbai',
    state: 'MH',
    address: '45, Link Road, Andheri West, Mumbai 400053',
    phone: '+91 22 2637 1002',
    email: 'storeb@vaultory.app',
    status: 'active',
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
  },
  {
    id: 'e1000000-0000-0000-0000-000000000003',
    name: 'Store C — Thane',
    code: 'STORE-C',
    city: 'Thane',
    state: 'MH',
    address: '78, Lakewood, Ghodbunder Rd, Thane 400607',
    phone: '+91 22 2540 1003',
    email: 'storec@vaultory.app',
    status: 'active',
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
  },
]

/** In-memory physical locations seeded from seed.sql */
export const memoryLocations: LocalLocation[] = [
  {
    id: 'a1000000-0000-0000-0000-000000000001',
    type: 'store',
    store_id: 'e1000000-0000-0000-0000-000000000001',
    name: 'Store A — MG Road',
    code: 'STORE-A',
    city: 'Mumbai',
    address: '12, MG Road, Colaba, Mumbai 400001',
    phone: '+91 22 2204 1001',
    email: 'storea@vaultory.app',
    is_default: false,
    status: 'active',
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000002',
    type: 'store',
    store_id: 'e1000000-0000-0000-0000-000000000002',
    name: 'Store B — Andheri',
    code: 'STORE-B',
    city: 'Mumbai',
    address: '45, Link Road, Andheri West, Mumbai 400053',
    phone: '+91 22 2637 1002',
    email: 'storeb@vaultory.app',
    is_default: false,
    status: 'active',
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000003',
    type: 'store',
    store_id: 'e1000000-0000-0000-0000-000000000003',
    name: 'Store C — Thane',
    code: 'STORE-C',
    city: 'Thane',
    address: '78, Lakewood, Ghodbunder Rd, Thane 400607',
    phone: '+91 22 2540 1003',
    email: 'storec@vaultory.app',
    is_default: false,
    status: 'active',
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000004',
    type: 'warehouse',
    store_id: null,
    name: 'Central Warehouse',
    code: 'WH-CENTRAL',
    city: 'Mumbai',
    address: 'Plot 23, MIDC Industrial Area, Andheri East',
    phone: '+91 22 2831 2000',
    email: 'warehouse@vaultory.app',
    is_default: true,
    status: 'active',
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
  },
]

// -----------------------------------------------------------------------------
// Store Store Operations
// -----------------------------------------------------------------------------

export async function getStoresList(params?: {
  search?: string
  status?: 'all' | 'active' | 'inactive'
}): Promise<StoreWithAggregates[]> {
  const search = params?.search?.toLowerCase().trim()
  const status = params?.status ?? 'all'

  // Attempt Supabase query if not mock
  if (!isMockSupabase) {
    try {
      let query = supabase.from('stores').select('*').order('name', { ascending: true })
      if (status !== 'all') {
        query = query.eq('status', status)
      }
      if (search) {
        query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,city.ilike.%${search}%,address.ilike.%${search}%`)
      }

      const { data: dbStores, error } = await query
      if (!error && dbStores) {
        // Fetch locations to map location_id
        const { data: dbLocations } = await supabase.from('locations').select('id, store_id').eq('type', 'store')
        const { data: dbProfiles } = await supabase.from('profiles').select('id, store_id')
        const { data: dbInventory } = await supabase.from('inventory').select('location_id, qty_on_hand, products(sale_price)')

        return (dbStores as LocalStore[]).map((store) => {
          const matchedLocation = dbLocations?.find((l) => l.store_id === store.id)
          const locId = matchedLocation?.id ?? null
          const staffCount = dbProfiles?.filter((p) => p.store_id === store.id).length ?? 0

          let itemCount = 0
          let totalUnits = 0
          let totalValue = 0

          if (locId && dbInventory) {
            const storeInv = dbInventory.filter((inv) => inv.location_id === locId)
            itemCount = storeInv.length
            for (const item of storeInv) {
              const qty = Number(item.qty_on_hand ?? 0)
              const price = Number((item.products as { sale_price?: number } | null)?.sale_price ?? 0)
              totalUnits += qty
              totalValue += qty * price
            }
          }

          return {
            ...store,
            location_id: locId,
            staff_count: staffCount,
            inventory_item_count: itemCount,
            total_inventory_units: totalUnits,
            total_inventory_value: Math.round(totalValue * 100) / 100,
          }
        })
      }
    } catch {
      // Fallback to memory
    }
  }

  // Memory fallback
  return memoryStores
    .filter((s) => {
      if (status !== 'all' && s.status !== status) return false
      if (!search) return true
      return (
        s.name.toLowerCase().includes(search) ||
        s.code.toLowerCase().includes(search) ||
        (s.city && s.city.toLowerCase().includes(search)) ||
        (s.address && s.address.toLowerCase().includes(search))
      )
    })
    .map((store) => {
      const loc = memoryLocations.find((l) => l.store_id === store.id)
      const locId = loc?.id ?? null
      const staffCount = memoryUsers.filter((u) => u.store_id === store.id).length

      let itemCount = 0
      let totalUnits = 0
      let totalValue = 0

      if (locId) {
        const invItems = memoryInventory.filter((inv) => inv.location_id === locId)
        itemCount = invItems.length
        for (const item of invItems) {
          totalUnits += item.qty_on_hand
          totalValue += item.qty_on_hand * item.sale_price
        }
      }

      return {
        ...store,
        location_id: locId,
        staff_count: staffCount,
        inventory_item_count: itemCount,
        total_inventory_units: totalUnits,
        total_inventory_value: Math.round(totalValue * 100) / 100,
      }
    })
}

export async function getStoreDetail(id: string): Promise<StoreDetailResponse> {
  let store: LocalStore | undefined
  let location: LocalLocation | null = null
  let staff: StoreStaffSummary[] = []
  let itemCount = 0
  let totalUnits = 0
  let totalValue = 0

  if (!isMockSupabase) {
    try {
      const { data: dbStore, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('id', id)
        .single()

      if (!storeError && dbStore) {
        store = dbStore as LocalStore

        const { data: dbLocation } = await supabase
          .from('locations')
          .select('*')
          .eq('store_id', id)
          .eq('type', 'store')
          .maybeSingle()
        if (dbLocation) location = dbLocation as LocalLocation

        const { data: dbStaff } = await supabase
          .from('profiles')
          .select('id, full_name, email, role, phone, status')
          .eq('store_id', id)
        if (dbStaff) {
          staff = dbStaff as StoreStaffSummary[]
        }

        if (location) {
          const { data: dbInventory } = await supabase
            .from('inventory')
            .select('qty_on_hand, products(sale_price)')
            .eq('location_id', location.id)

          if (dbInventory) {
            itemCount = dbInventory.length
            for (const item of dbInventory) {
              const qty = Number(item.qty_on_hand ?? 0)
              const price = Number((item.products as { sale_price?: number } | null)?.sale_price ?? 0)
              totalUnits += qty
              totalValue += qty * price
            }
          }
        }

        return {
          store,
          location,
          staff,
          inventory: {
            item_count: itemCount,
            total_units: totalUnits,
            total_value: Math.round(totalValue * 100) / 100,
          },
        }
      }
    } catch {
      // Fall through to memory
    }
  }

  store = memoryStores.find((s) => s.id === id)
  if (!store) {
    throw new AppError(404, 'Store not found', 'STORE_NOT_FOUND')
  }

  location = memoryLocations.find((l) => l.store_id === id) ?? null
  staff = memoryUsers
    .filter((u) => u.store_id === id)
    .map((u) => ({
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      role: u.role,
      phone: u.phone,
      status: u.status,
    }))

  if (location) {
    const invItems = memoryInventory.filter((inv) => inv.location_id === location!.id)
    itemCount = invItems.length
    for (const item of invItems) {
      totalUnits += item.qty_on_hand
      totalValue += item.qty_on_hand * item.sale_price
    }
  }

  return {
    store,
    location,
    staff,
    inventory: {
      item_count: itemCount,
      total_units: totalUnits,
      total_value: Math.round(totalValue * 100) / 100,
    },
  }
}

export async function createStore(
  input: CreateStoreInput,
  actor: { id?: string; email?: string; role?: Role },
): Promise<{ store: LocalStore; location: LocalLocation }> {
  const normalizedCode = input.code.toUpperCase().trim()

  // 1. Check duplicate code
  const existingStore = memoryStores.find((s) => s.code.toUpperCase() === normalizedCode)
  if (existingStore) {
    throw new AppError(409, `A store with code "${input.code}" already exists`, 'STORE_CODE_EXISTS')
  }

  if (!isMockSupabase) {
    try {
      const { data: existingDb } = await supabase
        .from('stores')
        .select('id')
        .ilike('code', normalizedCode)
        .maybeSingle()
      if (existingDb) {
        throw new AppError(409, `A store with code "${input.code}" already exists`, 'STORE_CODE_EXISTS')
      }
    } catch (err) {
      if (err instanceof AppError) throw err
    }
  }

  const newStoreId = randomUUID()
  const newLocationId = randomUUID()
  const now = new Date().toISOString()

  const storeRecord: LocalStore = {
    id: newStoreId,
    name: input.name.trim(),
    code: normalizedCode,
    city: input.city?.trim() ?? null,
    state: input.state?.trim() ?? null,
    address: input.address?.trim() ?? null,
    phone: input.phone?.trim() ?? null,
    email: input.email?.trim().toLowerCase() ?? null,
    status: input.status ?? 'active',
    created_at: now,
    updated_at: now,
  }

  const locationRecord: LocalLocation = {
    id: newLocationId,
    type: 'store',
    store_id: newStoreId,
    name: storeRecord.name,
    code: storeRecord.code,
    city: storeRecord.city,
    address: storeRecord.address,
    phone: storeRecord.phone,
    email: storeRecord.email,
    is_default: false,
    status: storeRecord.status,
    created_at: now,
    updated_at: now,
  }

  // Update memory
  memoryStores.push(storeRecord)
  memoryLocations.push(locationRecord)

  // Persist to Supabase if live
  if (!isMockSupabase) {
    try {
      await supabase.from('stores').insert({
        id: storeRecord.id,
        name: storeRecord.name,
        code: storeRecord.code,
        city: storeRecord.city,
        state: storeRecord.state,
        address: storeRecord.address,
        phone: storeRecord.phone,
        email: storeRecord.email,
        status: storeRecord.status,
      })

      await supabase.from('locations').insert({
        id: locationRecord.id,
        type: locationRecord.type,
        store_id: locationRecord.store_id,
        name: locationRecord.name,
        code: locationRecord.code,
        city: locationRecord.city,
        address: locationRecord.address,
        phone: locationRecord.phone,
        email: locationRecord.email,
        is_default: locationRecord.is_default,
        status: locationRecord.status,
      })
    } catch (dbErr) {
      console.warn('Non-fatal: Failed to persist store to Supabase, retained in memory', dbErr)
    }
  }

  // Record audit log
  await recordAuditLog({
    actorId: actor.id ?? null,
    actorEmail: actor.email ?? null,
    actorRole: actor.role ?? null,
    action: 'store_created',
    entity: 'store',
    entityId: storeRecord.id,
    detail: {
      code: storeRecord.code,
      name: storeRecord.name,
      city: storeRecord.city,
      location_id: locationRecord.id,
    },
  })

  return { store: storeRecord, location: locationRecord }
}

export async function updateStore(
  id: string,
  input: UpdateStoreInput,
  actor: { id?: string; email?: string; role?: Role },
): Promise<LocalStore> {
  const storeIndex = memoryStores.findIndex((s) => s.id === id)
  if (storeIndex === -1 && isMockSupabase) {
    throw new AppError(404, 'Store not found', 'STORE_NOT_FOUND')
  }

  const existingStore = memoryStores[storeIndex]

  if (input.code) {
    const normalizedCode = input.code.toUpperCase().trim()
    const duplicate = memoryStores.find(
      (s) => s.id !== id && s.code.toUpperCase() === normalizedCode,
    )
    if (duplicate) {
      throw new AppError(409, `Store code "${input.code}" is already in use`, 'STORE_CODE_EXISTS')
    }
  }

  const now = new Date().toISOString()
  const updatedStore: LocalStore = {
    ...existingStore,
    ...(input.name !== undefined && { name: input.name.trim() }),
    ...(input.code !== undefined && { code: input.code.toUpperCase().trim() }),
    ...(input.city !== undefined && { city: input.city?.trim() ?? null }),
    ...(input.state !== undefined && { state: input.state?.trim() ?? null }),
    ...(input.address !== undefined && { address: input.address?.trim() ?? null }),
    ...(input.phone !== undefined && { phone: input.phone?.trim() ?? null }),
    ...(input.email !== undefined && { email: input.email?.trim().toLowerCase() ?? null }),
    ...(input.status !== undefined && { status: input.status }),
    updated_at: now,
  }

  if (storeIndex !== -1) {
    memoryStores[storeIndex] = updatedStore
  }

  // Also sync linked physical location
  const locIndex = memoryLocations.findIndex((l) => l.store_id === id)
  if (locIndex !== -1) {
    memoryLocations[locIndex] = {
      ...memoryLocations[locIndex],
      name: updatedStore.name,
      code: updatedStore.code,
      city: updatedStore.city,
      address: updatedStore.address,
      phone: updatedStore.phone,
      email: updatedStore.email,
      status: updatedStore.status,
      updated_at: now,
    }
  }

  if (!isMockSupabase) {
    try {
      const { data, error } = await supabase
        .from('stores')
        .update({
          name: updatedStore.name,
          code: updatedStore.code,
          city: updatedStore.city,
          state: updatedStore.state,
          address: updatedStore.address,
          phone: updatedStore.phone,
          email: updatedStore.email,
          status: updatedStore.status,
          updated_at: now,
        })
        .eq('id', id)
        .select()
        .single()

      if (!error && data) {
        // Synchronize linked location
        await supabase
          .from('locations')
          .update({
            name: updatedStore.name,
            code: updatedStore.code,
            city: updatedStore.city,
            address: updatedStore.address,
            phone: updatedStore.phone,
            email: updatedStore.email,
            status: updatedStore.status,
            updated_at: now,
          })
          .eq('store_id', id)
      }
    } catch {
      // Non-fatal
    }
  }

  // Record audit log
  await recordAuditLog({
    actorId: actor.id ?? null,
    actorEmail: actor.email ?? null,
    actorRole: actor.role ?? null,
    action: 'store_updated',
    entity: 'store',
    entityId: updatedStore.id,
    detail: {
      changes: input,
    },
  })

  return updatedStore
}

// -----------------------------------------------------------------------------
// Location Store Operations
// -----------------------------------------------------------------------------

export async function getLocationsList(params?: {
  search?: string
  type?: 'all' | 'store' | 'warehouse'
  status?: 'all' | 'active' | 'inactive'
}): Promise<Array<LocalLocation & { store_name?: string }>> {
  const search = params?.search?.toLowerCase().trim()
  const type = params?.type ?? 'all'
  const status = params?.status ?? 'all'

  if (!isMockSupabase) {
    try {
      let query = supabase.from('locations').select('*, stores(name)').order('name', { ascending: true })
      if (type !== 'all') {
        query = query.eq('type', type)
      }
      if (status !== 'all') {
        query = query.eq('status', status)
      }
      if (search) {
        query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,city.ilike.%${search}%,address.ilike.%${search}%`)
      }

      const { data, error } = await query
      if (!error && data) {
        return data.map((loc: Record<string, unknown>) => ({
          ...(loc as unknown as LocalLocation),
          store_name: (loc.stores as { name?: string } | null)?.name,
        }))
      }
    } catch {
      // Fallback to memory
    }
  }

  return memoryLocations
    .filter((loc) => {
      if (type !== 'all' && loc.type !== type) return false
      if (status !== 'all' && loc.status !== status) return false
      if (!search) return true
      return (
        loc.name.toLowerCase().includes(search) ||
        loc.code.toLowerCase().includes(search) ||
        (loc.city && loc.city.toLowerCase().includes(search)) ||
        (loc.address && loc.address.toLowerCase().includes(search))
      )
    })
    .map((loc) => {
      const store = loc.store_id ? memoryStores.find((s) => s.id === loc.store_id) : null
      return {
        ...loc,
        store_name: store?.name,
      }
    })
}

export async function updateLocation(
  id: string,
  input: UpdateLocationInput,
  actor: { id?: string; email?: string; role?: Role },
): Promise<LocalLocation> {
  const locIndex = memoryLocations.findIndex((l) => l.id === id)
  if (locIndex === -1 && isMockSupabase) {
    throw new AppError(404, 'Location not found', 'LOCATION_NOT_FOUND')
  }

  const existingLoc = memoryLocations[locIndex]

  // Type cannot be changed (DB trigger F5 trigger_guard_location_type)
  if (input.type && input.type !== existingLoc.type) {
    throw new AppError(400, 'Location type is immutable and cannot be changed', 'LOCATION_TYPE_IMMUTABLE')
  }

  // Single default warehouse enforcement (uq_locations_default_warehouse)
  if (input.isDefault && existingLoc.type === 'warehouse') {
    for (const loc of memoryLocations) {
      if (loc.type === 'warehouse' && loc.id !== id) {
        loc.is_default = false
      }
    }
    if (!isMockSupabase) {
      try {
        await supabase
          .from('locations')
          .update({ is_default: false })
          .eq('type', 'warehouse')
      } catch {
        // Non-blocking
      }
    }
  }

  const now = new Date().toISOString()
  const updatedLoc: LocalLocation = {
    ...existingLoc,
    ...(input.name !== undefined && { name: input.name.trim() }),
    ...(input.code !== undefined && { code: input.code.toUpperCase().trim() }),
    ...(input.city !== undefined && { city: input.city?.trim() ?? null }),
    ...(input.address !== undefined && { address: input.address?.trim() ?? null }),
    ...(input.phone !== undefined && { phone: input.phone?.trim() ?? null }),
    ...(input.email !== undefined && { email: input.email?.trim().toLowerCase() ?? null }),
    ...(input.isDefault !== undefined && { is_default: input.isDefault }),
    ...(input.status !== undefined && { status: input.status }),
    updated_at: now,
  }

  if (locIndex !== -1) {
    memoryLocations[locIndex] = updatedLoc
  }

  if (!isMockSupabase) {
    try {
      await supabase
        .from('locations')
        .update({
          name: updatedLoc.name,
          code: updatedLoc.code,
          city: updatedLoc.city,
          address: updatedLoc.address,
          phone: updatedLoc.phone,
          email: updatedLoc.email,
          is_default: updatedLoc.is_default,
          status: updatedLoc.status,
          updated_at: now,
        })
        .eq('id', id)
    } catch {
      // Non-fatal
    }
  }

  await recordAuditLog({
    actorId: actor.id ?? null,
    actorEmail: actor.email ?? null,
    actorRole: actor.role ?? null,
    action: 'location_updated',
    entity: 'location',
    entityId: updatedLoc.id,
    detail: {
      changes: input,
    },
  })

  return updatedLoc
}
