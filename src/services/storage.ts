import localforage from 'localforage';
import type { Board } from '../models/Board';
import { getInitialColumns } from '../utils/dates';
import { getInitialStatusColumns } from '../utils/statusColumns';

const STORAGE_KEY = 'kanban-board-v4'; // Upgrading to v4 for displayId
const BACKUP_LOG_KEY = 'kanban-backup-logs';

const store = localforage.createInstance({
  name: 'kanban',
  storeName: 'kanban_board'
});

const backupLogStore = localforage.createInstance({
  name: 'kanban',
  storeName: 'backup_logs'
});

export interface BackupLog {
  id: string;
  timestamp: string; // ISO string
  date: string; // Formatted date DD/MM/YYYY
  time: string; // Formatted time HH:MM:SS
  destination: 'drive' | 'whatsapp' | 'local' | 'other';
  destinationName: string; // User-friendly name
  backupName: string; // Name assigned to backup
  success: boolean;
  error?: string;
}

function getDefaultBoard(): Board {
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

function migrateV3Data(v3: any): Board {
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

export async function loadBoard(): Promise<Board> {
  try {
    const storedBoard = await store.getItem<Board>(STORAGE_KEY);
    if (storedBoard) {
      return storedBoard;
    }

    const oldData = localStorage.getItem('kanban-board-v3');
    if (oldData) {
      const v3 = JSON.parse(oldData);
      const migrated = migrateV3Data(v3);
      await store.setItem(STORAGE_KEY, migrated);
      return migrated;
    }
  } catch (error) {
    console.error('Error loading kanban board from storage', error);
  }

  return getDefaultBoard();
}

export async function saveBoard(board: Board): Promise<void> {
  try {
    await store.setItem(STORAGE_KEY, board);
  } catch (error) {
    console.error('Error saving kanban board to storage', error);
  }
}

export async function addBackupLog(log: BackupLog): Promise<void> {
  try {
    const logs = await backupLogStore.getItem<BackupLog[]>(BACKUP_LOG_KEY) || [];
    logs.unshift(log); // Add to beginning
    await backupLogStore.setItem(BACKUP_LOG_KEY, logs);
  } catch (error) {
    console.error('Error saving backup log', error);
  }
}

export async function getBackupLogs(): Promise<BackupLog[]> {
  try {
    return await backupLogStore.getItem<BackupLog[]>(BACKUP_LOG_KEY) || [];
  } catch (error) {
    console.error('Error loading backup logs', error);
    return [];
  }
}

export async function clearBackupLogs(): Promise<void> {
  try {
    await backupLogStore.removeItem(BACKUP_LOG_KEY);
  } catch (error) {
    console.error('Error clearing backup logs', error);
  }
}
