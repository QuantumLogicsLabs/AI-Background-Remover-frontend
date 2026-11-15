import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import ProtectedRoute from '../ProtectedRoute'

const mocks = vi.hoisted(() => ({
  auth: { user: null as unknown, loading: false },
}))

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => mocks.auth,
}))

// Stands in for the real login page and shows where the user came from.
function LoginProbe() {
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname
  return <p>Login page, from: {from ?? 'none'}</p>
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<LoginProbe />} />
        <Route
          path="/secret"
          element={
            <ProtectedRoute>
              <p>Secret content</p>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mocks.auth = { user: null, loading: false }
  })

  it('shows a status message and no content while auth is loading', () => {
    mocks.auth = { user: null, loading: true }
    renderAt('/secret')

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('Checking authentication…')).toBeInTheDocument()
    expect(screen.queryByText('Secret content')).not.toBeInTheDocument()
    expect(screen.queryByText(/Login page/)).not.toBeInTheDocument()
  })

  it('redirects signed-out users to /login and remembers where they were going', () => {
    renderAt('/secret')

    expect(screen.getByText(/Login page/)).toBeInTheDocument()
    expect(screen.getByText(/from: \/secret/)).toBeInTheDocument()
    expect(screen.queryByText('Secret content')).not.toBeInTheDocument()
  })

  it('renders the page for signed-in users', () => {
    mocks.auth = { user: { name: 'Ali' }, loading: false }
    renderAt('/secret')

    expect(screen.getByText('Secret content')).toBeInTheDocument()
    expect(screen.queryByText(/Login page/)).not.toBeInTheDocument()
  })
})