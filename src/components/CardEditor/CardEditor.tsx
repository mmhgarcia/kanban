import React, { useState, useEffect } from 'react';
import styles from './CardEditor.module.css';
import type { Card, CardPriority } from '../../models/Card';
import type { BoardMode } from '../../models/Board';
import { generateId } from '../../utils/ids';
import { compressImage } from '../../utils/images';

interface CardEditorProps {
  initialCard: Card | null;
  mode: BoardMode;
  onSave: (card: Card) => void;
  onClose: () => void;
}

export const CardEditor: React.FC<CardEditorProps> = ({ initialCard, mode, onSave, onClose }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [monto, setMonto] = useState<string>('');
  const [priority, setPriority] = useState<CardPriority>('medium');
  const [scheduledDate, setScheduledDate] = useState('');
  const [image, setImage] = useState<string | undefined>('');
  const [isCompressing, setIsCompressing] = useState(false);

  useEffect(() => {
    if (initialCard) {
      setTitle(initialCard.title);
      setDescription(initialCard.description);
      setMonto(initialCard.monto !== undefined ? String(initialCard.monto) : '');
      setPriority(initialCard.priority);
      setImage(initialCard.image);
      if (initialCard.scheduledDate) {
        setScheduledDate(initialCard.scheduledDate);
      }
    }
  }, [initialCard]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      const compressed = await compressImage(file);
      setImage(compressed);
    } catch (error) {
      console.error('Error compressing image', error);
      alert('Error al procesar la imagen');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const now = new Date().toISOString();
    const card: Card = {
      id: initialCard?.id || generateId(),
      title: title.trim(),
      description: description.trim(),
      monto: mode === 'monthly' && monto !== '' ? parseFloat(monto) : undefined,
      priority,
      status: initialCard?.status || 'open',
      scheduledDate: scheduledDate || undefined,
      image,
      created: initialCard?.created || now,
      updated: now,
    };

    onSave(card);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>{initialCard ? 'Editar Tarjeta' : 'Nueva Tarjeta'}</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="title">Título</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Llamar al cliente..."
              autoFocus
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">Descripción</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles de la tarea..."
              rows={4}
            />
          </div>

          {mode === 'monthly' && (
            <div className={styles.formGroup}>
              <label htmlFor="monto">Monto</label>
              <input
                id="monto"
                type="number"
                min="0"
                step="0.01"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
              />
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="priority">Prioridad</label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as CardPriority)}
            >
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="scheduledDate">
              {mode === 'monthly' ? 'Programado Para:' : 'Fecha Límite:'}
            </label>
            <input
              id="scheduledDate"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="image">Imagen de Refuerzo (Opcional)</label>
            <input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className={styles.fileInput}
            />
            {isCompressing && <p className={styles.loadingText}>Comprimiendo imagen...</p>}
            {image && (
              <div className={styles.imagePreview}>
                <img src={image} alt="Vista previa" />
                <button
                  type="button"
                  className={styles.removeImgBtn}
                  onClick={() => setImage(undefined)}
                >
                  Eliminar Imagen
                </button>
              </div>
            )}
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className={styles.saveBtn} disabled={!title.trim() || isCompressing}>
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
