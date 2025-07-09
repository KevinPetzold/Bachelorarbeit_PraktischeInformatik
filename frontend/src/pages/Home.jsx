// /frontend/src/pages/Home.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import FileUploader from '../components/FileUploader';
import CameraCapture from '../components/CameraCapture';
import useAuth from '../hooks/useAuth';
import CookieBanner from '../components/CookieBanner';

export default function Home() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mode, setMode] = React.useState(null); // 'upload' | 'camera' | null

 const handleSuccess = (filePathOrArray) => {
   // Immer ein flaches String-Array draus machen
   const filePaths = Array.isArray(filePathOrArray)
     ? filePathOrArray
     : [filePathOrArray];
   navigate('/review', { state: { filePaths } });
 };
  const handleCancel = () => setMode(null);

  return (
    <div className="bg-white shadow rounded-lg p-6 w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Rechnungsverarbeitung</h1>
        {user ? (
          <div className="flex items-center gap-4">
            <span className="text-gray-700">Angemeldet als {user.name}</span>
            <Button variant="secondary" onClick={logout}>Logout</Button>
          </div>
        ) : (
          <Button onClick={() => navigate('/login')}>Login / Register</Button>
        )}
      </div>

      {!mode ? (
        <div className="text-center space-y-4">
          <p className="text-gray-600 mb-4">
            Rechnung hochladen oder mit Kamera scannen.
          </p>
          <Button className="w-full" onClick={() => setMode('upload')}>
            📁 Upload
          </Button>
          <Button className="w-full" onClick={() => setMode('camera')}>
            📷 Kamera
          </Button>
        </div>
      ) : mode === 'upload' ? (
        <div className="mt-6">
          <FileUploader onSuccess={handleSuccess} onCancel={handleCancel} />
        </div>
      ) : (
        <div className="mt-6">
          <CameraCapture onSuccess={handleSuccess} onCancel={handleCancel} />
        </div>
      )}

      <CookieBanner />
    </div>
  );
}