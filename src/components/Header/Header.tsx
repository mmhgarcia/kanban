import React from 'react';
import styles from './Header.module.css';
import type { Column } from '../../models/Column';
import { formatColumnTitle } from '../../utils/dates';

interface HeaderProps {
  columns: Column[];
}

export const Header: React.FC<HeaderProps> = ({ columns }) => {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>Kanban Board</h1>
      <div className={styles.monthsContainer}>
        {columns.map((col) => (
          <div key={col.id} className={styles.monthLabel}>
            {formatColumnTitle(col.month, col.year)}
          </div>
        ))}
      </div>
    </header>
  );
};
