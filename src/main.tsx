import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";

import { authClient } from "@/lib/auth-client";
import ParPage from "@/pages/par";

import "./styles/globals.css";
import DailyProductionPage from "./pages/dailyProduction";
import WholesaleOrderForm from "./pages/wholesaleOrderForm";
import ProductionPrintPage from "./pages/productionPrintView";
import Layout from "./components/layout";
import UserRole from "@/../shared/userRole";
import ItemCatalogPage from "./pages/itemCatalog";
import PageNotFoundPage from "./pages/404";

const convex = new ConvexReactClient(
  import.meta.env.VITE_CONVEX_URL as string,
  {
    expectAuth: false,
  },
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      <BrowserRouter>
        <Layout userRole={UserRole.Admin}>
          <Routes>
            <Route path="/" element={<Navigate to="/production" replace />} />
            <Route path="/par" element={<ParPage />} />
            <Route path="/wholesale-form" element={<WholesaleOrderForm />} />
            <Route path="/production" element={<DailyProductionPage />} />
            <Route path="/production/print" element={<ProductionPrintPage />} />
            <Route path="/item-catalog" element={<ItemCatalogPage />} />
            <Route path="*" element={<PageNotFoundPage links={UserRole.Admin.links} />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ConvexBetterAuthProvider>
  </StrictMode>,
);
