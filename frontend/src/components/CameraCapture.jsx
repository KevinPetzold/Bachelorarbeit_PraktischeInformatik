// src/components/CameraCapture.jsx
import React, { useRef, useState, useEffect } from 'react';
import { Button } from './Button';
import DocumentEditor from './DocumentEditor';
import ScanProcessor from './ScanProcessor';
import { compressImage } from '../utils/compressImage';
import { requestWithRetry } from '../utils/requestWithRetry';
import { useNavigate } from 'react-router-dom';

export default function CameraCapture({ onSuccess, onCancel }) {
  const navigate = useNavigate();
  const videoRef = useRef(null);

  // 1) Object-URL des Live-Frames
  const [imgSrc, setImgSrc] = useState('');

  // 2) Blob + URL nach erfolgreicher Kantenerkennung
  const [processedBlob, setProcessedBlob] = useState(null);
  const [processedBlobURL, setProcessedBlobURL] = useState('');

  // 3) Eckpunkte für manuellen Zuschnitt
  const [initialCorners, setInitialCorners] = useState(null);

  // 4) Gesammelte Seiten
  const [photos, setPhotos] = useState([]); 
  //    jedes Element: { blob: Blob, url: string }

  // 5) Modus‐State
  // 'preview'           → Live‐Kamera  
  // 'auto'              → ScanProcessor  
  // 'previewProcessed'  → Vorschau des zugeschnittenen Bildes  
  // 'manual'            → Manueller Zuschnitt per DocumentEditor  
  // 'uploadingAll'      → Hochladen aller gesammelten Seiten  
  const [mode, setMode] = useState('preview');

  // 6) Fehlermeldung
  const [error, setError] = useState('');

  // 7) Guard für onProcessed / onConfirm
  const hasProcessedRef = useRef(false);

  // -------------------------------------
  // Kamera starten/stoppen
  // -------------------------------------
  useEffect(() => {
    let stream;
    if (mode === 'preview') {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then(s => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch(() => {
          setError('Kamera konnte nicht gestartet werden.');
        });
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mode]);

  // -------------------------------------
  // Foto aufnehmen → in `auto`-Modus
  // -------------------------------------
  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      setError('Kein Kamerabild verfügbar.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      setImgSrc(url);
      setMode('auto');
      hasProcessedRef.current = false; // Guard zurücksetzen
      setError('');
    }, 'image/jpeg');
  };

  // -------------------------------------
  // Auto-Kantenerkennung erfolgreich → `previewProcessed`
  // -------------------------------------
  const handleAutoSuccess = blob => {
    if (hasProcessedRef.current) return;
    hasProcessedRef.current = true;

    const url = URL.createObjectURL(blob);
    setProcessedBlob(blob);
    setProcessedBlobURL(url);
    setError('');
    setMode('previewProcessed');
  };

  // -------------------------------------
  // „✏️ Manuell anpassen“ aus Vorschau → `manual`
  // -------------------------------------
  const startManualAfterAuto = () => {
    setError('');
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
      hasProcessedRef.current = false;
      setMode('manual');
    };
    img.src = imgSrc;
  };

  // -------------------------------------
  // „➕ Dieses Foto zur Sammlung hinzufügen“
  // -------------------------------------
  const handleAddToPhotos = () => {
    if (!processedBlob || !processedBlobURL) return;

    setPhotos(prev => [...prev, { blob: processedBlob, url: processedBlobURL }]);

    // Aufräumen und zurück in `preview`
    setImgSrc('');
    setProcessedBlob(null);
    setProcessedBlobURL('');
    setInitialCorners(null);
    setError('');
    setMode('preview');
  };

  // -------------------------------------
  // Einzelnes Foto aus der Galerie entfernen
  // -------------------------------------
  const removePhotoAt = idx => {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[idx].url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  // -------------------------------------
  // „✅ Fertig (Fotos hochladen)“ → Upload aller + navigate to /review
  // -------------------------------------
  const handleUploadAllAndProceed = async () => {
    if (photos.length === 0) {
      setError('Mindestens eine Seite muss aufgenommen werden.');
      return;
    }
    setMode('uploadingAll');
    setError('');

    try {
      const uploadedPaths = [];
      for (let i = 0; i < photos.length; i++) {
        const { blob, url } = photos[i];

        // Kompression auf ≤ 2 MB
        const compressed = await compressImage(blob, 2 * 1024 * 1024);
        const file = new File(
          [compressed], 
          `scan-${Date.now()}-${i}.jpg`, 
          { type: compressed.type }
        );
        const form = new FormData();
        form.append('file', file);

        // upload mit Retry‐Logik
        const res = await requestWithRetry('/api/upload', {
          method: 'POST',
          body: form
        });
        const data = await res.json();
        if (!res.ok || !data.filePath) {
          throw new Error(data.error || 'Ein Upload schlug fehl.');
        }
        uploadedPaths.push(data.filePath);
        URL.revokeObjectURL(url);
      }

      // Navigiere zur Review‐Seite mit Array von filePaths
      onSuccess(uploadedPaths);
    } catch (err) {
      setError(`Fehler beim Hochladen: ${err.message}`);
      setMode('preview');
    }
  };

  // -------------------------------------
  // „↺ Neu scannen / Manueller Modus“ oder Abbruch → alles zurücksetzen
  // -------------------------------------
  const handleRetakeOrManual = () => {
    URL.revokeObjectURL(imgSrc);
    URL.revokeObjectURL(processedBlobURL);

    setMode('preview');
    setImgSrc('');
    setProcessedBlob(null);
    setProcessedBlobURL('');
    setInitialCorners(null);
    setError('');
  };

  // -------------------------------------
  // Rendering je nach mode
  // -------------------------------------
  switch (mode) {
    // ---------------------------------------------------
    // 1) Live‐Kamera (preview)
    // ---------------------------------------------------
    case 'preview':
      return (
        <div className="bg-white shadow rounded-lg p-6 w-full">
          {error && <p className="text-red-600 mb-2">❌ {error}</p>}
          <video ref={videoRef} autoPlay className="w-full mb-4 border rounded" />

          <div className="flex gap-2 mb-4">
            <Button onClick={capture}>📸 Foto aufnehmen</Button>
            <Button
              variant="secondary"
              onClick={() => {
                URL.revokeObjectURL(imgSrc);
                onCancel();
              }}
            >
              Abbrechen
            </Button>
          </div>

          {/* Galerie der bereits hinzugefügten Seiten */}
          {photos.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold mb-2">📚 Aufgenommene Seiten</h3>
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
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* "Fertig"-Button nur anzeigen, wenn mind. ein Foto existiert */}
          {photos.length > 0 && (
            <div className="text-center">
              <Button onClick={handleUploadAllAndProceed}>
                ✅ Fertig (Fotos hochladen)
              </Button>
            </div>
          )}
        </div>
      );

    // ---------------------------------------------------
    // 2) Automatische Kantenerkennung (auto)
    // ---------------------------------------------------
    case 'auto':
      return (
        <div className="bg-white shadow rounded-lg p-6 w-full">
          {error && <p className="text-red-600 mb-2">❌ {error}</p>}
          <h2 className="text-lg font-bold mb-4">🔍 Automatische Kantenerkennung</h2>
          <ScanProcessor
            src={imgSrc}
            onProcessed={handleAutoSuccess}
            onError={errMsg => {
              if(!hasProcessedRef.current) {
              startManualAfterAuto();
              setError(errMsg);}
            }}
          />
          <div className="mt-4">
            <Button
              variant="secondary"
              onClick={handleRetakeOrManual}
            >
              Abbrechen
            </Button>
          </div>
        </div>
      );

    // ---------------------------------------------------
    // 3) Vorschau des zugeschnittenen Fotos (previewProcessed)
    // ---------------------------------------------------
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
            <Button onClick={handleAddToPhotos}>
              ➕ Dieses Foto zur Sammlung hinzufügen
            </Button>
            <Button variant="secondary" onClick={startManualAfterAuto}>
              ✏️ Manuell Kanten anpassen
            </Button>
            <Button variant="secondary" onClick={handleRetakeOrManual}>
              ↺ Neu scannen
            </Button>
          </div>
        </div>
      );

    // ---------------------------------------------------
    // 4) Manueller Zuschnitt (manual)
    // ---------------------------------------------------
    case 'manual':
      return (
        <div className="bg-white shadow rounded-lg p-6 w-full">
          {error && <p className="text-red-600 mb-2">❌ {error}</p>}
          <h2 className="text-lg font-bold mb-4">✏️ Manueller Zuschnitt</h2>
          {initialCorners ? (
            <DocumentEditor
              src={imgSrc}
              initialCorners={initialCorners}
              onConfirm={blob => {
                if (hasProcessedRef.current) return;
                hasProcessedRef.current = true;
                const url = URL.createObjectURL(blob);
                setProcessedBlob(blob);
                setProcessedBlobURL(url);
                setMode('previewProcessed');
              }}
              onCancel={handleRetakeOrManual}
            />
          ) : (
            <p>Warte auf Bild und Eckpunkte …</p>
          )}
        </div>
      );

    // ---------------------------------------------------
    // 5) Hochladen aller Fotos (uploadingAll)
    // ---------------------------------------------------
    case 'uploadingAll':
      return (
        <div className="bg-white shadow rounded-lg p-6 w-full">
          <p className="text-gray-600 mb-2">
            🔄 Hochladevorgang läuft… Bitte warten
          </p>
        </div>
      );

    // ---------------------------------------------------
    // 6) Fallback (tritt hoffentlich nie ein)
    // ---------------------------------------------------
    default:
      return null;
  }
}