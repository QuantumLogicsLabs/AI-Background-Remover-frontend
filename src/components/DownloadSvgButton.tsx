import { useState } from 'react'

interface DownloadSvgButtonProps {
  /** The URL of the processed image (PNG) to be vectorized */
  sourceUrl: string
  /** Original filename to derive the SVG name */
  filename?: string
}

/**
 * DownloadSvgButton
 * Calls the /api/vectorize endpoint with the source image,
 * then fetches the SVG content as a Blob and triggers a local
 * object-URL download so the file is correctly named .svg
 * (avoids cross-origin `a.download` attribute limitations).
 */
export default function DownloadSvgButton({
  sourceUrl,
  filename = 'result',
}: DownloadSvgButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDownloadSvg = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // 1. Fetch the source image as a Blob to upload it
      const imgResponse = await fetch(sourceUrl)
      if (!imgResponse.ok) throw new Error('Could not fetch the source image.')
      const imgBlob = await imgResponse.blob()

      const baseName = filename.replace(/\.[^/.]+$/, '') || 'result'
      const file = new File([imgBlob], `${baseName}.png`, { type: 'image/png' })

      const formData = new FormData()
      formData.append('file', file)

      const token = localStorage.getItem('bgr_token')
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = 'Bearer ' + token

      // 2. Call the vectorize endpoint
      const res = await fetch('http://localhost:8000/api/vectorize', {
        method: 'POST',
        headers,
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.detail || 'Vectorization failed. Please try again.')
      }

      const data = await res.json()
      const svgUrl = 'http://localhost:8000' + data.download_url

      // 3. Fetch the SVG content as a Blob (fixes cross-origin download naming)
      const svgResponse = await fetch(svgUrl, { headers })
      if (!svgResponse.ok) throw new Error('Could not download the SVG file.')
      const svgBlob = await svgResponse.blob()

      // 4. Create a local object URL and trigger download with correct .svg name
      const objectUrl = URL.createObjectURL(
        new Blob([svgBlob], { type: 'image/svg+xml' })
      )
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = `${baseName}.svg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(objectUrl)

    } catch (err: any) {
      setError(err.message || 'An error occurred.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative">
      <button
        id="download-svg-button"
        onClick={handleDownloadSvg}
        disabled={isLoading}
        title={error ?? 'Download as scalable SVG vector'}
        aria-label="Download as SVG"
        className={`
          inline-flex items-center gap-2 px-4 py-2.5 rounded-md font-medium text-sm
          border border-border bg-surface hover:bg-surface-raised text-primary
          shadow-sm hover:shadow-md
          transition-all duration-200
          focus:outline-none focus:shadow-focus
          active:scale-95
          ${isLoading ? 'opacity-60 cursor-wait' : ''}
          ${error ? 'border-danger/50 text-danger' : ''}
        `}
      >
        {isLoading ? (
          <>
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Converting...
          </>
        ) : error ? (
          <>
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Retry SVG
          </>
        ) : (
          <>
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v.75A2.25 2.25 0 005.25 19.5h9.5A2.25 2.25 0 0017 17.25v-.75M10 3v10m0 0L7 10m3 3l3-3" />
            </svg>
            SVG
          </>
        )}
      </button>
    </div>
  )
}
