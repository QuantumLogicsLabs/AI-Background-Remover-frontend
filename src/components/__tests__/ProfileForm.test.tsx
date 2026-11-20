import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import axios, { AxiosError, type AxiosResponse } from 'axios'
import ProfileForm from '../ProfileForm'

const mocks = vi.hoisted(() => ({
  user: { user_id: 'u1', name: 'Alice', email: 'alice@gmail.com', created_at: '2026-01-01T00:00:00Z' },
  updateProfile: vi.fn(),
  showToast: vi.fn(),
}))

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: mocks.user, updateProfile: mocks.updateProfile }),
}))
vi.mock('../../hooks/useToast', () => ({ useToast: () => ({ showToast: mocks.showToast }) }))

function apiError(status: number, detail: string) {
  const response = { status, data: { detail }, statusText: '', headers: {}, config: {} } as unknown as AxiosResponse
  return new AxiosError('failed', 'ERR_BAD_REQUEST', undefined, undefined, response)
}

function spies() {
  return { patch: vi.spyOn(axios, 'patch'), post: vi.spyOn(axios, 'post') }
}

function startEmailChange(address: string) {
  fireEvent.click(screen.getByRole('button', { name: /^change$/i }))
  fireEvent.change(screen.getByLabelText('New email address'), { target: { value: address } })
  fireEvent.click(screen.getByRole('button', { name: /send code/i }))
}

describe('ProfileForm', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.restoreAllMocks())

  describe('name', () => {
    it('saves a changed name (cleaned up) and reports it', async () => {
      const { patch } = spies()
      patch.mockResolvedValue({ data: { ...mocks.user, name: 'Alice Smith' } })
      const onSaved = vi.fn()
      render(<ProfileForm onSaved={onSaved} />)

      const save = screen.getByRole('button', { name: /save name/i })
      expect(save).toBeDisabled()
      fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: '  Alice   Smith ' } })
      expect(save).toBeEnabled()
      fireEvent.click(save)

      await waitFor(() => expect(onSaved).toHaveBeenCalled())
      expect(patch).toHaveBeenCalledWith('/api/auth/profile', { name: 'Alice Smith' })
      expect(mocks.updateProfile).toHaveBeenCalledWith({ name: 'Alice Smith' })
      expect(mocks.showToast).toHaveBeenCalledWith('Name updated successfully!', 'success')
    })

    it('blocks a name that is too short', () => {
      const { patch } = spies()
      render(<ProfileForm />)
      const input = screen.getByLabelText(/display name/i)
      fireEvent.change(input, { target: { value: 'A' } })
      fireEvent.blur(input)

      expect(screen.getByText(/at least 2 characters/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /save name/i })).toBeDisabled()
      expect(patch).not.toHaveBeenCalled()
    })

    it('shows the server message when saving fails', async () => {
      const { patch } = spies()
      patch.mockRejectedValue(apiError(500, 'Server exploded'))
      render(<ProfileForm />)
      fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: 'Alice Smith' } })
      fireEvent.click(screen.getByRole('button', { name: /save name/i }))

      await waitFor(() => expect(mocks.showToast).toHaveBeenCalledWith('Server exploded', 'error'))
      expect(mocks.updateProfile).not.toHaveBeenCalled()
    })
  })

  describe('email change', () => {
    it('rejects a non-Google address without calling the server', async () => {
      const { post } = spies()
      render(<ProfileForm />)
      startEmailChange('bob@not-allowed.example')

      expect(await screen.findByRole('alert')).toHaveTextContent(/only google/i)
      expect(post).not.toHaveBeenCalled()
    })

    it('rejects the address the account already has', async () => {
      const { post } = spies()
      render(<ProfileForm />)
      startEmailChange('ALICE@gmail.com')

      expect(await screen.findByRole('alert')).toHaveTextContent(/already your email/i)
      expect(post).not.toHaveBeenCalled()
    })

    it('sends a code, then confirms it and updates the email', async () => {
      const { post } = spies()
      post
        .mockResolvedValueOnce({ data: { detail: 'sent' } })
        .mockResolvedValueOnce({ data: { ...mocks.user, email: 'new.address@gmail.com' } })
      const onSaved = vi.fn()
      render(<ProfileForm onSaved={onSaved} />)

      startEmailChange('new.address@gmail.com')
      const codeInput = await screen.findByLabelText('Verification code')
      expect(post).toHaveBeenNthCalledWith(1, '/api/auth/email-change', { email: 'new.address@gmail.com' })

      fireEvent.change(codeInput, { target: { value: '12ab3456' } })   // digits only, max six
      expect(codeInput).toHaveValue('123456')
      fireEvent.click(screen.getByRole('button', { name: /confirm email/i }))

      await waitFor(() => expect(onSaved).toHaveBeenCalled())
      expect(post).toHaveBeenNthCalledWith(2, '/api/auth/email-change/confirm', { code: '123456' })
      expect(mocks.updateProfile).toHaveBeenCalledWith({ email: 'new.address@gmail.com' })
    })

    it('shows a wrong-code error and clears the field', async () => {
      const { post } = spies()
      post
        .mockResolvedValueOnce({ data: { detail: 'sent' } })
        .mockRejectedValueOnce(apiError(400, 'That code is incorrect or has expired.'))
      const onSaved = vi.fn()
      render(<ProfileForm onSaved={onSaved} />)

      startEmailChange('new.address@gmail.com')
      fireEvent.change(await screen.findByLabelText('Verification code'), { target: { value: '000000' } })
      fireEvent.click(screen.getByRole('button', { name: /confirm email/i }))

      expect(await screen.findByRole('alert')).toHaveTextContent('That code is incorrect or has expired.')
      expect(screen.getByLabelText('Verification code')).toHaveValue('')
      expect(onSaved).not.toHaveBeenCalled()
    })

    it('can be cancelled', () => {
      spies()
      render(<ProfileForm />)
      fireEvent.click(screen.getByRole('button', { name: /^change$/i }))
      fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }))
      expect(screen.getByRole('button', { name: /^change$/i })).toBeInTheDocument()
    })
  })
})