import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import NotFoundPage from '../NotFoundPage'

describe('NotFoundPage', () => {
  it('explains that the page was not found', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument()
    expect(screen.getByText('404')).toBeInTheDocument()
  })

  it('links back to the home page', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: /back to home/i })).toHaveAttribute('href', '/')
  })
})