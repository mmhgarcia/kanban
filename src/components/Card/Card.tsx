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

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (card.image) {
      const win = window.open();
      if (win) {
        win.document.title = card.title;
        win.document.body.style.margin = '0';
        win.document.body.style.backgroundColor = '#1a1a2e';
        win.document.body.style.display = 'flex';
        win.document.body.style.justifyContent = 'center';
        win.document.body.style.alignItems = 'center';
        win.document.body.style.minHeight = '100vh';

        const img = win.document.createElement('img');
        img.src = card.image;
        img.style.maxWidth = '95%';
        img.style.maxHeight = '95vh';
        img.style.objectFit = 'contain';
        img.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';
        img.style.borderRadius = '8px';

        win.document.body.appendChild(img);
      }
    }
  };

  return (
    <div 
      className={`${styles.card} ${isClosed ? styles.closed : ''}`}
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {card.image && (
        <div className={styles.imageContainer} onClick={handleImageClick}>
          <img src={card.image} alt={card.title} title="Click para ver en grande" />
        </div>
      )}

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
