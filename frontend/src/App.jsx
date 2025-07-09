// src/App.jsx
import React, { useEffect, useState } from 'react';
import { Link, BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './components/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Review from './pages/Review';
import Send from './pages/Send';
import PrivacyPolicy from './pages/PrivacyPolicy';
import CookieBanner from './components/CookieBanner';
import './App.css';
import './index.css'; // Tailwind, etc.



export default function App() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        {isOffline && (
          <div className="bg-yellow-300 text-yellow-900 px-4 py-2 text-center">
            ⚠️ Du bist offline. Prüfe deine Verbindung.
          </div>
        )}
            <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-blue-600 hover:text-blue-800">
            Rechnungserfassung
          </Link>
        </div>
      </header>
      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <Routes>
          {/* Öffentliche Routen */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/datenschutz" element={<PrivacyPolicy />} />

          {/* Geschützte Routen */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Home />
              </PrivateRoute>
            }
          />
          <Route
            path="/review"
            element={
              <PrivateRoute>
                <Review />
              </PrivateRoute>
            }
          />
          <Route
            path="/send"
            element={
              <PrivateRoute>
                <Send />
              </PrivateRoute>
            }
          />

          {/* Fallback: falls keine Route passt */}
          <Route
            path="*"
            element={<PrivateRoute><Home /></PrivateRoute>}
          />
        </Routes>
      </main>
      <CookieBanner />
    </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
