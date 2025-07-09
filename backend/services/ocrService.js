// /backend/services/ocrService.js
import Tesseract from 'tesseract.js';
import path from 'path';

const tessdataPath = path.resolve(process.cwd(), 'tessdata');

export async function performOCR(filePath) {
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