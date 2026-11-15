import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useObjectUrl } from '../useObjectUrl'

// jsdom does not implement URL.createObjectURL / revokeObjectURL, so we fake them.
const realCreate = URL.createObjectURL
const realRevoke = URL.revokeObjectURL

const makeFile = (name: string) => new File(['x'], name, { type: 'image/png' })

describe('useObjectUrl', () => {
  let counter = 0

  beforeEach(() => {
    counter = 0
    URL.createObjectURL = vi.fn(() => `blob:mock-${++counter}`)
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    URL.createObjectURL = realCreate
    URL.revokeObjectURL = realRevoke
  })

  it('returns null and creates nothing when there is no file', () => {
    const { result } = renderHook(() => useObjectUrl(null))
    expect(result.current).toBeNull()
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })

  it('creates one URL per file and keeps it across re-renders', () => {
    const file = makeFile('a.png')
    const { result, rerender } = renderHook(({ source }) => useObjectUrl(source), {
      initialProps: { source: file as File | null },
    })

    expect(result.current).toBe('blob:mock-1')
    rerender({ source: file })
    rerender({ source: file })

    expect(result.current).toBe('blob:mock-1')
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
  })

  it('revokes the old URL and creates a new one when the file changes', () => {
    const { result, rerender } = renderHook(({ source }) => useObjectUrl(source), {
      initialProps: { source: makeFile('a.png') as File | null },
    })
    expect(result.current).toBe('blob:mock-1')

    rerender({ source: makeFile('b.png') })

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-1')
    expect(result.current).toBe('blob:mock-2')
  })

  it('revokes the URL and returns null when the file is removed', () => {
    const { result, rerender } = renderHook(({ source }) => useObjectUrl(source), {
      initialProps: { source: makeFile('a.png') as File | null },
    })

    rerender({ source: null })

    expect(result.current).toBeNull()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-1')
  })

  it('revokes the URL when the component unmounts', () => {
    const { unmount } = renderHook(() => useObjectUrl(makeFile('a.png')))
    unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1)
  })
})