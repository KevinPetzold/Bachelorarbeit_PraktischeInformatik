// /backend/services/authService.js
import jwt from 'jsonwebtoken';
import { db } from '../data/db.js';
import dotenv from 'dotenv';
dotenv.config();
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;
const USER_ID_START = 1000;


export function authenticateJWT(req, res, next) {
  // Das Token kommt per Header "Authorization: Bearer <token>".
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Keine Token-Angabe.' });
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token fehlt.' });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(403).json({ error: 'Ungültiges Token.' });
  }
  // Setze `req.user = payload`, damit nachfolgende Routen den User kennen
  req.user = payload;
  next();
}
/**
 * Registriert einen neuen Nutzer und speichert ihn in LowDB.
 * Erwartet im Request-Body: { email, password, name, budgetId }
 * Gibt zurück: { id, email, name, budgetId }
 */
export async function registerUser({ email, password, name, budgetId }) {
  // 1) Lade die Datenbank (db.data wird initialisiert, falls noch leer)
  await db.read();

  // 2) Prüfe, ob die Email bereits existiert
  const users = db.data.users;
  if (users.find((u) => u.email === email)) {
    throw new Error('Email bereits registriert.');
  }

  // 3) Hash das Passwort
  const hashed = await bcrypt.hash(password, SALT_ROUNDS);

  // Wenn noch kein User existiert, nimm Startwert
  const nextId = USER_ID_START.toString();
  if (users.length) { 
  // IDs in Zahlen umwandeln (evtl. noch String)
  const ids = users.map(u => Number(u.id)).filter(Number.isFinite);

  // Max + 1, oder Startwert wenn keine gültigen IDs
  nextId = ids.length ? Math.max(...ids) + 1 : USER_ID_START;
  }

  // 4) Erstelle neues User-Objekt mit einer eindeutigen ID, Budget-ID usw.
  const newUser = {
    id: nextId.toString(),
    email,
    name,
    password: hashed,
    budgetId,
    createdAt: new Date().toISOString()
  };

  // 5) Füge den neuen Nutzer in die users-Collection hinzu und speichere
  users.push(newUser);
  await db.write();

  // 6) Gib nur öffentliche Felder zurück
  return {
    id: newUser.id,
    email: newUser.email,
    name: newUser.name,
    budgetId: newUser.budgetId
  };
}

/**
 * Authentifiziert einen bestehenden Nutzer.
 * Erwartet im Request-Body: { email, password }
 * Gibt zurück: { token, user: { id, email, name, budgetId } }
 */
export async function loginUser({ email, password }) {
  await db.read();
  const users = db.data.users;
  const user = users.find((u) => u.email === email);
  if (!user) {
    throw new Error('Ungültige Anmeldedaten.');
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw new Error('Ungültige Anmeldedaten.');
  }

  // 1) Erstelle Payload für JWT (inkl. Budget-ID)
  const payload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    budgetId: user.budgetId
  };

  // 2) Signiere den Token mit dem Secret
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h'
  });

  // 3) Gib Token und Basisdaten des Users zurück
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      budgetId: user.budgetId
    }
  };
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

