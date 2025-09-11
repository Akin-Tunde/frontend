// src/SpotifyReceiptPage.tsx

import React, { useEffect, useState } from 'react';
import Receipt from './Receipt'; // The original component for tracks
import ArtistReceipt from './ArtistReceipt'; // The new component for artists

function SpotifyReceiptPage() {
  const [token, setToken] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('Initializing...');
  // --- NEW: State to manage which tab is active ---
  const [receiptType, setReceiptType] = useState<'tracks' | 'artists'>('tracks');

  useEffect(() => {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const accessToken = urlParams.get('access_token');

    if (accessToken) {
      console.log("Access token found in URL.");
      setToken(accessToken);
      setStatusMessage('Successfully logged in!');
      window.history.pushState({}, document.title, "/spotify");
    } else {
      console.log("No access token found, redirecting to login...");
      setStatusMessage('Redirecting to Spotify for login...');
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8888';
      window.location.href = `${backendUrl}/login`;
    }
  }, []);

  if (token) {
    return (
      <div className="bg-gray-900 min-h-screen flex flex-col items-center text-white p-4">
        <main className="w-full max-w-lg mx-auto text-center">
          {/* --- NEW: Tab Navigation --- */}
          <div className="mb-8 p-1 bg-gray-800 rounded-full flex items-center">
            <button
              onClick={() => setReceiptType('tracks')}
              className={`w-full py-2 px-4 rounded-full text-sm font-bold transition-colors ${
                receiptType === 'tracks' ? 'bg-green-500 text-white' : 'text-gray-400 hover:bg-gray-700'
              }`}
            >
              Top Tracks
            </button>
            <button
              onClick={() => setReceiptType('artists')}
              className={`w-full py-2 px-4 rounded-full text-sm font-bold transition-colors ${
                receiptType === 'artists' ? 'bg-green-500 text-white' : 'text-gray-400 hover:bg-gray-700'
              }`}
            >
              Top Artists
            </button>
          </div>

          {/* --- NEW: Conditional Rendering of Components --- */}
          {receiptType === 'tracks' ? (
            <Receipt token={token} />
          ) : (
            <ArtistReceipt token={token} />
          )}
        </main>
      </div>
    );
  } else {
    // Loading/status message remains the same
    return (
        <div className="bg-gray-900 min-h-screen flex items-center justify-center text-white">
            <p>{statusMessage}</p>
        </div>
    );
  }
}

export default SpotifyReceiptPage;