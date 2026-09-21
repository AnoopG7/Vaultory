import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api } from '@/lib/api'

describe('api client', () => {
  beforeEach(() => {
    localStorage.setItem('vaultory_token', 'test-token')
  })

  it('normalizes paths and sends the stored bearer token', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    ))

    await expect(api.get<{ ok: boolean }>('/products')).resolves.toEqual({ ok: true })
    expect(fetch).toHaveBeenCalledWith('/api/products', expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/json',
      }),
    }))
  })

  it('surfaces API messages and status codes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, statusText: 'Forbidden' }),
    ))

    await expect(api.post('/products', {})).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
      message: 'Forbidden',
    })
  })

  it('returns undefined for successful no-content responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))

    await expect(api.delete('/products/1')).resolves.toBeUndefined()
    expect(new ApiError(400, 'bad')).toBeInstanceOf(Error)
  })
})
