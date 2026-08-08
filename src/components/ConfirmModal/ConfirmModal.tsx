import React from 'react';
import styles from './ConfirmModal.module.css';

interface ConfirmModalProps {
  title: string;
  message: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title,
  message,
  detail,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
}) => {
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.icon}>⚠️</div>

        <h2 className={styles.title}>{title}</h2>
        <p className={styles.message}>{message}</p>

        {detail && <div className={styles.detail}>{detail}</div>}

        <div className={styles.actions}>
          <button onClick={onCancel} className={styles.cancelBtn}>{cancelLabel}</button>
          <button onClick={onConfirm} className={styles.confirmBtn} autoFocus>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};
