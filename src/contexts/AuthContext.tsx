import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useContext,
  useRef,
  type ReactNode,
} from 'react'
import axios, { type AxiosRequestConfig } from 'axios'

// ── Types ──────────────────────────────────────────────────────────────────

export interface AuthUser {
  user_id:    string
  name:       string
  email:      string
  created_at: string
}

export interface AuthContextValue {
  user:          AuthUser | null
  token:         string | null
  loading:       boolean       // true while validating stored token on mount
  login:         (email: string, password: string) => Promise<void>
  register:      (name: string, email: string, password: string) => Promise<void>
  logout:        () => Promise<void>
  refreshUser:   () => Promise<void>
  updateProfile: (data: Partial<Pick<AuthUser, 'name' | 'email'>>) => void
}

// ── Storage key ────────────────────────────────────────────────────────────

const TOKEN_KEY = 'bgr_token'

// ── Context ────────────────────────────────────────────────────────────────

export const AuthContext = createContext<AuthContextValue | null>(null)

// ── Axios token helpers ────────────────────────────────────────────────────

function setAxiosToken(token: string | null) {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete axios.defaults.headers.common['Authorization']
  }
}

// ── Provider ───────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<AuthUser | null>(null)
  const [token,   setToken]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Ref so the interceptor closure always sees the latest token setter
  // without needing to re-register the interceptor on every render.
  const tokenRef        = useRef<string | null>(null)
  const logoutRef       = useRef<() => Promise<void>>()
  const isRefreshingRef = useRef(false)
  // Queue of resolve callbacks waiting on a refresh in progress
  const refreshQueueRef = useRef<Array<(t: string | null) => void>>([])

  // ── Persist token ────────────────────────────────────────────────────────
  const _storeToken = useCallback((t: string) => {
    localStorage.setItem(TOKEN_KEY, t)
    setAxiosToken(t)
    setToken(t)
    tokenRef.current = t
  }, [])

  // ── Logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      // Tell the server to clear the httpOnly refresh cookie
      await axios.post('/api/auth/logout')
    } catch {
      // Non-fatal: proceed with client-side cleanup regardless
    }
    localStorage.removeItem(TOKEN_KEY)
    setAxiosToken(null)
    setToken(null)
    setUser(null)
    tokenRef.current = null
  }, [])

  // Keep logoutRef current so the interceptor can call it
  useEffect(() => {
    logoutRef.current = logout
  }, [logout])

  // ── Refresh token helper ──────────────────────────────────────────────────
  // Returns the new access token, or null if the refresh itself failed.
  const _doRefresh = useCallback(async (): Promise<string | null> => {
    try {
      const res = await axios.post<{ access_token: string }>(
        '/api/auth/refresh',
        null,
        { withCredentials: true },  // send the httpOnly refresh cookie
      )
      const newToken = res.data.access_token
      _storeToken(newToken)
      return newToken
    } catch {
      return null
    }
  }, [_storeToken])

  // ── Axios 401 interceptor ─────────────────────────────────────────────────
  // Registered once on mount. On every 401:
  //   1. If a refresh is already in flight, queue the retry.
  //   2. Otherwise start the refresh, then drain the queue.
  //   3. If refresh fails, call logout() and reject all queued requests.
  useEffect(() => {
    const interceptorId = axios.interceptors.response.use(
      res => res,  // pass-through success
      async (error) => {
        const original = error.config as AxiosRequestConfig & { _retry?: boolean }

        // Only intercept 401s from our own API — skip auth endpoints to
        // avoid infinite loops on /login, /refresh itself, etc.
        const isAuthEndpoint = original.url?.includes('/api/auth/')
        if (
          error.response?.status !== 401 ||
          original._retry ||
          isAuthEndpoint
        ) {
          return Promise.reject(error)
        }

        // Mark so we don't intercept the retry itself
        original._retry = true

        if (isRefreshingRef.current) {
          // Another refresh is already running — wait for it to complete
          return new Promise((resolve, reject) => {
            refreshQueueRef.current.push((newToken) => {
              if (!newToken) {
                reject(error)
                return
              }
              original.headers = {
                ...original.headers,
                Authorization: `Bearer ${newToken}`,
              }
              resolve(axios(original))
            })
          })
        }

        // Start the refresh
        isRefreshingRef.current = true
        const newToken = await _doRefresh()
        isRefreshingRef.current = false

        if (!newToken) {
          // Refresh failed — log out and reject all queued requests
          refreshQueueRef.current.forEach(cb => cb(null))
          refreshQueueRef.current = []
          await logoutRef.current?.()
          return Promise.reject(error)
        }

        // Drain the queue with the new token
        refreshQueueRef.current.forEach(cb => cb(newToken))
        refreshQueueRef.current = []

        // Retry the original request with the new token
        original.headers = {
          ...original.headers,
          Authorization: `Bearer ${newToken}`,
        }
        return axios(original)
      },
    )

    return () => {
      axios.interceptors.response.eject(interceptorId)
    }
  }, [_doRefresh])

  // ── On mount: restore access token and validate it ────────────────────────
  useEffect(() => {
    // Use a short timeout specifically for the startup auth check so the app
    // never hangs on a blank spinner if the backend is unreachable. Regular
    // API calls still use the global 180s timeout.
    const AUTH_TIMEOUT = 8000  // 8 seconds

    const stored = localStorage.getItem(TOKEN_KEY)
    if (!stored) {
      // No stored access token — try the refresh cookie (user may have
      // closed the tab before the token was wiped but cookie is still valid)
      axios
        .post<{ access_token: string }>(
          '/api/auth/refresh',
          null,
          { withCredentials: true, timeout: AUTH_TIMEOUT },
        )
        .then(res => {
          _storeToken(res.data.access_token)
          return axios.get<AuthUser>('/api/auth/me', { timeout: AUTH_TIMEOUT })
        })
        .then(res => setUser(res.data))
        .catch(() => {
          // No valid session or backend unreachable — remain logged out
          setAxiosToken(null)
        })
        .finally(() => setLoading(false))
      return
    }

    // We have a stored access token — validate it against /me
    setAxiosToken(stored)
    tokenRef.current = stored
    axios
      .get<AuthUser>('/api/auth/me', { timeout: AUTH_TIMEOUT })
      .then(res => {
        setToken(stored)
        setUser(res.data)
      })
      .catch(() => {
        // Token invalid or backend unreachable — clear stored token
        localStorage.removeItem(TOKEN_KEY)
        setAxiosToken(null)
        tokenRef.current = null
      })
      .finally(() => setLoading(false))
  }, [_storeToken])

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    const res = await axios.post<{ access_token: string; user: AuthUser }>(
      '/api/auth/login',
      { email, password },
      { withCredentials: true },  // receive the httpOnly refresh cookie
    )
    _storeToken(res.data.access_token)
    setUser(res.data.user)
  }, [_storeToken])

  // ── Register ──────────────────────────────────────────────────────────────
  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const res = await axios.post<{ access_token: string; user: AuthUser }>(
        '/api/auth/register',
        { name, email, password },
        { withCredentials: true },  // receive the httpOnly refresh cookie
      )
      _storeToken(res.data.access_token)
      setUser(res.data.user)
    },
    [_storeToken],
  )

  // ── Refresh user profile ──────────────────────────────────────────────────────
  const refreshUser = useCallback(async () => {
    try {
      const res = await axios.get<AuthUser>('/api/auth/me')
      setUser(res.data)
    } catch {
      await logout()
    }
  }, [logout])

  // ── Update profile in-memory (after a successful PATCH) ───────────────────
  const updateProfile = useCallback(
    (data: Partial<Pick<AuthUser, 'name' | 'email'>>) => {
      setUser(prev => prev ? { ...prev, ...data } : prev)
    },
    [],
  )

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout, refreshUser, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// ── useAuthContext (raw, internal use) ─────────────────────────────────────

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used inside <AuthProvider>')
  return ctx
}
