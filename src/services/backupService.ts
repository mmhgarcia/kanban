import { loadBoard, addBackupLog, type BackupLog } from './storage';

export async function createBackupData(): Promise<string> {
  const board = await loadBoard();
  return JSON.stringify(board, null, 2);
}

export async function performBackup(
  destination: 'drive' | 'whatsapp' | 'local' | 'other',
  backupName: string
): Promise<void> {
  const now = new Date();
  const timestamp = now.toISOString();
  const date = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  const destinationNames = {
    drive: 'Google Drive',
    whatsapp: 'WhatsApp',
    local: 'Local/Archivo',
    other: 'Compartir'
  };

  let success = false;
  let error: string | undefined;

  try {
    const backupData = await createBackupData();
    const fileName = `${backupName}.json`;

    switch (destination) {
      case 'local':
        await backupToLocal(backupData, fileName);
        success = true;
        break;
      case 'whatsapp':
      case 'drive':
      case 'other':
        // All use native Web Share API
        await nativeShare(backupData, fileName, destinationNames[destination]);
        success = true;
        break;
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Error desconocido';
    console.error('Backup failed:', err);
  }

  const log: BackupLog = {
    id: `backup_${Date.now()}`,
    timestamp,
    date,
    time,
    destination,
    destinationName: destinationNames[destination],
    backupName,
    success,
    error
  };

  await addBackupLog(log);

  if (!success) {
    throw new Error(error || 'Backup falló');
  }
}

function isCordovaAvailable(): boolean {
  return typeof window !== 'undefined' && !!(window as any).cordova;
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

async function backupToLocal(data: string, fileName: string): Promise<void> {
  if (isCordovaAvailable()) {
    const hasPermissions = await requestAndroidStoragePermissions();
    if (!hasPermissions) {
      throw new Error('Permisos de almacenamiento denegados');
    }

    const cordova = (window as any).cordova;
    const baseDir = getCordovaSaveDirectory();
    const targetDirectory = cordova.file.externalRootDirectory ? `${baseDir}Download/` : baseDir;
    await createCordovaFile(targetDirectory, fileName, data);
    return;
  }

  webDownload(data, fileName);
}

async function nativeShare(data: string, fileName: string, destinationName: string): Promise<void> {
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
          intentShim.startActivity(chooser, resolve, reject);
        } catch (error) {
          reject(error);
        }
      });
    }

    if (cordova.plugins && cordova.plugins.socialsharing) {
      return cordovaShareFallback(data, fileName, destinationName);
    }

    throw new Error('Plugin de sharing Cordova no disponible');
  }

  await webShare(data, fileName, destinationName);
}

async function cordovaShareFallback(data: string, fileName: string, destinationName: string): Promise<void> {
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
        () => resolve(),
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

async function webShare(data: string, fileName: string, destinationName: string): Promise<void> {
  if (navigator.share) {
    const blob = new Blob([data], { type: 'application/json' });
    const file = new File([blob], fileName, { type: 'application/json' });
    
    try {
      await navigator.share({
        files: [file],
        title: 'Backup Kanban Board',
        text: `Backup del tablero Kanban para ${destinationName}: ${fileName}`
      });
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        webDownload(data, fileName);
      }
    }
  } else {
    webDownload(data, fileName);
  }
}
