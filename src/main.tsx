// src/main.tsx - FINAL AND CORRECTED VERSION

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import './datepicker.css';

// --- WAGMI SETUP ---
import { WagmiProvider, createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
// This is the new, correct import format you provided
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector';

export const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  // We are now only providing the Farcaster connector
  connectors: [
    miniAppConnector()
  ]
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
