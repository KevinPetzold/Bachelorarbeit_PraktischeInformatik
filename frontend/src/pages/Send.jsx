
// src/pages/Send.jsx
import React, { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { AuthContext } from '../components/AuthContext';

export default function Send() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const filePaths = state?.filePaths || [];
  const ocrTexts = state?.ocrTexts || [];

  const { user } = useContext(AuthContext); 

  const [pdfUrl, setPdfUrl] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | success | error
  const [error, setError]   = useState('');

  if (filePaths.length === 0) {
    return (
      <div className="p-4 text-red-600">
        ❌ Keine Seiten zum Versenden.
        <div className="mt-4">
          <Button onClick={() => navigate('/')}>Zurück</Button>
        </div>
      </div>
    );
  }

  const handleSend = async () => {
    setStatus('sending');
    setError('');
    const token = localStorage.getItem('token');

    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}`,},
        body: JSON.stringify({ images: filePaths, texts: ocrTexts }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehler beim Erzeugen des PDFs');
      const url = `http://localhost:3001/${data.pdfPath}`;
      const invNum = data.invoice;
      setPdfUrl(url);
      setStatus('success');

  try {
    const pdfResp = await fetch(url, { credentials: 'include' });
    if (!pdfResp.ok) throw new Error('Download fehlgeschlagen');

    const blob    = await pdfResp.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href      = blobUrl;
    console.log(invNum);
    a.download  = `Rechnung_${invNum}.pdf`;
    document.body.appendChild(a);
    a.click();
    // Cleanup
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  } catch (downloadErr) {
    console.error(downloadErr);
    setError('PDF-Download fehlgeschlagen');
    setStatus('error');
  }


    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 w-full">
      <h2 className="text-2xl font-bold mb-6">📤 PDF erzeugen & versenden</h2>
       {user && (
        <div className="mb-4">
          <p className="font-semibold">
            Ihre Budget-ID: <span className="text-blue-600">{user.budgetId}</span>
          </p>
        </div>
      )}

      {/* Seiten-Vorschau */}
      <div className="space-y-6 mb-6">
        {filePaths.map((fp, idx) => (
          <div key={idx}>
            <h3 className="font-semibold mb-2">Seite {idx + 1}</h3>
            <img
              src={`/${fp}`}
              alt={`Seite ${idx + 1}`}
              className="max-w-full border rounded mb-2"
            />
            <pre className="bg-gray-50 p-3 border rounded h-32 overflow-auto whitespace-pre-wrap">
              {ocrTexts[idx]}
            </pre>
          </div>
        ))}
      </div>

      {status === 'idle' && (
        <>
          <Button onClick={handleSend}>
            PDF erzeugen & versenden ✉️
          </Button>
          {error && <p className="text-red-600 mt-2">{error}</p>}
        </>
      )}

      {status === 'sending' && <p>📨 Wird erzeugt & versendet…</p>}

      {status === 'success' && pdfUrl && (
        <>
          <Button onClick={() => navigate('/')}>
            Fertig – Zurück zur Startseite
          </Button>
        </>
      )}

      {status === 'error' && (
        <>
          <p className="text-red-600">❌ Fehler: {error}</p>
          <Button onClick={() => setStatus('idle')}>Erneut versuchen</Button>
        </>
      )}
    </div>
  );
}
