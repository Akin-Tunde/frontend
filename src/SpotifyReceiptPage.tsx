import React, { useEffect, useState } from 'react';
import Receipt from './Receipt';

function SpotifyReceiptPage() {
  // State to hold the token once we have it
  const [token, setToken] = useState<string | null>(null);
  // State to show a message while we figure out what to do
  const [statusMessage, setStatusMessage] = useState('Initializing...');

  // This single useEffect runs once when the component loads
  useEffect(() => {
    // Get the full search query string from the URL (e.g., "?access_token=...")
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const accessToken = urlParams.get('access_token');

    // Case 1: An access token is found in the URL
    if (accessToken) {
      console.log("Access token found in URL.");
      setToken(accessToken);
      setStatusMessage('Successfully logged in!');
      // Clean up the URL by removing the token, so it doesn't stay there on refresh
      window.history.pushState({}, document.title, "/spotify");
    } 
    // Case 2: No access token in the URL, so we need to log in
    else {
      console.log("No access token found, redirecting to login...");
      setStatusMessage('Redirecting to Spotify for login...');
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8888';
      // Redirect the user to the backend's login endpoint
      window.location.href = `${backendUrl}/login`;
    }
  }, []); // The empty dependency array [] means this runs only ONCE

  // Render content based on whether we have the token
  if (token) {
    // If we have a token, show the receipt
    return (
      <div className="bg-gray-900 min-h-screen flex flex-col items-center justify-center text-white p-4">
        <main className="w-full max-w-lg mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold">Your Spotify Receipt</h1>
          <Receipt token={token} />
        </main>
      </div>
    );
  } else {
    // If we don't have a token yet, show the status message
    return (
        <div className="bg-gray-900 min-h-screen flex items-center justify-center text-white">
            <p>{statusMessage}</p>
        </div>
    );
  }
}

export default SpotifyReceiptPage;
