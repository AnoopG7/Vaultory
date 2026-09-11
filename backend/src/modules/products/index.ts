export { default as productsRoutes } from './products.routes.js'
export {
  memoryProducts,
  deriveSkuPrefix,
  suggestSkuForPrefix,
  validateStockLevels,
} from './products.store.js'
export type { LocalProduct } from './products.store.js'