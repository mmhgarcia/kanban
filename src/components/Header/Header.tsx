import React from 'react';
import styles from './Header.module.css';
import type { Column } from '../../models/Column';
import type { BoardMode, Project } from '../../models/Board';
import { formatColumnTitle } from '../../utils/dates';

interface HeaderProps {
  columns: Column[];
  onNavigate: (delta: number) => void;
  onReset: () => void;
  mode: BoardMode;
  onModeChange: (mode: BoardMode) => void;
  projects: Project[];
  activeProjectId: string;
  onProjectChange: (id: string) => void;
  onAddProject: (name: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  columns,
  onNavigate,
  onReset,
  mode,
  onModeChange,
  projects,
  activeProjectId,
  onProjectChange,
  onAddProject
}) => {
  const handleAddProject = () => {
    const name = prompt('Nombre del nuevo proyecto:');
    if (name && name.trim()) {
      onAddProject(name.trim());
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.titleSection}>
        <div className={styles.left}>
          <h1 className={styles.title}>Kanban Board</h1>
          <div className={styles.modeSwitcher}>
            <button
              className={`${styles.modeBtn} ${mode === 'monthly' ? styles.active : ''}`}
              onClick={() => onModeChange('monthly')}
            >
              Mensual
            </button>
            <button
              className={`${styles.modeBtn} ${mode === 'status' ? styles.active : ''}`}
              onClick={() => onModeChange('status')}
            >
              Estados
            </button>
          </div>
        </div>

        <div className={styles.center}>
          {mode === 'status' && (
            <div className={styles.projectSelector}>
              <label htmlFor="project-select">Proyecto:</label>
              <select
                id="project-select"
                value={activeProjectId}
                onChange={(e) => onProjectChange(e.target.value)}
                className={styles.select}
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button onClick={handleAddProject} className={styles.addProjectBtn} title="Nuevo Proyecto">+</button>
            </div>
          )}
        </div>

        {mode === 'monthly' && (
          <div className={styles.navigation}>
            <button onClick={() => onNavigate(-1)} className={styles.navBtn} title="Mes anterior">◀</button>
            <button onClick={onReset} className={styles.navBtn} title="Ir a hoy">Hoy</button>
            <button onClick={() => onNavigate(1)} className={styles.navBtn} title="Siguiente mes">▶</button>
          </div>
        )}
      </div>
      <div className={`${styles.monthsContainer} ${mode === 'status' ? styles.statusMode : ''}`}>
        {columns.map((col) => (
          <div key={col.id} className={styles.monthLabel}>
            {mode === 'monthly'
              ? formatColumnTitle(col.month!, col.year!)
              : col.title}
          </div>
        ))}
      </div>
    </header>
  );
};
