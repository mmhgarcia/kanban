import { loadBoard } from './storage';
import { addLogEntry, type BackupLogEntry } from './backup';
import { Filesystem } from '@capacitor/filesystem';
import type { Board } from '../models/Board';

export async function createBackupData(): Promise<string> {
  const board = await loadBoard();
  return JSON.stringify(board, null, 2);
}

export async function performBackup(
  destination: 'drive' | 'whatsapp' | 'local' | 'other',
  backupName: string,
  customPath?: string
): Promise<{ fileName: string; filePath: string }> {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const destinationNames = {
    drive: 'Google Drive',
    whatsapp: 'WhatsApp',
    local: 'Local/Archivo',
    other: 'Compartir'
  };

  let filePath = '';
  let success = false;
  let error: string | undefined;
  let board: Board | undefined;

  try {
    const backupData = await createBackupData();
    board = JSON.parse(backupData) as Board;
    const fileName = `${backupName}.json`;

    switch (destination) {
      case 'local':
        filePath = await backupToLocal(backupData, fileName, customPath);
        success = true;
        break;
      case 'whatsapp':
      case 'drive':
      case 'other':
        // All use native Web Share API
        filePath = await nativeShare(backupData, fileName, destinationNames[destination]);
        success = true;
        break;
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Error desconocido';
    console.error('Backup failed:', err);
  }

  // Crear entrada de log con la información necesaria para restore
  const logEntry: BackupLogEntry = {
    id: `${now.getTime()}`,
    fileName: `${backupName}.json`,
    createdAt: now.toISOString(),
    cardCount: board ? countCards(board) : 0,
    sizeBytes: 0, // Se calcularía si necesitamos el tamaño exacto
    target: destination === 'local' ? 'download' : 'share',
    date: dateStr,
    time: timeStr,
    destination: filePath || destinationNames[destination],
    board // Guardamos el board para permitir restore local
  };

  await addLogEntry(logEntry);

  if (!success) {
    throw new Error(error || 'Backup falló');
  }

  return { fileName: `${backupName}.json`, filePath };
}

function countCards(board: Board): number {
  const columns = [
    ...board.monthlyColumns,
    ...board.projects.flatMap(p => p.columns),
  ];
  return columns.reduce((total, col) => total + col.cards.length, 0);
}

function isCordovaAvailable(): boolean {
  return typeof window !== 'undefined' && !!(window as any).cordova;
}

function isCapacitorAvailable(): boolean {
  return typeof window !== 'undefined' && !!(window as any).Capacitor;
}

async function requestAndroidStoragePermissions(): Promise<boolean> {
  if (!isCordovaAvailable()) return true;

  const cordova = (window as any).cordova;
  const permissions = cordova.plugins?.permissions;

  if (!permissions) {
    console.warn('cordova-plugin-android-permissions not available');
    return true;
  }

  const requiredPermissions = [
    permissions.READ_EXTERNAL_STORAGE,
    permissions.WRITE_EXTERNAL_STORAGE
  ];

  try {
    for (const permission of requiredPermissions) {
      const status = await new Promise<{ hasPermission: boolean }>((resolve, reject) => {
        permissions.checkPermission(permission, resolve, reject);
      });

      if (!status.hasPermission) {
        await new Promise<void>((resolve, reject) => {
          permissions.requestPermission(
            permission,
            (result: { hasPermission: boolean }) => {
              if (result.hasPermission) resolve();
              else reject(new Error('Permission denied'));
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

function getCordovaSaveDirectory(): string {
  const cordova = (window as any).cordova;
  const file = cordova.file;

  if (!file) {
    throw new Error('cordova-plugin-file no disponible');
  }

  if (file.externalRootDirectory) {
    return file.externalRootDirectory;
  }

  if (file.externalDataDirectory) {
    return file.externalDataDirectory;
  }

  return file.dataDirectory;
}

function resolveLocalFileSystemURL(path: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const resolver = (window as any).resolveLocalFileSystemURL || (window as any).webkitResolveLocalFileSystemURL;
    if (!resolver) {
      reject(new Error('Cordova file system API no disponible'));
      return;
    }

    resolver(path, resolve, reject);
  });
}

async function createCordovaFile(directoryPath: string, fileName: string, data: string): Promise<string> {
  const targetFolder = directoryPath.endsWith('/') ? directoryPath : `${directoryPath}/`;
  const directoryEntry = await resolveLocalFileSystemURL(targetFolder);

  return new Promise((resolve, reject) => {
    directoryEntry.getFile(
      fileName,
      { create: true, exclusive: false },
      (fileEntry: any) => {
        fileEntry.createWriter((writer: any) => {
          writer.onwriteend = () => {
            const url = fileEntry.toURL ? fileEntry.toURL() : fileEntry.nativeURL;
            resolve(url);
          };
          writer.onerror = reject;
          const blob = new Blob([data], { type: 'application/json' });
          writer.write(blob);
        }, reject);
      },
      reject
    );
  });
}

async function backupToLocal(data: string, fileName: string, customPath?: string): Promise<string> {
  if (isCapacitorAvailable()) {
    try {
      // Si se proporcionó un path personalizado del File Picker, usarlo
      if (customPath) {
        await Filesystem.writeFile({
          path: `${customPath}/${fileName}`,
          data: data,
          directory: 'EXTERNAL',
          encoding: 'utf8'
        });
        const location = `${customPath}/${fileName}`;
        alert(`Backup guardado en ${location}`);
        return location;
      } else {
        // Intentar usar Capacitor Filesystem API con directorio por defecto
        await Filesystem.writeFile({
          path: fileName,
          data: data,
          directory: 'Documents',
          encoding: 'utf8'
        });
        const location = `Documents/${fileName}`;
        alert(`Backup guardado en ${location}`);
        return location;
      }
    } catch (error) {
      console.warn('Capacitor Filesystem error, falling back to web download:', error);
      // Si falla, usar web download como fallback
      webDownload(data, fileName);
      return 'Descargado localmente';
    }
  }

  if (isCordovaAvailable()) {
    const hasPermissions = await requestAndroidStoragePermissions();
    if (!hasPermissions) {
      throw new Error('Permisos de almacenamiento denegados');
    }

    const cordova = (window as any).cordova;
    const baseDir = getCordovaSaveDirectory();
    const targetDirectory = cordova.file.externalRootDirectory ? `${baseDir}Download/` : baseDir;
    const filePath = await createCordovaFile(targetDirectory, fileName, data);
    return filePath;
  }

  webDownload(data, fileName);
  return 'Descargado localmente';
}

async function nativeShare(data: string, fileName: string, destinationName: string): Promise<string> {
  if (isCapacitorAvailable()) {
    try {
      // Guardar el archivo temporalmente usando Capacitor Filesystem
      await Filesystem.writeFile({
        path: fileName,
        data: data,
        directory: 'Cache',
        encoding: 'utf8'
      });

      // Obtener la URI del archivo
      const fileUri = await Filesystem.getUri({
        path: fileName,
        directory: 'Cache'
      });

      // Usar el File Picker nativo del sistema para compartir
      if ((navigator as any).share) {
        const blob = new Blob([data], { type: 'application/json' });
        const file = new File([blob], fileName, { type: 'application/json' });
        
        try {
          await (navigator as any).share({
            files: [file],
            title: 'Backup Kanban Board',
            text: `Backup del tablero Kanban para ${destinationName}: ${fileName}`
          });
          return `Compartido vía ${destinationName}`;
        } catch (err) {
          if ((err as Error).name !== 'AbortError') {
            // Si el share nativo falla, usar fallback
            console.warn('Navigator.share failed, using fallback:', err);
          } else {
            return `Compartido vía ${destinationName} (cancelado por usuario)`;
          }
        }
      }

      // Fallback: descargar el archivo
      webDownload(data, fileName);
      return 'Descargado localmente (fallback)';
    } catch (error) {
      console.warn('Capacitor sharing error, falling back to web share:', error);
      const result = await webShare(data, fileName, destinationName);
      return result;
    }
  }

  if (isCordovaAvailable()) {
    const hasPermissions = await requestAndroidStoragePermissions();
    if (!hasPermissions) {
      throw new Error('Permisos de almacenamiento denegados');
    }

    const cordova = (window as any).cordova;
    const baseDir = getCordovaSaveDirectory();
    const targetDirectory = cordova.file.externalRootDirectory ? `${baseDir}Download/` : baseDir;
    const filePath = await createCordovaFile(targetDirectory, fileName, data);

    if (cordova.plugins && cordova.plugins.intentShim) {
      return new Promise((resolve, reject) => {
        try {
          const intentShim = cordova.plugins.intentShim;
          const intent = {
            action: 'android.intent.action.SEND',
            type: 'application/json',
            extras: {
              'android.intent.extra.STREAM': filePath,
              'android.intent.extra.SUBJECT': 'Backup Kanban Board',
              'android.intent.extra.TEXT': `Backup del tablero Kanban: ${fileName}`
            },
            flags: ['FLAG_GRANT_READ_URI_PERMISSION']
          };

          const chooser = intentShim.createChooser(intent, 'Compartir backup');
          intentShim.startActivity(chooser, () => resolve(filePath), reject);
        } catch (error) {
          reject(error);
        }
      });
    }

    if (cordova.plugins && cordova.plugins.socialsharing) {
      const result = await cordovaShareFallback(data, fileName, destinationName);
      return result;
    }

    throw new Error('Plugin de sharing Cordova no disponible');
  }

  const result = await webShare(data, fileName, destinationName);
  return result;
}

async function cordovaShareFallback(data: string, fileName: string, destinationName: string): Promise<string> {
  const cordova = (window as any).cordova;
  if (!cordova.plugins?.socialsharing) {
    throw new Error('Plugin socialsharing no disponible');
  }

  return new Promise((resolve, reject) => {
    const blob = new Blob([data], { type: 'application/json' });
    const reader = new FileReader();

    reader.onload = () => {
      const base64Data = (reader.result as string).split(',')[1];
      cordova.plugins.socialsharing.shareWithOptions(
        {
          message: `Backup del tablero Kanban para ${destinationName}: ${fileName}`,
          files: [`data:application/json;base64,${base64Data}`],
          subject: 'Backup Kanban Board',
          chooserTitle: 'Compartir Backup'
        },
        () => resolve(`Compartido vía ${destinationName}`),
        (error: any) => reject(error)
      );
    };

    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function webDownload(data: string, fileName: string): void {
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function webShare(data: string, fileName: string, destinationName: string): Promise<string> {
  if (navigator.share) {
    const blob = new Blob([data], { type: 'application/json' });
    const file = new File([blob], fileName, { type: 'application/json' });
    
    try {
      await navigator.share({
        files: [file],
        title: 'Backup Kanban Board',
        text: `Backup del tablero Kanban para ${destinationName}: ${fileName}`
      });
      return `Compartido vía ${destinationName}`;
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        webDownload(data, fileName);
        return 'Descargado localmente (fallback del share)';
      }
      return `Compartido vía ${destinationName} (cancelado por usuario)`;
    }
  } else {
    webDownload(data, fileName);
    return 'Descargado localmente';
  }
}
