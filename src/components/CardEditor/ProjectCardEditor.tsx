import React, { useState, useEffect } from 'react';
import styles from './CardEditor.module.css';
import type { Card, CardPriority } from '../../models/Card';
import { generateId } from '../../utils/ids';
import { compressImage } from '../../utils/images';

interface ProjectCardEditorProps {
  initialCard: Card | null;
  onSave: (card: Card) => void;
  onClose: () => void;
}

export const ProjectCardEditor: React.FC<ProjectCardEditorProps> = ({ initialCard, onSave, onClose }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<CardPriority>('medium');
  const [scheduledDate, setScheduledDate] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);

  useEffect(() => {
    if (initialCard) {
      setTitle(initialCard.title || '');
      setDescription(initialCard.description || '');
      setPriority(initialCard.priority || 'medium');

      if (initialCard.images) {
        setImages(initialCard.images);
      } else if ((initialCard as any).image) {
        setImages([(initialCard as any).image]);
      }

      if (initialCard.scheduledDate) {
        setScheduledDate(initialCard.scheduledDate);
      }
    }
  }, [initialCard]);

  const handleImagesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsCompressing(true);
      const newImages: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressImage(files[i]);
        newImages.push(compressed);
      }
      setImages(prev => [...prev, ...newImages]);
    } catch (error) {
      console.error('Error compressing images', error);
      alert('Error al procesar las imágenes');
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const now = new Date().toISOString();
    const card: Card = {
      id: initialCard?.id || generateId(),
      displayId: initialCard?.displayId,
      title: title.trim(),
      description: description.trim(),
      priority,
      status: initialCard?.status || 'open',
      scheduledDate: scheduledDate || undefined,
      images,
      created: initialCard?.created || now,
      updated: now,
    };

    onSave(card);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>{initialCard ? 'Editar Tarea de Proyecto' : 'Nueva Tarea de Proyecto'}</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="title">Título de la Tarea</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Implementar login..."
              autoFocus
              required
            />
          </div>

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
            <label htmlFor="scheduledDate">Vencimiento (Opcional):</label>
            <input
              id="scheduledDate"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">Descripción / Requerimientos</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Pasos a seguir, especificaciones..."
              rows={6}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="images">Capturas / Adjuntos</label>
            <input
              id="images"
              type="file"
              accept="image/*"
              multiple
              onChange={handleImagesChange}
              className={styles.fileInput}
            />
            {isCompressing && <p className={styles.loadingText}>Procesando adjuntos...</p>}

            {images.length > 0 && (
              <div className={styles.imagesGrid}>
                {images.map((img, index) => (
                  <div key={index} className={styles.imageThumbContainer}>
                    <img src={img} alt={`Adjunto ${index + 1}`} />
                    <button
                      type="button"
                      className={styles.removeThumbBtn}
                      onClick={() => removeImage(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className={styles.saveBtn} disabled={!title.trim() || isCompressing}>
              Guardar Tarea
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
