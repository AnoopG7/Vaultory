import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import NotFoundPage from "@/pages/not-found";
import DashboardPage from "@/pages/dashboard";
import InventoryPage from "@/pages/inventory";
import SalesPage from "@/pages/sales";
import AutoOrderPage from "@/pages/auto-order";
import PurchaseOrdersPage from "@/pages/purchase-orders";
import StoresPage from "@/pages/stores";
import ReportsPage from "@/pages/reports";
import SettingsPage from "@/pages/settings";
import ComponentsDemoPage from "@/pages/components-demo";

/**
 * Routing structure (react-router v7 data router)
 *
 *   /                  layout -> dashboard
 *   /inventory         layout
 *   /sales             layout
 *   /auto-order        layout
 *   /purchase-orders   layout
 *   /stores            layout
 *   /reports           layout
 *   /settings          layout
 *   /components        layout -> dev component showcase
 *   *                  -> 404
 *
 * All pages are public for now; the auth guard comes back with the auth flow.
 */
export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "inventory", element: <InventoryPage /> },
      { path: "sales", element: <SalesPage /> },
      { path: "auto-order", element: <AutoOrderPage /> },
      { path: "purchase-orders", element: <PurchaseOrdersPage /> },
      { path: "stores", element: <StoresPage /> },
      { path: "reports", element: <ReportsPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "components", element: <ComponentsDemoPage /> },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);

export default router;
