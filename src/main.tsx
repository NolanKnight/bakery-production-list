import { JSX, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useQuery } from "convex/react";

import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";

import { authClient } from "@/lib/auth-client";
import ParPage from "@/pages/par";

import "./styles/globals.css";
import DailyProductionPage from "./pages/dailyProduction";
import WholesaleOrderForm from "./pages/wholesaleOrderForm";
import Layout from "./components/layout";
import UserRole from "@/../shared/userRole";
import ItemCatalogPage from "./pages/itemCatalog";
import PageNotFoundPage from "./pages/404";
import WholesaleOrdersPage from "./pages/wholesaleOrders";
import WholesaleOrderPage from "./pages/wholesaleOrder";
import RetailOrdersPage from "./pages/retailOrders";
import RetailOrderPage from "./pages/retailOrder";
import LoginPage from "./pages/login";
import SignupPage from "./pages/signup";
import PendingAccessPage from "./pages/pendingAccess";
import AdminAccessPage from "./pages/adminAccess";
import BakerRolesPage from "./pages/bakerRoles";
import AccountPage from "./pages/account";
import { api } from "../convex/_generated/api";
import type { UserRoleValue } from "@/../shared/userRole";
import { Toaster } from "./components/ui/sonner";
import InventoryPage from "./pages/inventory";

const convex = new ConvexReactClient(
  import.meta.env.VITE_CONVEX_URL as string,
  {
    expectAuth: false,
  },
);

const authenticatedRoutes: {
  path: string;
  element: JSX.Element;
  allowedRoles: Exclude<UserRoleValue, "none">[];
}[] = [
  { path: "/par", element: <ParPage />, allowedRoles: ["admin"] as const },
  {
    path: "/wholesale-form",
    element: <WholesaleOrderForm />,
    allowedRoles: ["admin", "client"] as const,
  },
  {
    path: "/wholesale-orders",
    element: <WholesaleOrdersPage />,
    allowedRoles: ["admin"] as const,
  },
  {
    path: "/wholesale-order/:id",
    element: <WholesaleOrderPage />,
    allowedRoles: ["admin"] as const,
  },
  {
    path: "/retail-orders",
    element: <RetailOrdersPage />,
    allowedRoles: ["admin"] as const,
  },
  {
    path: "/retail-order/:id",
    element: <RetailOrderPage />,
    allowedRoles: ["admin"] as const,
  },
  {
    path: "/production",
    element: <DailyProductionPage />,
    allowedRoles: ["admin", "employee"] as const,
  },
  {
    path: "/inventory",
    element: <InventoryPage />,
    allowedRoles: ["admin", "employee"] as const,
  },
  {
    path: "/item-catalog",
    element: <ItemCatalogPage />,
    allowedRoles: ["admin"] as const,
  },
  {
    path: "/admin/access",
    element: <AdminAccessPage />,
    allowedRoles: ["admin"] as const,
  },
  {
    path: "/admin/baker-roles",
    element: <BakerRolesPage />,
    allowedRoles: ["admin"] as const,
  },
  {
    path: "/account",
    element: <AccountPage />,
    allowedRoles: ["admin", "employee", "client"] as const,
  },
];

function AppRoutes() {
  const session = authClient.useSession();
  const roleState = useQuery(api.auth.getCurrentUserRole);

  if (session.isPending || roleState === undefined) {
    return (
      <div className="w-full h-screen flex bg-blue-200 place-items-center text-center">
        <h4 className="shimmer w-full">Loading...</h4>
      </div>
    );
  }

  if (!session.data || !roleState.isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const userRole = UserRole.from(roleState.role);
  if (userRole.value === "none") {
    return (
      <Routes>
        <Route path="/pending-access" element={<PendingAccessPage />} />
        <Route path="*" element={<Navigate to="/pending-access" replace />} />
      </Routes>
    );
  }

  const defaultRoute = userRole.links[0]?.path ?? "/production";

  return (
    <Layout userRole={userRole}>
      <Routes>
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/signup" element={<Navigate to="/" replace />} />
        <Route path="/pending-access" element={<Navigate to="/" replace />} />
        <Route path="/" element={<Navigate to={defaultRoute} replace />} />

        {authenticatedRoutes
          .filter((route) => route.allowedRoles.includes(userRole.value as Exclude<UserRoleValue, "none">))
          .map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
          
        <Route path="*" element={<PageNotFoundPage links={[...userRole.links]} />} />
      </Routes>
    </Layout>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexBetterAuthProvider client={convex} authClient={authClient as any}>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-center" />
      </BrowserRouter>
    </ConvexBetterAuthProvider>
  </StrictMode>,
);
