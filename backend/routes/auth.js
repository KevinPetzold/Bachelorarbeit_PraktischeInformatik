// /backend/routes/auth.js
import express from 'express';
import { registerUser, loginUser } from '../services/authService.js';

const router = express.Router();

// POST /api/auth/register
// { email, password, name }
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name, budgetId } = req.body;
    if (!email || !password || !name || !budgetId) {
      return res.status(400).json({ error: 'Alle Felder erforderlich.' });
    }
    const newUser = await registerUser({ email, password, name, budgetId });
    res.status(201).json(newUser);
  } catch (err) {
    if (err.message.includes('bereits registriert')) {
      return res.status(409).json({ error: err.message });
    }
    next(err);
  }
});

// POST /api/auth/login
// { email, password } → { token, user: { id, email, name } }
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email & Passwort erforderlich.' });
    }
    const { token, user } = await loginUser({ email, password });
    res.status(200).json({ token, user });
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
});

// POST /api/auth/logout
// Hier reicht es aus, der Client löscht das JWT, für das PoC wird einfach eine 200-Antwort gesendet.
router.post('/logout', (req, res) => {
  res.status(200).json({ message: 'Abgemeldet.' });
});

export default router;
