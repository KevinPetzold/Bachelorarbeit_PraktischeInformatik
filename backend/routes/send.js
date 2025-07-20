// /backend/routes/send.js
import express from 'express';
import { generatePDF } from '../services/pdfService.js';
import { db } from '../data/db.js';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();

// Diese Route liegt hinter authenticateJWT, daher steht req.user
router.post('/', async (req, res) => {
  const { images, texts } = req.body;

  // 1) Validierung
  if (
    !Array.isArray(images) || images.length === 0 ||
    !Array.isArray(texts)  || texts.length !== images.length
  ) {
    return res.status(400).json({ error: 'Missing or invalid data.' });
  }

  // 2) userId und budgetId aus req.user
  const userId = req.user.sub;
  // Wir gehen davon aus, dass beim Anlegen des Users in der DB ein Feld budgetId gesetzt wurde.
  const budgetId = req.user.budgetId;
  if (!budgetId) {
    return res.status(400).json({ error: 'Kein Budget für diesen Nutzer hinterlegt.' });
  }

  try {
    // 3) Fortlaufende Rechnungsnummer anhand budgetId + Jahr holen
      const year = new Date().getFullYear().toString();
      const key = `${budgetId}-${year}`;
    
      await db.read();
      db.data.invoiceCounters ||= {};
      let next = 1;
      if (typeof db.data.invoiceCounters[key] === 'number') {
        next = db.data.invoiceCounters[key] + 1;
      }
    
      // Zähler speichern
      db.data.invoiceCounters[key] = next;
      await db.write();
    
      // Formatierung: 4-stellig mit führenden Nullen: z.B. "0001"
      const suffix = String(next).padStart(4, '0');
       
    const invoiceNumber = `${year}-${suffix}`;
    const calendarYear  = new Date().getFullYear();
    // 4) PDF erstellen (mit Metadaten)
    const pdfRelPath = await generatePDF({
      images,
      texts,
      metadata: {
        userId,
        budgetId,
        invoiceNumber,
        calendarYear
      }
    });


  // === TEMP-Dateien nach PDF-Erstellung löschen ===
    for (const filePath of images) {
      if (filePath.startsWith('uploads/')) {
        try {
          await fs.unlink(path.join(process.cwd(), filePath));
        } catch (err) {
          console.warn(`Konnte temporäre Datei nicht löschen: ${filePath}:`, err.message);
        }
      }
    }

    return res.json({ pdfPath: pdfRelPath, invoice: invoiceNumber });
  } catch (err) {
    console.error('Send error:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;