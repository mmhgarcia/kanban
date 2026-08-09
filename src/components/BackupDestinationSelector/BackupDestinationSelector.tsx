import React, { useState } from 'react';
import styles from './BackupDestinationSelector.module.css';

interface BackupDestinationSelectorProps {
  onClose: () => void;
  onBackup: (destination: 'drive' | 'whatsapp' | 'local' | 'other', backupName: string) => Promise<void>;
}

export const BackupDestinationSelector: React.FC<BackupDestinationSelectorProps> = ({
  onClose,
  onBackup
}) => {
  const [selectedDestination, setSelectedDestination] = useState<'drive' | 'whatsapp' | 'local' | 'other' | null>(null);
  const [backupName, setBackupName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const destinations = [
    { id: 'drive' as const, name: 'Google Drive', icon: '📁', description: 'Usar selector nativo' },
    { id: 'whatsapp' as const, name: 'WhatsApp', icon: '💬', description: 'Compartir directamente' },
    { id: 'local' as const, name: 'Local/Archivo', icon: '💾', description: 'Descargar archivo' },
    { id: 'other' as const, name: 'Compartir', icon: '📤', description: 'Selector de apps' }
  ];

  const handleDestinationSelect = (dest: 'drive' | 'whatsapp' | 'local' | 'other') => {
    setSelectedDestination(dest);
    // Generate default backup name based on date
    const now = new Date();
    const defaultName = `backup_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    setBackupName(defaultName);
  };

  const handleBackup = async () => {
    if (!selectedDestination || !backupName.trim()) {
      alert('Por favor selecciona un destino y nombre para el backup');
      return;
    }

    setIsProcessing(true);
    try {
      await onBackup(selectedDestination, backupName.trim());
      onClose();
    } catch (error) {
      console.error('Backup failed:', error);
      alert('Error al realizar el backup. Por favor intenta nuevamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>Seleccionar Destino de Backup</h2>
        
        {!selectedDestination ? (
          <div className={styles.destinationsGrid}>
            {destinations.map(dest => (
              <button
                key={dest.id}
                className={styles.destinationCard}
                onClick={() => handleDestinationSelect(dest.id)}
              >
                <span className={styles.destinationIcon}>{dest.icon}</span>
                <span className={styles.destinationName}>{dest.name}</span>
                <span className={styles.destinationDescription}>{dest.description}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className={styles.backupConfig}>
            <div className={styles.selectedDestination}>
              <span className={styles.selectedIcon}>
                {destinations.find(d => d.id === selectedDestination)?.icon}
              </span>
              <span className={styles.selectedName}>
                {destinations.find(d => d.id === selectedDestination)?.name}
              </span>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="backup-name">Nombre del Backup:</label>
              <input
                id="backup-name"
                type="text"
                value={backupName}
                onChange={(e) => setBackupName(e.target.value)}
                className={styles.input}
                placeholder="Nombre del archivo de backup"
              />
            </div>

            <div className={styles.actions}>
              <button
                onClick={() => setSelectedDestination(null)}
                className={styles.backBtn}
                disabled={isProcessing}
              >
                ← Volver
              </button>
              <button
                onClick={handleBackup}
                className={styles.confirmBtn}
                disabled={isProcessing || !backupName.trim()}
              >
                {isProcessing ? 'Procesando...' : 'Iniciar Backup'}
              </button>
            </div>
          </div>
        )}

        <button onClick={onClose} className={styles.closeBtn} disabled={isProcessing}>
          ✕
        </button>
      </div>
    </div>
  );
};