import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import AccentPicker from '../AccentPicker'
import { ACCENT_OPTIONS } from '../../contexts/ThemeSettingsContext'

const mocks = vi.hoisted(() => ({ accent: 'gold', setAccent: vi.fn(), showToast: vi.fn() }))

vi.mock('../../contexts/ThemeSettingsContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../contexts/ThemeSettingsContext')>()
  return { ...actual, useThemeSettings: () => ({ accent: mocks.accent, setAccent: mocks.setAccent }) }
})
vi.mock('../../hooks/useToast', () => ({ useToast: () => ({ showToast: mocks.showToast }) }))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.accent = 'gold'
})

describe('theme options', () => {
  it('offers four themes, each made of two different colours', () => {
    expect(ACCENT_OPTIONS).toHaveLength(4)
    expect(new Set(ACCENT_OPTIONS.map((o) => o.id)).size).toBe(4)
    for (const o of ACCENT_OPTIONS) {
      expect(o.primary).toMatch(/^#[0-9A-F]{6}$/i)
      expect(o.secondary).toMatch(/^#[0-9A-F]{6}$/i)
      expect(o.primary).not.toBe(o.secondary)
    }
  })
})

describe.each(['grid', 'cards'] as const)('AccentPicker (%s)', (variant) => {
  it('shows every theme as a radio inside a labelled group', () => {
    render(<AccentPicker variant={variant} />)
    const group = screen.getByRole('radiogroup', { name: /accent theme/i })
    expect(within(group).getAllByRole('radio')).toHaveLength(ACCENT_OPTIONS.length)
    for (const o of ACCENT_OPTIONS) {
      expect(within(group).getByRole('radio', { name: new RegExp(o.name, 'i') })).toBeInTheDocument()
    }
  })

  it('marks only the active theme as checked', () => {
    mocks.accent = 'emerald'
    render(<AccentPicker variant={variant} />)
    expect(screen.getByRole('radio', { name: /emerald/i })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getAllByRole('radio', { checked: true })).toHaveLength(1)
  })

  it('switches theme when another one is clicked', () => {
    render(<AccentPicker variant={variant} />)
    fireEvent.click(screen.getByRole('radio', { name: /sapphire/i }))
    expect(mocks.setAccent).toHaveBeenCalledWith('sapphire')
  })

  it('does nothing when the active theme is clicked again', () => {
    render(<AccentPicker variant={variant} />)
    fireEvent.click(screen.getByRole('radio', { name: /amber/i }))   // "Amber" is the gold theme
    expect(mocks.setAccent).not.toHaveBeenCalled()
  })
})

it('only the settings-page (cards) variant announces a change with a toast', () => {
  mocks.accent = 'sapphire'
  const { unmount } = render(<AccentPicker variant="grid" />)
  fireEvent.click(screen.getByRole('radio', { name: /cyber/i }))
  expect(mocks.showToast).not.toHaveBeenCalled()
  unmount()

  render(<AccentPicker variant="cards" />)
  fireEvent.click(screen.getByRole('radio', { name: /cyber/i }))
  expect(mocks.showToast).toHaveBeenCalledWith('Theme changed to Cyber', 'info')
})