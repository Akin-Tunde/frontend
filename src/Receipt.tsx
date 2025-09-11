
// src/Receipt.tsx

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import html2canvas from 'html2canvas';
import { ethers, BrowserProvider } from 'ethers';

// --- CHANGE: Import the contract address and ABI from the new file ---
import { contractAddress, contractABI } from './contract/contractInfo';
// --------------------------------------------------------------------

// --- NEW: Define Base network details ---
const baseMainnet = {
    chainId: '0x2105', // 8453 in decimal
    chainName: 'Base Mainnet',
    nativeCurrency: {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
    },
    rpcUrls: ['https://mainnet.base.org'],
    blockExplorerUrls: ['https://basescan.org'],
};


// Interface definitions (these do not change)
interface Track {
  id: string;
  name: string;
  artists: { name: string }[];
  duration_ms: number;
}
interface ReceiptProps {
  token: string;
}
type TimeRange = 'short_term' | 'medium_term' | 'long_term';

const Receipt: React.FC<ReceiptProps> = ({ token }) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('short_term');
  const [userName, setUserName] = useState<string>('YOUR');
  const receiptRef = useRef<HTMLDivElement>(null);

  // --- NEW STATE VARIABLES FOR MINTING ---
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [mintingStatus, setMintingStatus] = useState('');

  // This function does not change
  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${parseInt(seconds) < 10 ? '0' : ''}${seconds}`;
  };

  const timeRangeLabels: { [key in TimeRange]: string } = {
    short_term: 'LAST MONTH',
    medium_term: 'LAST 6 MONTHS',
    long_term: 'ALL TIME',
  };

  // This useEffect for fetching Spotify data does not change
  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      try {
        const userProfile = await axios.get("https://api.spotify.com/v1/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUserName(userProfile.data.display_name.toUpperCase());
        const { data } = await axios.get("https://api.spotify.com/v1/me/top/tracks", {
          headers: { Authorization: `Bearer ${token}` },
          params: { time_range: timeRange, limit: 10 }
        });
        setTracks(data.items);
      } catch (error) {
        console.error("Error fetching data from Spotify", error);
      }
    };
    fetchData();
  }, [token, timeRange]);

  // --- NEW FUNCTION: Switches or adds the Base network ---
  const switchToBaseNetwork = async (provider: BrowserProvider) => {
    try {
        await provider.send('wallet_switchEthereumChain', [{ chainId: baseMainnet.chainId }]);
    } catch (switchError: any) {
        // This error code indicates that the chain has not been added to MetaMask.
        if (switchError.code === 4902) {
            try {
                await provider.send('wallet_addEthereumChain', [baseMainnet]);
            } catch (addError) {
                console.error("Failed to add Base network", addError);
                throw new Error("Failed to add Base network to MetaMask.");
            }
        } else {
            console.error("Failed to switch network", switchError);
            throw new Error("Failed to switch to Base network.");
        }
    }
  };

  // --- NEW FUNCTION: Connects to MetaMask ---
  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert("Please install MetaMask to mint an NFT.");
      return null;
    }
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      // Request account access
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      setWalletAddress(await signer.getAddress());
      return signer;
    } catch (error) {
      console.error("Wallet connection failed", error);
      alert("Wallet connection failed. Please try again.");
      return null;
    }
  };

  // --- UPDATED FUNCTION: Replaces downloadReceipt with the full minting logic ---
  const mintNFT = async () => {
    if (!receiptRef.current) return;
    setIsMinting(true);
    setMintingStatus("Initializing...");

    try {
        // Step 1: Connect wallet and get the provider
        setMintingStatus("Connecting to wallet...");
        if (typeof window.ethereum === 'undefined') {
          throw new Error("Please install MetaMask to mint an NFT.");
        }
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        setWalletAddress(await signer.getAddress());

        // Step 2: Verify the network and switch if necessary
        setMintingStatus("Checking network...");
        const network = await provider.getNetwork();
        if (network.chainId !== BigInt(baseMainnet.chainId)) { // CHANGE: Check against Base chainId
            setMintingStatus("Please switch to Base network...");
            await switchToBaseNetwork(provider);
        }

        // Step 3: Generate the receipt image
        setMintingStatus("Generating receipt image...");
        const canvas = await html2canvas(receiptRef.current, { scale: 2, backgroundColor: null });
        const imageData = canvas.toDataURL('image/png').split(',')[1]; // Get base64 string

        // Step 4: Send data to your backend to upload to IPFS
        setMintingStatus("Uploading assets to IPFS...");
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8888';
        const response = await axios.post(`${backendUrl}/upload-to-ipfs`, {
            imageData,
            userName,
            timeRange: timeRangeLabels[timeRange],
            tracks: tracks, // Send the full track data
        });
        const { tokenURI } = response.data;
        if (!tokenURI) throw new Error("Failed to get tokenURI from backend.");

        // Step 5: Call the smart contract to mint the NFT
        setMintingStatus("Please confirm transaction in MetaMask...");
        const contract = new ethers.Contract(contractAddress, contractABI, signer);
        // We call the 'safeMint' function from our contract, passing the IPFS link
        const transaction = await contract.safeMint(tokenURI);

        // Step 6: Wait for the transaction to be confirmed on the blockchain
        setMintingStatus("Minting in progress on the blockchain...");
        await transaction.wait();

        alert("NFT minted successfully! You can view it on OpenSea.");
        setMintingStatus('');

    } catch (error: any) {
        console.error("Minting failed:", error);
        alert(`Minting failed: ${error.message || "Please check the console for details."}`);
        setMintingStatus('Minting failed. Please try again.');
    } finally {
        setIsMinting(false);
    }
  };

  // --- JSX (The View) ---
  return (
    <div className="w-full mt-8">
        {/* The receipt display itself does not change */}
        <div ref={receiptRef} className="p-6 bg-white text-black font-mono w-full max-w-sm mx-auto shadow-lg">
            <div className="text-center">
                <h2 className="text-2xl font-bold">RECEIPTIFY</h2>
                <p className="text-sm">{timeRangeLabels[timeRange]}</p>
                <p className="text-sm">ORDER FOR {userName}</p>
            </div>
            <div className="my-4 border-t border-b border-dashed border-black py-2">
            {tracks.length > 0 ? (
                tracks.map((track, index) => (
                <div key={track.id} className="flex justify-between items-start text-sm my-2">
                    <div className="flex">
                    <span className="mr-2 font-bold">{index + 1}.</span>
                    <div className="pr-2">
                        <p className="font-bold uppercase break-words">{track.name}</p>
                        <p className="text-gray-600 uppercase break-words">
                        {track.artists.map(artist => artist.name).join(', ')}
                        </p>
                    </div>
                    </div>
                    <span className="font-bold whitespace-nowrap">{formatDuration(track.duration_ms)}</span>
                </div>
                ))
            ) : (
                <p className="text-center text-gray-500 py-4">Loading tracks...</p>
            )}
            </div>
            <div className="text-center mt-6">
                <p className="text-xs">THANK YOU FOR VISITING!</p>
            </div>
        </div>

        {/* --- UPDATED UI: Replaces the download button with minting controls --- */}
        <div className="mt-8 flex flex-col items-center space-y-4">
            <div className="flex justify-center space-x-2">
                <button onClick={() => setTimeRange('short_term')} className={`px-3 py-1 text-sm rounded transition-colors ${timeRange === 'short_term' ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300'}`}>Month</button>
                <button onClick={() => setTimeRange('medium_term')} className={`px-3 py-1 text-sm rounded transition-colors ${timeRange === 'medium_term' ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300'}`}>6 Months</button>
                <button onClick={() => setTimeRange('long_term')} className={`px-3 py-1 text-sm rounded transition-colors ${timeRange === 'long_term' ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300'}`}>All Time</button>
            </div>

            {!walletAddress ? (
                <button onClick={connectWallet} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-full transition-colors">
                    Connect Wallet to Mint
                </button>
            ) : (
                <button onClick={mintNFT} disabled={isMinting} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full transition-colors disabled:bg-gray-500">
                    {isMinting ? 'Minting...' : 'Mint as NFT on Base'}
                </button>
            )}
            {isMinting && <p className="text-gray-300 animate-pulse">{mintingStatus}</p>}
        </div>
    </div>
  );
};

export default Receipt;
