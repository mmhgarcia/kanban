import type { Board } from '../models/Board';
import { getInitialColumns } from '../utils/dates';
import { getInitialStatusColumns } from '../utils/statusColumns';

const STORAGE_KEY = 'kanban-board-v3';

export function loadBoard(): Board {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data) as Board;
    }

    // Migration from v2
    const oldData = localStorage.getItem('kanban-board-v2');
    if (oldData) {
      const v2 = JSON.parse(oldData);
      const monthly = v2.mode === 'monthly' ? v2.columns : v2.backupColumns;
      const status = v2.mode === 'status' ? v2.columns : v2.backupColumns;

      return {
        mode: v2.mode || 'monthly',
        monthlyColumns: monthly || getInitialColumns(),
        projects: [
          { id: 'default', name: 'Principal', columns: status || getInitialStatusColumns() }
        ],
        activeProjectId: 'default'
      };
    }
  } catch (error) {
    console.error('Error loading kanban board from local storage', error);
  }
  
  // Default new board
  return {
    mode: 'monthly',
    monthlyColumns: getInitialColumns(),
    projects: [
      { id: 'default', name: 'Principal', columns: getInitialStatusColumns() }
    ],
    activeProjectId: 'default'
  };
}

export function saveBoard(board: Board): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
  } catch (error) {
    console.error('Error saving kanban board to local storage', error);
  }
}
