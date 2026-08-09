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
    other: 'Otro'
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
        await backupToWhatsApp(backupData, fileName);
        success = true;
        break;
      case 'drive':
        await backupToDrive(backupData, fileName);
        success = true;
        break;
      case 'other':
        await backupToOther(backupData, fileName);
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
  // For web/Cordova environment, we'll use the File API or Cordova File plugin
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

async function backupToWhatsApp(data: string, fileName: string): Promise<void> {
  // For mobile, use WhatsApp sharing
  if (typeof window !== 'undefined' && (window as any).cordova) {
    const cordova = (window as any).cordova;
    if (cordova && cordova.plugins && cordova.plugins.socialsharing) {
      await cordovaWhatsAppShare(data, fileName);
    } else {
      throw new Error('Plugin de sharing social no disponible');
    }
  } else {
    // Web environment - use web share API if available
    await webShare(data, fileName);
  }
}

async function backupToDrive(data: string, fileName: string): Promise<void> {
  // Google Drive integration would require OAuth and Drive API
  // For now, we'll use the web share API or local storage
  if (typeof window !== 'undefined' && (window as any).cordova) {
    // Cordova environment - would need Google Drive plugin
    throw new Error('Integración con Google Drive requiere configuración adicional');
  } else {
    // Web environment - use web share API
    await webShare(data, fileName);
  }
}

async function backupToOther(data: string, fileName: string): Promise<void> {
  // Use generic share functionality
  if (typeof window !== 'undefined' && (window as any).cordova) {
    const cordova = (window as any).cordova;
    if (cordova && cordova.plugins && cordova.plugins.socialsharing) {
      await cordovaGenericShare(data, fileName);
    } else {
      throw new Error('Plugin de sharing social no disponible');
    }
  } else {
    await webShare(data, fileName);
  }
}

// Helper functions for different environments

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

async function webShare(data: string, fileName: string): Promise<void> {
  if (navigator.share) {
    const blob = new Blob([data], { type: 'application/json' });
    const file = new File([blob], fileName, { type: 'application/json' });
    
    try {
      await navigator.share({
        files: [file],
        title: 'Backup Kanban Board',
        text: `Backup del tablero Kanban: ${fileName}`
      });
    } catch (err) {
      // Fallback to download if share fails or is cancelled
      if ((err as Error).name !== 'AbortError') {
        webDownload(data, fileName);
      }
    }
  } else {
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

    // Request persistent storage for Android
    filePlugin.requestFileSystem(
      filePlugin.PERSISTENT,
      0,
      onFileSystemSuccess,
      onError
    );
  });
}

async function cordovaWhatsAppShare(data: string, fileName: string): Promise<void> {
  const cordova = (window as any).cordova;
  const socialSharing = cordova.plugins.socialsharing;
  
  return new Promise((resolve, reject) => {
    const blob = new Blob([data], { type: 'application/json' });
    const reader = new FileReader();
    
    reader.onload = () => {
      const base64Data = (reader.result as string).split(',')[1];
      
      socialSharing.shareWithOptions(
        {
          message: `Backup del tablero Kanban: ${fileName}`,
          files: [`data:application/json;base64,${base64Data}`],
          subject: 'Backup Kanban Board'
        },
        () => resolve(),
        (error: any) => reject(error)
      );
    };
    
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function cordovaGenericShare(data: string, fileName: string): Promise<void> {
  const cordova = (window as any).cordova;
  const socialSharing = cordova.plugins.socialsharing;
  
  return new Promise((resolve, reject) => {
    const blob = new Blob([data], { type: 'application/json' });
    const reader = new FileReader();
    
    reader.onload = () => {
      const base64Data = (reader.result as string).split(',')[1];
      
      socialSharing.shareWithOptions(
        {
          message: `Backup del tablero Kanban: ${fileName}`,
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