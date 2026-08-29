import { useContext } from 'react'
import { ThemeProviderContext } from '@/components/theme'
import type { Theme } from '@/components/theme'

export function useTheme() {
  const context = useContext(ThemeProviderContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export type { Theme }
