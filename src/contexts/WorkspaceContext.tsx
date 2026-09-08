import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface WorkspaceItem {
  id: string;
  name: string;
  originalUrl?: string;
  outputUrl?: string;
  outputFilename?: string;
  timestamp: number;
  operationType: string;
  size?: number;
}

export interface WorkspaceProject {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  items: WorkspaceItem[];
}

export interface WorkspaceContextType {
  projects: WorkspaceProject[];
  activeProjectId: string;
  activeProject: WorkspaceProject;
  createProject: (name: string) => WorkspaceProject;
  renameProject: (id: string, newName: string) => void;
  deleteProject: (id: string) => void;
  setActiveProjectId: (id: string) => void;
  addItemToProject: (item: Omit<WorkspaceItem, 'id' | 'timestamp'>) => void;
  removeItemFromProject: (itemId: string) => void;
  clearActiveProject: () => void;
  recentItems: WorkspaceItem[];
}

const STORAGE_KEY = 'ai_bg_workspace_projects';
const ACTIVE_PROJECT_KEY = 'ai_bg_active_project_id';

const DEFAULT_PROJECT: WorkspaceProject = {
  id: 'default',
  name: 'Main Workspace',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  items: [],
};

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<WorkspaceProject[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      } catch (_err) {
        // localStorage value is corrupt — fall back to default project
      }
    return [DEFAULT_PROJECT];
  });

  const [activeProjectId, setActiveProjectIdState] = useState<string>(() => {
    return localStorage.getItem(ACTIVE_PROJECT_KEY) || 'default';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_PROJECT_KEY, activeProjectId);
  }, [activeProjectId]);

  const activeProject =
    projects.find((p) => p.id === activeProjectId) || projects[0] || DEFAULT_PROJECT;

  const createProject = (name: string): WorkspaceProject => {
    const trimmed = name.trim() || `Workspace ${projects.length + 1}`;
    const newProj: WorkspaceProject = {
      id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: trimmed,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      items: [],
    };
    setProjects((prev) => [newProj, ...prev]);
    setActiveProjectIdState(newProj.id);
    return newProj;
  };

  const renameProject = (id: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: trimmed, updatedAt: Date.now() } : p))
    );
  };

  const deleteProject = (id: string) => {
    if (projects.length <= 1) return; // Keep at least one project
    setProjects((prev) => {
      const remaining = prev.filter((p) => p.id !== id);
      if (activeProjectId === id) {
        setActiveProjectIdState(remaining[0]?.id || 'default');
      }
      return remaining;
    });
  };

  const setActiveProjectId = (id: string) => {
    setActiveProjectIdState(id);
  };

  const addItemToProject = (item: Omit<WorkspaceItem, 'id' | 'timestamp'>) => {
    const newItem: WorkspaceItem = {
      ...item,
      id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    };

    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProjectId
          ? {
              ...p,
              updatedAt: Date.now(),
              items: [newItem, ...p.items.filter((i) => i.outputFilename !== item.outputFilename)],
            }
          : p
      )
    );
  };

  const removeItemFromProject = (itemId: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProjectId
          ? {
              ...p,
              updatedAt: Date.now(),
              items: p.items.filter((i) => i.id !== itemId),
            }
          : p
      )
    );
  };

  const clearActiveProject = () => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProjectId ? { ...p, updatedAt: Date.now(), items: [] } : p
      )
    );
  };

  const recentItems = activeProject.items.slice(0, 10);

  return (
    <WorkspaceContext.Provider
      value={{
        projects,
        activeProjectId,
        activeProject,
        createProject,
        renameProject,
        deleteProject,
        setActiveProjectId,
        addItemToProject,
        removeItemFromProject,
        clearActiveProject,
        recentItems,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextType {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
