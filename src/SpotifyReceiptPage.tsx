// src/SpotifyReceiptPage.tsx

import React, { useEffect, useState } from 'react';
import Receipt from './Receipt'; // The original component for tracks
import ArtistReceipt from './ArtistReceipt'; // The new component for artists
import GenreReceipt from './GenreReceipt'; // Import the new component

function SpotifyReceiptPage() {
  const [token, setToken] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('Initializing...');
  // --- NEW: State to manage which tab is active ---

  const [receiptType, setReceiptType] = useState<'tracks' | 'artists' | 'genres'>('tracks');


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
    <div className="bg-gray-900 min-h-screen ...">
        <main className="w-full max-w-lg ...">
          {/* --- Add the third button to the tab navigation --- */}
          <div className="mb-8 p-1 bg-gray-800 rounded-full flex items-center">
            <button onClick={() => setReceiptType('tracks')} /* ... */>Top Tracks</button>
            <button onClick={() => setReceiptType('artists')} /* ... */>Top Artists</button>
            <button onClick={() => setReceiptType('genres')} className={`...`} >Top Genres</button>
          </div>

          {/* --- Update the conditional rendering to handle three components --- */}
          {receiptType === 'tracks' && <Receipt token={token} />}
          {receiptType === 'artists' && <ArtistReceipt token={token} />}
          {receiptType === 'genres' && <GenreReceipt token={token} />}
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