// /frontend/src/components/AuthContext.jsx
import React, { createContext, useEffect, useState } from 'react';
import api from '../utils/api';

export const AuthContext = createContext();

/**
 * AuthProvider hält den aktuellen User und Token‐Status.
 * Beim Laden prüft er (z.B. via /api/auth/me), ob bereits eingeloggt.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // 1) Beim Start: ggf. bestehendes Token validieren
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setInitializing(false);
      return;
    }
    // Falls du keinen /auth/me-Endpoint hast, kannst du stattdessen den Token
    // parsen oder direkt als angemeldet betrachten – je nach Bedarf:
    try {
      // Beispiel: Payload aus JWT auslesen, ohne Server-Call
      const payloadBase64 = token.split('.')[1];
      const decoded = JSON.parse(atob(payloadBase64));
      setUser({ id: decoded.sub, email: decoded.email, name: decoded.name });
    } catch {
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setInitializing(false);
    }
  }, []);

  // 2) login: speichere Token & User
  const login = (token, userData) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  // 3) logout: entferne Token & User
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    // Optional: rufe /api/auth/logout auf, falls Server‐Session invalidiert werden soll
    api.post('/auth/logout').catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, initializing }}>
      {children}
    </AuthContext.Provider>
  );
}