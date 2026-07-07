import React, { useState, useEffect } from 'react';
import styles from './CardEditor.module.css';
import type { Card, CardPriority } from '../../models/Card';
import { generateId } from '../../utils/ids';
import { compressImage } from '../../utils/images';

interface MonthlyCardEditorProps {
  initialCard: Card | null;
  onSave: (card: Card) => void;
  onClose: () => void;
}

export const MonthlyCardEditor: React.FC<MonthlyCardEditorProps> = ({ initialCard, onSave, onClose }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [monto, setMonto] = useState<string>('');
  const [priority, setPriority] = useState<CardPriority>('medium');
  const [scheduledDate, setScheduledDate] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);

  useEffect(() => {
    if (initialCard) {
      setTitle(initialCard.title);
      setDescription(initialCard.description);
      setMonto(initialCard.monto !== undefined ? String(initialCard.monto) : '');
      setPriority(initialCard.priority);

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
      title: title.trim(),
      description: description.trim(),
      monto: monto !== '' ? parseFloat(monto) : undefined,
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
          <h2>{initialCard ? 'Editar Gasto/Tarea' : 'Nuevo Gasto/Tarea'}</h2>
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
              placeholder="Ej. Pago de Alquiler..."
              autoFocus
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="monto">Monto ($)</label>
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

          <div className={styles.formGroup}>
            <label htmlFor="scheduledDate">Programado Para:</label>
            <input
              id="scheduledDate"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
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
            <label htmlFor="description">Descripción / Notas</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles adicionales..."
              rows={4}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="images">Evidencias / Fotos (Múltiple)</label>
            <input
              id="images"
              type="file"
              accept="image/*"
              multiple
              onChange={handleImagesChange}
              className={styles.fileInput}
            />
            {isCompressing && <p className={styles.loadingText}>Procesando imágenes...</p>}

            {images.length > 0 && (
              <div className={styles.imagesGrid}>
                {images.map((img, index) => (
                  <div key={index} className={styles.imageThumbContainer}>
                    <img src={img} alt={`Refuerzo ${index + 1}`} />
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
              Guardar Gasto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
