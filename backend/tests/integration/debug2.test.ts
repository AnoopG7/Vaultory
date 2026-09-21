import { beforeEach, describe, expect, it } from 'vitest'
import { resetFakeDb } from '../helpers/fake-supabase'
import { poDb, PO4, PO5 } from '../helpers/fixtures/purchase-orders'
import { getFakeSupabase } from '../helpers/fake-supabase'

beforeEach(() => resetFakeDb(poDb()))

describe('debug2', () => {
  it('counts after or filter', async () => {
    const sb = getFakeSupabase()
    const afterSeed = await sb.from('purchase_orders').select('id')
    expect(afterSeed.data).toHaveLength(5)
    expect(afterSeed.data?.map((r) => r.id)).toContain(PO4)
    expect(afterSeed.data?.map((r) => r.id)).toContain(PO5)
    const list = await sb
      .from('purchase_orders')
      .select('*, po_lines(*)')
      .or('po_number.ilike.%bakery%,notes.ilike.%bakery%')
      .order('created_at', { ascending: false })
      .range(0, 49)
    expect(list.data).toHaveLength(1)
    const afterList = await sb.from('purchase_orders').select('id')
    expect(afterList.data).toHaveLength(5)
  })
})
