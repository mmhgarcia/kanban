import React, { useState, useMemo, useEffect } from 'react';
import styles from './Board.module.css';
import { useBoard } from '../../hooks/useBoard';
import { Header } from '../Header/Header';
import { Column } from '../Column/Column';
import { CardEditor } from '../CardEditor/CardEditor';
import type { Card } from '../../models/Card';
import { getColumnId } from '../../utils/dates';

export const Board: React.FC = () => {
  const {
    mode,
    columns,
    projects,
    activeProjectId,
    addCard,
    updateCard,
    toggleCardStatus,
    removeCard,
    moveCard,
    reorderCard,
    moveCardToIndex,
    duplicateCard,
    ensureColumn,
    rolloverCards,
    setMode,
    addProject,
    switchProject
  } = useBoard();

  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const visibleColumns = useMemo(() => {
    if (mode === 'status') {
      return columns;
    }

    const visible = [];
    for (let i = 0; i < 4; i++) {
      const targetDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + i, 1);
      const id = getColumnId(targetDate);
      let col = columns.find(c => c.id === id);

      if (!col) {
        col = { id, month: targetDate.getMonth(), year: targetDate.getFullYear(), cards: [] };
      }
      visible.push(col);
    }
    return visible;
  }, [viewDate, columns, mode]);

  useEffect(() => {
    if (mode === 'monthly') {
      visibleColumns.forEach(col => {
        if (!columns.some(c => c.id === col.id)) {
          ensureColumn(col.id, col.month!, col.year!);
        }
      });
    }
  }, [visibleColumns, columns, ensureColumn, mode]);

  const navigateMonths = (delta: number) => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const handleReset = () => {
    const d = new Date();
    d.setDate(1);
    setViewDate(d);
  };

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
      <Header
        columns={visibleColumns}
        onNavigate={navigateMonths}
        onReset={handleReset}
        mode={mode}
        onModeChange={setMode}
        projects={projects}
        activeProjectId={activeProjectId}
        onProjectChange={switchProject}
        onAddProject={addProject}
      />
      
      <main className={`${styles.columnsContainer} ${mode === 'status' ? styles.statusMode : ''}`}>
        {visibleColumns.map((col, index) => (
          <Column 
            key={col.id} 
            column={col} 
            mode={mode}
            onAddCard={() => handleOpenEditor(col.id)}
            onEditCard={(card) => handleOpenEditor(col.id, card)}
            onDeleteCard={(cardId) => removeCard(col.id, cardId)}
            onToggleCardStatus={(cardId) => toggleCardStatus(col.id, cardId)}
            onDuplicateCard={(cardId) => duplicateCard(col.id, cardId)}
            onMoveLeft={(cardId) => {
              if (mode === 'monthly') {
                const prevColDate = new Date(col.year!, col.month! - 1, 1);
                moveCard(col.id, getColumnId(prevColDate), cardId);
              } else {
                if (index > 0) {
                  moveCard(col.id, visibleColumns[index - 1].id, cardId);
                }
              }
            }}
            onMoveRight={(cardId) => {
              if (mode === 'monthly') {
                const nextColDate = new Date(col.year!, col.month! + 1, 1);
                moveCard(col.id, getColumnId(nextColDate), cardId);
              } else {
                if (index < visibleColumns.length - 1) {
                  moveCard(col.id, visibleColumns[index + 1].id, cardId);
                }
              }
            }}
            onReorderCard={(startIndex, endIndex) => reorderCard(col.id, startIndex, endIndex)}
            onDragStart={(cardId) => handleDragStart(cardId, col.id)}
            onDrop={(destIndex) => handleDrop(col.id, destIndex)}
            onRollover={() => {
              const nextColDate = new Date(col.year, col.month + 1, 1);
              rolloverCards(col.id, getColumnId(nextColDate));
            }}
          />
        ))}
      </main>

      {editorState.isOpen && (
        <CardEditor
          initialCard={editorState.cardToEdit}
          mode={mode}
          onSave={handleSaveCard}
          onClose={handleCloseEditor}
        />
      )}
    </div>
  );
};
