import axios from 'axios'

/**
 * Shared Axios instance for all API calls.
 *
 * Why we don't use a separate axios.create() here:
 *   AuthContext sets the JWT on axios.defaults.headers.common['Authorization']
 *   and registers its 401-refresh interceptor on the global axios instance.
 *   A separate instance would miss both — requests would go out without the
 *   token and 401 auto-refresh would never fire.
 *
 * Instead we configure the global instance once here and export it.
 * AuthContext imports this same reference, so all auth state is shared.
 */

// Global base URL — reads VITE_API_BASE_URL at build time so production
// deployments can point at a different origin (e.g. https://api.example.com).
// Falls back to '' in development, where Vite's proxy rewrites /api → 8000.
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL ?? ''

// Background removal with BiRefNet (quality mode) can take 60–120s on first
// load while the model downloads and warms up. Use a generous timeout.
axios.defaults.timeout = 180000

const apiClient = axios

export default apiClient
