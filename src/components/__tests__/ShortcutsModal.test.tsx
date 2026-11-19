import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import ShortcutsModal from '../ShortcutsModal'

const mocks = vi.hoisted(() => ({ isOpen: true, setOpen: vi.fn() }))

vi.mock('../../contexts/ThemeSettingsContext', () => ({
  useThemeSettings: () => ({ isShortcutsOpen: mocks.isOpen, setIsShortcutsOpen: mocks.setOpen }),
}))

describe('ShortcutsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.isOpen = true
  })

  it('renders nothing while closed', () => {
    mocks.isOpen = false
    const { container } = render(<ShortcutsModal />)
    expect(container).toBeEmptyDOMElement()
  })

  it('is a labelled dialog', () => {
    render(<ShortcutsModal />)
    expect(screen.getByRole('dialog', { name: /keyboard shortcuts/i })).toBeInTheDocument()
  })

  it('gives the search box an accessible name', () => {
    render(<ShortcutsModal />)
    expect(screen.getByLabelText(/search shortcuts/i)).toBeInTheDocument()
  })

  it('filters the list as you type, by description or key', () => {
    render(<ShortcutsModal />)
    const search = screen.getByLabelText(/search shortcuts/i)

    fireEvent.change(search, { target: { value: 'enhance' } })
    expect(screen.getByText('Go to Enhance')).toBeInTheDocument()
    expect(screen.queryByText('Go to Batch Processor')).not.toBeInTheDocument()

    fireEvent.change(search, { target: { value: 'ctrl' } })
    expect(screen.getByText('Toggle shortcuts cheatsheet')).toBeInTheDocument()
    expect(screen.queryByText('Go to Enhance')).not.toBeInTheDocument()
  })

  it('closes from the close button but not when clicking inside the panel', () => {
    render(<ShortcutsModal />)
    fireEvent.click(screen.getByText('Keyboard Shortcuts'))
    expect(mocks.setOpen).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /close shortcuts dialog/i }))
    expect(mocks.setOpen).toHaveBeenCalledWith(false)
  })
})
