import localforage from 'localforage';
import type { Board } from '../models/Board';
import { loadBoard, saveBoard } from './storage';

const BACKUP_LOG_KEY = 'kanban-backup-log';
const BACKUP_FORMAT = 'kanban-backup';

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
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  destination: string; // App name or path
}

interface BackupFile {
  format: typeof BACKUP_FORMAT;
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
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `export_${year}-${month}-${day}_${hours}${minutes}${seconds}.csv`;
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
 * Converts board data to CSV format
 */
function boardToCSV(board: Board): string {
  const headers = ['ID', 'Title', 'Description', 'Column', 'Project', 'CreatedAt', 'UpdatedAt'];
  const rows: string[][] = [headers];

  // Add monthly columns cards
  board.monthlyColumns.forEach(col => {
    col.cards.forEach(card => {
      rows.push([
        card.id,
        `"${card.title.replace(/"/g, '""')}"`,
        `"${card.description?.replace(/"/g, '""') || ''}"`,
        col.title || '',
        'Monthly',
        card.created,
        card.updated
      ]);
    });
  });

  // Add project columns cards
  board.projects.forEach(project => {
    project.columns.forEach(col => {
      col.cards.forEach(card => {
        rows.push([
          card.id,
          `"${card.title.replace(/"/g, '""')}"`,
          `"${card.description?.replace(/"/g, '""') || ''}"`,
          col.title || '',
          project.name,
          card.created,
          card.updated
        ]);
      });
    });
  });

  return rows.map(row => row.join(',')).join('\n');
}

/**
 * Logs backup operation to console and optionally to file
 */
function logBackupOperation(date: string, time: string, fileName: string, destination: string): void {
  const logEntry = {
    date,
    time,
    fileName,
    destination
  };
  
  console.log('Backup operation:', logEntry);
  
  // Optionally store in a separate log file within the app
  // This could be extended to write to a local file in Cordova
}

/**
 * Requests Android storage permissions using cordova-plugin-android-permissions
 */
async function requestStoragePermissions(): Promise<boolean> {
  if (typeof window === 'undefined' || !(window as any).cordova) {
    return true; // Not in Cordova environment
  }

  const cordova = (window as any).cordova;
  if (!cordova.plugins || !cordova.plugins.permissions) {
    console.warn('cordova-plugin-android-permissions not available');
    return true;
  }

  const permissions = [
    cordova.plugins.permissions.READ_EXTERNAL_STORAGE,
    cordova.plugins.permissions.WRITE_EXTERNAL_STORAGE
  ];

  try {
    for (const permission of permissions) {
      const result = await new Promise<{ hasPermission: boolean }>((resolve, reject) => {
        cordova.plugins.permissions.checkPermission(
          permission,
          (status: { hasPermission: boolean }) => resolve(status),
          reject
        );
      });

      if (!result.hasPermission) {
        await new Promise<void>((resolve, reject) => {
          cordova.plugins.permissions.requestPermission(
            permission,
            (status: { hasPermission: boolean }) => {
              if (status.hasPermission) {
                resolve();
              } else {
                reject(new Error('Permission denied'));
              }
            },
            reject
          );
        });
      }
    }
    return true;
  } catch (error) {
    console.error('Permission request failed:', error);
    return false;
  }
}

/**
 * Creates file using cordova-plugin-file and opens Android Sharesheet
 */
function cordovaExportWithSharesheet(csvData: string, fileName: string): Promise<{ filePath: string; destination: string }> {
  const cordova = (window as any).cordova;
  const filePlugin = cordova.plugins.file;
  
  return new Promise((resolve, reject) => {
    // Request storage permissions first
    requestStoragePermissions()
      .then(hasPermissions => {
        if (!hasPermissions) {
          reject(new Error('Storage permissions denied'));
          return;
        }

        const onFileSystemSuccess = (fileSystem: any) => {
          const directoryEntry = fileSystem.root;
          
          directoryEntry.getFile(
            fileName,
            { create: true, exclusive: false },
            (fileEntry: any) => {
              fileEntry.createWriter((writer: any) => {
                writer.onwriteend = () => {
                  // File created successfully, now open with Android Sharesheet
                  const filePath = fileEntry.toURL();
                  
                  // Use cordova-plugin-intent (intentShim) to launch Android Sharesheet
                  if (cordova.plugins && cordova.plugins.intentShim) {
                    try {
                      const intentShim = cordova.plugins.intentShim;
                      
                      // Create ACTION_SEND intent for sharing with file
                      const intent = {
                        action: 'android.intent.action.SEND',
                        type: 'text/csv',
                        extras: {
                          'android.intent.extra.STREAM': filePath,
                          'android.intent.extra.SUBJECT': 'Backup Kanban Board',
                          'android.intent.extra.TEXT': `Backup del tablero Kanban: ${fileName}`
                        }
                      };
                      
                      // Create chooser for Sharesheet
                      const chooserIntent = intentShim.createChooser(intent, 'Compartir backup');
                      
                      // Launch Sharesheet
                      intentShim.startActivity(chooserIntent, 
                        () => {
                          resolve({ filePath, destination: 'Sharesheet launched' });
                        },
                        (error: any) => {
                          console.warn('Intent launch failed, falling back to file-opener2:', error);
                          // Fallback to file-opener2 if intent fails
                          if (cordova.plugins.fileOpener2) {
                            cordova.plugins.fileOpener2.open(
                              filePath,
                              'text/csv',
                              {
                                success: () => {
                                  resolve({ filePath, destination: 'File opened with file-opener2' });
                                },
                                error: (error: any) => {
                                  console.warn('File opener failed, file was created:', error);
                                  resolve({ filePath, destination: 'File created (no opener)' });
                                }
                              }
                            );
                          } else {
                            resolve({ filePath, destination: 'File created (no opener)' });
                          }
                        }
                      );
                    } catch (intentError) {
                      console.warn('Intent setup failed, falling back to file-opener2:', intentError);
                      // Fallback to file-opener2 if intent setup fails
                      if (cordova.plugins.fileOpener2) {
                        cordova.plugins.fileOpener2.open(
                          filePath,
                          'text/csv',
                          {
                            success: () => {
                              resolve({ filePath, destination: 'File opened with file-opener2' });
                            },
                            error: (error: any) => {
                              console.warn('File opener failed, file was created:', error);
                              resolve({ filePath, destination: 'File created (no opener)' });
                            }
                          }
                        );
                      } else {
                        resolve({ filePath, destination: 'File created (no opener)' });
                      }
                    }
                  } else {
                    // Fallback: file was created, but intentShim not available
                    console.warn('cordova-plugin-intent not available');
                    if (cordova.plugins.fileOpener2) {
                      cordova.plugins.fileOpener2.open(
                        filePath,
                        'text/csv',
                        {
                          success: () => {
                            resolve({ filePath, destination: 'File opened with file-opener2' });
                          },
                          error: (error: any) => {
                            console.warn('File opener failed, file was created:', error);
                            resolve({ filePath, destination: 'File created (no opener)' });
                          }
                        }
                      );
                    } else {
                      resolve({ filePath, destination: 'File created (no opener)' });
                    }
                  }
                };
                writer.onerror = reject;
                
                const blob = new Blob([csvData], { type: 'text/csv' });
                writer.write(blob);
              }, reject);
            },
            reject
          );
        };

        const onError = (error: any) => reject(error);

        filePlugin.requestFileSystem(
          filePlugin.PERSISTENT,
          0,
          onFileSystemSuccess,
          onError
        );
      })
      .catch(reject);
  });
}

/**
 * Exports the board as a CSV file. On Android with Cordova, uses native Sharesheet.
 * On web, falls back to download.
 */
export async function exportBackup(): Promise<BackupLogEntry> {
  const board = await loadBoard();
  const now = new Date();
  
  // Format date and time for logging
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  
  // Generate CSV data
  const csvData = boardToCSV(board);
  const fileName = buildFileName(now);
  
  let target: BackupLogEntry['target'] = 'download';
  let destination = 'download';
  let fileContent = csvData;
  let mimeType = 'text/csv';

  // Check if running in Cordova environment
  if (typeof window !== 'undefined' && (window as any).cordova) {
    try {
      const result = await cordovaExportWithSharesheet(csvData, fileName);
      target = 'share';
      destination = result.destination;
      
      // Log the operation
      logBackupOperation(dateStr, timeStr, fileName, destination);
      
      const entry: BackupLogEntry = {
        id: `${now.getTime()}`,
        fileName,
        createdAt: now.toISOString(),
        cardCount: countCards(board),
        sizeBytes: csvData.length,
        target,
        date: dateStr,
        time: timeStr,
        destination
      };
      await addLogEntry(entry);
      return entry;
    } catch (error) {
      console.error('Cordova export failed, falling back to download:', error);
      // Fall through to web download
    }
  }

  // Web environment or Cordova fallback
  const file = new File([fileContent], fileName, { type: mimeType });
  
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName });
      target = 'share';
      destination = 'Web Share API';
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') throw error;
      downloadFile(file);
      destination = 'download';
    }
  } else {
    downloadFile(file);
    destination = 'download';
  }

  // Log the operation
  logBackupOperation(dateStr, timeStr, fileName, destination);

  const entry: BackupLogEntry = {
    id: `${now.getTime()}`,
    fileName,
    createdAt: now.toISOString(),
    cardCount: countCards(board),
    sizeBytes: file.size,
    target,
    date: dateStr,
    time: timeStr,
    destination
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
