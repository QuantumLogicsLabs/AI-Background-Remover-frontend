import { createContext, useContext } from 'react';

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

export const DEFAULT_PROJECT: WorkspaceProject = {
  id: 'default',
  name: 'Main Workspace',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  items: [],
};

export const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function useWorkspace(): WorkspaceContextType {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}

