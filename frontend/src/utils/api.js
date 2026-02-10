// import axios from 'axios';

// const API_URL = 'http://127.0.0.1:8000/api';

// const api = axios.create({
//     baseURL: API_URL,
//     // withCredentials is required for Google OAuth sessions and HttpOnly cookies
//     withCredentials: true, 
// });

// // Request Interceptor: Attach the JWT to every request
// api.interceptors.request.use(
//     (config) => {
//         const token = localStorage.getItem('access_token');
//         if (token) {
//             config.headers.Authorization = `Bearer ${token}`;
//         }
//         return config;
//     },
//     (error) => Promise.reject(error)
// );

// // Response Interceptor: Handle token expiration (401 errors)
// api.interceptors.response.use(
//     (response) => response,
//     async (error) => {
//         const originalRequest = error.config;

//         // If the error is 401 and we haven't tried to refresh yet
//         if (error.response?.status === 401 && !originalRequest._retry) {
//             originalRequest._retry = true;
            
//             const refreshToken = localStorage.getItem('refresh_token');

//             if (refreshToken) {
//                 try {
//                     // Attempt to get a new access token using the refresh token
//                     const response = await axios.post(`${API_URL}/token/refresh/`, {
//                         refresh: refreshToken,
//                     });

//                     const newAccessToken = response.data.access;
//                     localStorage.setItem('access_token', newAccessToken);

//                     // Update the header and retry the original request
//                     originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
//                     return api(originalRequest);
//                 } catch (refreshError) {
//                     // Refresh token is also expired or invalid
//                     console.error("Refresh token expired. Logging out...");
//                     localStorage.clear();
//                     window.location.href = '/login';
//                 }
//             } else {
//                 // No refresh token available, send to login
//                 window.location.href = '/login';
//             }
//         }
//         return Promise.reject(error);
//     }
// );

// export default api;


import axios from 'axios';

// Use localhost consistently to match CORS_ALLOWED_ORIGINS and browser cookies
const API_URL = 'http://localhost:8000/api';

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true, // Required for Google Session cookies and CSRF
    headers: {
        'Content-Type': 'application/json',
    },
});

// Helper to get CSRF token from cookies (Required for POST/PUT/DELETE in Django)
const getCookie = (name) => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
};

// Request Interceptor
api.interceptors.request.use(
    (config) => {
        // 1. Attach JWT Access Token
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // 2. Attach CSRF Token for non-GET requests
        if (['post', 'put', 'delete', 'patch'].includes(config.method)) {
            const csrfToken = getCookie('csrftoken');
            if (csrfToken) {
                config.headers['X-CSRFToken'] = csrfToken;
            }
        }
        
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Handle 401 Unauthorized errors
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            const refreshToken = localStorage.getItem('refresh_token');

            if (refreshToken) {
                try {
                    // Use a clean axios instance for the refresh call to avoid interceptor loops
                    const refreshResponse = await axios.post(`${API_URL}/token/refresh/`, {
                        refresh: refreshToken,
                    }, { withCredentials: true });

                    const newAccessToken = refreshResponse.data.access;
                    localStorage.setItem('access_token', newAccessToken);

                    // Update header and retry original request
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                    return api(originalRequest);
                } catch (refreshError) {
                    console.error("Session expired. Logging out...");
                    localStorage.clear();
                    window.location.href = '/login';
                    return Promise.reject(refreshError);
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;