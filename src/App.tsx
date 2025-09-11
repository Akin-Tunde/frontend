// src/App.tsx

import React from 'react';
// Make sure you have react-router-dom installed: npm install react-router-dom
import { Routes, Route, Link } from 'react-router-dom';
import SpotifyReceiptPage from './SpotifyReceiptPage';
import LastFmReceipt from './LastFmReceipt'; // Corrected the import name if file is astFmReceipt.tsx

// This is the main landing page component
function HomePage() {
  // --- FIX: Define the backend URL ---
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8888';

  return (
    <div className="bg-gray-900 min-h-screen flex flex-col items-center justify-center text-white p-4 text-center">
      <h1 className="text-4xl md:text-5xl font-bold">Receiptify</h1>
      {/* This text correctly mentions both services */}
      <p className="mt-4 mb-8 text-lg text-gray-300">
        Get a receipt of your top tracks from Spotify or Last.fm.
      </p>
      {/* This div contains both Link components */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* --- FIX: Changed from Link to a standard <a> tag for external navigation --- */}
        <a href={`${backendUrl}/login`} className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-full transition-colors">
          Log in with Spotify
        </a>
        <Link to="/lastfm" className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-full transition-colors">
          Use Last.fm
        </Link>
      </div>
    </div>
  );
}

// This is the main App component that sets up the routes
function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/spotify" element={<SpotifyReceiptPage />} />
      <Route path="/lastfm" element={<LastFmReceipt />} />
    </Routes>
  );
}

export default App;
