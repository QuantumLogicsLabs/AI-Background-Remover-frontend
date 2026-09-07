import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'
import { ActiveImageProvider } from './contexts/ActiveImageContext'
import { ToastProvider } from './contexts/ToastContext'
import { ThemeSettingsProvider } from './contexts/ThemeSettingsContext'
import { WorkspaceProvider } from './contexts/WorkspaceContext'
import { BrandKitProvider } from './contexts/BrandKitContext'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

// ── Eagerly loaded components ───────────────────────────────────────────────
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import PageLoader from './components/PageLoader'
import BottomNav from './components/BottomNav'
import ShortcutsModal from './components/ShortcutsModal'

// ── Lazy-loaded pages ───────────────────────────────────────────────────────
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const HomePage = lazy(() => import('./pages/HomePage'))
const EnhancePage = lazy(() => import('./pages/EnhancePage'))
const ReplaceBgPage = lazy(() => import('./pages/ReplaceBgPage'))
const RecolorAndEraserPage = lazy(() => import('./pages/RecolorAndEraserPage'))
const SmartCropPage = lazy(() => import('./pages/SmartCropPage'))
const BatchPage = lazy(() => import('./pages/BatchPage'))
const ShadowPage = lazy(() => import('./pages/ShadowPage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const AIAnalysisPage = lazy(() => import('./pages/AIAnalysisPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

// ── ChatbotWidget ──────────────────────────────────────────────────────────
const ChatbotWidget = lazy(() => import('./components/ChatbotWidget'))

function ChatbotWidgetWrapper() {
  const { user } = useAuth()
  if (!user) return null
  return (
    <Suspense fallback={null}>
      <ChatbotWidget />
    </Suspense>
  )
}

function MainLayout() {
  const { user } = useAuth()
  const location = useLocation()
  useKeyboardShortcuts()

  // Auth pages that should not show the navbar
  const authPages = ['/login', '/register', '/forgot-password', '/reset-password']
  const isAuthPage = authPages.includes(location.pathname)

  return (
    <div className="min-h-screen bg-page flex flex-col selection:bg-magenta selection:text-white">
      {!isAuthPage && <Navbar />}
      <div className="flex-1 flex w-full">
        <main className="flex-1 min-w-0 pb-16 md:pb-6">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* Protected routes */}
              <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
              <Route path="/enhance" element={<ProtectedRoute><EnhancePage /></ProtectedRoute>} />
              <Route path="/replace-bg" element={<ProtectedRoute><ReplaceBgPage /></ProtectedRoute>} />
              <Route path="/recolor-and-eraser" element={<ProtectedRoute><RecolorAndEraserPage /></ProtectedRoute>} />
              <Route path="/smart-crop" element={<ProtectedRoute><SmartCropPage /></ProtectedRoute>} />
              <Route path="/batch" element={<ProtectedRoute><BatchPage /></ProtectedRoute>} />
              <Route path="/shadow" element={<ProtectedRoute><ShadowPage /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/ai-analysis" element={<ProtectedRoute><AIAnalysisPage /></ProtectedRoute>} />

              {/* Catch-all */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </main>
      </div>

      {user && !isAuthPage && <BottomNav />}
      <ShortcutsModal />
      <ChatbotWidgetWrapper />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeSettingsProvider>
          <WorkspaceProvider>
            <BrandKitProvider>
              <ToastProvider>
              <ActiveImageProvider>
                <MainLayout />
              </ActiveImageProvider>
            </ToastProvider>
            </BrandKitProvider>
          </WorkspaceProvider>
        </ThemeSettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
