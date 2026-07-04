import React from 'react';
import styles from './Card.module.css';
import type { Card as CardModel } from '../../models/Card';
import type { BoardMode } from '../../models/Board';
import { formatFriendlyDate } from '../../utils/dates';

interface CardProps {
  card: CardModel;
  mode?: BoardMode;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
  onDuplicate: () => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

export const Card: React.FC<CardProps> = ({ 
  card, 
  mode = 'monthly',
  onEdit,
  onDelete,
  onToggleStatus,
  onDuplicate,
  onMoveLeft, 
  onMoveRight, 
  onMoveUp, 
  onMoveDown,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  const isClosed = card.status === 'closed';

  return (
    <div 
      className={`${styles.card} ${isClosed ? styles.closed : ''}`}
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className={styles.header}>
        <span className={`${styles.priorityIndicator} ${styles[card.priority]}`} />
        <div className={styles.actions}>
          {onMoveUp && (
            <button onClick={onMoveUp} className={styles.actionBtn} title="Subir" disabled={isClosed}>⬆️</button>
          )}
          {onMoveDown && (
            <button onClick={onMoveDown} className={styles.actionBtn} title="Bajar" disabled={isClosed}>⬇️</button>
          )}
          {onMoveLeft && (
            <button onClick={onMoveLeft} className={styles.actionBtn} title="Mover a la izquierda" disabled={isClosed}>⬅️</button>
          )}
          {onMoveRight && (
            <button onClick={onMoveRight} className={styles.actionBtn} title="Mover a la derecha" disabled={isClosed}>➡️</button>
          )}
          <button onClick={onEdit} className={styles.actionBtn} title="Editar" disabled={isClosed}>✏️</button>
          <button
            onClick={onToggleStatus}
            className={styles.actionBtn}
            title={isClosed ? 'Abrir de nuevo' : 'Marcar como cerrada'}
          >
            {isClosed ? '🔄' : '✅'}
          </button>
          <button onClick={onDuplicate} className={styles.actionBtn} title="Duplicar" disabled={isClosed}>📋</button>
          <button onClick={onDelete} className={styles.actionBtn} title="Eliminar" disabled={isClosed}>🗑️</button>
        </div>
      </div>
      
      <h3 className={styles.title}>{card.title}</h3>
      {card.description && <p className={styles.description}>{card.description}</p>}
      {mode === 'monthly' && card.monto !== undefined && (
        <div className={styles.monto}>
          $ {card.monto.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      )}
      
      {card.scheduledDate && (
        <div className={styles.scheduledDate}>
          {mode === 'monthly' ? 'Programado Para: ' : 'Vencimiento: '}
          {card.scheduledDate}
        </div>
      )}
      
      <div className={styles.footer}>
        <span className={styles.date}>Actualizado: {formatFriendlyDate(card.updated)}</span>
      </div>
    </div>
  );
};
