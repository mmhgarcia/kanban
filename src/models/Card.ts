export type CardPriority = 'low' | 'medium' | 'high';
export type CardStatus = 'open' | 'closed';

export interface Card {
  id: string;
  title: string;
  description: string;
  monto?: number;
  priority: CardPriority;
  status: CardStatus;
  created: string; // ISO date string
  updated: string; // ISO date string
  scheduledDate?: string; // YYYY-MM-DD
}
