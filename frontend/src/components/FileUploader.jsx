// src/components/FileUploader.jsx
import React, { useState, useRef } from 'react';
import heic2any from 'heic2any';
import { Button } from './Button';
import DocumentEditor from './DocumentEditor';
import ScanProcessor from './ScanProcessor';
import { compressImage } from '../utils/compressImage';
import { requestWithRetry } from '../utils/requestWithRetry';

export default function FileUploader({ onSuccess, onCancel }) {
  // Sammlung gescannter Seiten: {blob, url}
  const [photos, setPhotos] = useState([]);
  // State für aktuell bearbeitete Datei
  const [file, setFile] = useState(null);
  const [imageURL, setImageURL] = useState('');
  const [processedBlobURL, setProcessedBlobURL] = useState('');
  const [processedBlob, setProcessedBlob] = useState(null);
  const [initialCorners, setInitialCorners] = useState(null);

  // 'select' | 'auto' | 'previewProcessed' | 'manual' | 'uploadingAll'
  const [mode, setMode] = useState('select');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const hasProcessedRef = useRef(false);

  // Datei auswählen
  const handleChange = async (e) => {
    setError('');
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Wir nehmen zunächst nur das erste Bild (wie Kamera-Flow)
    const f = files[0];
    if (!f) return;

    const isHeic = f.type === 'image/heic' || f.name.toLowerCase().endsWith('.heic');

    try {
      let imageBlob = f;

      // HEIC in JPEG konvertieren
      if (isHeic) {
        try {
          const converted = await heic2any({
            blob: f,
            toType: 'image/jpeg',
            quality: 0.92,
          });
          imageBlob = converted instanceof Blob ? converted : converted[0];
        } catch (err) {
          setError(
            'Das Bild konnte nicht verarbeitet werden. Bitte HEIC-Fotos vorher manuell in JPG umwandeln, falls Sie nicht direkt über ein iPhone hochladen. Sonst bitte in den iPhone-Einstellungen unter\n"Kamera" > "Formate" die Option "Maximale Kompatibilität" aktivieren.\nFehler: ' +
              err.message
          );
          return;
        }
      }

      const url = URL.createObjectURL(imageBlob);
      setFile(
        imageBlob instanceof File
          ? imageBlob
          : new File([imageBlob], f.name.replace(/\.heic$/i, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
      );
      setImageURL(url);
      setMode('auto');
      hasProcessedRef.current = false;
    } catch (e) {
      setError('Allgemeiner Fehler beim Laden der Datei: ' + e.message);
    }
  };

  // Upload-Helper für PDF oder andere Nicht-Bilder (selten genutzt)
  const uploadFileDirect = async (f) => {
    if (!navigator.onLine) {
      setError('Offline: Bitte Verbindung prüfen.');
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', f);
      const res = await requestWithRetry('/api/upload', {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!res.ok || !data.filePath) {
        throw new Error(data.error || 'Upload fehlgeschlagen');
      }
      onSuccess([data.filePath]);
    } catch (err) {
      setError(`Upload fehlgeschlagen: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Nach Auto-Scan → Vorschau-Modus
  const handleAutoSuccess = (blob) => {
    if (hasProcessedRef.current) return;
    hasProcessedRef.current = true;
    const url = URL.createObjectURL(blob);
    setProcessedBlobURL(url);
    setProcessedBlob(blob);
    setMode('previewProcessed');
  };

  // Bei Auto-Scan-Fehler → Manueller Modus mit 10%-Innenrand
  const handleAutoError = (errMsg) => {
    if (hasProcessedRef.current) return;
    setError(`Auto-Detect fehlgeschlagen: ${errMsg}`);
    const img = new Image();
    img.onload = () => {
      const insetX = img.width * 0.1;
      const insetY = img.height * 0.1;
      setInitialCorners([
        { x: insetX, y: insetY },
        { x: img.width - insetX, y: insetY },
        { x: img.width - insetX, y: img.height - insetY },
        { x: insetX, y: img.height - insetY }
      ]);
      setMode('manual');
    };
    img.src = imageURL;
  };

  // Seite aus Vorschau zur Sammlung hinzufügen
  const handleAddToPhotos = () => {
    if (!processedBlob || !processedBlobURL) return;
    setPhotos((prev) => [...prev, { blob: processedBlob, url: processedBlobURL }]);
    // Clean up aktuell bearbeitete Seite
    cleanupCurrent();
    setMode('select');
  };

  // Clean up Hilfsfunktion
  function cleanupCurrent() {
    if (imageURL) URL.revokeObjectURL(imageURL);
    if (processedBlobURL) URL.revokeObjectURL(processedBlobURL);
    setFile(null);
    setImageURL('');
    setProcessedBlobURL('');
    setProcessedBlob(null);
    setInitialCorners(null);
    setError('');
  }

  // Einzelnes Foto aus Sammlung entfernen
  const removePhotoAt = (idx) => {
    setPhotos((prev) => {
      if (prev[idx]?.url) URL.revokeObjectURL(prev[idx].url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  // Upload aller gesammelten Seiten
  const handleUploadAllAndProceed = async () => {
    if (photos.length === 0) {
      setError('Mindestens eine Seite muss hinzugefügt werden.');
      return;
    }
    setMode('uploadingAll');
    setUploading(true);
    setError('');

    try {
      const uploadedPaths = [];
      for (let i = 0; i < photos.length; i++) {
        const { blob, url } = photos[i];
        const compressed = await compressImage(blob, 2 * 1024 * 1024);
        const f = new File(
          [compressed],
          `upload-${Date.now()}-${i}.jpg`,
          { type: compressed.type }
        );
        const form = new FormData();
        form.append('file', f);

        const res = await requestWithRetry('/api/upload', {
          method: 'POST',
          body: form,
        });
        const data = await res.json();
        if (!res.ok || !data.filePath) {
          throw new Error(data.error || 'Upload fehlgeschlagen');
        }
        uploadedPaths.push(data.filePath);
        URL.revokeObjectURL(url);
      }
      onSuccess(uploadedPaths);
    } catch (err) {
      setError(`Kompression/Upload fehlgeschlagen: ${err.message}`);
      setMode('select');
    } finally {
      setUploading(false);
      cleanupCurrent();
      setPhotos([]);
    }
  };

  // Neu scannen / alles zurücksetzen
  const handleRetakeOrManual = () => {
    cleanupCurrent();
    setMode('select');
  };

  // Manueller Zuschnitt bestätigt → Seite zur Sammlung hinzufügen
  const handleManualConfirm = (blob) => {
    if (hasProcessedRef.current) return;
    hasProcessedRef.current = true;
    const url = URL.createObjectURL(blob);
    setProcessedBlob(blob);
    setProcessedBlobURL(url);
    setMode('previewProcessed');
  };

  // UI je nach Modus
  switch (mode) {
    case 'select':
      return (
        <div className="bg-white shadow rounded-lg p-6 w-full">
          <h2 className="text-lg font-bold mb-4">📤 Datei hochladen</h2>
          {error && <p className="text-red-600 mb-2 whitespace-pre-line">❌ {error}</p>}
          <input
            type="file"
            accept="image/jpeg,image/png,image/*,.pdf"
            multiple
            onChange={handleChange}
            disabled={uploading}
          />
          <div className="flex gap-2 mt-4">
            <Button variant="secondary" onClick={onCancel} disabled={uploading}>
              Abbrechen
            </Button>
          </div>
          {/* Galerie der hinzugefügten Seiten */}
          {photos.length > 0 && (
            <div className="mb-4 mt-6">
              <h3 className="font-semibold mb-2">📚 Hinzugefügte Seiten</h3>
              <div className="flex gap-2 overflow-x-auto">
                {photos.map((p, idx) => (
                  <div
                    key={idx}
                    className="relative inline-block border rounded overflow-hidden w-20 h-28"
                  >
                    <img
                      src={p.url}
                      alt={`Seite ${idx + 1}`}
                      className="object-cover w-full h-full"
                    />
                    <button
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center"
                      onClick={() => removePhotoAt(idx)}
                      title="Entfernen"
                      tabIndex={-1}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="text-center mt-2">
                <Button onClick={handleUploadAllAndProceed} disabled={uploading}>
                  ✅ Fertig (Fotos hochladen)
                </Button>
              </div>
            </div>
          )}
        </div>
      );

    case 'auto':
      return (
        <div className="bg-white shadow rounded-lg p-6 w-full">
          {error && <p className="text-red-600 mb-2">❌ {error}</p>}
          <h2 className="text-lg font-bold mb-4">🔍 Automatische Kantenerkennung</h2>
          <ScanProcessor
            src={imageURL}
            onProcessed={handleAutoSuccess}
            onError={handleAutoError}
          />
          <div className="mt-4 flex gap-2">
            <Button
              variant="secondary"
              onClick={handleRetakeOrManual}
              disabled={uploading}
            >
              Abbrechen
            </Button>
          </div>
        </div>
      );

    case 'previewProcessed':
      return (
        <div className="bg-white shadow rounded-lg p-6 w-full">
          {error && <p className="text-red-600 mb-2">❌ {error}</p>}
          <h2 className="text-lg font-bold mb-4">📷 Vorschau</h2>
          <div className="mb-4">
            <img
              src={processedBlobURL}
              alt="Zugeschnittene Vorschau"
              className="max-w-full border rounded shadow"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAddToPhotos} disabled={uploading}>
              ➕ Seite zur Sammlung hinzufügen
            </Button>
            <Button variant="secondary" onClick={handleRetakeOrManual} disabled={uploading}>
              ↺ Neu scannen / manueller Modus
            </Button>
          </div>
        </div>
      );

    case 'manual':
      return (
        <div className="bg-white shadow rounded-lg p-6 w-full">
          {error && <p className="text-red-600 mb-2">❌ {error}</p>}
          <h2 className="text-lg font-bold mb-4">✏️ Manuelle Kantenauswahl</h2>
          {file && initialCorners ? (
            <DocumentEditor
              src={imageURL}
              initialCorners={initialCorners}
              onConfirm={handleManualConfirm}
              onCancel={handleRetakeOrManual}
            />
          ) : (
            <p>Warte auf Bild und Eckpunkte…</p>
          )}
        </div>
      );

    case 'uploadingAll':
      return (
        <div className="bg-white shadow rounded-lg p-6 w-full">
          <p className="text-gray-600 mb-2">🔄 Upload läuft…</p>
        </div>
      );

    default:
      return null;
  }
}
