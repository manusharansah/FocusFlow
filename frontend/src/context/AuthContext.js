import React, { createContext, useState, useEffect } from 'react';
import api from '../utils/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const token = localStorage.getItem('access_token');
        if (token) {
            try {
                const response = await api.get('/users/profile/');
                setUser(response.data);
            } catch (error) {
                localStorage.removeItem('access_token');
            }
        }
        setLoading(false);
    };

    const login = async (email, password) => {
        const response = await api.post('/users/login/', { email, password });
        localStorage.setItem('access_token', response.data.access);
        await checkAuth();
    };

    const register = async (username, email, password) => {
        await api.post('/users/register/', { username, email, password });
        await login(email, password);
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};