import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000/api/v1/',
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 second timeout
});

// Add a request interceptor
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle restrictions
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 403) {
            const detail = error.response.data?.detail;
            if (typeof detail === 'string' && detail.startsWith('FEATURE_RESTRICTED:')) {
                const feature = detail.split(':')[1];
                // Dispatch custom event for the UI to catch
                const event = new CustomEvent('ig:restriction', { detail: { feature } });
                window.dispatchEvent(event);

                // Return a cancelled promise or appropriate error
                return Promise.reject({ ...error, isRestriction: true });
            }
        }
        return Promise.reject(error);
    }
);

export default api;
