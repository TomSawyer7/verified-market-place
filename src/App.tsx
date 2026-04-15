import { useEffect } from "react"; // 1. Dinagdag itong useEffect
import { supabase } from "@/integrations/supabase/client"; // 2. Import ang client mo
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Marketplace from "./pages/Marketplace";
import ProductDetail from "./pages/ProductDetail";
import CreateListing from "./pages/CreateListing";
import Verification from "./pages/Verification";
import Profile from "./pages/Profile";
import Messages from "./pages/Messages";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import SellerProfile from "./pages/SellerProfile";

const queryClient = new QueryClient();

const App = () => {
<<<<<<< HEAD
  // 3. ITO ANG PANGLALAMAN KUNG CONNECTED O HINDI
  useEffect(() => {
    const checkConnection = async () => {
      const { data, error } = await supabase.from('test').select('*').limit(1);
      if (error && error.message.includes("fetch")) {
        console.log("❌ MALAS: Hindi connected. Check net o credentials.");
      } else {
        console.log("✅ SWERTE: Connected na ang Supabase mo!");
      }
    };
    checkConnection();
  }, []);
=======
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <Navbar />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/create-listing" element={<CreateListing />} />
              <Route path="/seller/:id" element={<SellerProfile />} />
              <Route path="/verification" element={<Verification />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};
>>>>>>> e2adefbebe2b8cce350d7dbeccbd44d973e181ff

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <Navbar />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/create-listing" element={<CreateListing />} />
              <Route path="/seller/:id" element={<SellerProfile />} />
              <Route path="/verification" element={<Verification />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;