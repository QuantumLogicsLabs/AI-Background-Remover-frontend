import axios from 'axios'

/** Turn any axios/FastAPI error into a readable message. */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (!axios.isAxiosError(err)) return fallback
  if (!err.response) return 'Cannot reach the server. Make sure the backend is running.'

  const detail = err.response.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length) {
    const msg = detail.map((d: { msg?: string }) => d?.msg ?? '').filter(Boolean).join(', ')
    return msg || fallback
  }
  if (detail && typeof detail === 'object' && typeof detail.message === 'string') return detail.message
  return fallback
}

/** True when login failed because the email still needs verifying. */
export function isEmailNotVerified(err: unknown): boolean {
  return (
    axios.isAxiosError(err) &&
    err.response?.status === 403 &&
    err.response.data?.detail?.code === 'email_not_verified'
  )
}