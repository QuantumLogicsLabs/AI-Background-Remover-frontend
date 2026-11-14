import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { AxiosError, type AxiosResponse } from 'axios'
import VerifyEmailForm from '../VerifyEmailForm'

const mocks = vi.hoisted(() => ({
  verifyEmail: vi.fn(),
  resendVerification: vi.fn(),
  showToast: vi.fn(),
}))

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    verifyEmail: mocks.verifyEmail,
    resendVerification: mocks.resendVerification,
  }),
}))

vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({ showToast: mocks.showToast }),
}))

const EMAIL = 'alice@gmail.com'

function setup() {
  const onVerified = vi.fn()
  const onBack = vi.fn()
  render(<VerifyEmailForm email={EMAIL} onVerified={onVerified} onBack={onBack} />)
  return { onVerified, onBack, input: screen.getByLabelText(/verification code/i) }
}

function apiError(detail: string) {
  const response = {
    status: 400,
    data: { detail },
    statusText: '',
    headers: {},
    config: {},
  } as unknown as AxiosResponse
  return new AxiosError('failed', 'ERR_BAD_REQUEST', undefined, undefined, response)
}

describe('VerifyEmailForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the address the code was sent to and starts with Verify disabled', () => {
    setup()
    expect(screen.getByText(EMAIL)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /verify email/i })).toBeDisabled()
  })

  it('only accepts digits and caps the code at six', () => {
    const { input } = setup()
    fireEvent.change(input, { target: { value: '12ab34' } })
    expect(input).toHaveValue('1234')
    expect(mocks.verifyEmail).not.toHaveBeenCalled()
  })

  it('submits automatically once six digits are entered', async () => {
    mocks.verifyEmail.mockResolvedValue(undefined)
    const { input, onVerified } = setup()

    fireEvent.change(input, { target: { value: '123456' } })

    await waitFor(() => expect(mocks.verifyEmail).toHaveBeenCalledWith(EMAIL, '123456'))
    await waitFor(() => expect(onVerified).toHaveBeenCalledTimes(1))
    expect(mocks.showToast).toHaveBeenCalledWith('Email verified. Welcome!', 'success')
  })

  it('shows the server error and clears the field on a wrong code', async () => {
    mocks.verifyEmail.mockRejectedValueOnce(apiError('That code is incorrect or has expired.'))
    const { input, onVerified } = setup()

    fireEvent.change(input, { target: { value: '000000' } })

    expect(await screen.findByRole('alert')).toHaveTextContent('That code is incorrect or has expired.')
    expect(input).toHaveValue('')
    expect(onVerified).not.toHaveBeenCalled()
  })

  it('lets the user go back to change the email', () => {
    const { onBack } = setup()
    fireEvent.click(screen.getByRole('button', { name: /use a different email/i }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('enables Resend only after the 60 second cooldown', async () => {
    vi.useFakeTimers()
    mocks.resendVerification.mockResolvedValue(undefined)
    setup()

    expect(screen.getByRole('button', { name: /resend code in 60s/i })).toBeDisabled()

    // One tick at a time: each second re-renders and schedules the next timer.
    for (let i = 0; i < 60; i++) {
      act(() => {
        vi.advanceTimersByTime(1000)
      })
    }

    const resend = screen.getByRole('button', { name: /^resend code$/i })
    expect(resend).toBeEnabled()

    await act(async () => {
      fireEvent.click(resend)
    })
    expect(mocks.resendVerification).toHaveBeenCalledWith(EMAIL)
    expect(mocks.showToast).toHaveBeenCalledWith('A new code is on its way.', 'info')
  })

  it('shows a toast when resending fails', async () => {
    vi.useFakeTimers()
    mocks.resendVerification.mockRejectedValueOnce(apiError('Too many code requests. Please try again later.'))
    setup()

    for (let i = 0; i < 60; i++) {
      act(() => {
        vi.advanceTimersByTime(1000)
      })
    }

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^resend code$/i }))
    })
    expect(mocks.showToast).toHaveBeenCalledWith('Too many code requests. Please try again later.', 'error')
  })
})