import type { Column } from '../models/Column';

export function getInitialStatusColumns(): Column[] {
  return [
    { id: 'documentation', title: 'DOCUMENTATION', cards: [] },
    { id: 'backlog', title: 'BACKLOG', cards: [] },
    { id: 'doing', title: 'DOING', cards: [] },
    { id: 'testing', title: 'TESTING', cards: [] },
    { id: 'done', title: 'DONE', cards: [] },
  ];
}
