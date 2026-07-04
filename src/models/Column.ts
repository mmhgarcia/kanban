import type { Card } from './Card';

export interface Column {
  id: string; // e.g., "2026-07"
  month: number; // 0-11
  year: number;
  cards: Card[];
}
