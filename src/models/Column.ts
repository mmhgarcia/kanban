import type { Card } from './Card';

export interface Column {
  id: string; // e.g., "2026-07" or "backlog"
  title?: string; // For status mode
  month?: number; // 0-11, for monthly mode
  year?: number; // for monthly mode
  cards: Card[];
}
