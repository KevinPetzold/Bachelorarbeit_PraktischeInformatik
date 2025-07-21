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
  // Clone options, um Header hinzuzufügen, ohne das Original zu modifizieren
  const opts = {
    ...options,
    headers: {
      ...(options.headers || {}),
    },
  };

  // Wenn im localStorage ein JWT unter "token" liegt, hänge ihn an
  const storedToken = localStorage.getItem('token');
  if (storedToken) {
    opts.headers.Authorization = `Bearer ${storedToken}`;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, opts);

      // Wenn HTTP-Status ein echter Server-Error (5xx) ist, retry
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
    }
  }
}
