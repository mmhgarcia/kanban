import React, { useState, useMemo, useEffect } from 'react';
import styles from './Board.module.css';
import { useBoard } from '../../hooks/useBoard';
import { Header } from '../Header/Header';
import { Column } from '../Column/Column';
import { MonthlyCardEditor } from '../CardEditor/MonthlyCardEditor';
import { ProjectCardEditor } from '../CardEditor/ProjectCardEditor';
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
    switchProject,
    renameProject,
    removeProject,
    addColumn,
    removeColumn,
    renameColumn,
    reorderColumn
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

  const handleVoiceCommand = (text: string) => {
    const cleanText = text.toLowerCase().trim();
    console.log('Comando de voz recibido:', cleanText);

    // Mapeo de números escritos a dígitos por si el navegador transcribe palabras
    const wordNumbers: { [key: string]: number } = {
      'uno': 1, 'una': 1, 'dos': 2, 'tres': 3, 'cuatro': 4, 'cinco': 5,
      'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10
    };

    // Buscamos número en dígitos o en palabras
    let id: number | null = null;
    const digitMatch = cleanText.match(/\d+/);

    if (digitMatch) {
      id = parseInt(digitMatch[0]);
    } else {
      // Si no hay dígitos, buscamos palabras (uno, dos...)
      for (const [word, val] of Object.entries(wordNumbers)) {
        if (cleanText.includes(word)) {
          id = val;
          break;
        }
      }
    }

    if (id === null) {
      alert(`No identifiqué el número de tarjeta. Prueba con "Cerrar 5" o "Borra la 8". (Escuché: "${text}")`);
      return;
    }

    // Determinamos la acción por palabras clave
    const isCloseCommand = /cerrar|terminar|completar|finalizar|cierra/.test(cleanText);
    const isOpenCommand = /abrir|reabrir|activar|abre|abierto/.test(cleanText);
    const isDeleteCommand = /eliminar|elimina|borrar|borra/.test(cleanText);

    if (!isCloseCommand && !isOpenCommand && !isDeleteCommand) {
      alert(`No entendí la acción. Prueba con "Cerrar", "Reabrir" o "Eliminar". (Escuché: "${text}")`);
      return;
    }

    // Buscar la tarjeta en todas las columnas
    for (const col of columns) {
      const card = col.cards.find(c => c.displayId === id);
      if (card) {
        if (isDeleteCommand) {
          const confirmacion = window.confirm(`⚠️ ELIMINACIÓN POR VOZ\n\n¿Estás seguro de que deseas borrar la tarjeta #${id}?\n"${card.title}"`);
          if (confirmacion) {
            removeCard(col.id, card.id);
          }
          return;
        }

        const isCurrentlyClosed = card.status === 'closed';

        // Si pides abrir y está cerrada, o pides cerrar y está abierta -> Togleamos
        const needsToggle = (isOpenCommand && isCurrentlyClosed) ||
                            (isCloseCommand && !isCurrentlyClosed);

        if (needsToggle) {
          toggleCardStatus(col.id, card.id);
        } else {
          const statusTxt = isCurrentlyClosed ? 'cerrada' : 'abierta';
          console.log(`La tarjeta #${id} ya está ${statusTxt}.`);
        }
        return;
      }
    }
    alert(`No encontré la tarjeta #${id} en el tablero actual.`);
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
        onRemoveProject={removeProject}
        onVoiceCommand={handleVoiceCommand}
      />
      
      <main className={`${styles.columnsContainer} ${mode === 'status' ? styles.statusMode : ''}`}>
        {visibleColumns.map((col, index) => (
          <Column 
            key={col.id} 
            column={col} 
            mode={mode}
            onAddCard={() => handleOpenEditor(col.id)}
            onEditCard={(card) => handleOpenEditor(col.id, card)}
            onDeleteCard={(cardId) => {
              if (confirm('¿Estás seguro de que deseas eliminar esta tarjeta?')) {
                removeCard(col.id, cardId);
              }
            }}
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
              if (col.year !== undefined && col.month !== undefined) {
                const nextColDate = new Date(col.year, col.month + 1, 1);
                rolloverCards(col.id, getColumnId(nextColDate));
              }
            }}
            onRename={mode === 'status' ? (newName) => renameColumn(col.id, newName) : undefined}
            onDelete={mode === 'status' ? () => removeColumn(col.id) : undefined}
            onMoveLeftCol={mode === 'status' && index > 0 ? () => reorderColumn(index, index - 1) : undefined}
            onMoveRightCol={mode === 'status' && index < visibleColumns.length - 1 ? () => reorderColumn(index, index + 1) : undefined}
          />
        ))}

        {mode === 'status' && (
          <button
            className={styles.addColumnBtn}
            onClick={() => {
              const name = prompt('Nombre de la nueva columna:');
              if (name && name.trim()) addColumn(name.trim());
            }}
          >
            + Añadir Columna
          </button>
        )}
      </main>

      {editorState.isOpen && mode === 'monthly' && (
        <MonthlyCardEditor
          initialCard={editorState.cardToEdit}
          onSave={handleSaveCard}
          onClose={handleCloseEditor}
        />
      )}

      {editorState.isOpen && mode === 'status' && (
        <ProjectCardEditor
          initialCard={editorState.cardToEdit}
          onSave={handleSaveCard}
          onClose={handleCloseEditor}
        />
      )}
    </div>
  );
};
