import React from 'react';
import styles from './Header.module.css';
import type { BoardMode, Project } from '../../models/Board';

interface HeaderProps {
  onNavigate: (delta: number) => void;
  onReset: () => void;
  mode: BoardMode;
  onModeChange: (mode: BoardMode) => void;
  projects: Project[];
  activeProjectId: string;
  onProjectChange: (id: string) => void;
  onAddProject: (name: string) => void;
  onRemoveProject: (id: string) => void;
  onVoiceCommand: (text: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onNavigate,
  onReset,
  mode,
  onModeChange,
  projects,
  activeProjectId,
  onProjectChange,
  onAddProject,
  onRemoveProject,
  onVoiceCommand
}) => {
  const [isListening, setIsListening] = React.useState(false);

  const handleVoiceButtonClick = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Tu navegador no soporta reconocimiento de voz.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = true; // Mantener abierto aunque haya pausas breves

    let silenceTimer: number;

    const stopRecognition = () => {
      recognition.stop();
      setIsListening(false);
      clearTimeout(silenceTimer);
    };

    recognition.onstart = () => {
      setIsListening(true);
      // Timer de seguridad por si no se habla nada
      silenceTimer = window.setTimeout(stopRecognition, 5000);
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      clearTimeout(silenceTimer);
    };

    recognition.onresult = (event: any) => {
      clearTimeout(silenceTimer);
      const text = event.results[event.results.length - 1][0].transcript;
      onVoiceCommand(text);

      // Detener automáticamente después de recibir el comando
      // pero damos un pequeño margen
      silenceTimer = window.setTimeout(stopRecognition, 1000);
    };

    recognition.start();
  };

  const handleAddProject = () => {
    const name = prompt('Nombre del nuevo proyecto:');
    if (name && name.trim()) {
      onAddProject(name.trim());
    }
  };

  const handleRemoveProject = () => {
    const project = projects.find(p => p.id === activeProjectId);
    if (!project) return;

    if (projects.length <= 1) {
      alert('No puedes eliminar el único proyecto existente.');
      return;
    }

    if (confirm(`¿Estás seguro de que deseas eliminar el proyecto "${project.name}" y todas sus columnas?`)) {
      onRemoveProject(activeProjectId);
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
          <button
            onClick={handleVoiceButtonClick}
            className={`${styles.voiceBtn} ${isListening ? styles.listening : ''}`}
            title="Comando de voz (Ej: 'Cerrar 1')"
          >
            {isListening ? '🎙️' : '🎤'}
          </button>

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
              <button onClick={handleRemoveProject} className={styles.removeProjectBtn} title="Eliminar Proyecto">🗑</button>
            </div>
          )}
        </div>

        <div className={styles.navigation}>
          {mode === 'monthly' && (
            <>
              <button onClick={() => onNavigate(-1)} className={styles.navBtn} title="Mes anterior">◀</button>
              <button onClick={onReset} className={styles.navBtn} title="Ir a hoy">Hoy</button>
              <button onClick={() => onNavigate(1)} className={styles.navBtn} title="Siguiente mes">▶</button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
