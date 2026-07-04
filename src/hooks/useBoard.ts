import { useState, useEffect, useCallback } from 'react';
import type { Board } from '../models/Board';
import type { Card } from '../models/Card';
import { loadBoard, saveBoard } from '../services/storage';
import { generateId } from '../utils/ids';

export function useBoard() {
  const [board, setBoard] = useState<Board>(() => loadBoard());

  // Save to local storage whenever the board changes
  useEffect(() => {
    saveBoard(board);
  }, [board]);

  const addCard = useCallback((columnId: string, card: Card) => {
    setBoard((prev) => {
      const newColumns = prev.columns.map((col) => {
        if (col.id === columnId) {
          return { ...col, cards: [...col.cards, card] };
        }
        return col;
      });
      return { ...prev, columns: newColumns };
    });
  }, []);

  const updateCard = useCallback((columnId: string, updatedCard: Card) => {
    setBoard((prev) => {
      const newColumns = prev.columns.map((col) => {
        if (col.id === columnId) {
          return {
            ...col,
            cards: col.cards.map((c) => (c.id === updatedCard.id ? updatedCard : c)),
          };
        }
        return col;
      });
      return { ...prev, columns: newColumns };
    });
  }, []);

  const toggleCardStatus = useCallback((columnId: string, cardId: string) => {
    setBoard((prev) => {
      const newColumns = prev.columns.map((col) => {
        if (col.id === columnId) {
          return {
            ...col,
            cards: col.cards.map((c) => {
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
      return { ...prev, columns: newColumns };
    });
  }, []);

  const removeCard = useCallback((columnId: string, cardId: string) => {
    setBoard((prev) => {
      const newColumns = prev.columns.map((col) => {
        if (col.id === columnId) {
          return {
            ...col,
            cards: col.cards.filter((c) => c.id !== cardId),
          };
        }
        return col;
      });
      return { ...prev, columns: newColumns };
    });
  }, []);

  const moveCard = useCallback((sourceColumnId: string, destColumnId: string, cardId: string) => {
    setBoard((prev) => {
      let cardToMove: Card | undefined;
      
      const sourceCol = prev.columns.find(col => col.id === sourceColumnId);
      if (sourceCol) {
        cardToMove = sourceCol.cards.find(c => c.id === cardId);
      }
      
      if (!cardToMove) return prev;

      let updatedCard = { ...cardToMove };
      if (updatedCard.scheduledDate) {
        const day = updatedCard.scheduledDate.substring(8, 10);
        updatedCard.scheduledDate = `${destColumnId}-${day}`;
      } else {
        updatedCard.scheduledDate = `${destColumnId}-01`;
      }
      updatedCard.updated = new Date().toISOString();

      const newColumns = prev.columns.map((col) => {
        if (col.id === sourceColumnId) {
          return { ...col, cards: col.cards.filter(c => c.id !== cardId) };
        }
        if (col.id === destColumnId) {
          return { ...col, cards: [...col.cards, updatedCard] };
        }
        return col;
      });
      return { ...prev, columns: newColumns };
    });
  }, []);

  const reorderCard = useCallback((columnId: string, startIndex: number, endIndex: number) => {
    setBoard((prev) => {
      const newColumns = prev.columns.map(col => {
        if (col.id === columnId) {
          const newCards = Array.from(col.cards);
          const [removed] = newCards.splice(startIndex, 1);
          newCards.splice(endIndex, 0, removed);
          return { ...col, cards: newCards };
        }
        return col;
      });
      return { ...prev, columns: newColumns };
    });
  }, []);

  const moveCardToIndex = useCallback((sourceColumnId: string, destColumnId: string, cardId: string, destIndex: number) => {
    setBoard((prev) => {
      let cardToMove: Card | undefined;
      
      const sourceCol = prev.columns.find(col => col.id === sourceColumnId);
      if (sourceCol) {
        cardToMove = sourceCol.cards.find(c => c.id === cardId);
      }
      
      if (!cardToMove) return prev;

      let updatedCard = { ...cardToMove };
      if (sourceColumnId !== destColumnId) {
        if (updatedCard.scheduledDate) {
          const day = updatedCard.scheduledDate.substring(8, 10);
          updatedCard.scheduledDate = `${destColumnId}-${day}`;
        } else {
          updatedCard.scheduledDate = `${destColumnId}-01`;
        }
        updatedCard.updated = new Date().toISOString();
      }

      const newColumns = prev.columns.map((col) => {
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
      return { ...prev, columns: newColumns };
    });
  }, []);

  const duplicateCard = useCallback((columnId: string, cardId: string) => {
    setBoard((prev) => {
      const newColumns = prev.columns.map((col) => {
        if (col.id !== columnId) return col;
        const idx = col.cards.findIndex((c) => c.id === cardId);
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
      return { ...prev, columns: newColumns };
    });
  }, []);

  return {
    columns: board.columns,
    addCard,
    updateCard,
    toggleCardStatus,
    removeCard,
    moveCard,
    reorderCard,
    moveCardToIndex,
    duplicateCard,
  };
}
