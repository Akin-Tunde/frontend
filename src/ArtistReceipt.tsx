// src/ArtistReceipt.tsx - Enhanced version with modern UI/UX

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import html2canvas from 'html2canvas';
import { ethers, BrowserProvider } from 'ethers';
import { SketchPicker, type ColorResult } from 'react-color';
import SkeletonReceipt from './SkeletonReceipt';
import {
  Mic,
  Palette,
  Download,
  Wallet,
  Settings,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Type,
  Layout,
  Clock,
  Loader2,
  AlertCircle
} from 'lucide-react';

// --- NEW: Import DatePicker ---
import DatePicker from 'react-datepicker';

import { contractAddress, contractABI } from './contract/contractInfo';

// Base network configuration
const baseMainnet = {
  chainId: '0x2105',
  chainName: 'Base Mainnet',
  nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://mainnet.base.org'],
  blockExplorerUrls: ['https://basescan.org'],
};

// Interface definitions
interface Artist {
  id: string;
  name: string;
  images: { url: string }[];
  genres: string[];
}
interface ReceiptProps {
  token: string;
}
type TimeRange = 'short_term' | 'medium_term' | 'long_term' | 'custom';
type ReceiptSize = 'compact' | 'standard' | 'large';
type PaperEffect = 'clean' | 'torn' | 'stacked';

const ArtistReceipt: React.FC<ReceiptProps> = ({ token }) => {
  // Core state
  const [artists, setArtists] = useState<Artist[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('short_term');
  const [userName, setUserName] = useState<string>('YOUR');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

    // --- NEW: State for Custom Date Range ---
  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7); // Default to one week ago
    return d;
  });
  const [endDate, setEndDate] = useState<Date>(new Date());

  // Customization state
  const [customTitle, setCustomTitle] = useState<string>('TOP ARTISTS');
  const [customFooter, setCustomFooter] = useState<string>('THANK YOU FOR VISITING!');
  const [primaryColor, setPrimaryColor] = useState<string>('#000000');
  const [backgroundColor, setBackgroundColor] = useState<string>('#ffffff');
  const [showPrimaryPicker, setShowPrimaryPicker] = useState<boolean>(false);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState<boolean>(false);
  const [artistLimit, setArtistLimit] = useState<number>(10);
  const [showArtistImage, setShowArtistImage] = useState<boolean>(true);
  const [receiptSize, setReceiptSize] = useState<ReceiptSize>('standard');
  const [paperEffect, setPaperEffect] = useState<PaperEffect>('clean');

  // UI state
  const [showCustomization, setShowCustomization] = useState<boolean>(false);
  const [expandedSections, setExpandedSections] = useState({
    appearance: true,
    content: false,
    layout: false,
  });

  // Minting state
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [mintingStatus, setMintingStatus] = useState('');
  const [mintingStep, setMintingStep] = useState(0);

   // --- MODIFIED: Updated timeRangeLabels ---
  const timeRangeLabels: { [key in TimeRange]: string } = {
    short_term: 'LAST MONTH',
    medium_term: 'LAST 6 MONTHS',
    long_term: 'ALL TIME',
    custom: `CUSTOM RANGE`,
  };

  const sizeClasses: Record<ReceiptSize, string> = {
    compact: 'max-w-xs',
    standard: 'max-w-sm',
    large: 'max-w-md'
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Data fetching
  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const userProfile = await axios.get("https://api.spotify.com/v1/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUserName(userProfile.data.display_name.toUpperCase());
        const { data } = await axios.get("https://api.spotify.com/v1/me/top/artists", {
          headers: { Authorization: `Bearer ${token}` },
          params: { time_range: timeRange, limit: artistLimit }
        });
        setArtists(data.items);
      } catch (err) {
        console.error("Error fetching artist data from Spotify", err);
        setError("Failed to fetch your top artists. The Spotify token may have expired. Please try logging in again.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, timeRange, artistLimit]);

  // Blockchain functions
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
    setMintingStep(1);
    setMintingStatus("Connecting to wallet...");

    try {
      if (typeof window.ethereum === 'undefined') {
        throw new Error("Please install MetaMask to mint an NFT.");
      }
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      setWalletAddress(await signer.getAddress());

      setMintingStep(2);
      setMintingStatus("Checking network...");
      const network = await provider.getNetwork();
      if (network.chainId !== BigInt(baseMainnet.chainId)) {
        setMintingStatus("Switching to Base network...");
        await switchToBaseNetwork(provider);
      }

      setMintingStep(3);
      setMintingStatus("Generating receipt image...");
      const canvas = await html2canvas(receiptRef.current, { scale: 2, backgroundColor: null });
      const imageData = canvas.toDataURL('image/png').split(',')[1];

      setMintingStep(4);
      setMintingStatus("Uploading to IPFS...");
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8888';
      const response = await axios.post(`${backendUrl}/upload-to-ipfs`, {
        imageData,
        userName,
        timeRange: timeRangeLabels[timeRange],
        artists: artists, // Send artists data
        receiptType: 'artists', // Specify receipt type
        customization: {
          title: customTitle,
          footer: customFooter,
          textColor: primaryColor,
          backgroundColor: backgroundColor,
          artistLimit: artistLimit,
          showArtistImage: showArtistImage,
          receiptSize: receiptSize,
          paperEffect: paperEffect,
        }
      });

      const { tokenURI } = response.data;
      if (!tokenURI) throw new Error("Failed to get tokenURI from backend.");

      setMintingStep(5);
      setMintingStatus("Confirming transaction...");
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      const transaction = await contract.safeMint(tokenURI);

      setMintingStep(6);
      setMintingStatus("Minting on blockchain...");
      await transaction.wait();

      setMintingStep(7);
      setMintingStatus("Success!");
      alert("NFT minted successfully! You can view it on OpenSea.");

    } catch (error: any) {
      console.error("Minting failed:", error);
      alert(`Minting failed: ${error.message || "Please check the console for details."}`);
      setMintingStatus('Minting failed. Please try again.');
    } finally {
      setIsMinting(false);
      setMintingStep(0);
    }
  };

  // Loading and error states
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900 flex items-center justify-center p-4">
        <SkeletonReceipt />
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center p-8 bg-red-900/20 backdrop-blur-lg rounded-2xl border border-red-500/20 max-w-md">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-red-400 mb-2">Something went wrong</h3>
          <p className="text-red-300 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return  (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900">
      <header className="bg-black/20 backdrop-blur-lg border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Mic className="h-6 w-6 text-green-400" />
              <span className="text-xl font-bold text-white">Receiptify</span>
              <span className="text-sm text-gray-400">• Artists</span>
            </div>
            <button onClick={() => setShowCustomization(!showCustomization)} className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-colors border ${showCustomization ? 'bg-green-500 text-white border-green-500' : 'bg-white/10 hover:bg-white/20 text-white border-white/20'}`}>
              <Settings className="h-4 w-4" />
              <span>Customize</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className={`grid gap-8 ${showCustomization ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>
          <div className={showCustomization ? 'lg:col-span-2' : 'max-w-2xl mx-auto w-full'}>
            
            {/* --- MODIFIED: Time Period Selector --- */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 mb-8 border border-white/20">
              <div className="flex items-center space-x-2 mb-4">
                <Clock className="h-5 w-5 text-blue-400" />
                <span className="text-white font-medium">Time Period</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(['short_term', 'medium_term', 'long_term', 'custom'] as TimeRange[]).map((key) => (
                  <button key={key} onClick={() => setTimeRange(key)} className={`py-3 px-4 rounded-xl font-medium transition-all text-sm capitalize ${timeRange === key ? 'bg-green-500 text-white shadow-lg' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}>
                    {key.includes('_') ? key.split('_')[0] : key}
                  </button>
                ))}
              </div>
              {/* --- NEW: Date Picker UI --- */}
              {timeRange === 'custom' && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-2 text-center">Start Date</label>
                      <DatePicker
                        selected={startDate}
                        onChange={(date: Date) => setStartDate(date)}
                        selectsStart
                        startDate={startDate}
                        endDate={endDate}
                        maxDate={new Date()}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-2 text-center">End Date</label>
                       <DatePicker
                        selected={endDate}
                        onChange={(date: Date) => setEndDate(date)}
                        selectsEnd
                        startDate={startDate}
                        endDate={endDate}
                        minDate={startDate}
                        maxDate={new Date()}
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="flex items-start space-x-2 bg-blue-900/20 text-blue-300 text-xs p-3 mt-4 rounded-lg border border-blue-500/20">
                    <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>Custom range is calculated from your recent listening history and may only go back ~50 days due to Spotify API limits.</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-center mb-8">
              <div ref={receiptRef} className={`font-mono shadow-2xl relative transition-transform duration-300 hover:scale-[1.02] ${sizeClasses[receiptSize]}`} style={{ backgroundColor: paperEffect === 'clean' ? backgroundColor : 'transparent' }}>
                {paperEffect === 'stacked' && (
                  <>
                    <div className="absolute top-1 left-1 w-full h-full rounded-sm" style={{ backgroundColor: backgroundColor, transform: 'rotate(-1.5deg)', zIndex: 1 }}></div>
                    <div className="absolute top-0 left-0 w-full h-full rounded-sm" style={{ backgroundColor: backgroundColor, transform: 'rotate(1deg)', zIndex: 1 }}></div>
                  </>
                )}
                <div className={`p-6 relative ${paperEffect === 'torn' ? 'torn-edge' : ''}`} style={{ backgroundColor: backgroundColor, color: primaryColor, zIndex: 2 }}>
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold uppercase mb-2">{customTitle}</h2>
                    {/* --- MODIFIED: Receipt Header to show dynamic date range --- */}
                    <p className="text-sm opacity-80">
                      {timeRange === 'custom'
                        ? `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
                        : timeRangeLabels[timeRange]
                      }
                    </p>
                    <p className="text-sm opacity-80">ORDER FOR {userName}</p>
                    <div className="mt-4 h-px bg-current opacity-20"></div>
                  </div>
                  <div className="space-y-3 mb-6">
                    {/* --- MODIFIED: Added check for empty artists --- */}
                    {artists.length > 0 ? (
                      artists.map((artist, index) => (
                        <div key={artist.id} className="flex items-center gap-3 text-sm">
                          <span className="font-bold w-6 text-center flex-shrink-0">{index + 1}.</span>
                          {showArtistImage && artist.images.length > 0 && (
                            <img src={artist.images[0].url} alt={artist.name} className="w-10 h-10 object-cover rounded-full flex-shrink-0" />
                          )}
                          <div className="flex-grow min-w-0">
                            <p className="font-bold uppercase truncate">{artist.name}</p>
                            <p className="opacity-70 capitalize text-xs truncate">
                              {artist.genres.slice(0, 2).join(', ')}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        {loading ? (
                          <>
                           <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 opacity-50" />
                           <p className="opacity-50">Loading artists...</p>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="opacity-50 px-4">No listening history found for this period.</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-center pt-4 border-t border-current border-opacity-20">
                    <p className="text-xs uppercase opacity-80">{customFooter}</p>
                     <div className="mt-2 text-xs opacity-60">
                      {new Date().toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-full transition-colors shadow-lg">
                <Download className="h-4 w-4" />
                <span>Download Image</span>
              </button>
              
              {!walletAddress ? (
                <button 
                  onClick={connectWallet}
                  className="flex items-center justify-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-full transition-colors shadow-lg"
                >
                  <Wallet className="h-4 w-4" />
                  <span>Connect Wallet</span>
                </button>
              ) : (
                <button 
                  onClick={mintNFT}
                  disabled={isMinting}
                  className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold py-3 px-6 rounded-full transition-colors shadow-lg"
                >
                  {isMinting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wallet className="h-4 w-4" />
                  )}
                  <span>{isMinting ? 'Minting...' : 'Mint as NFT'}</span>
                </button>
              )}
            </div>

            {isMinting && (
              <div className="mt-6 bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <div className="flex items-center space-x-3 mb-4">
                  <Loader2 className="h-5 w-5 animate-spin text-green-400" />
                  <span className="text-white font-medium">Minting Progress</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Step {mintingStep} of 7</span>
                    <span className="text-white">{Math.round((mintingStep / 7) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(mintingStep / 7) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-gray-300 text-sm">{mintingStatus}</p>
                </div>
              </div>
            )}
          </div>

          {showCustomization && (
            <div className="lg:col-span-1">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden sticky top-24">
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2"><Palette className="h-5 w-5" /><span>Customization</span></h3>
                  
                  <div className="mb-6">
                    <button onClick={() => toggleSection('appearance')} className="flex items-center justify-between w-full text-left text-white font-medium mb-4 hover:text-green-400 transition-colors">
                      <div className="flex items-center space-x-2"><Palette className="h-4 w-4" /><span>Appearance</span></div>
                      {expandedSections.appearance ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {expandedSections.appearance && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-gray-400 mb-2">Text Color</label>
                            <div className="relative">
                              <button
                                onClick={() => setShowPrimaryPicker(!showPrimaryPicker)}
                                className="w-full h-10 rounded-lg border border-white/20 cursor-pointer"
                                style={{ backgroundColor: primaryColor }}
                              />
                              {showPrimaryPicker && (
                                <div className="absolute z-10 mt-2">
                                  <div className="fixed inset-0" onClick={() => setShowPrimaryPicker(false)}/>
                                  <SketchPicker color={primaryColor} onChange={(color: ColorResult) => setPrimaryColor(color.hex)} />
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-2">Background</label>
                            <div className="relative">
                              <button
                                onClick={() => setShowBackgroundPicker(!showBackgroundPicker)}
                                className="w-full h-10 rounded-lg border border-white/20 cursor-pointer"
                                style={{ backgroundColor: backgroundColor }}
                              />
                              {showBackgroundPicker && (
                                <div className="absolute z-10 mt-2">
                                  <div className="fixed inset-0" onClick={() => setShowBackgroundPicker(false)}/>
                                  <SketchPicker color={backgroundColor} onChange={(color: ColorResult) => setBackgroundColor(color.hex)} />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-2">Paper Effect</label>
                          <div className="grid grid-cols-3 gap-1">
                            {(['clean', 'torn', 'stacked'] as PaperEffect[]).map(effect => (
                              <button key={effect} onClick={() => setPaperEffect(effect)} className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors capitalize ${paperEffect === effect ? 'bg-green-500 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>{effect}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mb-6">
                    <button onClick={() => toggleSection('content')} className="flex items-center justify-between w-full text-left text-white font-medium mb-4 hover:text-green-400 transition-colors">
                      <div className="flex items-center space-x-2"><Type className="h-4 w-4" /><span>Content</span></div>
                      {expandedSections.content ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {expandedSections.content && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-2">Receipt Title</label>
                          <input type="text" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-2">Footer Text</label>
                          <input type="text" value={customFooter} onChange={(e) => setCustomFooter(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mb-6">
                    <button onClick={() => toggleSection('layout')} className="flex items-center justify-between w-full text-left text-white font-medium mb-4 hover:text-green-400 transition-colors">
                      <div className="flex items-center space-x-2"><Layout className="h-4 w-4" /><span>Layout</span></div>
                      {expandedSections.layout ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {expandedSections.layout && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-2">Receipt Size</label>
                          <div className="grid grid-cols-3 gap-1">
                            {(['compact', 'standard', 'large'] as ReceiptSize[]).map(size => (
                              <button key={size} onClick={() => setReceiptSize(size)} className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors capitalize ${receiptSize === size ? 'bg-green-500 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>{size}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-2">Number of Artists: {artistLimit}</label>
                          <input type="range" min="5" max="50" value={artistLimit} onChange={(e) => setArtistLimit(Number(e.target.value))} className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer" />
                           <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>5</span>
                            <span>50</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2"><ImageIcon className="h-4 w-4 text-gray-400" /><label className="text-sm text-white">Show Artist Image</label></div>
                          <button onClick={() => setShowArtistImage(!showArtistImage)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showArtistImage ? 'bg-green-500' : 'bg-gray-600'}`}>
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showArtistImage ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ArtistReceipt;