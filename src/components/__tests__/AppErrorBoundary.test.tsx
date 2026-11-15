import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import AppErrorBoundary from '../AppErrorBoundary'

let shouldThrow = true

function Flaky() {
  if (shouldThrow) throw new Error('Boom')
  return <p>Page content</p>
}

describe('AppErrorBoundary', () => {
  beforeEach(() => {
    shouldThrow = true
    // React logs caught errors; keep the test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders its children when nothing goes wrong', () => {
    shouldThrow = false
    render(
      <AppErrorBoundary>
        <Flaky />
      </AppErrorBoundary>,
    )
    expect(screen.getByText('Page content')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a recovery screen instead of crashing when a child throws', () => {
    render(
      <AppErrorBoundary>
        <Flaky />
      </AppErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument()
    expect(screen.queryByText('Page content')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument()
  })

  it('recovers when "Try again" is clicked and the problem is gone', () => {
    render(
      <AppErrorBoundary>
        <Flaky />
      </AppErrorBoundary>,
    )
    shouldThrow = false
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(screen.getByText('Page content')).toBeInTheDocument()
  })

  it('clears the error when resetKey changes (for example on navigation)', () => {
    const { rerender } = render(
      <AppErrorBoundary resetKey="/a">
        <Flaky />
      </AppErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()

    shouldThrow = false
    rerender(
      <AppErrorBoundary resetKey="/b">
        <Flaky />
      </AppErrorBoundary>,
    )
    expect(screen.getByText('Page content')).toBeInTheDocument()
  })

  it('keeps showing the error while resetKey stays the same', () => {
    const { rerender } = render(
      <AppErrorBoundary resetKey="/a">
        <Flaky />
      </AppErrorBoundary>,
    )
    shouldThrow = false
    rerender(
      <AppErrorBoundary resetKey="/a">
        <Flaky />
      </AppErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})