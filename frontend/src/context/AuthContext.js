// import React, { createContext, useState, useEffect } from 'react';
// import api from '../utils/api';

// export const AuthContext = createContext();

// export const AuthProvider = ({ children }) => {
//     const [user, setUser] = useState(null);
//     const [loading, setLoading] = useState(true);

//     useEffect(() => {
//         checkAuth();
//     }, []);

//     const checkAuth = async () => {
//         const token = localStorage.getItem('access_token');
        
//         // Even if there's no token in localStorage, we try to call the API.
//         // If the user logged in via Google, the browser's COOKIE will 
//         // authorize this request because of withCredentials: true.
//         try {
//             const response = await api.get('/users/profile/');
//             setUser(response.data);
            
//             // If the user has no token in storage (Google user), 
//             // but the request succeeded, we are officially "Logged In" via Session.
//         } catch (error) {
//             console.warn("No valid session or token found.");
//             localStorage.removeItem('access_token');
//             localStorage.removeItem('refresh_token');
//             setUser(null);
//         } finally {
//             setLoading(false);
//         }
//     };

//     const login = async (email, password) => {
//         try {
//             const response = await api.post('/users/login/', { email, password });
//             // Save both tokens for the refresh interceptor we built in api.js
//             localStorage.setItem('access_token', response.data.access);
//             localStorage.setItem('refresh_token', response.data.refresh);
            
//             // Re-verify the user and set state
//             await checkAuth();
//         } catch (error) {
//             throw error; // Let the login page handle the UI error
//         }
//     };

//     const register = async (username, email, password) => {
//         await api.post('/users/register/', { username, email, password });
//         await login(email, password);
//     };

//     const logout = async () => {
//         try {
//             // Optional: Call a backend logout if using dj-rest-auth
//             await api.post('/users/logout/'); 
//         } catch (e) {
//             console.log("Cleanup local data only");
//         } finally {
//             localStorage.removeItem('access_token');
//             localStorage.removeItem('refresh_token');
//             setUser(null);
//             window.location.href = '/login';
//         }
//     };

//     return (
//         <AuthContext.Provider value={{ 
//             user, 
//             login, 
//             register, 
//             logout, 
//             loading, 
//             isAuthenticated: !!user,
//             checkAuth // Exported in case you want to manually refresh user state
//         }}>
//             {children}
//         </AuthContext.Provider>
//     );
// };

import React, { createContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Wrapped in useCallback to prevent infinite loops when passed into values or effects
    const checkAuth = useCallback(async () => {
        const token = localStorage.getItem('access_token');
        
        try {
            // We call the profile endpoint. 
            // If JWT exists, the interceptor attaches it.
            // If not (Google login), withCredentials: true sends the session cookie.
            const response = await api.get('/users/profile/');
            setUser(response.data);
        } catch (error) {
            // Only clear storage if the error is a 401 (Unauthorized)
            // This prevents clearing tokens if the server is just temporarily down (500)
            if (error.response?.status === 401) {
                console.warn("Session expired or invalid. Clearing local auth data.");
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                setUser(null);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const login = async (email, password) => {
        try {
            const response = await api.post('/users/login/', { email, password });
            localStorage.setItem('access_token', response.data.access);
            localStorage.setItem('refresh_token', response.data.refresh);
            
            // Re-verify the user to set the state
            await checkAuth();
        } catch (error) {
            // Propagate error so the Login component can show an alert
            throw error;
        }
    };

    const register = async (username, email, password) => {
        try {
            await api.post('/users/register/', { username, email, password });
            // Automatically log in after successful registration
            await login(email, password);
        } catch (error) {
            throw error;
        }
    };

    const logout = async () => {
        try {
            // Notify the backend to invalidate the session/token
            await api.post('/users/logout/'); 
        } catch (e) {
            console.log("Backend logout failed, clearing local state only.");
        } finally {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            setUser(null);
            // Redirect to login page
            window.location.href = '/login';
        }
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            login, 
            register, 
            logout, 
            loading, 
            isAuthenticated: !!user,
            checkAuth 
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};