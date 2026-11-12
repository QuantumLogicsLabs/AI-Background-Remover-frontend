import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'

/**
 * Landing page after the backend finishes the Google/GitHub flow.
 * The backend has already set the httpOnly refresh cookie; we exchange it
 * for an access token and load the user, then continue to the app.
 */
export default function AuthCallbackPage() {
  const { completeOAuthLogin } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const ran = useRef(false)   // React StrictMode runs effects twice in dev

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    completeOAuthLogin()
      .then(() => {
        showToast('Signed in successfully.', 'success')
        navigate('/', { replace: true })
      })
      .catch(() => {
        showToast('Sign-in failed. Please try again.', 'error')
        navigate('/login', { replace: true })
      })
  }, [completeOAuthLogin, navigate, showToast])

  return (
    <div className="min-h-screen flex items-center justify-center" role="status">
      <p className="text-secondary text-sm">Signing you in…</p>
    </div>
  )
}
