import React, { useState } from 'react';
import styles from './AlarmModal.module.css';
import type { Card } from '../../models/Card';

interface AlarmModalProps {
  card: Card;
  onSnooze: (minutes: number) => void;
  onDiscard: () => void;
}

export const AlarmModal: React.FC<AlarmModalProps> = ({ card, onSnooze, onDiscard }) => {
  const [snoozeMinutes, setSnoozeMinutes] = useState(5);

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.iconPulse}>
          🔔
        </div>
        
        <h2 className={styles.alertTitle}>Alerta de Tratamiento</h2>
        
        <div className={styles.cardDetail}>
          <h3 className={styles.cardTitle}>{card.title}</h3>
          
          <div className={styles.metaInfo}>
            <span className={styles.timeLabel}>
              ⏰ Hora programada: <strong>{card.alarmTime}</strong>
            </span>
            {card.priority === 'high' && (
              <span className={styles.priorityBadge}>Alta prioridad</span>
            )}
          </div>

          {card.description && (
            <p className={styles.description}>{card.description}</p>
          )}
        </div>

        <div className={styles.actions}>
          <div className={styles.snoozeSection}>
            <select
              value={snoozeMinutes}
              onChange={(e) => setSnoozeMinutes(parseInt(e.target.value))}
              className={styles.snoozeSelect}
            >
              <option value={5}>Posponer 5 min</option>
              <option value={10}>Posponer 10 min</option>
              <option value={15}>Posponer 15 min</option>
              <option value={30}>Posponer 30 min</option>
            </select>
            <button
              onClick={() => onSnooze(snoozeMinutes)}
              className={styles.snoozeBtn}
            >
              💤 Posponer
            </button>
          </div>

          <button onClick={onDiscard} className={styles.discardBtn}>
            ✅ Descartar / Tomado
          </button>
        </div>
      </div>
    </div>
  );
};
