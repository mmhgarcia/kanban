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

async function backupToLocal(data: string, fileName: string): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).cordova) {
    // Cordova environment
    const cordova = (window as any).cordova;
    if (cordova && cordova.plugins && cordova.plugins.file) {
      await cordovaBackup(data, fileName);
    } else {
      throw new Error('Plugin de archivos Cordova no disponible');
    }
  } else {
    // Web environment - use download
    webDownload(data, fileName);
  }
}

async function nativeShare(data: string, fileName: string, destinationName: string): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).cordova) {
    // Cordova environment - use social sharing plugin
    const cordova = (window as any).cordova;
    if (cordova && cordova.plugins && cordova.plugins.socialsharing) {
      await cordovaShare(data, fileName, destinationName);
    } else {
      throw new Error('Plugin de sharing social no disponible');
    }
  } else {
    // Web environment - use Web Share API
    await webShare(data, fileName, destinationName);
  }
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
      // Fallback to download if share fails or is cancelled
      if ((err as Error).name !== 'AbortError') {
        webDownload(data, fileName);
      }
    }
  } else {
    // Fallback to download if Web Share API not available
    webDownload(data, fileName);
  }
}

async function cordovaBackup(data: string, fileName: string): Promise<void> {
  const cordova = (window as any).cordova;
  const filePlugin = cordova.plugins.file;
  
  return new Promise((resolve, reject) => {
    const onFileSystemSuccess = (fileSystem: any) => {
      const directoryEntry = fileSystem.root;
      
      directoryEntry.getFile(
        fileName,
        { create: true, exclusive: false },
        (fileEntry: any) => {
          fileEntry.createWriter((writer: any) => {
            writer.onwriteend = () => resolve();
            writer.onerror = reject;
            
            const blob = new Blob([data], { type: 'application/json' });
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
  });
}

async function cordovaShare(data: string, fileName: string, destinationName: string): Promise<void> {
  const cordova = (window as any).cordova;
  const socialSharing = cordova.plugins.socialsharing;
  
  return new Promise((resolve, reject) => {
    const blob = new Blob([data], { type: 'application/json' });
    const reader = new FileReader();
    
    reader.onload = () => {
      const base64Data = (reader.result as string).split(',')[1];
      
      socialSharing.shareWithOptions(
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