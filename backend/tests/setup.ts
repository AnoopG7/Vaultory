import { afterEach, vi } from 'vitest'

vi.mock('@supabase/supabase-js', async () => {
  const { getFakeSupabase } = await import('./helpers/fake-supabase')
  return { createClient: () => getFakeSupabase() }
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
