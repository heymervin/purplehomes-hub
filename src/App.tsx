import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "@/pages/Dashboard";
import Properties from "@/pages/Properties";
import PropertyDetail from "@/pages/PropertyDetail";
import Buyers from "@/pages/Buyers";
import BuyerAcquisitions from "@/pages/BuyerAcquisitions";
import SellerAcquisitions from "@/pages/SellerAcquisitions";
import Contacts from "@/pages/Contacts";
import Matching from "@/pages/Matching";
import DealPipeline from "@/pages/DealPipeline";
import Documents from "@/pages/Documents";
import SocialMedia from "@/pages/SocialMedia";
import Settings from "@/pages/Settings";
import ActivityLogs from "@/pages/ActivityLogs";
import BuyerManagement from "@/pages/BuyerManagement";
import PublicListings from "@/pages/PublicListings";
import PublicPropertyDetail from "@/pages/PublicPropertyDetail";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster position="top-right" richColors />
          <BrowserRouter>
          <Routes>
            {/* Auth Route */}
            <Route path="/auth" element={<Auth />} />
            
            {/* Public Routes (embeddable, no sidebar) */}
            <Route path="/listings" element={<PublicListings />} />
            <Route path="/listing/:slug" element={<PublicPropertyDetail />} />
            
            {/* Protected Internal Routes (with sidebar) */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/properties" element={<Properties />} />
                <Route path="/properties/:id" element={<PropertyDetail />} />
                <Route path="/buyers" element={<Buyers />} />
                <Route path="/buyer-management" element={<BuyerManagement />} />
                <Route path="/acquisitions" element={<BuyerAcquisitions />} />
                <Route path="/seller-acquisitions" element={<SellerAcquisitions />} />
                <Route path="/contacts" element={<Contacts />} />
                <Route path="/matching" element={<Matching />} />
                <Route path="/deals" element={<DealPipeline />} />
                <Route path="/documents" element={<Documents />} />
                <Route path="/social" element={<SocialMedia />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/activity" element={<ActivityLogs />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
