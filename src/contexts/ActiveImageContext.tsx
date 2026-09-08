/**
 * ActiveImageContext
 *
 * Tracks the "active" image flowing through the Studio pipeline:
 *   - activeFile / activePreviewUrl  — the original uploaded file
 *   - outputUrl / outputFilename     — the latest processed result
 *
 * Any tool's result hook should call setOutput() when it completes.
 * The SendToMenu component calls sendToTool() to navigate + pre-fill the
 * destination page without requiring a manual re-upload.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PipelineOutput {
  /** Absolute-or-relative URL to fetch the processed image */
  url:      string
  /** Suggested filename (e.g. "result_abc123.png") */
  filename: string
}

interface ActiveImageContextType {
  // Original file state (set when user first uploads)
  activeFile:       File | null
  activePreviewUrl: string | null
  setActiveImage:   (file: File | null, previewUrl: string | null) => void

  // Latest tool output (updated after each successful processing)
  pipelineOutput:   PipelineOutput | null
  setOutput:        (url: string, filename: string) => void

  /**
   * Fetches the current pipelineOutput as a Blob, converts it to a File,
   * stores it as the new activeFile, then navigates to `route`.
   *
   * The destination page reads `activeFile` on mount and pre-fills its
   * upload zone — the user lands ready to process without re-uploading.
   *
   * @param route        e.g. "/enhance"
   * @param displayName  human-readable label for the origin file name
   */
  sendToTool: (route: string, displayName?: string) => Promise<void>

  /** True while sendToTool is fetching the output blob */
  isSending: boolean
}

// ── Context ───────────────────────────────────────────────────────────────────

const ActiveImageContext = createContext<ActiveImageContextType | undefined>(undefined)

// ── Provider ──────────────────────────────────────────────────────────────────

/**
 * Inner component that can use useNavigate (must be inside BrowserRouter).
 */
function ActiveImageProviderInner({ children }: { children: ReactNode }) {
  const navigate = useNavigate()

  const [activeFile,       setActiveFile]       = useState<File | null>(null)
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null)
  const [pipelineOutput,   setPipelineOutput]   = useState<PipelineOutput | null>(null)
  const [isSending,        setIsSending]        = useState(false)

  // ── Set original uploaded image ─────────────────────────────────────────
  const setActiveImage = useCallback(
    (file: File | null, previewUrl: string | null) => {
      setActiveFile(file)
      setActivePreviewUrl(previewUrl)
    },
    [],
  )

  // ── Register the latest tool output ────────────────────────────────────
  const setOutput = useCallback((url: string, filename: string) => {
    setPipelineOutput({ url, filename })
  }, [])

  // ── Send current output to another tool ────────────────────────────────
  const sendToTool = useCallback(
    async (route: string, displayName?: string) => {
      if (!pipelineOutput) return

      setIsSending(true)
      try {
        // Fetch the processed image from the server
        const resp = await fetch(pipelineOutput.url)
        if (!resp.ok) throw new Error(`Failed to fetch output: ${resp.status}`)

        const blob = await resp.blob()
        const ext  = blob.type.split('/')[1] || 'png'
        const name = displayName ?? pipelineOutput.filename ?? `image.${ext}`
        const file = new File([blob], name, { type: blob.type })

        // Create a fresh object URL for the preview
        const previewUrl = URL.createObjectURL(blob)

        // Store as new active image so destination page can pick it up
        setActiveFile(file)
        setActivePreviewUrl(previewUrl)

        // Navigate — destination page reads activeFile on mount
        navigate(route)
      } catch (_err) {
        // Navigation failed — isSending resets in finally, user stays on current page
      } finally {
        setIsSending(false)
      }
    },
    [pipelineOutput, navigate],
  )

  return (
    <ActiveImageContext.Provider
      value={{
        activeFile,
        activePreviewUrl,
        setActiveImage,
        pipelineOutput,
        setOutput,
        sendToTool,
        isSending,
      }}
    >
      {children}
    </ActiveImageContext.Provider>
  )
}

/**
 * Public provider — wraps children in a Router-aware inner provider.
 * Must be placed inside <BrowserRouter>.
 */
export const ActiveImageProvider: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ActiveImageProviderInner>{children}</ActiveImageProviderInner>
)

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useActiveImage = (): ActiveImageContextType => {
  const context = useContext(ActiveImageContext)
  if (context === undefined) {
    throw new Error('useActiveImage must be used within an ActiveImageProvider')
  }
  return context
}
