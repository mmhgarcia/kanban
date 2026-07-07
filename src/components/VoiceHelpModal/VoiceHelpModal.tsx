import React from 'react';
import styles from './VoiceHelpModal.module.css';

interface VoiceHelpModalProps {
  onClose: () => void;
}

export const VoiceHelpModal: React.FC<VoiceHelpModalProps> = ({ onClose }) => {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>🎙️ Comandos de Voz</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.content}>
          <div className={styles.section}>
            <h3>📄 Crear Tarjetas</h3>
            <ul className={styles.commandList}>
              <li className={styles.commandItem}>
                <span className={styles.example}>"Nueva tarjeta en Julio Pagar el Agua"</span>
                <span className={styles.description}>Abre el editor con el título y la fecha autocompletada.</span>
              </li>
              <li className={styles.commandItem}>
                <span className={styles.example}>"Añadir en Backlog Diseño de Logo"</span>
                <span className={styles.description}>Funciona con nombres de meses o de estados + el título.</span>
              </li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>✅ Estado y Edición</h3>
            <ul className={styles.commandList}>
              <li className={styles.commandItem}>
                <span className={styles.example}>"Cerrar número 5"</span>
                <span className={styles.description}>Marca la tarjeta #5 como completada.</span>
              </li>
              <li className={styles.commandItem}>
                <span className={styles.example}>"Reabrir la 3"</span>
                <span className={styles.description}>Vuelve a poner la tarjeta #3 en pendiente.</span>
              </li>
              <li className={styles.commandItem}>
                <span className={styles.example}>"Editar número 8"</span>
                <span className={styles.description}>Abre el editor para modificar la tarjeta #8.</span>
              </li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>↕️ Movimiento Vertical</h3>
            <ul className={styles.commandList}>
              <li className={styles.commandItem}>
                <span className={styles.example}>"Sube la 10" / "Arriba la 10"</span>
                <span className={styles.description}>Mueve la tarjeta un puesto hacia arriba.</span>
              </li>
              <li className={styles.commandItem}>
                <span className={styles.example}>"Baja la 4" / "Abajo la 4"</span>
                <span className={styles.description}>Mueve la tarjeta un puesto hacia abajo.</span>
              </li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>↔️ Movimiento Horizontal</h3>
            <ul className={styles.commandList}>
              <li className={styles.commandItem}>
                <span className={styles.example}>"Mueve la 5 a la derecha" / "Avanza la 5"</span>
                <span className={styles.description}>Mueve la tarjeta a la siguiente columna o mes.</span>
              </li>
              <li className={styles.commandItem}>
                <span className={styles.example}>"Mueve la 2 a la izquierda" / "Atrás la 2"</span>
                <span className={styles.description}>Mueve la tarjeta a la columna o mes anterior.</span>
              </li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>🗑️ Eliminación</h3>
            <ul className={styles.commandList}>
              <li className={styles.commandItem}>
                <span className={styles.example}>"Borra la número 7" / "Elimina la 7"</span>
                <span className={styles.description}>Elimina la tarjeta (pedirá confirmación).</span>
              </li>
            </ul>
          </div>

          <div className={styles.section}>
            <h3>❓ Ayuda</h3>
            <ul className={styles.commandList}>
              <li className={styles.commandItem}>
                <span className={styles.example}>"Ayuda" / "Help"</span>
                <span className={styles.description}>Muestra esta ventana de comandos.</span>
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.footer}>
          Pulsa el icono 🎤 y habla con naturalidad.
        </div>
      </div>
    </div>
  );
};
