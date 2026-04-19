import axios from 'axios';

/**
 * Centralized API client for the Answer Evaluator.
 * 
 * In development: proxied through Vite (relative URLs like /api/...)
 * In production: uses VITE_API_URL env var pointing to the Render backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 120000, // 2 min timeout — Render cold starts + AI inference can be slow
    headers: {
        'Accept': 'application/json',
    },
});

// ─── Request Interceptor ───
api.interceptors.request.use(
    (config) => {
        // Log in development
        if (import.meta.env.DEV) {
            console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ─── Response Interceptor with Retry for Cold Starts ───
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Retry once on network error or 502/503 (Render cold start)
        const isRetryable =
            !originalRequest._retry &&
            (
                !error.response || // Network error
                error.response.status === 502 || // Bad Gateway (cold start)
                error.response.status === 503 || // Service Unavailable
                error.response.status === 504    // Gateway Timeout
            );

        if (isRetryable) {
            originalRequest._retry = true;
            console.warn('[API] Request failed, retrying in 3s (possible cold start)...');

            await new Promise(resolve => setTimeout(resolve, 3000));
            return api(originalRequest);
        }

        // Build user-friendly error message
        let message = 'Something went wrong. Please try again.';

        if (!error.response) {
            message = 'Network error — cannot reach the server. It may be starting up (cold start). Please wait a moment and try again.';
        } else if (error.response.status === 413) {
            message = 'File too large. Please upload smaller images.';
        } else if (error.response.status === 429) {
            message = 'Too many requests. Please wait a moment.';
        } else if (error.response.status >= 500) {
            message = error.response.data?.error || 'Server error. The backend may be restarting — please retry in a few seconds.';
        } else if (error.response.status >= 400) {
            message = error.response.data?.error || 'Invalid request. Please check your input.';
        }

        // Attach user-friendly message
        error.userMessage = message;
        return Promise.reject(error);
    }
);

export default api;
export { API_BASE_URL };
