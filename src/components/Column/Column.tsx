import React, { useState, useMemo, useRef, useEffect } from 'react';
import styles from './Column.module.css';
import type { Column as ColumnModel } from '../../models/Column';
import type { Card as CardModel } from '../../models/Card';
import type { BoardMode } from '../../models/Board';
import { Card } from '../Card/Card';
import { formatColumnTitle } from '../../utils/dates';

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
  onRename?: (newName: string) => void;
  onDelete?: () => void;
  onMoveLeftCol?: () => void;
  onMoveRightCol?: () => void;
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
  onRename,
  onDelete,
  onMoveLeftCol,
  onMoveRightCol,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showClosed, setShowClosed] = useState(true);
  const cardListRef = useRef<HTMLDivElement>(null);
  const prevCardsLength = useRef(column.cards.length);

  useEffect(() => {
    // Si se ha añadido una tarjeta nueva
    if (column.cards.length > prevCardsLength.current) {
      if (cardListRef.current) {
        cardListRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
    prevCardsLength.current = column.cards.length;
  }, [column.cards.length]);

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

  const handleRename = () => {
    if (!onRename) return;
    const newName = prompt('Nuevo nombre para la columna:', column.title);
    if (newName && newName.trim()) {
      onRename(newName.trim());
    }
  };

  const handleDelete = () => {
    if (!onDelete) return;
    const message = column.cards.length > 0
      ? 'Esta columna tiene tarjetas. ¿Estás seguro de que quieres eliminarla con todo su contenido?'
      : '¿Estás seguro de que quieres eliminar esta columna?';

    if (confirm(message)) {
      onDelete();
    }
  };

  return (
    <div 
      className={`${styles.column} ${isDragOver ? styles.dragOver : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDropEvent(e)}
    >
      <div className={styles.columnTitle}>
        {mode === 'monthly'
          ? formatColumnTitle(column.month!, column.year!)
          : column.title}
      </div>

      <div className={styles.columnHeader}>
        <div className={styles.headerLeft}>
          <span className={styles.cardCount}>
            {column.cards.filter(c => c.status !== 'closed').length}
          </span>

          {mode === 'monthly' && (() => {
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

        <div className={styles.headerActions}>
          {onMoveLeftCol && <button onClick={onMoveLeftCol} className={styles.headerBtn} title="Mover columna a la izquierda">⇠</button>}
          {onRename && <button onClick={handleRename} className={styles.headerBtn} title="Renombrar columna">✎</button>}
          {onDelete && <button onClick={handleDelete} className={styles.headerBtn} title="Eliminar columna">🗑</button>}
          {onMoveRightCol && <button onClick={onMoveRightCol} className={styles.headerBtn} title="Mover columna a la derecha">⇢</button>}

          {mode === 'monthly' && (
            <button
              className={`${styles.headerBtn} ${!showClosed ? styles.activeFilter : ''}`}
              onClick={() => setShowClosed(!showClosed)}
              title={showClosed ? "Ocultar tarjetas cerradas" : "Mostrar tarjetas cerradas"}
            >
              {showClosed ? '👁️' : '👁️‍🗨️'}
            </button>
          )}

          {mode === 'monthly' && (
            <div className={styles.sortActions}>
              <button
                className={`${styles.sortBtn} ${sortDirection === 'asc' ? styles.activeSort : ''}`}
                onClick={() => setSortDirection('asc')}
                title="Ordenar por fecha ascendente"
              >
                ▲
              </button>
              <button
                className={`${styles.sortBtn} ${sortDirection === 'desc' ? styles.activeSort : ''}`}
                onClick={() => setSortDirection('desc')}
                title="Ordenar por fecha descendente"
              >
                ▼
              </button>
            </div>
          )}

          <button className={styles.addButton} onClick={onAddCard} title="Agregar nueva tarjeta">
            +
          </button>
        </div>
      </div>

      {isPast && hasOpenCards && (
        <div className={styles.rolloverAlert}>
          <p>Tienes {openCards.length} pendientes</p>
          <button onClick={onRollover} className={styles.rolloverBtn}>
            Mover al siguiente mes →
          </button>
        </div>
      )}

      <div className={styles.cardList} ref={cardListRef}>
        {(() => {
          let filteredCards = [...column.cards];

          // Apply visibility filter
          if (mode === 'monthly' && !showClosed) {
            filteredCards = filteredCards.filter(c => c.status !== 'closed');
          }

          // Apply sorting for monthly mode
          if (mode === 'monthly') {
            filteredCards.sort((a, b) => {
              const dateA = a.scheduledDate || '';
              const dateB = b.scheduledDate || '';

              if (!dateA && !dateB) return 0;
              if (!dateA) return -1;
              if (!dateB) return 1;

              return sortDirection === 'desc'
                ? dateB.localeCompare(dateA)
                : dateA.localeCompare(dateB);
            });
          }

          return filteredCards.map((card, index) => (
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
              onMoveDown={index < filteredCards.length - 1 ? () => onReorderCard(index, index + 1) : undefined}
              onDragStart={() => onDragStart(card.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropEvent(e, index)}
            />
          ));
        })()}
      </div>
    </div>
  );
};
