import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth }      from './hooks/useAuth'
import { ActiveImageProvider }   from './contexts/ActiveImageContext'
import { ToastProvider } from './contexts/ToastContext'
import Navbar          from './components/Navbar'
import ProtectedRoute  from './components/ProtectedRoute'
import ChatbotWidget   from './components/ChatbotWidget'

import LoginPage          from './pages/LoginPage'
import RegisterPage       from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage  from './pages/ResetPasswordPage'
import HomePage           from './pages/HomePage'
import EnhancePage        from './pages/EnhancePage'
import ReplaceBgPage      from './pages/ReplaceBgPage'
import SmartCropPage      from './pages/SmartCropPage'
import BatchPage          from './pages/BatchPage'
import HistoryPage        from './pages/HistoryPage'
import SettingsPage       from './pages/SettingsPage'
import NotFoundPage       from './pages/NotFoundPage'
import RecolorPage        from './pages/RecolorPage'

function ChatbotWidgetWrapper() {
  const { user } = useAuth()
  if (!user) return null
  return <ChatbotWidget />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ActiveImageProvider>
            <div className="min-h-screen bg-page flex flex-col">
              <Navbar />
              <Routes>
                {/* ── Public routes ────────────────────────────────────────────────── */}
                <Route path="/login"            element={<LoginPage />} />
                <Route path="/register"          element={<RegisterPage />} />
                <Route path="/forgot-password"   element={<ForgotPasswordPage />} />
                <Route path="/reset-password"    element={<ResetPasswordPage />} />

                {/* ── Protected routes ───────────────────────────────────────── */}
                <Route path="/" element={
                  <ProtectedRoute><HomePage /></ProtectedRoute>
                } />
                <Route path="/enhance" element={
                  <ProtectedRoute><EnhancePage /></ProtectedRoute>
                } />
                <Route path="/replace-bg" element={
                  <ProtectedRoute><ReplaceBgPage /></ProtectedRoute>
                } />
                <Route path="/smart-crop" element={
                  <ProtectedRoute><SmartCropPage /></ProtectedRoute>
                } />
                <Route path="/batch" element={
                  <ProtectedRoute><BatchPage /></ProtectedRoute>
                } />
                <Route path="/recolor" element={
                  <ProtectedRoute><RecolorPage /></ProtectedRoute>
                } />
                <Route path="/history" element={
                  <ProtectedRoute><HistoryPage /></ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute><SettingsPage /></ProtectedRoute>
                } />

                {/* ── Catch-all ──────────────────────────────────────────────── */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
              <ChatbotWidgetWrapper />
            </div>
          </ActiveImageProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
