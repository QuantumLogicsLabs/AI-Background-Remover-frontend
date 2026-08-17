import { useState } from 'react'
import { Link } from 'react-router-dom'
import HistoryCard from '../components/HistoryCard'
import HistorySkeleton from '../components/HistorySkeleton'
import { useHistory } from '../hooks/useHistory'
import type { OperationType } from '../hooks/useHistory'
import { OPERATION_LABELS } from '../hooks/useHistory'

type FilterTab = 'all' | OperationType

const TABS: { id: FilterTab; label: string }[] = [
  { id: 'all',        label: 'All' },
  { id: 'remove_bg',  label: OPERATION_LABELS.remove_bg  },
  { id: 'enhance',    label: OPERATION_LABELS.enhance     },
  { id: 'replace_bg', label: OPERATION_LABELS.replace_bg  },
  { id: 'smart_crop', label: OPERATION_LABELS.smart_crop  },
]

export default function HistoryPage() {
  const { items, loading, error, deleteItem } = useHistory()
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  const filtered = activeTab === 'all'
    ? items
    : items.filter(i => i.operation_type === activeTab)

  /** Count per tab for the badge numbers */
  const counts: Record<FilterTab, number> = {
    all:        items.length,
    remove_bg:  items.filter(i => i.operation_type === 'remove_bg').length,
    enhance:    items.filter(i => i.operation_type === 'enhance').length,
    replace_bg: items.filter(i => i.operation_type === 'replace_bg').length,
    smart_crop: items.filter(i => i.operation_type === 'smart_crop').length,
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-primary tracking-tight">
            Processing History
          </h1>
          <p className="text-secondary text-sm mt-1">
            {items.length > 0
              ? `${items.length} processed image${items.length !== 1 ? 's' : ''} — click a card to export`
              : 'Your processed images will appear here'
            }
          </p>
        </div>

        <Link to="/" className="btn-primary shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4" aria-hidden="true">
            <path d="M8.75 3.75a.75.75 0 00-1.5 0v3.5h-3.5a.75.75 0 000 1.5h3.5v3.5a.75.75 0 001.5 0v-3.5h3.5a.75.75 0 000-1.5h-3.5v-3.5z"/>
          </svg>
          New image
        </Link>
      </div>

      {/* Filter tabs — only shown once data is loaded */}
      {!loading && !error && items.length > 0 && (
        <div
          role="tablist"
          aria-label="Filter by operation type"
          className="flex flex-wrap gap-2 mb-6"
        >
          {TABS.map(tab => {
            const isActive = activeTab === tab.id
            const count = counts[tab.id]
            // Hide tabs that have no items (except "All")
            if (tab.id !== 'all' && count === 0) return null
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  inline-flex items-center gap-1.5
                  px-3.5 py-1.5 rounded-full text-sm font-medium
                  border transition-all duration-150
                  focus:outline-none focus:shadow-focus
                  ${isActive
                    ? 'bg-teal text-white border-teal shadow-sm'
                    : 'bg-surface text-secondary border-border hover:border-teal/40 hover:text-primary'
                  }
                `}
              >
                {tab.label}
                <span className={`
                  text-[11px] font-semibold tabular-nums
                  px-1.5 py-0 rounded-full leading-snug
                  ${isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-border/60 text-muted'
                  }
                `}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Loading state — use last-known item count so skeleton card count
          matches what will appear, avoiding a jarring layout jump */}
      {loading && (
        <div className="py-2">
          <HistorySkeleton count={items.length > 0 ? items.length : 4} />
          <span className="sr-only">Loading history…</span>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-danger/40 bg-surface px-4 py-4">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-danger shrink-0 mt-0.5" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-8.75a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zm.75-1.5a1 1 0 110-2 1 1 0 010 2z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-danger">Failed to load history</p>
            <p className="text-xs text-secondary mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Empty state — no history at all */}
      {!loading && !error && items.length === 0 && (
        <div className="flex flex-col items-center gap-5 py-24 text-center animate-fade-up">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-checker border border-border flex items-center justify-center shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.2" stroke="currentColor" className="w-10 h-10 text-muted" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5M4.5 3h15M5.25 3v18M18.75 3v18" />
              </svg>
            </div>
            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-magenta/15 border border-magenta/30 flex items-center justify-center" aria-hidden="true">
              <span className="text-[10px]">✨</span>
            </div>
          </div>
          <div>
            <p className="text-primary font-display font-semibold text-lg">No images yet</p>
            <p className="text-muted text-sm mt-1 max-w-xs">
              Upload and process your first image to see it here.
            </p>
          </div>
          <Link to="/" className="btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4" aria-hidden="true">
              <path d="M8.75 3.75a.75.75 0 00-1.5 0v3.5h-3.5a.75.75 0 000 1.5h3.5v3.5a.75.75 0 001.5 0v-3.5h3.5a.75.75 0 000-1.5h-3.5v-3.5z"/>
            </svg>
            Upload an image
          </Link>
        </div>
      )}

      {/* Empty state — tab has no matching items but others do */}
      {!loading && !error && items.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-20 text-center animate-fade-up">
          <p className="text-primary font-semibold">
            No {activeTab === 'all' ? '' : `${OPERATION_LABELS[activeTab as OperationType]} `}images yet
          </p>
          <p className="text-muted text-sm">Try a different filter above.</p>
        </div>
      )}

      {/* History grid */}
      {!loading && !error && filtered.length > 0 && (
        <>
          {/* Stats bar */}
          <div className="flex items-center gap-3 mb-5 p-3 rounded-lg bg-surface border border-border text-sm text-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-magenta shrink-0" aria-hidden="true">
              <path d="M2 2.75A.75.75 0 012.75 2h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 012 2.75zm0 4A.75.75 0 012.75 6h6.5a.75.75 0 010 1.5h-6.5A.75.75 0 012 6.75zm0 4a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5A.75.75 0 012 10.75z"/>
              <path d="M11.5 2.5a1 1 0 011-1h1a1 1 0 011 1v11a1 1 0 01-1 1h-1a1 1 0 01-1-1v-11z"/>
            </svg>
            <span>
              Showing{' '}
              <strong className="font-semibold text-primary">{filtered.length}</strong>
              {activeTab !== 'all' && (
                <> <span className="text-primary font-medium">{OPERATION_LABELS[activeTab as OperationType]}</span></>
              )}{' '}
              image{filtered.length !== 1 ? 's' : ''}
              {activeTab !== 'all' && (
                <> of <strong className="font-semibold text-primary">{items.length}</strong> total</>
              )}
            </span>
          </div>

          <ul
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
            aria-label="Processing history grid"
          >
            {filtered.map((item, idx) => (
              <li
                key={`${item.operation_type}-${item.upload_id}`}
                className="animate-fade-up"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <HistoryCard item={item} onDelete={deleteItem} />
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  )
}
