// src/ArtistReceipt.tsx

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import html2canvas from 'html2canvas';
import { ethers, BrowserProvider } from 'ethers';
import { SketchPicker, type ColorResult } from 'react-color';

import { contractAddress, contractABI } from './contract/contractInfo';

// --- ARTIST-SPECIFIC INTERFACE ---
interface Artist {
  id: string;
  name: string;
  images: { url: string }[];
  genres: string[];
}
interface ReceiptProps {
  token: string;
}
type TimeRange = 'short_term' | 'medium_term' | 'long_term';
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

const ArtistReceipt: React.FC<ReceiptProps> = ({ token }) => {
  // --- STATE MODIFIED FOR ARTISTS ---
  const [artists, setArtists] = useState<Artist[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('short_term');
  const [userName, setUserName] = useState<string>('YOUR');
  const receiptRef = useRef<HTMLDivElement>(null);
  
  // Customization state
  const [customTitle, setCustomTitle] = useState<string>('TOP ARTISTS');
  const [customFooter, setCustomFooter] = useState<string>('THANK YOU FOR VISITING!');
  const [primaryColor, setPrimaryColor] = useState<string>('#000000');
  const [backgroundColor, setBackgroundColor] = useState<string>('#ffffff');
  const [showPrimaryPicker, setShowPrimaryPicker] = useState<boolean>(false);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState<boolean>(false);
  const [artistLimit, setArtistLimit] = useState<number>(10); // Renamed for clarity
  const [showArtistImage, setShowArtistImage] = useState<boolean>(true); // Renamed for clarity
  const [receiptSize, setReceiptSize] = useState<ReceiptSize>('standard');
  const [paperEffect, setPaperEffect] = useState<PaperEffect>('clean');

  // Minting State
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [mintingStatus, setMintingStatus] = useState('');

  const timeRangeLabels: { [key in TimeRange]: string } = {
    short_term: 'LAST MONTH',
    medium_term: 'LAST 6 MONTHS',
    long_term: 'ALL TIME',
  };

  // --- DATA FETCHING LOGIC UPDATED FOR ARTISTS ---
  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      try {
        const userProfile = await axios.get("https://api.spotify.com/v1/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUserName(userProfile.data.display_name.toUpperCase());
        
        // --- THE KEY CHANGE: Use the /top/artists endpoint ---
        const { data } = await axios.get("https://api.spotify.com/v1/me/top/artists", {
          headers: { Authorization: `Bearer ${token}` },
          params: { time_range: timeRange, limit: artistLimit }
        });
        setArtists(data.items);
      } catch (error) {
        console.error("Error fetching artist data from Spotify", error);
      }
    };
    fetchData();
  }, [token, timeRange, artistLimit]);

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

  // --- MINTING LOGIC UPDATED TO SEND ARTIST DATA ---
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
        const canvas = await html2canvas(receiptRef.current, { scale: 2, backgroundColor: 'transparent' });
        const imageData = canvas.toDataURL('image/png').split(',')[1];

        setMintingStatus("Uploading assets to IPFS...");
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8888';
        const response = await axios.post(`${backendUrl}/upload-to-ipfs`, {
            imageData,
            userName,
            timeRange: timeRangeLabels[timeRange],
            // --- SEND 'artists' INSTEAD OF 'tracks' ---
            artists: artists,
            // --- Also send receiptType to help the backend ---
            receiptType: 'artists',
            customization: {
                title: customTitle,
                footer: customFooter,
                textColor: primaryColor,
                backgroundColor: backgroundColor,
                artistLimit: artistLimit, // Use artist-specific name
                showArtistImage: showArtistImage, // Use artist-specific name
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

  // --- JSX (THE VIEW) UPDATED FOR ARTISTS ---
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
                    <p className="text-sm">{timeRangeLabels[timeRange]}</p>
                    <p className="text-sm">ORDER FOR {userName}</p>
                </div>
                <div className="my-4 border-t border-b py-2" style={{ borderColor: `${primaryColor}80`, borderStyle: 'dashed' }}>
                {artists.length > 0 ? (
                    artists.map((artist, index) => (
                    <div key={artist.id} className="flex items-center text-sm my-3 gap-3">
                        <span className="font-bold w-6 text-center flex-shrink-0">{index + 1}.</span>
                        {showArtistImage && artist.images.length > 0 && (
                            <img src={artist.images[0].url} alt={artist.name} className="w-10 h-10 object-cover rounded-full flex-shrink-0" />
                        )}
                        <div className="flex-grow text-left">
                            <p className="font-bold uppercase break-words">{artist.name}</p>
                            <p className="capitalize break-words text-xs" style={{ color: `${primaryColor}B3` }}>
                                {artist.genres.slice(0, 2).join(', ')}
                            </p>
                        </div>
                    </div>
                    ))
                ) : (
                    <p className="text-center py-4" style={{ color: `${primaryColor}80` }}>Loading artists...</p>
                )}
                </div>
                <div className="text-center mt-6">
                    <p className="text-xs uppercase">{customFooter}</p>
                </div>
            </div>
        </div>

        {/* --- Full Customization Panel (Relabeled for Artists) --- */}
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
                 <div className="flex justify-between items-center pt-2">
                    <label className="text-sm font-medium">Show Artist Image</label>
                    <button onClick={() => setShowArtistImage(!showArtistImage)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${showArtistImage ? 'bg-green-500' : 'bg-gray-600'}`}>
                        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${showArtistImage ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
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
                <h4 className="text-md font-semibold mb-2 text-center text-gray-400">Artist List</h4>
                <div>
                    <label className="block text-sm font-medium mb-2">Time Period</label>
                     <div className="flex justify-center space-x-1 bg-gray-700 p-1 rounded-md">
                        <button onClick={() => setTimeRange('short_term')} className={`w-full px-3 py-1 text-sm rounded transition-colors ${timeRange === 'short_term' ? 'bg-green-500 text-white' : 'hover:bg-gray-600'}`}>Month</button>
                        <button onClick={() => setTimeRange('medium_term')} className={`w-full px-3 py-1 text-sm rounded transition-colors ${timeRange === 'medium_term' ? 'bg-green-500 text-white' : 'hover:bg-gray-600'}`}>6 Months</button>
                        <button onClick={() => setTimeRange('long_term')} className={`w-full px-3 py-1 text-sm rounded transition-colors ${timeRange === 'long_term' ? 'bg-green-500 text-white' : 'hover:bg-gray-600'}`}>All Time</button>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-2">Number of Artists</label>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-gray-700 rounded-md p-1">
                            {[10, 25, 50].map(limit => (
                                <button key={limit} onClick={() => setArtistLimit(limit)} className={`px-3 py-1 text-sm rounded-md transition-colors ${artistLimit === limit ? 'bg-green-500' : 'hover:bg-gray-600'}`}>
                                    {limit}
                                </button>
                            ))}
                        </div>
                        <input type="number" min="1" max="50" value={artistLimit} onChange={(e) => setArtistLimit(Number(e.target.value))} className="w-full bg-gray-900 rounded-md p-2 text-sm text-center"/>
                    </div>
                </div>
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

export default ArtistReceipt;