import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import PageLoader from '../PageLoader'

describe('PageLoader', () => {
  it('announces itself as a loading status', () => {
    render(<PageLoader />)

    expect(screen.getByRole('status', { name: /loading page/i })).toBeInTheDocument()
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })
})