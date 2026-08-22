import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  name?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class CanvasErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[CanvasErrorBoundary] Error in component '${this.props.name || 'Canvas'}':`, error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full min-h-[300px] p-6 rounded-2xl border border-danger/30 bg-surface-raised flex flex-col items-center justify-center text-center shadow-lg animate-fade-up">
          <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </div>

          <h3 className="text-base font-bold text-primary mb-1">
            {this.props.name || 'Canvas'} Rendering Issue
          </h3>
          
          <p className="text-xs text-muted max-w-md leading-relaxed mb-5">
            An unexpected error occurred while rendering the canvas elements. The rest of the application remains fully functional.
          </p>

          {this.state.error && (
            <div className="w-full max-w-md p-2.5 mb-5 rounded-lg bg-black/40 border border-border text-[11px] font-mono text-danger/90 truncate">
              {this.state.error.message || String(this.state.error)}
            </div>
          )}

          <button
            type="button"
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-magenta hover:bg-magenta-hover text-white rounded-lg transition-all shadow-sm active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H4.5a.75.75 0 00-.75.75v3.75a.75.75 0 001.5 0v-2.132l.44.44a7 7 0 1010.596-3.238.75.75 0 00-.974-.225z" clipRule="evenodd" />
            </svg>
            Reload Canvas
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
