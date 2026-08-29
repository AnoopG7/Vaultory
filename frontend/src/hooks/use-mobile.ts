import { useSyncExternalStore } from 'react'

const MOBILE_BREAKPOINT = 768

/** Subscribe to mobile-width media queries. */
function subscribe(callback: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

/** Reads current mobile state without triggering setState-in-effect warnings. */
export function useIsMobile() {
  return useSyncExternalStore(
    subscribe,
    () => window.innerWidth < MOBILE_BREAKPOINT,
    () => false,
  )
}
