import type { Column } from '../models/Column';

export const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export function getColumnId(date: Date): string {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function getInitialColumns(): Column[] {
  const columns: Column[] = [];
  const currentDate = new Date();
  currentDate.setDate(1); // Ensure we start at the beginning of the month

  for (let i = 0; i < 4; i++) {
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
    const month = targetDate.getMonth();
    const year = targetDate.getFullYear();
    const id = getColumnId(targetDate);

    columns.push({
      id,
      month,
      year,
      cards: [],
    });
  }

  return columns;
}

export function formatColumnTitle(month: number, year: number): string {
  const monthName = MONTH_NAMES[month] || '';
  return `${monthName} ${year}`;
}

export function formatFriendlyDate(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
