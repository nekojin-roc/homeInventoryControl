import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import DashboardPage from "@/pages/DashboardPage";
import IntakePage from "@/pages/IntakePage";
import PickupPage from "@/pages/PickupPage";
import PackagesPage from "@/pages/PackagesPage";
import RecipientsPage from "@/pages/RecipientsPage";
import SettingsPage from "@/pages/SettingsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="intake" element={<IntakePage />} />
            <Route path="pickup" element={<PickupPage />} />
            <Route path="packages" element={<PackagesPage />} />
            <Route path="recipients" element={<RecipientsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
