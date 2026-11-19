import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import HistoryCard from "../components/HistoryCard";
import HistorySkeleton from "../components/HistorySkeleton";
import ZipExportModal from "../components/ZipExportModal";
import Tooltip from "../components/Tooltip";
import { useHistory, HistoryItem } from "../hooks/useHistory";
import type { OperationType } from "../hooks/useHistory";
import { OPERATION_LABELS } from "../hooks/useHistory";
import type { ZipFormat } from "../hooks/useBatch";

type FilterTab = "all" | OperationType;
type LayoutMode = "grid" | "masonry";
type SortOrder = "newest" | "oldest" | "operation";

const TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "remove_bg", label: OPERATION_LABELS.remove_bg },
  { id: "enhance", label: OPERATION_LABELS.enhance },
  { id: "replace_bg", label: OPERATION_LABELS.replace_bg },
  { id: "smart_crop", label: OPERATION_LABELS.smart_crop },
];

export default function HistoryPage() {
  const { items, loading, error, deleteItem } = useHistory();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("grid");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);

  // Filtered & Sorted items
  const processedItems = useMemo(() => {
    let result =
      activeTab === "all"
        ? items
        : items.filter((i) => i.operation_type === activeTab);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.output_filename.toLowerCase().includes(q) ||
          i.original_name?.toLowerCase().includes(q) ||
          i.operation_type.toLowerCase().includes(q),
      );
    }

    return [...result].sort((a, b) => {
      const timeA = new Date(a.created_at).getTime() || 0;
      const timeB = new Date(b.created_at).getTime() || 0;
      if (sortOrder === "newest") return timeB - timeA;
      if (sortOrder === "oldest") return timeA - timeB;
      if (sortOrder === "operation")
        return a.operation_type.localeCompare(b.operation_type);
      return 0;
    });
  }, [items, activeTab, searchQuery, sortOrder]);

  // Multi-selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === processedItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(processedItems.map((i) => i.upload_id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (confirm(`Delete ${selectedIds.size} selected image(s)?`)) {
      for (const id of Array.from(selectedIds)) {
        await deleteItem(id);
      }
      setSelectedIds(new Set());
    }
  };

  const selectedItemsList: HistoryItem[] = useMemo(() => {
    return items.filter((i) => selectedIds.has(i.upload_id));
  }, [items, selectedIds]);

  const handleDownloadZip = async (_format: ZipFormat, _quality: number) => {
    setIsZipping(true);
    setZipError(null);

    try {
      // Trigger instant sequential download for selected images
      for (const item of selectedItemsList) {
        const link = document.createElement("a");
        link.href = `/api/download/${item.output_filename}`;
        link.download = item.output_filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        await new Promise((r) => setTimeout(r, 250));
      }
      setIsZipping(false);
      setIsExportModalOpen(false);
    } catch {
      setZipError("Failed to export selected items.");
      setIsZipping(false);
    }
  };

  const counts: Record<FilterTab, number> = {
    all: items.length,
    remove_bg: items.filter((i) => i.operation_type === "remove_bg").length,
    enhance: items.filter((i) => i.operation_type === "enhance").length,
    replace_bg: items.filter((i) => i.operation_type === "replace_bg").length,
    smart_crop: items.filter((i) => i.operation_type === "smart_crop").length,
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-primary tracking-tight">
            Processing Gallery
          </h1>
          <p className="text-secondary text-xs sm:text-sm mt-1">
            {items.length > 0
              ? `${items.length} image${items.length !== 1 ? "s" : ""} in cloud storage &mdash; filter, multi-select, or export zip`
              : "Your processed images will appear here"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 animate-fade-up">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(true)}
                className="btn-primary text-xs py-2 px-3 shadow-sm"
              >
                Export Selected ({selectedIds.size})
              </button>
              <button
                type="button"
                onClick={handleDeleteSelected}
                className="p-2 rounded-lg border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20 transition-colors text-xs"
                title="Delete Selected"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          )}

          <Link to="/" className="btn-primary text-xs py-2 px-3.5 shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="w-3.5 h-3.5"
            >
              <path d="M8.75 3.75a.75.75 0 00-1.5 0v3.5h-3.5a.75.75 0 000 1.5h3.5v3.5a.75.75 0 001.5 0v-3.5h3.5a.75.75 0 000-1.5h-3.5v-3.5z" />
            </svg>
            New Process
          </Link>
        </div>
      </div>

      {/* Toolbar */}
      {!loading && !error && items.length > 0 && (
        <div className="flex flex-col gap-4 mb-6 p-4 rounded-2xl bg-surface border border-border shadow-xs">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Search images by name…"
                aria-label="Search images by name…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-1.5 rounded-lg border border-border bg-surface-raised text-xs text-primary placeholder:text-muted focus:outline-none focus:border-magenta"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2"
              >
                <path
                  fillRule="evenodd"
                  d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
              <button
                type="button"
                onClick={selectAll}
                className="px-2.5 py-1.5 rounded-lg border border-border hover:bg-surface-raised text-xs font-medium text-secondary"
              >
                {selectedIds.size === processedItems.length
                  ? "Deselect All"
                  : "Select All"}
              </button>

              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                aria-label="Sort order"
                className="px-2.5 py-1.5 rounded-lg border border-border bg-surface-raised text-xs text-secondary font-medium focus:outline-none cursor-pointer"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="operation">By Operation</option>
              </select>

              <div className="flex items-center p-0.5 rounded-lg bg-surface-raised border border-border">
                <Tooltip content="Grid View">
                  <button
                    type="button"
                    onClick={() => setLayoutMode("grid")}
                    className={`p-1.5 rounded-md transition-colors ${
                      layoutMode === "grid"
                        ? "bg-surface text-magenta shadow-xs"
                        : "text-muted hover:text-secondary"
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      className="w-3.5 h-3.5"
                    >
                      <path d="M2 3a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H3a1 1 0 01-1-1V3zm6 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H9a1 1 0 01-1-1V3zm-6 6a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H3a1 1 0 01-1-1V9zm6 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H9a1 1 0 01-1-1V9z" />
                    </svg>
                  </button>
                </Tooltip>
                <Tooltip content="Masonry View">
                  <button
                    type="button"
                    onClick={() => setLayoutMode("masonry")}
                    className={`p-1.5 rounded-md transition-colors ${
                      layoutMode === "masonry"
                        ? "bg-surface text-magenta shadow-xs"
                        : "text-muted hover:text-secondary"
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      className="w-3.5 h-3.5"
                    >
                      <path d="M2 3a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H3a1 1 0 01-1-1V3zm6 0a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H9a1 1 0 01-1-1V3zm0 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H9a1 1 0 01-1-1V8zm-6 4a1 1 0 011-1h4a1 1 0 011 1v1a1 1 0 01-1 1H3a1 1 0 01-1-1v-1z" />
                    </svg>
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Filter by operation type"
            className="flex flex-wrap gap-1.5 pt-2 border-t border-border/60"
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const count = counts[tab.id];
              if (tab.id !== "all" && count === 0) return null;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                    isActive
                      ? "bg-magenta text-white border-magenta shadow-xs"
                      : "bg-surface text-secondary border-border hover:border-magenta/30 hover:text-primary"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-border text-muted"}`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Skeleton */}
      {loading && (
        <div className="py-4">
          <HistorySkeleton count={items.length > 0 ? items.length : 6} />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-danger/40 bg-surface p-4"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5 text-danger shrink-0 mt-0.5"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-8.75a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zm.75-1.5a1 1 0 110-2 1 1 0 010 2z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <p className="text-sm font-bold text-danger">
              Failed to load history
            </p>
            <p className="text-xs text-secondary mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && items.length === 0 && (
        <div className="flex flex-col items-center gap-5 py-24 text-center animate-fade-up">
          <div className="w-20 h-20 rounded-2xl bg-surface-raised border border-border flex items-center justify-center text-muted shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="w-9 h-9"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v13.5a1.5 1.5 0 001.5 1.5z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-primary">
              No Images Processed Yet
            </h2>
            <p className="text-xs text-muted mt-1 max-w-sm">
              Process your first image on the homepage or batch processor to
              build your gallery.
            </p>
          </div>
          <Link to="/" className="btn-primary text-xs py-2 px-4 shadow-sm">
            Start Processing
          </Link>
        </div>
      )}

      {/* Grid */}
      {!loading && !error && processedItems.length > 0 && (
        <ul
          className={`grid gap-4 ${
            layoutMode === "masonry"
              ? "columns-2 sm:columns-3 lg:columns-4 space-y-4"
              : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
          }`}
          aria-label="Gallery items"
        >
          {processedItems.map((item, idx) => {
            const isSelected = selectedIds.has(item.upload_id);
            return (
              <li
                key={`${item.operation_type}-${item.upload_id}`}
                className={`relative group rounded-xl transition-all duration-200 animate-fade-up ${
                  isSelected ? "ring-2 ring-magenta scale-[1.02]" : ""
                }`}
                style={{ animationDelay: `${idx * 25}ms` }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(item.upload_id);
                  }}
                  className={`absolute top-2 left-2 z-20 w-6 h-6 rounded-md border flex items-center justify-center transition-all ${
                    isSelected
                      ? "bg-magenta text-white border-magenta shadow-md"
                      : "bg-black/60 border-white/40 text-transparent hover:border-white opacity-0 group-hover:opacity-100"
                  }`}
                  title={isSelected ? "Deselect" : "Select"}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-3.5 h-3.5"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                <HistoryCard item={item} onDelete={deleteItem} />
              </li>
            );
          })}
        </ul>
      )}

      {/* Zip Export Modal */}
      {isExportModalOpen && (
        <ZipExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          fileCount={selectedItemsList.length}
          isZipping={isZipping}
          zipError={zipError}
          onDownload={handleDownloadZip}
        />
      )}
    </main>
  );
}
