// ---------------------------------------------------------------------------
// Schema barrel — re-exports all Zod schemas & inferred types
// ---------------------------------------------------------------------------

export * from './common.js'
export * from './enums.js'
export * from './auth.js'
export * from './products.js'
export * from './inventory.js'
export * from './stores.js'
export * from './locations.js'
export * from './suppliers.js'
export * from './categories.js'
export * from './units.js'
export * from './sales.js'
export * from './purchase-orders.js'
export * from './safety-stock.js'
export * from './alerts.js'
export * from './ai.js'
export * from './audit.js'
export * from './reports.js'
export * from './users.js'

// Rohan branch additions (feature-specific schemas, unique to this branch)
export * from './sales.schema.js'
export * from './dashboard.schema.js'
export * from './reference.schema.js'
export * from './settings.schema.js'
