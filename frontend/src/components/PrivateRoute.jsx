// /frontend/src/components/PrivateRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

/**
 * PrivateRoute umschließt alle Routen, die eine Authentifizierung erfordern.
 * Ist der User nicht eingeloggt → Weiterleitung zu /login.
 */
export default function PrivateRoute({ children }) {
  const { user, initializing } = useAuth();

  if (initializing) {
    return <div className="p-4">🔄 Lade …</div>;
  }

  return user ? children : <Navigate to="/login" replace />;
}