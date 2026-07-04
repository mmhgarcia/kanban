import type { Board } from '../models/Board';
import { getInitialColumns } from '../utils/dates';

const STORAGE_KEY = 'kanban-board';

export function loadBoard(): Board {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data) as Board;
    }
  } catch (error) {
    console.error('Error loading kanban board from local storage', error);
  }
  
  // If no board exists, create default columns
  return { columns: getInitialColumns() };
}

export function saveBoard(board: Board): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
  } catch (error) {
    console.error('Error saving kanban board to local storage', error);
  }
}
