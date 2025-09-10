import React, { useEffect, useState } from 'react';
import Receipt from './Receipt'; // This component remains unchanged

function SpotifyReceiptPage() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.search;
    const urlParams = new URLSearchParams(hash);
    const accessToken = urlParams.get('access_token');
    
    if (accessToken) {
      setToken(accessToken);
      window.history.pushState({}, document.title, "/spotify"); // Clean URL to /spotify
    }
  }, []);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8888';

  // If there's no token yet, trigger the login redirect immediately
  if (!token) {
    // Find token from URL on first render
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    if (!accessToken) {
        window.location.href = `${backendUrl}/login`;
        return <div className="bg-gray-900 min-h-screen flex items-center justify-center text-white">Redirecting to Spotify...</div>;
    }
  }
  
  return (
    <div className="bg-gray-900 min-h-screen flex flex-col items-center justify-center text-white p-4">
      <main className="w-full max-w-lg mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-bold">Your Spotify Receipt</h1>
        {token && <Receipt token={token} />}
      </main>
    </div>
  );
}

export default SpotifyReceiptPage;