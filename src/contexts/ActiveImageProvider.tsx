import React, {
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ActiveImageContext,
  type PipelineOutput,
} from './ActiveImageContext'

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

