// /backend/data/db.js
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

// 1) Pfad zur JSON-Datei festlegen
const file = path.join(__dirname, 'db.json');

// 2) Stelle sicher, dass das Verzeichnis existiert
const dir = path.dirname(file);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// 3) Adapter instanziieren
const adapter = new JSONFile(file);

// 4) Low-Instanz mit „defaultData“ erstellen
//    Hier definieren wir die anfängliche Struktur: leere Arrays usw.
const defaultData = {
  users: [],      // später werden hier Objekte wie { id, email, name, passwordHash, budgetId, invoiceCounter, ... } liegen
  invoices: [],   // später werden hier Rechnungen abgelegt: { id, userId, invoiceNumber, createdAt, ... }
  // evtl. weitere Collections:
  // settings: { lastInvoiceNumber: 0, ... },
  // logs: []
};

export const db = new Low(adapter, defaultData);

// 5) Initialisierung: beim ersten Start die Datei füllen, wenn sie leer ist
export async function initDB() {
  await db.read();          // Versucht, die Datei zu lesen (oder legt sie an, wenn sie nicht existiert)
  db.data ||= defaultData;  // Wenn db.data == null/undefined → mit defaultData füllen
  await db.write();         // Speichere (wichtig, damit die Datei zumindest das defaultData-Gerüst enthält)
}

// 6) Optional: Helferfunktionen, um Collections leichter zu nutzen:
//    z. B. db.data.users.push(...), db.write() danach