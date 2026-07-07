import type { Column } from './Column';

export type BoardMode = 'monthly' | 'status';

export interface Project {
  id: string;
  name: string;
  columns: Column[];
}

export interface Board {
  mode: BoardMode;
  monthlyColumns: Column[];
  projects: Project[];
  activeProjectId: string;
  nextCardNumber: number; // Counter for displayId
}
