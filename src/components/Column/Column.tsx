import React, { useState, useMemo } from 'react';
import styles from './Column.module.css';
import type { Column as ColumnModel } from '../../models/Column';
import type { Card as CardModel } from '../../models/Card';
import type { BoardMode } from '../../models/Board';
import { Card } from '../Card/Card';

interface ColumnProps {
  column: ColumnModel;
  mode?: BoardMode;
  onAddCard: () => void;
  onEditCard: (card: CardModel) => void;
  onDeleteCard: (cardId: string) => void;
  onToggleCardStatus: (cardId: string) => void;
  onDuplicateCard: (cardId: string) => void;
  onMoveLeft?: (cardId: string) => void;
  onMoveRight?: (cardId: string) => void;
  onReorderCard: (startIndex: number, endIndex: number) => void;
  onDragStart: (cardId: string) => void;
  onDrop: (destIndex: number) => void;
  onRollover: () => void;
}

export const Column: React.FC<ColumnProps> = ({
  column,
  mode = 'monthly',
  onAddCard,
  onEditCard,
  onDeleteCard,
  onToggleCardStatus,
  onDuplicateCard,
  onMoveLeft,
  onMoveRight,
  onReorderCard,
  onDragStart,
  onDrop,
  onRollover,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const openCards = column.cards.filter(c => c.status !== 'closed');
  const hasOpenCards = openCards.length > 0;

  const isPast = useMemo(() => {
    if (column.year === undefined || column.month === undefined) return false;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return column.year < currentYear || (column.year === currentYear && column.month < currentMonth);
  }, [column.year, column.month]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDropEvent = (e: React.DragEvent, index?: number) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    onDrop(index !== undefined ? index : column.cards.length);
  };

  return (
    <div 
      className={`${styles.column} ${isDragOver ? styles.dragOver : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDropEvent(e)}
    >
      <div className={styles.columnHeader}>
        <div className={styles.headerLeft}>
          <span className={styles.cardCount}>
            {column.cards.filter(c => c.status !== 'closed').length}
          </span>
          {(() => {
            const total = column.cards
              .filter(c => c.status !== 'closed')
              .reduce((sum, c) => sum + (c.monto ?? 0), 0);
            return total > 0 ? (
              <span className={styles.montoTotal}>
                $ {total.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            ) : null;
          })()}
        </div>
        <button className={styles.addButton} onClick={onAddCard} title="Agregar nueva tarjeta">
          +
        </button>
      </div>

      {isPast && hasOpenCards && (
        <div className={styles.rolloverAlert}>
          <p>Tienes {openCards.length} pendientes</p>
          <button onClick={onRollover} className={styles.rolloverBtn}>
            Mover al siguiente mes →
          </button>
        </div>
      )}

      <div className={styles.cardList}>
        {[...column.cards]
          .sort((a, b) => {
            if (!a.scheduledDate && !b.scheduledDate) return 0;
            if (!a.scheduledDate) return 1;
            if (!b.scheduledDate) return -1;
            return a.scheduledDate.localeCompare(b.scheduledDate);
          })
          .map((card, index) => (
          <Card 
            key={card.id} 
            card={card} 
            mode={mode}
            onEdit={() => onEditCard(card)}
            onDelete={() => onDeleteCard(card.id)}
            onToggleStatus={() => onToggleCardStatus(card.id)}
            onDuplicate={() => onDuplicateCard(card.id)}
            onMoveLeft={onMoveLeft ? () => onMoveLeft(card.id) : undefined}
            onMoveRight={onMoveRight ? () => onMoveRight(card.id) : undefined}
            onMoveUp={index > 0 ? () => onReorderCard(index, index - 1) : undefined}
            onMoveDown={index < column.cards.length - 1 ? () => onReorderCard(index, index + 1) : undefined}
            onDragStart={() => onDragStart(card.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDropEvent(e, index)}
          />
        ))}
      </div>
    </div>
  );
};
