// src/GenreReceipt.tsx

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import html2canvas from 'html2canvas';
import { ethers, BrowserProvider } from 'ethers';
import { SketchPicker, type ColorResult } from 'react-color';

import { contractAddress, contractABI } from './contract/contractInfo';
import SkeletonReceipt from './SkeletonReceipt'; // Import the skeleton component

// --- Interfaces for this component ---
interface Genre {
  name: string;
  count: number; // How many times this genre appeared in the user's top artists
}
interface Artist { // We need this interface to process the initial fetch
  id: string;
  name: string;
  genres: string[];
}
interface ReceiptProps {
  token: string;
}
type ReceiptSize = 'compact' | 'standard' | 'large';
type PaperEffect = 'clean' | 'torn' | 'stacked';

// Base network details
const baseMainnet = {
    chainId: '0x2105',
    chainName: 'Base Mainnet',
    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://mainnet.base.org'],
    blockExplorerUrls: ['https://basescan.org'],
};

const GenreReceipt: React.FC<ReceiptProps> = ({ token }) => {
  // --- State for this component ---
  const [genres, setGenres] = useState<Genre[]>([]);
  const [userName, setUserName] = useState<string>('YOUR');
  const receiptRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Customization state
  const [customTitle, setCustomTitle] = useState<string>('TOP GENRES');
  const [customFooter, setCustomFooter] = useState<string>('THANK YOU FOR VISITING!');
  const [primaryColor, setPrimaryColor] = useState<string>('#000000');
  const [backgroundColor, setBackgroundColor] = useState<string>('#ffffff');
  const [showPrimaryPicker, setShowPrimaryPicker] = useState<boolean>(false);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState<boolean>(false);
  const [genreLimit, setGenreLimit] = useState<number>(10);
  const [receiptSize, setReceiptSize] = useState<ReceiptSize>('standard');
  const [paperEffect, setPaperEffect] = useState<PaperEffect>('clean');

  // Minting State
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [mintingStatus, setMintingStatus] = useState('');

  // --- DATA FETCHING AND PROCESSING LOGIC ---
  useEffect(() => {
    const fetchDataAndProcessGenres = async () => {
      if (!token) return;
      setLoading(true);
      setError(null);
      
      try {
        // First, get the user's name
        const userProfile = await axios.get("https://api.spotify.com/v1/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUserName(userProfile.data.display_name.toUpperCase());

        // Then, fetch top 50 artists to get a rich sample of genres
        const { data } = await axios.get("https://api.spotify.com/v1/me/top/artists", {
          headers: { Authorization: `Bearer ${token}` },
          params: { 
            time_range: 'long_term', // Use long_term for the most stable genre data
            limit: 50 
          }
        });

        // Process the artist data to calculate top genres
        const genreCounts: { [key: string]: number } = {};
        data.items.forEach((artist: Artist) => {
          artist.genres.forEach(genreName => {
            genreCounts[genreName] = (genreCounts[genreName] || 0) + 1;
          });
        });

        const sortedGenres = Object.entries(genreCounts)
          .sort(([, countA], [, countB]) => countB - countA)
          .map(([name, count]) => ({ name, count }));
        
        setGenres(sortedGenres);

      } catch (err) {
        console.error("Error fetching or processing genre data", err);
        setError("Failed to calculate your top genres. The Spotify token may be invalid. Please log in again.");
      } finally {
        setLoading(false);
      }
    };
    fetchDataAndProcessGenres();
  }, [token]);

  // Blockchain helper functions
  const switchToBaseNetwork = async (provider: BrowserProvider) => {
    try {
        await provider.send('wallet_switchEthereumChain', [{ chainId: baseMainnet.chainId }]);
    } catch (switchError: any) {
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

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert("Please install MetaMask to mint an NFT.");
      return null;
    }
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
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
        
        const canvas = await html2canvas(receiptRef.current, { scale: 2, backgroundColor: 'transparent' });
        const imageData = canvas.toDataURL('image/png').split(',')[1];

        setMintingStatus("Uploading assets to IPFS...");
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8888';
        const response = await axios.post(`${backendUrl}/upload-to-ipfs`, {
            imageData,
            userName,
            timeRange: 'All Time', // Hardcoded for genres
            genres: genres.slice(0, genreLimit), // Send the final genre list
            receiptType: 'genres',
            customization: {
                title: customTitle,
                footer: customFooter,
                textColor: primaryColor,
                backgroundColor: backgroundColor,
                genreLimit: genreLimit,
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
  
  const sizeClasses: Record<ReceiptSize, string> = {
    compact: 'max-w-xs', standard: 'max-w-sm', large: 'max-w-md'
  };

  // --- Conditional Rendering for Loading and Error States ---
  if (loading) {
    return <SkeletonReceipt />;
  }
  
  if (error) {
    return (
      <div className="text-center p-8 bg-red-900/20 rounded-lg max-w-sm mx-auto">
        <h3 className="text-xl font-bold text-red-400 mb-2">An Error Occurred</h3>
        <p className="text-red-300">{error}</p>
      </div>
    );
  }

  // --- JSX (THE VIEW) FOR GENRES ---
  return (
    <div className="w-full mt-8">
        <div 
            ref={receiptRef} 
            className={`font-mono mx-auto shadow-lg relative ${sizeClasses[receiptSize]}`}
            style={{ backgroundColor: paperEffect === 'clean' ? backgroundColor : 'transparent' }}
        >
            {paperEffect === 'stacked' && (
              <>
                <div className="absolute top-1 left-1 w-full h-full rounded-sm" style={{ backgroundColor: backgroundColor, transform: 'rotate(-1.5deg)', zIndex: 1 }}></div>
                <div className="absolute top-0 left-0 w-full h-full rounded-sm" style={{ backgroundColor: backgroundColor, transform: 'rotate(1deg)', zIndex: 1 }}></div>
              </>
            )}
            <div 
                className={`p-6 relative ${paperEffect === 'torn' ? 'torn-edge' : ''}`}
                style={{ backgroundColor: backgroundColor, color: primaryColor, zIndex: 2 }}
            >
                <div className="text-center">
                    <h2 className="text-2xl font-bold uppercase">{customTitle}</h2>
                    <p className="text-sm">BASED ON ALL-TIME LISTENING</p>
                    <p className="text-sm">ORDER FOR {userName}</p>
                </div>
                <div className="my-4 border-t border-b py-2" style={{ borderColor: `${primaryColor}80`, borderStyle: 'dashed' }}>
                {genres.slice(0, genreLimit).map((genre, index) => (
                    <div key={genre.name} className="flex justify-between items-center text-sm my-2 py-1">
                        <div className="flex items-center">
                            <span className="font-bold w-6 text-center flex-shrink-0">{index + 1}.</span>
                            <p className="font-bold uppercase break-words ml-2">{genre.name}</p>
                        </div>
                        <span className="font-mono text-xs px-2 py-1 rounded" style={{ backgroundColor: `${primaryColor}1A`, color: `${primaryColor}B3` }}>
                            {genre.count} pts
                        </span>
                    </div>
                ))}
                </div>
                <div className="text-center mt-6">
                    <p className="text-xs uppercase">{customFooter}</p>
                </div>
            </div>
        </div>

        {/* --- Customization Panel for Genres --- */}
        <div className="mt-8 p-6 bg-gray-800 rounded-lg max-w-sm mx-auto text-white space-y-6">
            <h3 className="text-lg font-bold text-center">Customize Your Receipt</h3>
            
            <div className="space-y-4">
                <h4 className="text-md font-semibold mb-2 text-center text-gray-400">Layout & Style</h4>
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
            </div>

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

            <div className="space-y-4 pt-4 border-t border-gray-700">
                <h4 className="text-md font-semibold mb-2 text-center text-gray-400">Genre List</h4>
                <div>
                    <label className="block text-sm font-medium mb-2">Number of Genres</label>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-gray-700 rounded-md p-1">
                            {[10, 15, 25].map(limit => (
                                <button key={limit} onClick={() => setGenreLimit(limit)} className={`px-3 py-1 text-sm rounded-md transition-colors ${genreLimit === limit ? 'bg-green-500' : 'hover:bg-gray-600'}`}>
                                    {limit}
                                </button>
                            ))}
                        </div>
                        <input type="number" min="1" max="50" value={genreLimit} onChange={(e) => setGenreLimit(Number(e.target.value))} className="w-full bg-gray-900 rounded-md p-2 text-sm text-center"/>
                    </div>
                </div>
                 <p className="text-xs text-gray-500 text-center pt-2">Genre data is calculated from your all-time top 50 artists for best accuracy.</p>
            </div>
        </div>

        <div className="mt-8 flex flex-col items-center space-y-4 max-w-sm mx-auto">
            {!walletAddress ? (
                <button onClick={connectWallet} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-full transition-colors">
                    Connect Wallet to Mint
                </button>
            ) : (
                <button onClick={mintNFT} disabled={isMinting} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full transition-colors disabled:bg-gray-500">
                    {isMinting ? `Minting... (${mintingStatus})` : 'Mint as NFT on Base'}
                </button>
            )}
            {isMinting && <p className="text-gray-300 animate-pulse">{mintingStatus}</p>}
        </div>
    </div>
  );
};

export default GenreReceipt;