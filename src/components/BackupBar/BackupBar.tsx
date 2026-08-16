import React, { useEffect, useRef, useState } from 'react';
import styles from './BackupBar.module.css';
import { ConfirmModal } from '../ConfirmModal/ConfirmModal';
import { exportBackup, getBackupLog, readBackupFile, restoreBackup } from '../../services/backup';
import type { BackupLogEntry } from '../../services/backup';
import type { Board } from '../../models/Board';
import { formatFriendlyDate } from '../../utils/dates';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const BackupBar: React.FC = () => {
  const [log, setLog] = useState<BackupLogEntry[]>([]);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [pendingRestore, setPendingRestore] = useState<{ board: Board; detail: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getBackupLog().then(setLog);
  }, []);

  const handleExport = async () => {
    try {
      const entry = await exportBackup();
      setLog(await getBackupLog());
      setStatus(`Respaldo creado: ${entry.fileName}`);
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') return;
      setStatus('No se pudo crear el respaldo.');
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const { board, cardCount, exportedAt } = await readBackupFile(file);
      const date = exportedAt ? formatFriendlyDate(exportedAt) : 'fecha desconocida';
      setPendingRestore({
        board,
        detail: `${file.name} · ${cardCount} tarjetas · ${date}`,
      });
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  const confirmRestore = async () => {
    if (!pendingRestore) return;
    await restoreBackup(pendingRestore.board);
    window.location.reload();
  };

  const handleRestoreFromLog = async (entryId: string) => {
    const entry = log.find(e => e.id === entryId);
    if (!entry) return;

    if (entry.board) {
      // Direct restore from log
      const date = formatFriendlyDate(entry.createdAt);
      setPendingRestore({
        board: entry.board,
        detail: `${entry.fileName} · ${entry.cardCount} tarjetas · ${date}`,
      });
    } else {
      // This backup doesn't have stored board data
      setStatus('Este respaldo solo se puede restaurar desde el archivo original');
    }
  };

  return (
    <>
      <div className={styles.bar}>
        <button onClick={handleExport} className={styles.actionBtn}>⬆️ Exportar</button>
        <button onClick={() => fileInputRef.current?.click()} className={styles.actionBtn}>⬇️ Importar</button>
        <button onClick={() => setIsLogOpen(o => !o)} className={styles.logBtn}>
          🕘 Respaldos ({log.length})
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className={styles.hiddenInput}
          onChange={handleFileSelected}
        />
      </div>

      {isLogOpen && (
        <div className={styles.logPanel}>
          {log.length === 0 ? (
            <p className={styles.empty}>Todavía no has hecho ningún respaldo.</p>
          ) : (
            <ul className={styles.logList}>
              {log.map(entry => (
                <li key={entry.id} className={styles.logItem}>
                  <div className={styles.logInfo}>
                    <span className={styles.logName}>{entry.fileName}</span>
                    <span className={styles.logMeta}>
                      {entry.date} {entry.time} · {entry.cardCount} tarjetas · {formatSize(entry.sizeBytes)}
                      {entry.target === 'share' ? ` · ${entry.destination}` : ' · descargado'}
                    </span>
                  </div>
                  {entry.board && (
                    <button 
                      onClick={() => handleRestoreFromLog(entry.id)}
                      className={styles.restoreBtn}
                      title="Restaurar este respaldo"
                    >
                      🔄
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {status && (
        <div className={styles.status} onClick={() => setStatus(null)}>
          {status}
        </div>
      )}

      {pendingRestore && (
        <ConfirmModal
          title="Restaurar respaldo"
          message="Se reemplazará el contenido actual del tablero por el del respaldo. ¿Continuar?"
          detail={pendingRestore.detail}
          confirmLabel="Restaurar"
          onConfirm={confirmRestore}
          onCancel={() => setPendingRestore(null)}
        />
      )}
    </>
  );
};
