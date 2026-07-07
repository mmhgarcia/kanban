import type { Board } from '../models/Board';
import { getInitialColumns } from '../utils/dates';
import { getInitialStatusColumns } from '../utils/statusColumns';

const STORAGE_KEY = 'kanban-board-v4'; // Upgrading to v4 for displayId

export function loadBoard(): Board {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data) as Board;
    }

    // Migration from v3
    const oldData = localStorage.getItem('kanban-board-v3');
    if (oldData) {
      const v3 = JSON.parse(oldData);
      let nextId = 1;

      const assignIds = (columns: any[]) => {
        if (!columns) return;
        columns.forEach(col => {
          if (!col.cards) return;
          col.cards.forEach((card: any) => {
            if (!card.displayId) {
              card.displayId = nextId++;
            } else if (card.displayId >= nextId) {
              nextId = card.displayId + 1;
            }
          });
        });
      };

      assignIds(v3.monthlyColumns);
      v3.projects?.forEach((p: any) => assignIds(p.columns));

      return {
        ...v3,
        nextCardNumber: nextId
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
    activeProjectId: 'default',
    nextCardNumber: 1
  };
}

export function saveBoard(board: Board): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
  } catch (error) {
    console.error('Error saving kanban board to local storage', error);
  }
}
