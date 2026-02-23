import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AdminDashboard from "./pages/admin/AdminDashboard";
import CreateEditShop from "./pages/admin/CreateEditShop";
import ChatbotBuilder from "./pages/admin/ChatbotBuilder";
import MallHome from "./pages/mall/MallHome";
import ShopDetail from "./pages/mall/ShopDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/admin/dashboard" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/chatbots/new" element={<ProtectedRoute requiredRole="admin"><CreateEditShop /></ProtectedRoute>} />
            <Route path="/admin/chatbots/:id/edit" element={<ProtectedRoute requiredRole="admin"><CreateEditShop /></ProtectedRoute>} />
            <Route path="/admin/chatbots/:id/builder" element={<ProtectedRoute requiredRole="admin"><ChatbotBuilder /></ProtectedRoute>} />
            <Route path="/mall" element={<ProtectedRoute requiredRole="user"><MallHome /></ProtectedRoute>} />
            <Route path="/mall/chatbots/:id" element={<ProtectedRoute requiredRole="user"><ShopDetail /></ProtectedRoute>} />
            <Route path="/mall/chatbots/:id/:domain" element={<ProtectedRoute requiredRole="user"><ShopDetail /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
