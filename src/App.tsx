import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import SpotifyReceiptPage from './SpotifyReceiptPage'; // Renaming for clarity
import LastFmReceipt from './LastFmReceipt';

// This component will be our main landing page
function HomePage() {
  return (
    <div className="bg-gray-900 min-h-screen flex flex-col items-center justify-center text-white p-4 text-center">
      <h1 className="text-4xl md:text-5xl font-bold">Receiptify</h1>
      <p className="mt-4 mb-8 text-lg text-gray-300">
        Get a receipt of your top tracks from Spotify or Last.fm.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link to="/spotify" className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-full transition-colors">
          Log in with Spotify
        </Link>
        <Link to="/lastfm" className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-full transition-colors">
          Use Last.fm
        </Link>
      </div>
    </div>
  );
}

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