import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import styles from './UpdatePrompt.module.css';

export const UpdatePrompt: React.FC = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!offlineReady && !needRefresh) return null;

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <div className={styles.toast}>
      <span className={styles.message}>
        {needRefresh
          ? 'Hay una nueva versión disponible.'
          : 'Listo para usarse sin conexión.'}
      </span>

      <div className={styles.actions}>
        {needRefresh && (
          <button className={styles.reloadBtn} onClick={() => updateServiceWorker(true)}>
            Actualizar
          </button>
        )}
        <button className={styles.closeBtn} onClick={close}>Cerrar</button>
      </div>
    </div>
  );
};
