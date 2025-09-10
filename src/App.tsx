import React, { useEffect, useState } from 'react';
import Receipt from './Receipt'; // We will create this component next

function App() {
  // This state will hold the access token
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // This code runs when the component mounts (the page loads)
    const hash = window.location.search;
    const urlParams = new URLSearchParams(hash);
    const accessToken = urlParams.get('access_token');

    if (accessToken) {
      setToken(accessToken);
      // Clean the URL so the token doesn't stay in the address bar
      window.history.pushState({}, document.title, "/");
    }
  }, []); // The empty array means this effect runs only once

  return (
    // Main container with a dark background, full height, and centered content
    <div className="bg-gray-900 min-h-screen flex flex-col items-center justify-center text-white p-4">
      <main className="w-full max-w-lg mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-bold">Receiptify in TypeScript</h1>

        {/* Conditionally render content based on if we have a token */}
        {!token ? (
          <>
            <p className="mt-4 mb-8 text-lg text-gray-300">
              Get a receipt of your top Spotify tracks.
            </p>
            <a href="http://localhost:8888/login">
              <button className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-full transition-colors duration-300">
                Log in with Spotify
              </button>
            </a>
          </>
        ) : (
          // If we have a token, render the Receipt component
          <Receipt token={token} />
        )}
      </main>
    </div>
  );
}

export default App;