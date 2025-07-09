// src/utils/requestWithRetry.js

/**
 * Führt einen fetch-Aufruf aus und versucht bei Netzwerkfehlern
 * (oder 5xx-Statuscodes) bis zu `retries`-mal neu.
 *
 * Ergänzung: Falls im localStorage ein JWT unter "token" liegt,
 * wird es automatisch als Bearer-Token im Authorization-Header mitgeschickt.
 *
 * @param {string} url - URL für fetch()
 * @param {object} options - fetch-Optionen (z.B. method, headers, body)
 * @param {number} retries - Maximalanzahl der Versuche (inklusive Erstversuch)
 * @param {number} backoff - Basis-Wartezeit in ms (exponential Backoff)
 * @returns {Promise<Response>} - die erste erfolgreiche Response
 * @throws {Error} - wenn nach allen Versuchen noch ein Fehler steht
 */
export async function requestWithRetry(url, options = {}, retries = 3, backoff = 500) {
  // 1) Clone options, um Header hinzuzufügen, ohne das Original zu modifizieren
  const opts = {
    ...options,
    headers: {
      ...(options.headers || {}),
    },
  };

  // 2) Wenn im localStorage ein JWT unter "token" liegt, hänge ihn an
  const storedToken = localStorage.getItem('token');
  if (storedToken) {
    opts.headers.Authorization = `Bearer ${storedToken}`;
    // Hinweis: Falls du Cookies statt Header-Tokens einsetzt, könntest du hier
    // opts.credentials = 'include' setzen. In diesem Projekt verwenden wir jedoch
    // JWT im Bearer-Header.
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, opts);

      // Wenn HTTP-Status ein echter Server-Error (5xx) ist, wollen wir retryen
      if (response.status >= 500 && response.status < 600) {
        throw new Error(`Server-Error ${response.status}`);
      }

      // Ansonsten (200 OK oder 4xx Client-Error) → gib die Response zurück
      return response;
    } catch (err) {
      // Wenn letzter Versuch, wirf den Fehler weiter
      if (attempt === retries) {
        throw err;
      }
      // Sonst: exponential Backoff, dann neuer Versuch
      await new Promise((res) => setTimeout(res, backoff * Math.pow(2, attempt - 1)));
      // und schleife fort
    }
  }
}