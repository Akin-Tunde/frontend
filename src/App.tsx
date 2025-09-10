import React, { useEffect, useState } from 'react';
import Receipt from './Receipt';

function App() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.search;
    const urlParams = new URLSearchParams(hash);
    const accessToken = urlParams.get('access_token');
    
    if (accessToken) {
      setToken(accessToken);
      window.history.pushState({}, document.title, "/");
    }
  }, []);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8888';

  return (
    <div className="bg-gray-900 min-h-screen flex flex-col items-center justify-center text-white p-4">
      <main className="w-full max-w-lg mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-bold">Receiptify</h1>
        
        {!token ? (
          <>
            <p className="mt-4 mb-8 text-lg text-gray-300">
              Get a receipt of your top Spotify tracks.
            </p>
            <a href={`${backendUrl}/login`}>
              <button className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-full transition-colors duration-300">
                Log in with Spotify
              </button>
            </a>
          </>
        ) : (
          <Receipt token={token} />
        )}
      </main>
    </div>
  );
}

export default App;