import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout, PublicLayout } from './components/Layouts';
import Loading from './components/Loading';
import ProtectedRoute from './components/ProtectedRoute';
import Account from './pages/Account';
import { Focus, Insights, Overview, Tasks } from './pages/AppPages';
import { AuthCallback, ForgotPassword, Login, Register, ResetPassword, VerifyEmail } from './pages/AuthPages';
import { Landing, NotFound, PaymentSuccess, Pricing, Privacy, Terms } from './pages/Public';

function Gate({ children }) {
  const { ready } = useAuth();
  return ready ? children : <Loading />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Gate>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Landing />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
            </Route>
            <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<Overview />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="focus" element={<Focus />} />
              <Route path="insights" element={<Insights />} />
              <Route path="account" element={<Account />} />
            </Route>
            <Route path="/dashboard" element={<Navigate to="/app" replace />} />
            <Route path="/account" element={<Navigate to="/app/account" replace />} />
            <Route path="*" element={<PublicLayout />}><Route path="*" element={<NotFound />} /></Route>
          </Routes>
        </Gate>
      </BrowserRouter>
    </AuthProvider>
  );
}
