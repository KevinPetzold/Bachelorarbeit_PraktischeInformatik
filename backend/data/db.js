// /backend/data/db.js
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

// Pfad zur JSON-Datei festlegen
const file = path.join(__dirname, 'db.json');

// Stelle sicher, dass das Verzeichnis existiert
const dir = path.dirname(file);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Adapter instanziieren
const adapter = new JSONFile(file);

// Low-Instanz mit „defaultData“ erstellen
const defaultData = {
  users: [],      
  invoices: [],   
};

export const db = new Low(adapter, defaultData);

// Initialisierung: beim ersten Start die Datei füllen, wenn sie leer ist
export async function initDB() {
  await db.read();          // Versucht, die Datei zu lesen (oder legt sie an, wenn sie nicht existiert)
  db.data ||= defaultData;  // Wenn db.data == null/undefined → mit defaultData füllen
  await db.write();         // Speichere
}
