// vitest + @testing-library/react global setup
import '@testing-library/jest-dom/vitest'

// Newer Node versions ship their own experimental localStorage/sessionStorage.
// Without --localstorage-file they are undefined or throw, and they shadow the
// working jsdom versions, so any test touching storage crashes. When that
// happens, fall back to a simple in-memory Storage.
function createMemoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (key: string) => (data.has(String(key)) ? (data.get(String(key)) as string) : null),
    key: (index: number) => Array.from(data.keys())[index] ?? null,
    removeItem: (key: string) => {
      data.delete(String(key))
    },
    setItem: (key: string, value: string) => {
      data.set(String(key), String(value))
    },
  }
}

function storageWorks(name: 'localStorage' | 'sessionStorage'): boolean {
  try {
    const storage = globalThis[name]
    storage.setItem('__probe__', '1')
    storage.removeItem('__probe__')
    return true
  } catch {
    return false
  }
}

for (const name of ['localStorage', 'sessionStorage'] as const) {
  if (!storageWorks(name)) {
    Object.defineProperty(globalThis, name, {
      value: createMemoryStorage(),
      configurable: true,
      writable: true,
    })
  }
}