import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import { AuthProvider } from '../AuthProvider'
import { useAuth } from '../../hooks/useAuth'

const TOKEN_KEY = 'bgr_token'
const USER = { user_id: 'u1', name: 'Alice', email: 'alice@gmail.com', created_at: '2026-01-01T00:00:00Z' }

type Auth = { current: ReturnType<typeof useAuth> }

async function mount() {
  const view = renderHook(() => useAuth(), { wrapper: AuthProvider })
  await waitFor(() => expect(view.result.current.loading).toBe(false))
  return view
}

async function signIn(result: Auth) {
  vi.mocked(axios.post).mockResolvedValueOnce({ data: { access_token: 'tok', user: USER } })
  await act(async () => {
    await result.current.verifyEmail(USER.email, '123456')
  })
}

beforeEach(() => {
  localStorage.clear()
  delete axios.defaults.headers.common['Authorization']
  // By default there is no session: the startup refresh/me calls fail.
  vi.spyOn(axios, 'post').mockRejectedValue(new Error('no session'))
  vi.spyOn(axios, 'get').mockRejectedValue(new Error('no session'))
})

afterEach(() => vi.restoreAllMocks())

describe('AuthProvider', () => {
  it('starts signed out when there is no session', async () => {
    const { result } = await mount()
    expect(result.current.user).toBeNull()
    expect(result.current.token).toBeNull()
  })

  it('restores a saved session', async () => {
    localStorage.setItem(TOKEN_KEY, 'saved')
    vi.mocked(axios.get).mockResolvedValueOnce({ data: USER })

    const { result } = await mount()
    expect(result.current.user).toEqual(USER)
    expect(result.current.token).toBe('saved')
    expect(axios.defaults.headers.common['Authorization']).toBe('Bearer saved')
    expect(axios.get).toHaveBeenCalledWith('/api/auth/me', expect.anything())
  })

  it('drops a saved token the server rejects', async () => {
    localStorage.setItem(TOKEN_KEY, 'stale')   // /me fails by default

    const { result } = await mount()
    expect(result.current.user).toBeNull()
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(axios.defaults.headers.common['Authorization']).toBeUndefined()
  })

  it('register creates the account but does NOT sign the user in', async () => {
    const { result } = await mount()
    vi.mocked(axios.post).mockResolvedValueOnce({ data: { email: USER.email, verification_required: true } })

    await act(async () => {
      await result.current.register('Alice', USER.email, 'Pass1234!')
    })

    expect(axios.post).toHaveBeenLastCalledWith('/api/auth/register', {
      name: 'Alice', email: USER.email, password: 'Pass1234!',
    })
    expect(result.current.user).toBeNull()
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('verifyEmail signs the user in and remembers the token', async () => {
    const { result } = await mount()
    await signIn(result)

    expect(axios.post).toHaveBeenLastCalledWith(
      '/api/auth/verify-email',
      { email: USER.email, code: '123456' },
      { withCredentials: true },
    )
    expect(result.current.user).toEqual(USER)
    expect(result.current.token).toBe('tok')
    expect(localStorage.getItem(TOKEN_KEY)).toBe('tok')
    expect(axios.defaults.headers.common['Authorization']).toBe('Bearer tok')
  })

  it('a wrong code leaves the user signed out', async () => {
    const { result } = await mount()
    // post still rejects by default

    await act(async () => {
      await expect(result.current.verifyEmail(USER.email, '000000')).rejects.toThrow('no session')
    })
    expect(result.current.user).toBeNull()
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('login passes an "email not verified" rejection through without signing in', async () => {
    const { result } = await mount()
    const unverified = Object.assign(new Error('forbidden'), { response: { status: 403 } })
    vi.mocked(axios.post).mockRejectedValueOnce(unverified)

    await act(async () => {
      await expect(result.current.login(USER.email, 'Pass1234!')).rejects.toBe(unverified)
    })
    expect(result.current.user).toBeNull()
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('logout clears the session even when the server call fails', async () => {
    const { result } = await mount()
    await signIn(result)

    await act(async () => {
      await result.current.logout()   // post rejects: the server is "down"
    })
    expect(result.current.user).toBeNull()
    expect(result.current.token).toBeNull()
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(axios.defaults.headers.common['Authorization']).toBeUndefined()
  })

  it('updateProfile merges new values into the signed-in user', async () => {
    const { result } = await mount()
    await signIn(result)

    act(() => result.current.updateProfile({ name: 'Alice Smith' }))
    expect(result.current.user).toEqual({ ...USER, name: 'Alice Smith' })
  })
})