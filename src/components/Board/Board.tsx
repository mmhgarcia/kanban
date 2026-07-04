import React, { useState } from 'react';
import styles from './Board.module.css';
import { useBoard } from '../../hooks/useBoard';
import { Header } from '../Header/Header';
import { Column } from '../Column/Column';
import { CardEditor } from '../CardEditor/CardEditor';
import type { Card } from '../../models/Card';

export const Board: React.FC = () => {
  const {
    columns,
    addCard,
    updateCard,
    toggleCardStatus,
    removeCard,
    moveCard,
    reorderCard,
    moveCardToIndex,
    duplicateCard
  } = useBoard();
  const [editorState, setEditorState] = useState<{
    isOpen: boolean;
    columnId: string | null;
    cardToEdit: Card | null;
  }>({ isOpen: false, columnId: null, cardToEdit: null });

  const [draggedCard, setDraggedCard] = useState<{ id: string; columnId: string } | null>(null);

  const handleDragStart = (cardId: string, columnId: string) => {
    setDraggedCard({ id: cardId, columnId });
  };

  const handleDrop = (destColumnId: string, destIndex: number) => {
    if (draggedCard) {
      moveCardToIndex(draggedCard.columnId, destColumnId, draggedCard.id, destIndex);
    }
    setDraggedCard(null);
  };

  const handleOpenEditor = (columnId: string, cardToEdit?: Card) => {
    setEditorState({ isOpen: true, columnId, cardToEdit: cardToEdit || null });
  };

  const handleCloseEditor = () => {
    setEditorState({ isOpen: false, columnId: null, cardToEdit: null });
  };

  const handleSaveCard = (card: Card) => {
    if (editorState.columnId) {
      if (editorState.cardToEdit) {
        updateCard(editorState.columnId, card);
      } else {
        addCard(editorState.columnId, card);
      }
    }
    handleCloseEditor();
  };

  return (
    <div className={styles.boardContainer}>
      <Header columns={columns} />
      
      <main className={styles.columnsContainer}>
        {columns.map((col, index) => (
          <Column 
            key={col.id} 
            column={col} 
            onAddCard={() => handleOpenEditor(col.id)}
            onEditCard={(card) => handleOpenEditor(col.id, card)}
            onDeleteCard={(cardId) => removeCard(col.id, cardId)}
            onToggleCardStatus={(cardId) => toggleCardStatus(col.id, cardId)}
            onDuplicateCard={(cardId) => duplicateCard(col.id, cardId)}
            onMoveLeft={
              index > 0 
                ? (cardId) => moveCard(col.id, columns[index - 1].id, cardId)
                : undefined
            }
            onMoveRight={
              index < columns.length - 1 
                ? (cardId) => moveCard(col.id, columns[index + 1].id, cardId)
                : undefined
            }
            onReorderCard={(startIndex, endIndex) => reorderCard(col.id, startIndex, endIndex)}
            onDragStart={(cardId) => handleDragStart(cardId, col.id)}
            onDrop={(destIndex) => handleDrop(col.id, destIndex)}
          />
        ))}
      </main>

      {editorState.isOpen && (
        <CardEditor
          initialCard={editorState.cardToEdit}
          onSave={handleSaveCard}
          onClose={handleCloseEditor}
        />
      )}
    </div>
  );
};
