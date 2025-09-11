// src/Receipt.tsx

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import html2canvas from 'html2canvas';
import { ethers, BrowserProvider } from 'ethers';
import { SketchPicker, type ColorResult } from 'react-color';

import { contractAddress, contractABI } from './contract/contractInfo';

// Base network details remain the same
const baseMainnet = {
    chainId: '0x2105',
    chainName: 'Base Mainnet',
    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://mainnet.base.org'],
    blockExplorerUrls: ['https://basescan.org'],
};

// Interface definitions remain the same

interface Track {
  id: string;
  name: string;
  artists: { name: string }[];
  duration_ms: number;
  // Add the album property to the interface
  album: {
    images: { url: string }[];
  };
}

interface ReceiptProps {
  token: string;
}
type TimeRange = 'short_term' | 'medium_term' | 'long_term';
type ReceiptSize = 'compact' | 'standard' | 'large';
type PaperEffect = 'clean' | 'torn' | 'stacked';

const Receipt: React.FC<ReceiptProps> = ({ token }) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('short_term');
  const [userName, setUserName] = useState<string>('YOUR');
  const receiptRef = useRef<HTMLDivElement>(null);
  
  // State for Personalization and Color Themes
  const [customTitle, setCustomTitle] = useState<string>('RECEIPTIFY');
  const [customFooter, setCustomFooter] = useState<string>('THANK YOU FOR VISITING!');
  const [primaryColor, setPrimaryColor] = useState<string>('#000000');
  const [backgroundColor, setBackgroundColor] = useState<string>('#ffffff');
  const [showPrimaryPicker, setShowPrimaryPicker] = useState<boolean>(false);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState<boolean>(false);

  // --- NEW: State for Track Limit ---
  const [trackLimit, setTrackLimit] = useState<number>(10);

  // --- NEW: State for the new features ---
  const [showAlbumArt, setShowAlbumArt] = useState<boolean>(true);
  const [receiptSize, setReceiptSize] = useState<ReceiptSize>('standard');
  const [paperEffect, setPaperEffect] = useState<PaperEffect>('clean');

  // State for minting process
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [mintingStatus, setMintingStatus] = useState('');

  // Helper functions
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

  // --- UPDATED: Data fetching now depends on trackLimit ---
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
          // The limit parameter is now dynamic based on our state
          params: { time_range: timeRange, limit: trackLimit }
        });
        setTracks(data.items);
      } catch (error) {
        console.error("Error fetching data from Spotify", error);
      }
    };
    fetchData();
    // Added trackLimit to the dependency array. This makes the component
    // automatically re-fetch data whenever the limit changes.
  }, [token, timeRange, trackLimit]);

  
  // --- UPDATED: mintNFT function now sends customization data ---
  const mintNFT = async () => {
    if (!receiptRef.current) return;
    setIsMinting(true);
    setMintingStatus("Initializing...");

    try {
        setMintingStatus("Connecting to wallet...");
        if (typeof window.ethereum === 'undefined') {
          throw new Error("Please install MetaMask to mint an NFT.");
        }
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        setWalletAddress(await signer.getAddress());

        setMintingStatus("Checking network...");
        const network = await provider.getNetwork();
        if (network.chainId !== BigInt(baseMainnet.chainId)) {
            setMintingStatus("Please switch to Base network...");
            await switchToBaseNetwork(provider);
        }

        setMintingStatus("Generating receipt image...");
        const canvas = await html2canvas(receiptRef.current, { scale: 2, backgroundColor: null });
        const imageData = canvas.toDataURL('image/png').split(',')[1];

        setMintingStatus("Uploading assets to IPFS...");
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8888';
        const response = await axios.post(`${backendUrl}/upload-to-ipfs`, {
            imageData,
            userName,
            timeRange: timeRangeLabels[timeRange],
            tracks: tracks,
            // --- NEW: Send all customization data to the backend ---
            customization: {
                title: customTitle,
                footer: customFooter,
                textColor: primaryColor,
                backgroundColor: backgroundColor,
                trackLimit: trackLimit,
           // --- NEW: Send the new feature states ---
            showAlbumArt: showAlbumArt,
            receiptSize: receiptSize,
            paperEffect: paperEffect,
        }
    });
        const { tokenURI } = response.data;
        if (!tokenURI) throw new Error("Failed to get tokenURI from backend.");

        setMintingStatus("Please confirm transaction in MetaMask...");
        const contract = new ethers.Contract(contractAddress, contractABI, signer);
        const transaction = await contract.safeMint(tokenURI);

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
  
  // Blockchain helper functions (connectWallet, switchToBaseNetwork) remain the same.
  // ... (Omitted for brevity)
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

// --- NEW: Helper to get dynamic classes for receipt size ---
  const sizeClasses: Record<ReceiptSize, string> = {
    compact: 'max-w-xs',
    standard: 'max-w-sm',
    large: 'max-w-md'
  };
  // --- JSX (The View) ---
   // --- JSX (The View) ---
  return (
    <div className="w-full mt-8">
        {/* --- UPDATED: Receipt display with dynamic classes for size and paper effect --- */}
        <div 
            ref={receiptRef} 
            // The outer div now controls the size and relative positioning for effects
            className={`font-mono mx-auto shadow-lg relative ${sizeClasses[receiptSize]}`}
            // The background is made transparent when an effect is active to prevent color overlap
            style={{ backgroundColor: paperEffect === 'clean' ? backgroundColor : 'transparent' }}
        >
            {/* Paper effect layers: These are positioned behind the main content */}
            {paperEffect === 'stacked' && (
              <>
                <div className="absolute top-1 left-1 w-full h-full rounded-sm" style={{ backgroundColor: backgroundColor, transform: 'rotate(-1.5deg)', zIndex: 1 }}></div>
                <div className="absolute top-0 left-0 w-full h-full rounded-sm" style={{ backgroundColor: backgroundColor, transform: 'rotate(1deg)', zIndex: 1 }}></div>
              </>
            )}

            {/* Main receipt content div */}
            <div 
                // The 'torn-edge' class is applied conditionally
                className={`p-6 relative ${paperEffect === 'torn' ? 'torn-edge' : ''}`}
                // This div always gets the background color and has a higher z-index
                style={{ backgroundColor: backgroundColor, color: primaryColor, zIndex: 2 }}
            >
                <div className="text-center">
                    <h2 className="text-2xl font-bold uppercase">{customTitle}</h2>
                    <p className="text-sm">{timeRangeLabels[timeRange]}</p>
                    <p className="text-sm">ORDER FOR {userName}</p>
                </div>
                <div className="my-4 border-t border-b py-2" style={{ borderColor: `${primaryColor}80`, borderStyle: 'dashed' }}>
                {tracks.length > 0 ? (
                    tracks.map((track, index) => (
                    <div key={track.id} className="flex justify-between items-center text-sm my-2 gap-3">
                        {/* --- Conditional Album Art --- */}
                        {showAlbumArt && track.album.images.length > 0 && (
                            <img src={track.album.images[0].url} alt={track.name} className="w-10 h-10 object-cover flex-shrink-0" />
                        )}
                        <div className="flex-grow text-left">
                            <p className="font-bold uppercase break-words">{track.name}</p>
                            <p className="uppercase break-words" style={{ color: `${primaryColor}B3` }}>
                                {track.artists.map(artist => artist.name).join(', ')}
                            </p>
                        </div>
                        <span className="font-bold whitespace-nowrap">{formatDuration(track.duration_ms)}</span>
                    </div>
                    ))
                ) : (
                    <p className="text-center py-4" style={{ color: `${primaryColor}80` }}>Loading tracks...</p>
                )}
                </div>
                <div className="text-center mt-6">
                    <p className="text-xs uppercase">{customFooter}</p>
                </div>
            </div>
        </div>

        {/* --- Full Customization Panel --- */}
        <div className="mt-8 p-6 bg-gray-800 rounded-lg max-w-sm mx-auto text-white space-y-6">
            <h3 className="text-lg font-bold text-center">Customize Your Receipt</h3>
            
            {/* Section for Layout & Style */}
            <div className="space-y-4">
                <h4 className="text-md font-semibold mb-2 text-center text-gray-400">Layout & Style</h4>
                {/* Receipt Size */}
                <div>
                    <label className="block text-sm font-medium mb-2">Receipt Size</label>
                    <div className="flex items-center gap-1 bg-gray-700 rounded-md p-1">
                        {(['compact', 'standard', 'large'] as ReceiptSize[]).map(size => (
                            <button key={size} onClick={() => setReceiptSize(size)} className={`w-full capitalize px-3 py-1 text-sm rounded-md transition-colors ${receiptSize === size ? 'bg-green-500' : 'hover:bg-gray-600'}`}>
                                {size}
                            </button>
                        ))}
                    </div>
                </div>
                {/* Paper Effect */}
                <div>
                    <label className="block text-sm font-medium mb-2">Paper Effect</label>
                    <div className="flex items-center gap-1 bg-gray-700 rounded-md p-1">
                        {(['clean', 'torn', 'stacked'] as PaperEffect[]).map(effect => (
                            <button key={effect} onClick={() => setPaperEffect(effect)} className={`w-full capitalize px-3 py-1 text-sm rounded-md transition-colors ${paperEffect === effect ? 'bg-green-500' : 'hover:bg-gray-600'}`}>
                                {effect}
                            </button>
                        ))}
                    </div>
                </div>
                 {/* Album Art Toggle */}
                 <div className="flex justify-between items-center pt-2">
                    <label className="text-sm font-medium">Show Album Art</label>
                    <button onClick={() => setShowAlbumArt(!showAlbumArt)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${showAlbumArt ? 'bg-green-500' : 'bg-gray-600'}`}>
                        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${showAlbumArt ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>

             {/* Section for Content & Colors */}
            <div className="space-y-4 pt-4 border-t border-gray-700">
                 <h4 className="text-md font-semibold mb-2 text-center text-gray-400">Content & Colors</h4>
                 <div>
                    <label className="block text-sm font-medium mb-1">Custom Title</label>
                    <input type="text" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} className="w-full bg-gray-700 rounded-md p-2 text-sm"/>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Custom Footer</label>
                    <input type="text" value={customFooter} onChange={(e) => setCustomFooter(e.target.value)} className="w-full bg-gray-700 rounded-md p-2 text-sm"/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Text Color</label>
                        <button onClick={() => setShowPrimaryPicker(!showPrimaryPicker)} className="p-2 rounded-md w-full" style={{ backgroundColor: primaryColor }} />
                        {showPrimaryPicker && (
                            <div className="absolute z-10 mt-2">
                                <div className="fixed inset-0" onClick={() => setShowPrimaryPicker(false)}/>
                                <SketchPicker color={primaryColor} onChange={(color: ColorResult) => setPrimaryColor(color.hex)} />
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Background Color</label>
                        <button onClick={() => setShowBackgroundPicker(!showBackgroundPicker)} className="p-2 rounded-md w-full" style={{ backgroundColor: backgroundColor, border: `1px solid ${primaryColor}`}}/>
                        {showBackgroundPicker && (
                            <div className="absolute z-10 mt-2">
                                <div className="fixed inset-0" onClick={() => setShowBackgroundPicker(false)}/>
                                <SketchPicker color={backgroundColor} onChange={(color: ColorResult) => setBackgroundColor(color.hex)} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Section for Track List */}
            <div className="space-y-4 pt-4 border-t border-gray-700">
                <h4 className="text-md font-semibold mb-2 text-center text-gray-400">Track List</h4>
                <div>
                    <label className="block text-sm font-medium mb-2">Time Period</label>
                     <div className="flex justify-center space-x-1 bg-gray-700 p-1 rounded-md">
                        <button onClick={() => setTimeRange('short_term')} className={`w-full px-3 py-1 text-sm rounded transition-colors ${timeRange === 'short_term' ? 'bg-green-500 text-white' : 'hover:bg-gray-600'}`}>Month</button>
                        <button onClick={() => setTimeRange('medium_term')} className={`w-full px-3 py-1 text-sm rounded transition-colors ${timeRange === 'medium_term' ? 'bg-green-500 text-white' : 'hover:bg-gray-600'}`}>6 Months</button>
                        <button onClick={() => setTimeRange('long_term')} className={`w-full px-3 py-1 text-sm rounded transition-colors ${timeRange === 'long_term' ? 'bg-green-500 text-white' : 'hover:bg-gray-600'}`}>All Time</button>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-2">Number of Tracks</label>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-gray-700 rounded-md p-1">
                            {[10, 25, 50].map(limit => (
                                <button key={limit} onClick={() => setTrackLimit(limit)} className={`px-3 py-1 text-sm rounded-md transition-colors ${trackLimit === limit ? 'bg-green-500' : 'hover:bg-gray-600'}`}>
                                    {limit}
                                </button>
                            ))}
                        </div>
                        <input type="number" min="1" max="50" value={trackLimit} onChange={(e) => setTrackLimit(Number(e.target.value))} className="w-full bg-gray-900 rounded-md p-2 text-sm text-center"/>
                    </div>
                </div>
            </div>
        </div>

        {/* --- Minting controls --- */}
        <div className="mt-8 flex flex-col items-center space-y-4 max-w-sm mx-auto">
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
// --- FIX: This closing brace was missing ---
};
export default Receipt;