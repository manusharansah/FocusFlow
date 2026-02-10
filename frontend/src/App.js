import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Pricing from './pages/Pricing';
import PaymentSuccess from './pages/PaymentSuccess';




function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Login />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/pricing" element={<Pricing />} />
                    <Route path="/payment-success" element={<PaymentSuccess />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;