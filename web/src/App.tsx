import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "./components/layout/AppShell";
import { ThemeProvider } from "./lib/theme";
import { Dashboard } from "./pages/Dashboard";
import { Landing } from "./pages/Landing";
import { Loading } from "./components/ui/State";

const Markets = lazy(() => import("./pages/Markets").then((m) => ({ default: m.Markets })));
const AssetDetail = lazy(() => import("./pages/AssetDetail").then((m) => ({ default: m.AssetDetail })));
const Portfolio = lazy(() => import("./pages/Portfolio").then((m) => ({ default: m.Portfolio })));
const Agents = lazy(() => import("./pages/Agents").then((m) => ({ default: m.Agents })));
const Docs = lazy(() => import("./pages/Docs").then((m) => ({ default: m.Docs })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 15_000,
    },
  },
});

export function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense fallback={<Loading text="Loading page..." />}>
            <Routes>
              <Route index element={<Landing />} />
              <Route element={<AppShell />}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="markets" element={<Markets />} />
                <Route path="markets/:symbol" element={<AssetDetail />} />
                <Route path="portfolio" element={<Portfolio />} />
                <Route path="agents" element={<Agents />} />
                <Route path="docs" element={<Docs />} />
                <Route path="*" element={<Dashboard />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
