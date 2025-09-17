// src/App.tsx


import React, { useState, useEffect, useRef } from 'react';
import { Music, Palette, Wallet, ExternalLink } from 'lucide-react';

// Make sure you have react-router-dom installed: npm install react-router-dom
import { Routes, Route, Link } from 'react-router-dom';
import SpotifyReceiptPage from './SpotifyReceiptPage';
import LastFmReceipt from './LastFmReceipt'; // Corrected the import name if file is astFmReceipt.tsx

import { sdk } from '@farcaster/miniapp-sdk';

// Enhanced Homepage Component
const HomePage = () => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8888';
useEffect(() => {
    // This tells the Farcaster client (e.g., Warpcast) that your app's
    // initial UI has loaded and is ready to be displayed.
    // It's best practice to wrap it in a catch block.
    sdk.actions.ready().catch(err => console.error("Farcaster SDK ready() failed", err));

    // The empty dependency array [] ensures this effect runs only once.
  }, []);
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <nav className="p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Music className="h-8 w-8 text-green-400" />
            <span className="text-2xl font-bold text-white">Receiptify</span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
      <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-white mb-6 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
  Your Music, Receipted
</h1>
        <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
          Transform your listening history into beautiful, shareable receipts. 
          Connect your Spotify or Last.fm and create unique NFTs of your musical taste.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <button className="group relative overflow-hidden bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-8 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
            <span className="relative z-10 flex items-center space-x-2">
              <Music className="h-5 w-5" />
              <a href={`${backendUrl}/login`} className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-full transition-colors">
          Log in with Spotify
        </a>
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-green-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
          
          <button className="group relative overflow-hidden bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-8 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
            <span className="relative z-10 flex items-center space-x-2">
              <ExternalLink className="h-5 w-5" />
            <Link to="/lastfm" className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-full transition-colors">
          Use Last.fm
        </Link>
            </span>
          </button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="bg-green-500/20 rounded-full p-3 w-fit mx-auto mb-4">
              <Music className="h-6 w-6 text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Multiple Sources</h3>
            <p className="text-gray-300">Connect Spotify or Last.fm to generate receipts from your listening data</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="bg-purple-500/20 rounded-full p-3 w-fit mx-auto mb-4">
              <Palette className="h-6 w-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Customizable</h3>
            <p className="text-gray-300">Personalize colors, layout, and style to match your aesthetic</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="bg-blue-500/20 rounded-full p-3 w-fit mx-auto mb-4">
              <Wallet className="h-6 w-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">NFT Ready</h3>
            <p className="text-gray-300">Mint your receipts as NFTs on the Base blockchain</p>
          </div>
        </div>
      </div>
    </div>
  );
};

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

