import React, { useState, useMemo, useEffect } from 'react';
import styles from './Board.module.css';
import { useBoard } from '../../hooks/useBoard';
import { Header } from '../Header/Header';
import { Column } from '../Column/Column';
import { MonthlyCardEditor } from '../CardEditor/MonthlyCardEditor';
import { ProjectCardEditor } from '../CardEditor/ProjectCardEditor';
import { VoiceHelpModal } from '../VoiceHelpModal/VoiceHelpModal';
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

  const [isHelpOpen, setIsHelpOpen] = useState(false);

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
    console.log('Análisis semántico de:', cleanText);

    // 1. Clusters Semánticos (Intenciones)
    const INTENTS = {
      CLOSE: ['cerrar', 'terminé', 'terminada', 'lista', 'listo', 'hecho', 'completa', 'finaliza', 'liquida', 'concluye', 'cierra'],
      OPEN: ['abrir', 'reabrir', 'pendiente', 'activa', 'otra vez', 'nuevo', 'abre', 'activar', 'regresa'],
      DELETE: ['eliminar', 'borra', 'quitar', 'basura', 'suprime', 'fuera', 'elimina', 'quítame', 'deshazte'],
      EDIT: ['editar', 'edita', 'modificar', 'modifica', 'cambiar', 'cambia', 'corrige', 'corregir'],
      UP: ['subir', 'arriba', 'encima', 'anterior', 'sube'],
      DOWN: ['bajar', 'abajo', 'debajo', 'siguiente', 'baja'],
      LEFT: ['izquierda', 'atrás', 'atras', 'atrasar', 'anterior'],
      RIGHT: ['derecha', 'adelante', 'proximo', 'próximo', 'siguiente', 'avanza'],
      ADD: ['nueva', 'nuevo', 'añadir', 'añade', 'agrega', 'agregar', 'crear', 'crea'],
      HELP: ['ayuda', 'help', 'comandos', 'instrucciones', 'qué puedo decir', 'que puedo decir']
    };

    const getIntent = (txt: string) => {
      if (INTENTS.HELP.some(word => txt.includes(word))) return 'HELP';
      if (INTENTS.ADD.some(word => txt.includes(word))) return 'ADD';
      if (INTENTS.DELETE.some(word => txt.includes(word))) return 'DELETE';
      if (INTENTS.EDIT.some(word => txt.includes(word))) return 'EDIT';
      if (INTENTS.UP.some(word => txt.includes(word))) return 'UP';
      if (INTENTS.DOWN.some(word => txt.includes(word))) return 'DOWN';
      if (INTENTS.LEFT.some(word => txt.includes(word))) return 'LEFT';
      if (INTENTS.RIGHT.some(word => txt.includes(word))) return 'RIGHT';
      if (INTENTS.OPEN.some(word => txt.includes(word))) return 'OPEN';
      if (INTENTS.CLOSE.some(word => txt.includes(word))) return 'CLOSE';
      return null;
    };

    const intent = getIntent(cleanText);

    if (!intent) {
      alert(`No entendí qué quieres hacer. Prueba con "Ayuda", "Nueva tarjeta en julio" o "Cerrar 5".`);
      return;
    }

    // Caso especial: AYUDA
    if (intent === 'HELP') {
      setIsHelpOpen(true);
      return;
    }

    // Caso especial: AÑADIR (no requiere ID de tarjeta)
    if (intent === 'ADD') {
      const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

      for (const col of visibleColumns) {
        if (mode === 'monthly') {
          const monthName = monthNames[col.month!];
          if (cleanText.includes(monthName)) {
            // Calcular fecha: día actual en el mes indicado
            const today = new Date();
            const dayNum = today.getDate();
            const lastDayInTargetMonth = new Date(col.year!, col.month! + 1, 0).getDate();
            const finalDay = Math.min(dayNum, lastDayInTargetMonth);

            const scheduledDate = `${col.year}-${String(col.month! + 1).padStart(2, '0')}-${String(finalDay).padStart(2, '0')}`;

            handleOpenEditor(col.id, { scheduledDate } as Card);
            return;
          }
        } else {
          if (col.title && cleanText.includes(col.title.toLowerCase())) {
            handleOpenEditor(col.id);
            return;
          }
        }
      }
      alert(`¿En qué columna quieres añadir la tarjeta? No escuché el nombre del mes o de la columna.`);
      return;
    }

    // Resto de intenciones requieren un ID numérico
    const wordNumbers: { [key: string]: number } = {
      'uno': 1, 'una': 1, 'dos': 2, 'tres': 3, 'cuatro': 4, 'cinco': 5,
      'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10
    };

    let id: number | null = null;
    const digitMatch = cleanText.match(/\d+/);
    if (digitMatch) {
      id = parseInt(digitMatch[0]);
    } else {
      for (const [word, val] of Object.entries(wordNumbers)) {
        if (cleanText.includes(word)) { id = val; break; }
      }
    }

    if (id === null) {
      alert(`Para esta acción necesito el número de la tarjeta. (Escuché: "${text}")`);
      return;
    }

    // Ejecución según intención con ID
    for (let i = 0; i < visibleColumns.length; i++) {
      const col = visibleColumns[i];
      const cardIdx = col.cards.findIndex(c => c.displayId === id);

      if (cardIdx !== -1) {
        const card = col.cards[cardIdx];

        switch (intent) {
          case 'DELETE':
            if (window.confirm(`⚠️ ELIMINACIÓN SEMÁNTICA\n\n¿Deseas borrar la tarjeta #${id}?\n"${card.title}"`)) {
              removeCard(col.id, card.id);
            }
            break;

          case 'EDIT':
            handleOpenEditor(col.id, card);
            break;

          case 'UP':
            if (cardIdx > 0) reorderCard(col.id, cardIdx, cardIdx - 1);
            break;

          case 'DOWN':
            if (cardIdx < col.cards.length - 1) reorderCard(col.id, cardIdx, cardIdx + 1);
            break;

          case 'LEFT':
            if (mode === 'monthly') {
              const prevDate = new Date(col.year!, col.month! - 1, 1);
              moveCard(col.id, getColumnId(prevDate), card.id);
            } else if (i > 0) {
              moveCard(col.id, visibleColumns[i - 1].id, card.id);
            }
            break;

          case 'RIGHT':
            if (mode === 'monthly') {
              const nextDate = new Date(col.year!, col.month! + 1, 1);
              moveCard(col.id, getColumnId(nextDate), card.id);
            } else if (i < visibleColumns.length - 1) {
              moveCard(col.id, visibleColumns[i + 1].id, card.id);
            }
            break;

          default:
            const isCurrentlyClosed = card.status === 'closed';
            const shouldBeClosed = intent === 'CLOSE';

            if (isCurrentlyClosed !== shouldBeClosed) {
              toggleCardStatus(col.id, card.id);
            }
        }
        return;
      }
    }
    alert(`No encontré la tarjeta #${id} en las columnas visibles.`);
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

      {isHelpOpen && (
        <VoiceHelpModal onClose={() => setIsHelpOpen(false)} />
      )}
    </div>
  );
};
