import type { ReactNode } from 'react'
import { renderHook, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useKeyboardShortcuts } from '../useKeyboardShortcuts'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  setShortcutsOpen: vi.fn(),
  shortcutsOpen: false,
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mocks.navigate }
})

vi.mock('../../contexts/ThemeSettingsContext', () => ({
  useThemeSettings: () => ({
    isShortcutsOpen: mocks.shortcutsOpen,
    setIsShortcutsOpen: mocks.setShortcutsOpen,
  }),
}))

function setup(path = '/') {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
  )
  return renderHook(() => useKeyboardShortcuts(), { wrapper })
}

describe('useKeyboardShortcuts', () => {
  const added: HTMLElement[] = []

  function addToPage<T extends HTMLElement>(el: T): T {
    document.body.appendChild(el)
    added.push(el)
    return el
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.shortcutsOpen = false
  })

  afterEach(() => {
    while (added.length) added.pop()?.remove()
  })

  it('navigates with the number keys', () => {
    setup()
    fireEvent.keyDown(document.body, { key: '2' })
    expect(mocks.navigate).toHaveBeenCalledWith('/enhance')
  })

  it('goes to /login on Esc, and to /register when already on /login', () => {
    const first = setup('/enhance')
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(mocks.navigate).toHaveBeenCalledWith('/login')
    first.unmount()

    mocks.navigate.mockClear()
    setup('/login')
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(mocks.navigate).toHaveBeenCalledWith('/register')
  })

  it('opens the cheatsheet with ?', () => {
    setup()
    fireEvent.keyDown(document.body, { key: '?' })
    expect(mocks.setShortcutsOpen).toHaveBeenCalledWith(true)
  })

  it('ignores shortcuts while typing in an input', () => {
    setup()
    const input = addToPage(document.createElement('input'))
    fireEvent.keyDown(input, { key: '2' })
    expect(mocks.navigate).not.toHaveBeenCalled()
  })

  it('closes the cheatsheet on Esc without navigating', () => {
    mocks.shortcutsOpen = true
    setup()
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(mocks.setShortcutsOpen).toHaveBeenCalledWith(false)
    expect(mocks.navigate).not.toHaveBeenCalled()
  })

  it('closes the cheatsheet on Esc even when the search box has focus', () => {
    mocks.shortcutsOpen = true
    setup()
    const input = addToPage(document.createElement('input'))
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(mocks.setShortcutsOpen).toHaveBeenCalledWith(false)
    expect(mocks.navigate).not.toHaveBeenCalled()
  })

  it('does not navigate on Esc or number keys while another dialog is open', () => {
    setup()
    const dialog = addToPage(document.createElement('div'))
    dialog.setAttribute('role', 'dialog')
    dialog.setAttribute('aria-modal', 'true')

    fireEvent.keyDown(document.body, { key: 'Escape' })
    fireEvent.keyDown(document.body, { key: '3' })

    expect(mocks.navigate).not.toHaveBeenCalled()
  })
})