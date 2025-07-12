// src/pages/Review.jsx
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { requestWithRetry } from '../utils/requestWithRetry';

export default function Review() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const filePaths = state?.filePaths || [];

  const [loadingAll, setLoadingAll] = useState(true);
  const [errorAll, setErrorAll]     = useState('');

  // States pro Seite
  const [ocrTexts, setOcrTexts]           = useState([]);
  const [textHistories, setTextHistories] = useState([]);
  const [rotations, setRotations]         = useState([]);
  const [loadingPage, setLoadingPage]     = useState([]);
  const [errorPages, setErrorPages]       = useState([]);
  const [ratios, setRatios]               = useState([]);

  const isPdf = (fp) => fp.toLowerCase().endsWith('.pdf');


  useEffect(() => {
    if (filePaths.length === 0) {
      setErrorAll('Keine Seiten übergeben.');
      setLoadingAll(false);
      return;
    }

    (async () => {
      try {
        // 1) OCR für jede Seite (mit Retry + Offline-Prüfung)
        const texts = [];
        for (let i = 0; i < filePaths.length; i++) {
          if (isPdf(filePaths[i])) {
        texts.push('(PDF - kein OCR)');
        continue; // Überspringe OCR!
      }
          if (!navigator.onLine) {
            throw new Error('Offline: Verbindung prüfen');
          }
          const res = await requestWithRetry('/api/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath: filePaths[i] })
          });
          const { text } = await res.json();
          texts.push(text || '');
        }
        setOcrTexts(texts);
        setTextHistories(texts.map(() => []));
        setRotations(texts.map(() => 0));
        setLoadingPage(texts.map(() => false));
        setErrorPages(texts.map(() => ''));

        // 2) Bild-Maße laden für aspect-ratio
    const ratioArr = await Promise.all(
      filePaths.map(fp =>
        isPdf(fp)
          ? Promise.resolve(0.707) // A4: 210/297 ≈ 0.707
          : new Promise(resolve => {
              const img = new window.Image();
              img.src = `/${fp}`;
              img.onload = () => resolve(img.naturalWidth / img.naturalHeight);
              img.onerror = () => resolve(1); // fallback
            })
      )
    );
        setRatios(ratioArr);
      } catch (err) {
        setErrorAll(err.message);
      } finally {
        setLoadingAll(false);
      }
    })();
  }, [filePaths]);

  const handleReloadPage = async idx => {
    // Einzelne Seite neu laden (OCR mit Retry + Offline)
    if (!navigator.onLine) {
      const newErr = [...errorPages];
      newErr[idx] = 'Offline: Verbindung prüfen';
      setErrorPages(newErr);
      return;
    }

    const lp = [...loadingPage];
    lp[idx] = true;
    setLoadingPage(lp);

    const ep = [...errorPages];
    ep[idx] = '';
    setErrorPages(ep);

    try {
      const res = await requestWithRetry('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: filePaths[idx] })
      });
       const payload = await res.json();
       if (payload.warning) {
         console.warn(`Review: OCR Warnung auf Seite ${i + 1}:`, payload.warning);
       }
       const text = payload.text || '';

      setOcrTexts(t => t.map((tt, i) => (i === idx ? text : tt)));
      setTextHistories(h => h.map((hh, i) => (i === idx ? [] : hh)));
      setRotations(r => r.map((rr, i) => (i === idx ? 0 : rr)));
    } catch (err) {
      ep[idx] = err.message;
      setErrorPages(ep);
    } finally {
      lp[idx] = false;
      setLoadingPage(lp);
    }
  };

  const handleTextChange = (idx, value) => {
    setTextHistories(h =>
      h.map((hist, i) => (i === idx ? [...hist, ocrTexts[idx]] : hist))
    );
    setOcrTexts(t => t.map((tt, i) => (i === idx ? value : tt)));
  };

  const handleUndo = idx => {
    setTextHistories(h =>
      h.map((hist, i) => {
        if (i !== idx || hist.length === 0) return hist;
        const prev = hist[hist.length - 1];
        setOcrTexts(t => t.map((tt, j) => (j === idx ? prev : tt)));
        return hist.slice(0, -1);
      })
    );
  };

  const rotateLeft = idx =>
    setRotations(r => r.map((rr, i) => (i === idx ? (rr + 270) % 360 : rr)));

  const rotateRight = idx =>
    setRotations(r => r.map((rr, i) => (i === idx ? (rr + 90) % 360 : rr)));

  if (loadingAll)
    return <div className="p-4">🔄 Lade OCR für alle Seiten…</div>;

  if (errorAll)
    return (
      <div className="p-4 text-red-600">
        ❌ Fehler: {errorAll}
        <div className="mt-4">
          <Button onClick={() => navigate('/')}>Zurück</Button>
        </div>
      </div>
    );

  return (
    <div className="bg-white shadow rounded-lg p-6 w-full">
      <h2 className="text-xl font-bold">📄 Seiten prüfen</h2>

      {filePaths.map((fp, idx) => {
        // dynamische aspect-ratio: je nach Rotation drehen wir das Verhältnis um
        const ratio = ratios[idx] || 1;
        const aspect = rotations[idx] % 180 === 0 ? ratio : 1 / ratio;

        return (
          <div key={idx} className="border p-4 rounded shadow">
            <h3 className="font-semibold mb-2">Seite {idx + 1}</h3>

            {/* Bild-Container */}
{isPdf(fp) ? (
  // PDF Vorschau/Link
  <div className="mb-4 flex flex-col items-center justify-center" style={{width: '100%', maxWidth: '600px', aspectRatio: '0.707', background: '#f5f5f5', borderRadius: '8px'}}>
    <span style={{fontSize: '3em'}}>📄</span>
    <a
      href={`/${fp}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-700 underline mt-2"
    >
      PDF öffnen
    </a>
  </div>
) : (
  // Bild-Vorschau wie bisher
  <div
    className="mb-4 border rounded mx-auto overflow-hidden"
    style={{
      width: '100%',
      maxWidth: '600px',
      aspectRatio: `${aspect}`,
      backgroundColor: '#f9f9f9'
    }}
  >
    <img
      src={`/${fp}`}
      alt={`Seite ${idx + 1}`}
      className="w-full h-full object-contain"
      style={{
        transform: `rotate(${rotations[idx]}deg)`,
        transformOrigin: 'center center',
        transition: 'transform 0.3s ease'
      }}
    />
  </div>
)}


            {/* Loading / Error für diese Seite */}
            {loadingPage[idx] && (
              <p className="text-gray-600 mb-2">🔄 Lade Seite…</p>
            )}
            {errorPages[idx] && (
              <p className="text-red-600 mb-2">❌ {errorPages[idx]}</p>
            )}

{/* Controls */}
<div className="flex flex-wrap gap-2 mb-4">
  {!isPdf(fp) && (
    <>
      <Button variant="secondary" onClick={() => handleReloadPage(idx)} disabled={loadingPage[idx]}>
        Seite neu laden
      </Button>
      <Button variant="secondary" onClick={() => rotateLeft(idx)}>
        ↺ Drehen
      </Button>
      <Button variant="secondary" onClick={() => rotateRight(idx)}>
        ↻ Drehen
      </Button>
      <Button variant="secondary" onClick={() => handleUndo(idx)} disabled={textHistories[idx].length === 0}>
        ↶ Undo
      </Button>
    </>
  )}
</div>
{/* OCR-Text */}
{isPdf(fp) ? (
  <label className="font-semibold block mb-1 text-gray-500">Kein OCR für PDF-Dateien</label>
) : (
  <>
    <label className="font-semibold block mb-1">OCR-Text:</label>
    <textarea
      className="w-full h-32 p-2 border rounded"
      value={ocrTexts[idx]}
      onChange={e => handleTextChange(idx, e.target.value)}
    />
  </>
)}
          </div>
        );
      })}

      <div className="text-center">
        <Button
          onClick={() =>
            navigate('/send', { state: { filePaths, ocrTexts } })
          }
        >
          Weiter zur PDF-Erzeugung ➡️
        </Button>
      </div>
    </div>
  );
}
