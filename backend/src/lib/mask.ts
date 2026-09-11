/**
 * Data masking helper (SRS §7.2).
 *
 * Sensitive fields (products.cost_price, supplier finance, margin) are replaced
 * with a masked representation for unauthorized roles. ADMIN and explicitly
 * authorized roles receive clear-text via a logged access path.
 */

export const SENSITIVE_MASK = '••••'

/** Roles entitled to clear-text sensitive values. */
export const SENSITIVE_AUTHORIZED_ROLES = ['admin'] as const

export function canAccessSensitive(role: string | undefined): boolean {
  return !!role && (SENSITIVE_AUTHORIZED_ROLES as readonly string[]).includes(role)
}

/** Returns the raw value for authorized roles, SENSITIVE_MASK otherwise. */
export function maskSensitive<T>(value: T, role: string | undefined): T | string {
  return canAccessSensitive(role) ? value : SENSITIVE_MASK
}