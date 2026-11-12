import { createContext, useContext } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PipelineOutput {
  /** Absolute-or-relative URL to fetch the processed image */
  url:      string
  /** Suggested filename (e.g. "result_abc123.png") */
  filename: string
}

export interface ActiveImageContextType {
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

export const ActiveImageContext = createContext<ActiveImageContextType | undefined>(undefined)

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useActiveImage = (): ActiveImageContextType => {
  const context = useContext(ActiveImageContext)
  if (context === undefined) {
    throw new Error('useActiveImage must be used within an ActiveImageProvider')
  }
  return context
}

