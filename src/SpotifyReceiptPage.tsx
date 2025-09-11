// src/SpotifyReceiptPage.tsx

import  { useEffect, useState } from 'react';
import Receipt from './Receipt'; // The original component for tracks
import ArtistReceipt from './ArtistReceipt'; // The new component for artists
import GenreReceipt from './GenreReceipt'; // Import the new component

function SpotifyReceiptPage() {
  const [token, setToken] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('Initializing...');
  const [receiptType, setReceiptType] = useState<'tracks' | 'artists' | 'genres'>('tracks');

  useEffect(() => {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const accessToken = urlParams.get('access_token');

    if (accessToken) {
      setToken(accessToken);
      setStatusMessage('Successfully logged in!');
      window.history.pushState({}, document.title, "/spotify");
    } else {
      setStatusMessage('Redirecting to Spotify for login...');
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8888';
      window.location.href = `${backendUrl}/login`;
    }
  }, []);

  if (token) {
    return (
      // It's good practice to add some padding to the main container
      <div className="bg-gray-900 min-h-screen flex flex-col items-center text-white p-4">
        {/* The main content area */}
        <main className="w-full max-w-lg">
          {/* --- FIX: Add the complete className attributes to the buttons --- */}
          <div className="mb-8 p-1 bg-gray-800 rounded-full flex items-center justify-between text-sm">
            <button 
              onClick={() => setReceiptType('tracks')} 
              className={`w-full py-2 rounded-full transition-colors ${receiptType === 'tracks' ? 'bg-green-500 text-white' : 'hover:bg-gray-700 text-gray-300'}`}
            >
              Top Tracks
            </button>
            <button 
              onClick={() => setReceiptType('artists')} 
              className={`w-full py-2 rounded-full transition-colors ${receiptType === 'artists' ? 'bg-green-500 text-white' : 'hover:bg-gray-700 text-gray-300'}`}
            >
              Top Artists
            </button>
            <button 
              onClick={() => setReceiptType('genres')} 
              className={`w-full py-2 rounded-full transition-colors ${receiptType === 'genres' ? 'bg-green-500 text-white' : 'hover:bg-gray-700 text-gray-300'}`}
            >
              Top Genres
            </button>
          </div>

          {/* This conditional rendering is correct and will work once the buttons are fixed */}
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