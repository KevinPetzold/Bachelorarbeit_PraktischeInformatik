// /frontend/src/pages/PrivacyPolicy.jsx
import React from 'react';
import { Button } from '../components/Button';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  return (
    <div className="bg-white shadow rounded-lg p-6 w-full">
      <h1 className="text-3xl font-bold mb-4">Datenschutzerklärung</h1>
      <p className="mb-4">
        Welche Daten wir sammeln
        <br />
        &bull; Speicherung von Nutzerdaten  <br />
        &bull; Cookies & Tracking  <br />
        &bull; SSL, Datensicherheit  <br />
        &bull; Kontaktmöglichkeiten
      </p>
      <Button onClick={() => navigate(-1)}>Zurück</Button>
    </div>
  );
}
