// src/main.tsx - CORRECTED AND FINAL

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import './datepicker.css';

// --- WAGMI SETUP ---
import { WagmiProvider, createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { farcasterConnector } from '@farcaster/miniapp-wagmi-connector';
import { injected } from 'wagmi/connectors';

const config = createConfig({
  chains: [base],
  connectors: [
    farcasterConnector(), 
    injected(),
  ],
  transports: {
    [base.id]: http(),
  },
});
// --- END OF WAGMI SETUP ---

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </WagmiProvider>
  </React.StrictMode>
);
