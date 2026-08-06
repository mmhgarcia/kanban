import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Board, BoardMode, Project } from '../models/Board';
import type { Card, CardStatus } from '../models/Card';
import type { Column } from '../models/Column';
import { loadBoard, saveBoard } from '../services/storage';
import { generateId } from '../utils/ids';
import { getInitialStatusColumns } from '../utils/statusColumns';

function getDefaultBoard(): Board {
  return {
    mode: 'monthly',
    monthlyColumns: [],
    projects: [
      { id: 'default', name: 'Principal', columns: getInitialStatusColumns() }
    ],
    activeProjectId: 'default',
    nextCardNumber: 1
  };
}

export function useBoard() {
  const [board, setBoard] = useState<Board>(() => getDefaultBoard());
  const [isLoaded, setIsLoaded] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    (async () => {
      const loadedBoard = await loadBoard();
      if (isMounted.current) {
        setBoard(loadedBoard);
        setIsLoaded(true);
      }
    })();

    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    const persist = async () => {
      await saveBoard(board);
    };

    persist();
  }, [board, isLoaded]);

  const activeProject = useMemo(() => {
    return board.projects.find(p => p.id === board.activeProjectId) || board.projects[0];
  }, [board.projects, board.activeProjectId]);

  const columns = useMemo(() => {
    return board.mode === 'monthly' ? board.monthlyColumns : activeProject.columns;
  }, [board.mode, board.monthlyColumns, activeProject]);

  const addCard = useCallback((columnId: string, card: Card) => {
    setBoard(prev => {
      const displayId = prev.nextCardNumber;
      const cardWithId = { ...card, displayId };

      const updateCols = (cols: Column[]) => cols.map(col => {
        if (col.id === columnId) {
          return { ...col, cards: [cardWithId, ...col.cards] };
        }
        return col;
      });

      if (prev.mode === 'monthly') {
        return {
          ...prev,
          monthlyColumns: updateCols(prev.monthlyColumns),
          nextCardNumber: prev.nextCardNumber + 1
        };
      } else {
        return {
          ...prev,
          projects: prev.projects.map(p =>
            p.id === prev.activeProjectId ? { ...p, columns: updateCols(p.columns) } : p
          ),
          nextCardNumber: prev.nextCardNumber + 1
        };
      }
    });
  }, []);

  const updateCard = useCallback((columnId: string, updatedCard: Card) => {
    setBoard(prev => {
      const updateCols = (cols: Column[]) => cols.map(col => {
        if (col.id === columnId) {
          return {
            ...col,
            cards: col.cards.map(c => (c.id === updatedCard.id ? updatedCard : c)),
          };
        }
        return col;
      });

      if (prev.mode === 'monthly') {
        return { ...prev, monthlyColumns: updateCols(prev.monthlyColumns) };
      } else {
        return {
          ...prev,
          projects: prev.projects.map(p =>
            p.id === prev.activeProjectId ? { ...p, columns: updateCols(p.columns) } : p
          )
        };
      }
    });
  }, []);

  const toggleCardStatus = useCallback((columnId: string, cardId: string) => {
    setBoard(prev => {
      const updateCols = (cols: Column[]): Column[] => cols.map(col => {
        if (col.id === columnId) {
          return {
            ...col,
            cards: col.cards.map(c => {
              if (c.id === cardId) {
                const currentStatus: CardStatus = c.status === 'closed' ? 'closed' : 'open';
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

      if (prev.mode === 'monthly') {
        return { ...prev, monthlyColumns: updateCols(prev.monthlyColumns) };
      } else {
        return {
          ...prev,
          projects: prev.projects.map(p =>
            p.id === prev.activeProjectId ? { ...p, columns: updateCols(p.columns) } : p
          )
        };
      }
    });
  }, []);

  const removeCard = useCallback((columnId: string, cardId: string) => {
    setBoard(prev => {
      const updateCols = (cols: Column[]) => cols.map(col => {
        if (col.id === columnId) {
          return { ...col, cards: col.cards.filter(c => c.id !== cardId) };
        }
        return col;
      });

      if (prev.mode === 'monthly') {
        return { ...prev, monthlyColumns: updateCols(prev.monthlyColumns) };
      } else {
        return {
          ...prev,
          projects: prev.projects.map(p =>
            p.id === prev.activeProjectId ? { ...p, columns: updateCols(p.columns) } : p
          )
        };
      }
    });
  }, []);

  const moveCard = useCallback((sourceColumnId: string, destColumnId: string, cardId: string) => {
    setBoard(prev => {
      const currentCols = prev.mode === 'monthly' ? prev.monthlyColumns :
                         (prev.projects.find(p => p.id === prev.activeProjectId)?.columns || []);

      let cardToMove: Card | undefined;
      const sourceCol = currentCols.find(col => col.id === sourceColumnId);
      if (sourceCol) {
        cardToMove = sourceCol.cards.find(c => c.id === cardId);
      }

      if (!cardToMove) return prev;

      let updatedCard = { ...cardToMove };
      if (prev.mode === 'monthly') {
        if (updatedCard.scheduledDate) {
          const day = updatedCard.scheduledDate.substring(8, 10);
          updatedCard.scheduledDate = `${destColumnId}-${day}`;
        } else {
          updatedCard.scheduledDate = `${destColumnId}-01`;
        }
      }
      updatedCard.updated = new Date().toISOString();

      let destColExists = false;
      let nextColumns = currentCols.map(col => {
        if (col.id === sourceColumnId) {
          return { ...col, cards: col.cards.filter(c => c.id !== cardId) };
        }
        if (col.id === destColumnId) {
          destColExists = true;
          return { ...col, cards: [...col.cards, updatedCard] };
        }
        return col;
      });

      if (prev.mode === 'monthly' && !destColExists) {
        const [year, month] = destColumnId.split('-').map(Number);
        nextColumns.push({
          id: destColumnId,
          month: month - 1,
          year,
          cards: [updatedCard]
        });
      }

      if (prev.mode === 'monthly') {
        return { ...prev, monthlyColumns: nextColumns };
      } else {
        return {
          ...prev,
          projects: prev.projects.map(p =>
            p.id === prev.activeProjectId ? { ...p, columns: nextColumns } : p
          )
        };
      }
    });
  }, []);

  const reorderCard = useCallback((columnId: string, startIndex: number, endIndex: number) => {
    setBoard(prev => {
      const updateCols = (cols: Column[]) => cols.map(col => {
        if (col.id === columnId) {
          const newCards = Array.from(col.cards);
          const [removed] = newCards.splice(startIndex, 1);
          newCards.splice(endIndex, 0, removed);
          return { ...col, cards: newCards };
        }
        return col;
      });

      if (prev.mode === 'monthly') {
        return { ...prev, monthlyColumns: updateCols(prev.monthlyColumns) };
      } else {
        return {
          ...prev,
          projects: prev.projects.map(p =>
            p.id === prev.activeProjectId ? { ...p, columns: updateCols(p.columns) } : p
          )
        };
      }
    });
  }, []);

  const moveCardToIndex = useCallback((sourceColumnId: string, destColumnId: string, cardId: string, destIndex: number) => {
    setBoard(prev => {
      const currentCols = prev.mode === 'monthly' ? prev.monthlyColumns :
                         (prev.projects.find(p => p.id === prev.activeProjectId)?.columns || []);

      let cardToMove: Card | undefined;
      const sourceCol = currentCols.find(col => col.id === sourceColumnId);
      if (sourceCol) {
        cardToMove = sourceCol.cards.find(c => c.id === cardId);
      }

      if (!cardToMove) return prev;

      let updatedCard = { ...cardToMove };
      if (sourceColumnId !== destColumnId) {
        if (prev.mode === 'monthly') {
          if (updatedCard.scheduledDate) {
            const day = updatedCard.scheduledDate.substring(8, 10);
            updatedCard.scheduledDate = `${destColumnId}-${day}`;
          } else {
            updatedCard.scheduledDate = `${destColumnId}-01`;
          }
        }
        updatedCard.updated = new Date().toISOString();
      }

      let destColExists = false;
      let nextColumns = currentCols.map(col => {
        if (col.id === sourceColumnId && sourceColumnId !== destColumnId) {
          return { ...col, cards: col.cards.filter(c => c.id !== cardId) };
        }
        if (col.id === destColumnId && sourceColumnId !== destColumnId) {
          destColExists = true;
          const newCards = Array.from(col.cards);
          newCards.splice(destIndex, 0, updatedCard);
          return { ...col, cards: newCards };
        }
        if (col.id === sourceColumnId && sourceColumnId === destColumnId) {
          destColExists = true;
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

      if (prev.mode === 'monthly' && !destColExists) {
        const [year, month] = destColumnId.split('-').map(Number);
        nextColumns.push({
          id: destColumnId,
          month: month - 1,
          year,
          cards: [updatedCard]
        });
      }

      if (prev.mode === 'monthly') {
        return { ...prev, monthlyColumns: nextColumns };
      } else {
        return {
          ...prev,
          projects: prev.projects.map(p =>
            p.id === prev.activeProjectId ? { ...p, columns: nextColumns } : p
          )
        };
      }
    });
  }, []);

  const duplicateCard = useCallback((columnId: string, cardId: string, destColumnId?: string) => {
    setBoard((prev) => {
      const targetColumnId = destColumnId || columnId;
      const displayId = prev.nextCardNumber;
      let cardToClone: Card | undefined;

      const currentCols = prev.mode === 'monthly' ? prev.monthlyColumns :
                         (prev.projects.find(p => p.id === prev.activeProjectId)?.columns || []);

      const sourceCol = currentCols.find(c => c.id === columnId);
      if (sourceCol) {
        cardToClone = sourceCol.cards.find(c => c.id === cardId);
      }

      if (!cardToClone) return prev;

      const now = new Date().toISOString();
      let clone: Card = {
        ...cardToClone,
        id: generateId(),
        displayId,
        title: `${cardToClone.title} (copia)`,
        status: 'open',
        created: now,
        updated: now,
      };

      // Adjust date if duplicating to a different month
      if (prev.mode === 'monthly' && destColumnId && destColumnId !== columnId) {
        const day = clone.scheduledDate ? clone.scheduledDate.substring(8, 10) : '01';
        clone.scheduledDate = `${destColumnId}-${day}`;
      }

      let destColExists = false;
      const nextColumns = currentCols.map((col) => {
        if (col.id === targetColumnId) {
          destColExists = true;
          const newCards = Array.from(col.cards);
          if (targetColumnId === columnId) {
            // If same column, place after original
            const idx = col.cards.findIndex(c => c.id === cardId);
            newCards.splice(idx + 1, 0, clone);
          } else {
            // If different column, place at top
            newCards.unshift(clone);
          }
          return { ...col, cards: newCards };
        }
        return col;
      });

      if (prev.mode === 'monthly' && !destColExists) {
        const [year, month] = targetColumnId.split('-').map(Number);
        nextColumns.push({
          id: targetColumnId,
          month: month - 1,
          year,
          cards: [clone]
        });
      }

      if (prev.mode === 'monthly') {
        return {
          ...prev,
          monthlyColumns: nextColumns,
          nextCardNumber: prev.nextCardNumber + 1
        };
      } else {
        return {
          ...prev,
          projects: prev.projects.map(p =>
            p.id === prev.activeProjectId ? { ...p, columns: nextColumns } : p
          ),
          nextCardNumber: prev.nextCardNumber + 1
        };
      }
    });
  }, []);

  const ensureColumn = useCallback((id: string, month: number, year: number) => {
    setBoard(prev => {
      if (prev.mode !== 'monthly') return prev;
      if (prev.monthlyColumns.some(col => col.id === id)) return prev;

      return {
        ...prev,
        monthlyColumns: [...prev.monthlyColumns, { id, month, year, cards: [] }]
      };
    });
  }, []);

  const rolloverCards = useCallback((sourceColumnId: string, destColumnId: string) => {
    setBoard(prev => {
      const currentCols = prev.mode === 'monthly' ? prev.monthlyColumns :
                         (prev.projects.find(p => p.id === prev.activeProjectId)?.columns || []);

      const sourceCol = currentCols.find(c => c.id === sourceColumnId);
      if (!sourceCol) return prev;

      const cardsToMove = sourceCol.cards.filter(c => c.status === 'open');
      if (cardsToMove.length === 0) return prev;

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
      let nextColumns = currentCols.map(col => {
        if (col.id === sourceColumnId) {
          return { ...col, cards: col.cards.filter(c => c.status === 'closed') };
        }
        if (col.id === destColumnId) {
          destColExists = true;
          return { ...col, cards: [...col.cards, ...updatedCards] };
        }
        return col;
      });

      if (prev.mode === 'monthly' && !destColExists) {
        const [year, month] = destColumnId.split('-').map(Number);
        nextColumns.push({
          id: destColumnId,
          month: month - 1,
          year,
          cards: updatedCards
        });
      }

      if (prev.mode === 'monthly') {
        return { ...prev, monthlyColumns: nextColumns };
      } else {
        return {
          ...prev,
          projects: prev.projects.map(p =>
            p.id === prev.activeProjectId ? { ...p, columns: nextColumns } : p
          )
        };
      }
    });
  }, []);

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
    setBoard(prev => {
      if (prev.mode !== 'status') return prev;
      const newColumn: Column = {
        id: generateId(),
        title,
        cards: []
      };

      return {
        ...prev,
        projects: prev.projects.map(p =>
          p.id === prev.activeProjectId ? { ...p, columns: [...p.columns, newColumn] } : p
        )
      };
    });
  }, []);

  const removeColumn = useCallback((columnId: string) => {
    setBoard(prev => {
      if (prev.mode !== 'status') return prev;
      return {
        ...prev,
        projects: prev.projects.map(p =>
          p.id === prev.activeProjectId ? { ...p, columns: p.columns.filter(col => col.id !== columnId) } : p
        )
      };
    });
  }, []);

  const renameColumn = useCallback((columnId: string, newTitle: string) => {
    setBoard(prev => {
      const updateCols = (cols: Column[]) => cols.map(col =>
        col.id === columnId ? { ...col, title: newTitle } : col
      );

      if (prev.mode === 'monthly') {
        return { ...prev, monthlyColumns: updateCols(prev.monthlyColumns) };
      } else {
        return {
          ...prev,
          projects: prev.projects.map(p =>
            p.id === prev.activeProjectId ? { ...p, columns: updateCols(p.columns) } : p
          )
        };
      }
    });
  }, []);

  const reorderColumn = useCallback((startIndex: number, endIndex: number) => {
    setBoard(prev => {
      if (prev.mode !== 'status') return prev;

      const p = prev.projects.find(proj => proj.id === prev.activeProjectId);
      if (!p) return prev;

      const newColumns = Array.from(p.columns);
      const [removed] = newColumns.splice(startIndex, 1);
      newColumns.splice(endIndex, 0, removed);

      return {
        ...prev,
        projects: prev.projects.map(proj =>
          proj.id === prev.activeProjectId ? { ...proj, columns: newColumns } : proj
        )
      };
    });
  }, []);

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
