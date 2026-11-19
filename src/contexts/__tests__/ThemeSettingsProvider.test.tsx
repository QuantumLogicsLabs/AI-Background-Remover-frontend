import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ThemeSettingsProvider } from '../ThemeSettingsProvider'
import {
  ACCENT_OPTIONS, DEFAULT_ACCENT, normalizeAccent, useThemeSettings,
} from '../ThemeSettingsContext'

vi.mock('../../services/pwaService', () => ({ subscribeToOnlineStatus: () => () => {} }))

const KEY = { accent: 'ai_bg_accent_theme', quality: 'ai_bg_compression_quality', maxDim: 'ai_bg_max_dimension' }

function setup() {
  return renderHook(() => useThemeSettings(), { wrapper: ThemeSettingsProvider })
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-accent')
  document.documentElement.removeAttribute('data-auth-page')
})

describe('normalizeAccent', () => {
  it.each(ACCENT_OPTIONS.map((o) => [o.id]))('keeps the current theme %s', (id) => {
    expect(normalizeAccent(id)).toBe(id)
  })

  it.each([['sunset', 'gold'], ['rose', 'cyber'], ['crimson', 'cyber'], ['violet', 'cyber'], ['arctic', 'sapphire']])(
    'moves the retired theme %s to %s',
    (retired, replacement) => {
      expect(normalizeAccent(retired)).toBe(replacement)
    },
  )

  it.each([[null], [undefined], [''], ['banana']])('falls back to the default for %j', (value) => {
    expect(normalizeAccent(value)).toBe(DEFAULT_ACCENT)
  })
})

describe('ThemeSettingsProvider', () => {
  it('starts with the defaults', () => {
    const { result } = setup()
    expect(result.current.accent).toBe(DEFAULT_ACCENT)
    expect(result.current.clientCompression).toBe(true)
    expect(result.current.compressionQuality).toBe(0.92)
    expect(result.current.maxDimension).toBe(2500)
  })

  it('moves a retired saved theme to its replacement and saves the change', () => {
    localStorage.setItem(KEY.accent, 'arctic')
    const { result } = setup()
    expect(result.current.accent).toBe('sapphire')
    expect(localStorage.getItem(KEY.accent)).toBe('sapphire')
    expect(document.documentElement.getAttribute('data-accent')).toBe('sapphire')
  })

  it('changes and saves the theme', () => {
    const { result } = setup()
    act(() => result.current.setAccent('emerald'))
    expect(result.current.accent).toBe('emerald')
    expect(localStorage.getItem(KEY.accent)).toBe('emerald')
    expect(document.documentElement.getAttribute('data-accent')).toBe('emerald')
  })

  it('leaves the accent alone on auth pages', () => {
    document.documentElement.setAttribute('data-auth-page', '')
    setup()
    expect(document.documentElement.getAttribute('data-accent')).toBeNull()
    expect(localStorage.getItem(KEY.accent)).toBeNull()
  })

  it('keeps valid saved compression settings', () => {
    localStorage.setItem(KEY.quality, '0.8')
    localStorage.setItem(KEY.maxDim, '4000')
    const { result } = setup()
    expect(result.current.compressionQuality).toBe(0.8)
    expect(result.current.maxDimension).toBe(4000)
  })

  it.each([['abc'], ['NaN'], [''], ['0'], ['5'], ['-1']])('ignores a bad saved quality %j', (raw) => {
    localStorage.setItem(KEY.quality, raw)
    expect(setup().result.current.compressionQuality).toBe(0.92)
  })

  it.each([['abc'], ['NaN'], ['0'], ['-10'], ['99999']])('ignores a bad saved max size %j', (raw) => {
    localStorage.setItem(KEY.maxDim, raw)
    expect(setup().result.current.maxDimension).toBe(2500)
  })
})