import { useState, FormEvent } from 'react';
import { useWorkspace, WorkspaceProject } from '../contexts/WorkspaceContext';
import { useThemeSettings } from '../contexts/ThemeSettingsContext';

export default function WorkspaceSidebar() {
  const {
    projects,
    activeProjectId,
    activeProject,
    createProject,
    renameProject,
    deleteProject,
    setActiveProjectId,
    removeItemFromProject,
    clearActiveProject,
  } = useWorkspace();

  const { sidebarOpen, setSidebarOpen, accent, setAccent } = useThemeSettings();
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  if (!sidebarOpen) return null;

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      createProject(newProjectName.trim());
      setNewProjectName('');
      setIsCreating(false);
    }
  };

  const handleRename = (id: string) => {
    if (editName.trim()) {
      renameProject(id, editName.trim());
    }
    setEditingId(null);
  };

  return (
    <aside
      aria-label="Workspace Sidebar"
      className="hidden lg:flex flex-col w-64 shrink-0 border-r border-border bg-surface-raised/90 backdrop-blur-md h-[calc(100vh-64px)] sticky top-16 overflow-y-auto transition-all z-30"
    >
      {/* Workspace Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
            Workspace Hub
          </span>
          <h2 className="text-sm font-bold text-primary truncate">
            {activeProject.name}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="p-1 rounded-lg border border-border hover:border-border-strong text-muted hover:text-primary transition-colors text-xs"
          title="Collapse Sidebar (Ctrl+B)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Projects List */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
            Projects ({projects.length})
          </span>
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="text-[11px] font-semibold text-magenta hover:underline flex items-center gap-1"
          >
            + New
          </button>
        </div>

        {isCreating && (
          <form onSubmit={handleCreate} className="flex items-center gap-1.5 p-1">
            <input
              type="text"
              autoFocus
              placeholder="Project name…"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="w-full px-2.5 py-1 text-xs rounded border border-magenta bg-surface text-primary focus:outline-none"
            />
            <button
              type="submit"
              className="px-2 py-1 text-xs font-semibold bg-magenta text-white rounded"
            >
              Add
            </button>
          </form>
        )}

        <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
          {projects.map((proj: WorkspaceProject) => {
            const isActive = proj.id === activeProjectId;
            return (
              <div
                key={proj.id}
                className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                  isActive
                    ? 'bg-magenta/15 text-magenta font-semibold'
                    : 'text-secondary hover:text-primary hover:bg-surface'
                }`}
                onClick={() => setActiveProjectId(proj.id)}
              >
                {editingId === proj.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => handleRename(proj.id)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRename(proj.id)}
                    autoFocus
                    className="w-full bg-surface border border-magenta rounded px-1.5 py-0.5 text-xs text-primary"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="truncate max-w-[130px]">{proj.name}</span>
                )}

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-mono text-muted">{proj.items.length}</span>
                  {projects.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteProject(proj.id);
                      }}
                      className="text-muted hover:text-danger p-0.5"
                      title="Delete project"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                        <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 000 1.5h.3l.815 8.15A1.5 1.5 0 005.357 15h5.285a1.5 1.5 0 001.493-1.35l.815-8.15h.3a.75.75 0 000-1.5H11v-.75A2.25 2.25 0 008.75 1h-1.5A2.25 2.25 0 005 3.25zm2.25-.75a.75.75 0 00-.75.75V4h3v-.75a.75.75 0 00-.75-.75h-1.5z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Project Items / Queue */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
            Project Queue ({activeProject.items.length})
          </span>
          {activeProject.items.length > 0 && (
            <button
              type="button"
              onClick={clearActiveProject}
              className="text-[10px] text-muted hover:text-danger"
            >
              Clear
            </button>
          )}
        </div>

        {activeProject.items.length === 0 ? (
          <div className="p-4 text-center border border-dashed border-border rounded-xl">
            <p className="text-xs text-muted">No images in this project yet.</p>
            <p className="text-[11px] text-secondary mt-1">Processed images will appear here automatically.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {activeProject.items.map((item) => (
              <div
                key={item.id}
                className="group relative flex items-center gap-2.5 p-2 rounded-lg bg-surface border border-border hover:border-border-strong transition-all shadow-sm"
              >
                <div className="w-9 h-9 rounded bg-checker overflow-hidden shrink-0 border border-border/40">
                  {item.outputUrl ? (
                    <img src={item.outputUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-surface-raised flex items-center justify-center text-xs text-muted">
                      IMG
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-primary truncate">{item.name}</p>
                  <p className="text-[10px] text-muted capitalize">{item.operationType.replace('_', ' ')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeItemFromProject(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger p-1 transition-opacity"
                  title="Remove from project"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M5.28 4.22a.75.75 0 00-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 101.06 1.06L8 9.06l2.72 2.72a.75.75 0 101.06-1.06L9.06 8l2.72-2.72a.75.75 0 00-1.06-1.06L8 6.94 5.28 4.22z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Accent Selector */}
      <div className="p-3 border-t border-border bg-surface">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold text-muted uppercase">Accent Theme</span>
          <span className="text-[10px] font-mono text-primary capitalize">{accent}</span>
        </div>
        <div className="flex items-center justify-between gap-1">
          {(['gold', 'cyber', 'emerald', 'sapphire', 'sunset', 'rose', 'arctic', 'crimson', 'violet'] as const).map((th) => (
            <button
              key={th}
              type="button"
              onClick={() => setAccent(th)}
              className={`w-5 h-5 rounded-full border transition-transform ${
                accent === th ? 'scale-125 ring-2 ring-magenta/50 border-white' : 'border-border hover:scale-110'
              }`}
              style={{
                backgroundColor:
                  th === 'gold'     ? '#F59E0B'
                  : th === 'cyber'  ? '#EC4899'
                  : th === 'emerald'? '#10B981'
                  : th === 'sapphire'?'#3B82F6'
                  : th === 'rose'   ? '#FB7185'
                  : th === 'arctic' ? '#22D3EE'
                  : th === 'crimson'? '#EF4444'
                  : th === 'violet' ? '#A855F7'
                  : '#F97316',
              }}
              title={th}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
