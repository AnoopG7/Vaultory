import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { vi } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.restoreAllMocks()
})
