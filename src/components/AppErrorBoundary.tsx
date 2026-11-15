import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /**
   * When this value changes (for example the current route path), an error
   * caught earlier is cleared so the next page starts fresh.
   */
  resetKey?: string
}

interface State {
  error: Error | null
}

/**
 * Catches render errors below it (including a lazy page chunk that fails to
 * load) and shows a recovery screen instead of a blank page. Layout pieces
 * outside it, such as the Navbar, keep working so the user can navigate away.
 */
export default class AppErrorBoundary extends Component<Props, State> {
  public state: State = { error: null }

  public static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  public componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AppErrorBoundary] Unhandled render error:', error, info.componentStack)
  }

  public componentDidUpdate(prevProps: Props) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  private handleRetry = () => {
    this.setState({ error: null })
  }

  private handleReload = () => {
    window.location.reload()
  }

  public render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div role="alert" className="flex-1 flex items-center justify-center px-4 py-16 min-h-[50vh]">
        <div className="w-full max-w-md p-6 rounded-2xl border border-danger/30 bg-surface-raised text-center shadow-lg animate-fade-up">
          <div className="w-12 h-12 mx-auto rounded-full bg-danger/10 text-danger flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6" aria-hidden="true">
              <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </div>

          <h2 className="text-lg font-bold text-primary mb-1">Something went wrong</h2>
          <p className="text-sm text-secondary mb-5">
            This page ran into an unexpected problem. You can try again or reload the page.
          </p>

          {import.meta.env.DEV && (
            <p className="w-full p-2.5 mb-5 rounded-lg border border-border text-[11px] font-mono text-danger/90 break-words">
              {error.message || String(error)}
            </p>
          )}

          <div className="flex justify-center gap-2">
            <button type="button" onClick={this.handleRetry} className="btn-primary text-xs py-2.5 px-5">
              Try again
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="px-4 py-2.5 rounded-lg text-xs font-semibold text-secondary hover:text-primary hover:bg-surface border border-border transition-colors"
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    )
  }
}