import type { Column } from '../models/Column';

export function getInitialStatusColumns(): Column[] {
  return [
    { id: 'backlog', title: 'Backlog', cards: [] },
    { id: 'todo', title: 'To Do', cards: [] },
    { id: 'doing', title: 'Doing', cards: [] },
    { id: 'testing', title: 'Testing', cards: [] },
    { id: 'done', title: 'Done', cards: [] },
  ];
}
