import { describe, it, expect } from 'vitest'
import { AxiosError, type AxiosResponse } from 'axios'
import { getApiErrorMessage, isEmailNotVerified } from '../apiError'

function axiosError(status: number, data: unknown): AxiosError {
  const response = {
    status,
    data,
    statusText: '',
    headers: {},
    config: {},
  } as unknown as AxiosResponse
  return new AxiosError('failed', 'ERR_BAD_REQUEST', undefined, undefined, response)
}

describe('getApiErrorMessage', () => {
  it('returns a string detail as is', () => {
    expect(getApiErrorMessage(axiosError(400, { detail: 'Bad code' }), 'fallback')).toBe('Bad code')
  })

  it('joins validation messages from a list', () => {
    const err = axiosError(422, { detail: [{ msg: 'Too short' }, { msg: 'Invalid email' }] })
    expect(getApiErrorMessage(err, 'fallback')).toBe('Too short, Invalid email')
  })

  it('falls back when a list has no messages', () => {
    const err = axiosError(422, { detail: [{}] })
    expect(getApiErrorMessage(err, 'fallback')).toBe('fallback')
  })

  it('reads the message from an object detail', () => {
    const err = axiosError(403, { detail: { code: 'email_not_verified', message: 'Please verify' } })
    expect(getApiErrorMessage(err, 'fallback')).toBe('Please verify')
  })

  it('explains when the server cannot be reached', () => {
    expect(getApiErrorMessage(new AxiosError('Network Error'), 'fallback')).toMatch(
      /cannot reach the server/i,
    )
  })

  it('uses the fallback for unknown errors', () => {
    expect(getApiErrorMessage(new Error('boom'), 'fallback')).toBe('fallback')
    expect(getApiErrorMessage(axiosError(500, {}), 'fallback')).toBe('fallback')
  })
})

describe('isEmailNotVerified', () => {
  it('detects the 403 email_not_verified response', () => {
    expect(isEmailNotVerified(axiosError(403, { detail: { code: 'email_not_verified' } }))).toBe(true)
  })

  it('ignores other errors', () => {
    expect(isEmailNotVerified(axiosError(403, { detail: 'Forbidden' }))).toBe(false)
    expect(isEmailNotVerified(axiosError(401, { detail: { code: 'email_not_verified' } }))).toBe(false)
    expect(isEmailNotVerified(new Error('x'))).toBe(false)
  })
})