import localforage from 'localforage';
import type { Board } from '../models/Board';
import { loadBoard, saveBoard } from './storage';

const BACKUP_LOG_KEY = 'kanban-backup-log';
const BACKUP_FORMAT = 'kanban-backup';
const BACKUP_VERSION = 1;

const logStore = localforage.createInstance({
  name: 'kanban',
  storeName: 'kanban_backups'
});

export interface BackupLogEntry {
  id: string;
  fileName: string;
  createdAt: string; // ISO date string
  cardCount: number;
  sizeBytes: number;
  target: 'share' | 'download';
}

interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  board: Board;
}

function countCards(board: Board): number {
  const columns = [
    ...board.monthlyColumns,
    ...board.projects.flatMap(p => p.columns),
  ];
  return columns.reduce((total, col) => total + col.cards.length, 0);
}

function buildFileName(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `kanban-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}.json`;
}

export async function getBackupLog(): Promise<BackupLogEntry[]> {
  const entries = await logStore.getItem<BackupLogEntry[]>(BACKUP_LOG_KEY);
  if (!entries) return [];
  return [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function addLogEntry(entry: BackupLogEntry): Promise<BackupLogEntry[]> {
  const entries = await getBackupLog();
  const next = [entry, ...entries].slice(0, 50);
  await logStore.setItem(BACKUP_LOG_KEY, next);
  return next;
}

export async function clearBackupLog(): Promise<void> {
  await logStore.setItem(BACKUP_LOG_KEY, []);
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Exports the board as a JSON file. On mobile this opens the native share sheet
 * (WhatsApp, Drive, Files...); elsewhere it falls back to a download.
 */
export async function exportBackup(): Promise<BackupLogEntry> {
  const board = await loadBoard();
  const now = new Date();
  const payload: BackupFile = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    board,
  };

  const fileName = buildFileName(now);
  const file = new File([JSON.stringify(payload)], fileName, { type: 'application/json' });

  let target: BackupLogEntry['target'] = 'download';
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName });
      target = 'share';
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') throw error;
      downloadFile(file);
    }
  } else {
    downloadFile(file);
  }

  const entry: BackupLogEntry = {
    id: `${now.getTime()}`,
    fileName,
    createdAt: now.toISOString(),
    cardCount: countCards(board),
    sizeBytes: file.size,
    target,
  };
  await addLogEntry(entry);

  return entry;
}

function isBoard(value: unknown): value is Board {
  const board = value as Board | undefined;
  return (
    !!board &&
    Array.isArray(board.monthlyColumns) &&
    Array.isArray(board.projects) &&
    typeof board.activeProjectId === 'string'
  );
}

export async function readBackupFile(file: File): Promise<{ board: Board; cardCount: number; exportedAt?: string }> {
  const text = await file.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }

  const candidate = parsed as Partial<BackupFile>;
  const board = candidate.format === BACKUP_FORMAT ? candidate.board : (parsed as Board);

  if (!isBoard(board)) {
    throw new Error('El archivo no parece un respaldo del kanban.');
  }

  return { board, cardCount: countCards(board), exportedAt: candidate.exportedAt };
}

export async function restoreBackup(board: Board): Promise<void> {
  await saveBoard(board);
}
