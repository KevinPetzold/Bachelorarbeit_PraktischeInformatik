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
    const text = await retry(() => performOCR(filePath));

    if (!text) {
      return res.json({
        text: '',
        warning: 'OCR hat zu keinem Ergebnis geführt (möglicherweise unscharf oder fehlende Trainingsdaten).'
      });
    }
    return res.json({ text });
  } catch (e) {
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
      }
    );
    return text || '';
  } catch (err) {
    console.error('❌ performOCR Error:', err);
    return '';
  }
}
