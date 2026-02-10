import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Pricing from './pages/Pricing';
import PaymentSuccess from './pages/PaymentSuccess';
import Register from './pages/Register';
import Navbar from './components/Navbar';

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                {/* 1. Navbar stays here to show on ALL pages */}
                <Navbar /> 

                {/* 2. Only the content inside Routes changes based on the URL */}
                <Routes>
                    <Route path="/" element={<Login />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/pricing" element={<Pricing />} />
                    <Route path="/payment-success" element={<PaymentSuccess />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;