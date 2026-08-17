import { Skeleton } from './Skeleton'

interface HistorySkeletonProps {
  /** Number of placeholder cards to render. Defaults to 8. */
  count?: number
}

export default function HistorySkeleton({ count = 8 }: HistorySkeletonProps) {
  const cards = Array.from({ length: count })

  return (
    <>
      {/* Stats bar skeleton */}
      <Skeleton className="w-48 h-[46px] mb-5 rounded-lg" />

      <div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
        aria-hidden="true"
      >
        {cards.map((_, idx) => (
          <div
            key={idx}
            className="bg-surface border border-border rounded-xl overflow-hidden flex flex-col shadow-sm"
          >
            {/* Image placeholder (aspect-video) */}
            <Skeleton className="w-full aspect-video rounded-none border-x-0 border-t-0" />

            {/* Info placeholder */}
            <div className="p-3 flex flex-col gap-3 flex-1">
              {/* Title line */}
              <Skeleton className="w-3/4 h-4 rounded" />

              {/* Date line */}
              <Skeleton className="w-1/2 h-3 rounded" />

              {/* Action buttons */}
              <div className="flex items-center gap-2 mt-auto pt-2">
                <Skeleton className="flex-1 h-[28px] rounded-md" />
                <Skeleton className="w-[60px] h-[28px] rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
