// /backend/routes/process.js
import express from 'express';
import { performOCR } from '../services/ocrService.js';

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

