// src/main.tsx - UPDATED

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import './datepicker.css';

// --- WAGMI SETUP ---
import { WagmiProvider, createConfig } from 'wagmi';
import { base } from 'wagmi/chains'; // Import the Base chain configuration
import { farcasterWagmiConnector } from '@farcaster/miniapp-wagmi-connector';
import { injected } from 'wagmi/connectors'; // For MetaMask and other browser wallets

// 1. Create the Wagmi config
const config = createConfig({
  chains: [base], // Specify the blockchain you're working on
  connectors: [
    farcasterWagmiConnector(), // This will automatically activate inside Farcaster clients
    injected(),               // This is the fallback for standard browsers (MetaMask)
  ],
  transports: {
    [base.id]: http(), // viem requires a transport, http() is a basic one
  },
});

// --- END OF WAGMI SETUP ---

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* 2. Wrap your entire app with the WagmiProvider */}
    <WagmiProvider config={config}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </WagmiProvider>
  </React.StrictMode>
);
