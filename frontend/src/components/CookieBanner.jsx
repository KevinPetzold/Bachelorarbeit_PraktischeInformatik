// /frontend/src/components/CookieBanner.jsx
import React, { useEffect, useState } from 'react';
import { Button } from './Button';

const STORAGE_KEY = 'cookieConsentGiven';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(STORAGE_KEY);
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem(STORAGE_KEY, 'yes');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 w-full bg-gray-800 text-white p-4 flex flex-col md:flex-row items-center justify-between space-y-2 md:space-y-0">
      <p className="mb-2 md:mb-0">
        Diese Seite verwendet Cookies, um die Nutzerfreundlichkeit zu verbessern. 
        <a href="/datenschutz" className="underline ml-1">Privacy Policy</a>
      </p>
      <Button onClick={acceptCookies}>Akzeptieren</Button>
    </div>
  );
}