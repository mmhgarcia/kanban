import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Board, BoardMode, Project } from '../models/Board';
import type { Card } from '../models/Card';
import type { Column } from '../models/Column';
import { loadBoard, saveBoard } from '../services/storage';
import { generateId } from '../utils/ids';
import { getInitialStatusColumns } from '../utils/statusColumns';

export function useBoard() {
  const [board, setBoard] = useState<Board>(() => loadBoard());

  useEffect(() => {
    saveBoard(board);
  }, [board]);

  const activeProject = useMemo(() => {
    return board.projects.find(p => p.id === board.activeProjectId) || board.projects[0];
  }, [board.projects, board.activeProjectId]);

  const columns = useMemo(() => {
    return board.mode === 'monthly' ? board.monthlyColumns : activeProject.columns;
  }, [board.mode, board.monthlyColumns, activeProject]);

  const updateColumnsInState = useCallback((newColumns: Column[]) => {
    setBoard(prev => {
      if (prev.mode === 'monthly') {
        return { ...prev, monthlyColumns: newColumns };
      } else {
        return {
          ...prev,
          projects: prev.projects.map(p =>
            p.id === prev.activeProjectId ? { ...p, columns: newColumns } : p
          )
        };
      }
    });
  }, []);

  const addCard = useCallback((columnId: string, card: Card) => {
    const newColumns = columns.map(col => {
      if (col.id === columnId) {
        return { ...col, cards: [card, ...col.cards] };
      }
      return col;
    });
    updateColumnsInState(newColumns);
  }, [columns, updateColumnsInState]);

  const updateCard = useCallback((columnId: string, updatedCard: Card) => {
    const newColumns = columns.map(col => {
      if (col.id === columnId) {
        return {
          ...col,
          cards: col.cards.map(c => (c.id === updatedCard.id ? updatedCard : c)),
        };
      }
      return col;
    });
    updateColumnsInState(newColumns);
  }, [columns, updateColumnsInState]);

  const toggleCardStatus = useCallback((columnId: string, cardId: string) => {
    const newColumns = columns.map(col => {
      if (col.id === columnId) {
        return {
          ...col,
          cards: col.cards.map(c => {
            if (c.id === cardId) {
              const currentStatus = c.status || 'open';
              return {
                ...c,
                status: currentStatus === 'open' ? 'closed' : 'open',
                updated: new Date().toISOString(),
              };
            }
            return c;
          }),
        };
      }
      return col;
    });
    updateColumnsInState(newColumns);
  }, [columns, updateColumnsInState]);

  const removeCard = useCallback((columnId: string, cardId: string) => {
    const newColumns = columns.map(col => {
      if (col.id === columnId) {
        return {
          ...col,
          cards: col.cards.filter(c => c.id !== cardId),
        };
      }
      return col;
    });
    updateColumnsInState(newColumns);
  }, [columns, updateColumnsInState]);

  const moveCard = useCallback((sourceColumnId: string, destColumnId: string, cardId: string) => {
    let cardToMove: Card | undefined;
    const sourceCol = columns.find(col => col.id === sourceColumnId);
    if (sourceCol) {
      cardToMove = sourceCol.cards.find(c => c.id === cardId);
    }

    if (!cardToMove) return;

    let updatedCard = { ...cardToMove };
    if (board.mode === 'monthly') {
      if (updatedCard.scheduledDate) {
        const day = updatedCard.scheduledDate.substring(8, 10);
        updatedCard.scheduledDate = `${destColumnId}-${day}`;
      } else {
        updatedCard.scheduledDate = `${destColumnId}-01`;
      }
    }
    updatedCard.updated = new Date().toISOString();

    let nextColumns = columns.map(col => {
      if (col.id === sourceColumnId) {
        return { ...col, cards: col.cards.filter(c => c.id !== cardId) };
      }
      if (col.id === destColumnId) {
        return { ...col, cards: [...col.cards, updatedCard] };
      }
      return col;
    });

    if (board.mode === 'monthly' && !nextColumns.some(col => col.id === destColumnId)) {
      const [year, month] = destColumnId.split('-').map(Number);
      nextColumns.push({
        id: destColumnId,
        month: month - 1,
        year,
        cards: [updatedCard]
      });
    }
    updateColumnsInState(nextColumns);
  }, [columns, board.mode, updateColumnsInState]);

  const reorderCard = useCallback((columnId: string, startIndex: number, endIndex: number) => {
    const newColumns = columns.map(col => {
      if (col.id === columnId) {
        const newCards = Array.from(col.cards);
        const [removed] = newCards.splice(startIndex, 1);
        newCards.splice(endIndex, 0, removed);
        return { ...col, cards: newCards };
      }
      return col;
    });
    updateColumnsInState(newColumns);
  }, [columns, updateColumnsInState]);

  const moveCardToIndex = useCallback((sourceColumnId: string, destColumnId: string, cardId: string, destIndex: number) => {
    let cardToMove: Card | undefined;
    const sourceCol = columns.find(col => col.id === sourceColumnId);
    if (sourceCol) {
      cardToMove = sourceCol.cards.find(c => c.id === cardId);
    }

    if (!cardToMove) return;

    let updatedCard = { ...cardToMove };
    if (sourceColumnId !== destColumnId) {
      if (board.mode === 'monthly') {
        if (updatedCard.scheduledDate) {
          const day = updatedCard.scheduledDate.substring(8, 10);
          updatedCard.scheduledDate = `${destColumnId}-${day}`;
        } else {
          updatedCard.scheduledDate = `${destColumnId}-01`;
        }
      }
      updatedCard.updated = new Date().toISOString();
    }

    let nextColumns = columns.map(col => {
      if (col.id === sourceColumnId && sourceColumnId !== destColumnId) {
        return { ...col, cards: col.cards.filter(c => c.id !== cardId) };
      }
      if (col.id === destColumnId && sourceColumnId !== destColumnId) {
        const newCards = Array.from(col.cards);
        newCards.splice(destIndex, 0, updatedCard);
        return { ...col, cards: newCards };
      }
      if (col.id === sourceColumnId && sourceColumnId === destColumnId) {
        const newCards = Array.from(col.cards);
        const oldIndex = newCards.findIndex(c => c.id === cardId);
        if (oldIndex !== -1) {
          newCards.splice(oldIndex, 1);
          newCards.splice(destIndex, 0, updatedCard);
        }
        return { ...col, cards: newCards };
      }
      return col;
    });

    if (board.mode === 'monthly' && !nextColumns.some(col => col.id === destColumnId)) {
      const [year, month] = destColumnId.split('-').map(Number);
      nextColumns.push({
        id: destColumnId,
        month: month - 1,
        year,
        cards: [updatedCard]
      });
    }
    updateColumnsInState(nextColumns);
  }, [columns, board.mode, updateColumnsInState]);

  const duplicateCard = useCallback((columnId: string, cardId: string) => {
    const newColumns = columns.map(col => {
      if (col.id !== columnId) return col;
      const idx = col.cards.findIndex(c => c.id === cardId);
      if (idx === -1) return col;
      const original = col.cards[idx];
      const now = new Date().toISOString();
      const clone: Card = {
        ...original,
        id: generateId(),
        title: `${original.title} (copia)`,
        status: 'open',
        created: now,
        updated: now,
      };
      const newCards = Array.from(col.cards);
      newCards.splice(idx + 1, 0, clone);
      return { ...col, cards: newCards };
    });
    updateColumnsInState(newColumns);
  }, [columns, updateColumnsInState]);

  const ensureColumn = useCallback((id: string, month: number, year: number) => {
    if (board.mode !== 'monthly') return;
    if (board.monthlyColumns.some(col => col.id === id)) return;

    setBoard(prev => ({
      ...prev,
      monthlyColumns: [...prev.monthlyColumns, { id, month, year, cards: [] }]
    }));
  }, [board.mode, board.monthlyColumns]);

  const rolloverCards = useCallback((sourceColumnId: string, destColumnId: string) => {
    const sourceCol = columns.find(c => c.id === sourceColumnId);
    if (!sourceCol) return;

    const cardsToMove = sourceCol.cards.filter(c => c.status === 'open');
    if (cardsToMove.length === 0) return;

    const now = new Date().toISOString();
    const updatedCards = cardsToMove.map(c => {
      let scheduledDate = c.scheduledDate;
      if (scheduledDate) {
        const day = scheduledDate.substring(8, 10);
        scheduledDate = `${destColumnId}-${day}`;
      } else {
        scheduledDate = `${destColumnId}-01`;
      }
      return { ...c, scheduledDate, updated: now };
    });

    let destColExists = false;
    let nextColumns = columns.map(col => {
      if (col.id === sourceColumnId) {
        return { ...col, cards: col.cards.filter(c => c.status === 'closed') };
      }
      if (col.id === destColumnId) {
        destColExists = true;
        return { ...col, cards: [...col.cards, ...updatedCards] };
      }
      return col;
    });

    if (!destColExists) {
      const [year, month] = destColumnId.split('-').map(Number);
      nextColumns.push({
        id: destColumnId,
        month: month - 1,
        year,
        cards: updatedCards
      });
    }
    updateColumnsInState(nextColumns);
  }, [columns, updateColumnsInState]);

  const setMode = useCallback((mode: BoardMode) => {
    setBoard(prev => ({ ...prev, mode }));
  }, []);

  const addProject = useCallback((name: string) => {
    const newProject: Project = {
      id: generateId(),
      name,
      columns: getInitialStatusColumns()
    };
    setBoard(prev => ({
      ...prev,
      projects: [...prev.projects, newProject],
      activeProjectId: newProject.id,
      mode: 'status'
    }));
  }, []);

  const switchProject = useCallback((projectId: string) => {
    setBoard(prev => ({
      ...prev,
      activeProjectId: projectId,
      mode: 'status'
    }));
  }, []);

  const renameProject = useCallback((projectId: string, newName: string) => {
    setBoard(prev => ({
      ...prev,
      projects: prev.projects.map(p => p.id === projectId ? { ...p, name: newName } : p)
    }));
  }, []);

  const removeProject = useCallback((projectId: string) => {
    setBoard(prev => {
      if (prev.projects.length <= 1) return prev;
      const newProjects = prev.projects.filter(p => p.id !== projectId);
      return {
        ...prev,
        projects: newProjects,
        activeProjectId: prev.activeProjectId === projectId ? newProjects[0].id : prev.activeProjectId
      };
    });
  }, []);

  const addColumn = useCallback((title: string) => {
    if (board.mode !== 'status') return;
    const newColumn: Column = {
      id: generateId(),
      title,
      cards: []
    };
    updateColumnsInState([...columns, newColumn]);
  }, [board.mode, columns, updateColumnsInState]);

  const removeColumn = useCallback((columnId: string) => {
    if (board.mode !== 'status') return;
    const newColumns = columns.filter(col => col.id !== columnId);
    updateColumnsInState(newColumns);
  }, [board.mode, columns, updateColumnsInState]);

  const renameColumn = useCallback((columnId: string, newTitle: string) => {
    const newColumns = columns.map(col =>
      col.id === columnId ? { ...col, title: newTitle } : col
    );
    updateColumnsInState(newColumns);
  }, [columns, updateColumnsInState]);

  const reorderColumn = useCallback((startIndex: number, endIndex: number) => {
    if (board.mode !== 'status') return;
    const newColumns = Array.from(columns);
    const [removed] = newColumns.splice(startIndex, 1);
    newColumns.splice(endIndex, 0, removed);
    updateColumnsInState(newColumns);
  }, [board.mode, columns, updateColumnsInState]);

  return {
    mode: board.mode,
    columns,
    projects: board.projects,
    activeProjectId: board.activeProjectId,
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
  };
}
