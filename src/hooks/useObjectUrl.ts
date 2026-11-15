import { useEffect, useState } from 'react'

/**
 * Creates an object URL for a File/Blob and frees it automatically when the
 * file changes or the component unmounts.
 *
 * Returns null when there is no file. It never returns a URL that belongs to
 * a different file than the one passed in on the current render.
 */
export function useObjectUrl(source: File | Blob | null | undefined): string | null {
  const [entry, setEntry] = useState<{ source: File | Blob; url: string } | null>(null)

  useEffect(() => {
    if (!source) {
      setEntry(null)
      return
    }
    const url = URL.createObjectURL(source)
    setEntry({ source, url })
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [source])

  return source && entry && entry.source === source ? entry.url : null
}