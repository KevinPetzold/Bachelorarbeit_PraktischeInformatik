// /backend/routes/process.js
import express from 'express';
import Tesseract from 'tesseract.js';
import path from 'path';

const tessdataPath = path.resolve(process.cwd(), 'tessdata');

const retry = async (fn, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

const router = express.Router();

router.post('/', async (req, res) => {
  const { filePath } = req.body;
  if (!filePath) {
    return res.status(400).json({ error: 'No file path provided.' });
  }

  try {
    // performOCR() fängt interne Fehler bereits ab und liefert '' zurück, wenn's schiefgeht.
    const text = await retry(() => performOCR(filePath));
    
    // Wir können optional einen Hinweis mitliefern, wenn text leer ist.
    if (!text) {
      return res.json({
        text: '',
        warning: 'OCR hat zu keinem Ergebnis geführt (möglicherweise unscharf oder fehlende Trainingsdaten).'
      });
    }
    // Normales 200-OK mit erkann­tem Text
    return res.json({ text });
  } catch (e) {
    // Diese catch-Sektion sollte jetzt nur noch greifen, wenn retry() wirklich
    // selbst aus anderen Gründen abbricht (z.B. Netzwerkprobleme).
    return res.json({
      text: '',
      warning: 'OCR vor Ort nicht ausführbar: ' + e.message
    });
  }
});

export default router;

async function performOCR(filePath) {
  const imagePath = path.resolve(process.cwd(), filePath);

  try {
    const {
      data: { text },
    } = await Tesseract.recognize(
      imagePath,
      'deu',
      {
        // Hinweis: Achte darauf, dass `tessdata`-Ordner mit den .traineddata-Dateien existiert.
        // Wenn nicht, kann man hier auch `langPath` weglassen, sodass Tesseract die Daten
        // automatisch aus dem CDN lädt (langs werden dann heruntergeladen).
        // Z. B.:
        // langPath:  tessdataPath,
        // cachePath: tessdataPath,
        // gzip:      false,
      }
    );
    return text || '';
  } catch (err) {
    console.error('❌ performOCR Error:', err);
    // Gib zumindest einen leeren String zurück, damit die Route nicht auf 500 fällt.
    return '';
  }
}