// src/ArtistReceipt.tsx - Enhanced version with receipt UI/UX

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
  AlertCircle,
  X
} from 'lucide-react';

import { contractAddress, contractABI } from './contract/contractInfo';
import { sdk } from '@farcaster/miniapp-sdk';

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
type TimeRange = 'short_term' | 'medium_term' | 'long_term';
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
  const [isFarcaster, setIsFarcaster] = useState(false);

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

  // Helper functions
  const timeRangeLabels: { [key in TimeRange]: string } = {
    short_term: 'LAST MONTH',
    medium_term: 'LAST 6 MONTHS',
    long_term: 'ALL TIME',
  };

  const sizeClasses: Record<ReceiptSize, string> = {
    compact: 'w-full max-w-[260px] sm:max-w-[280px] mx-auto',
    standard: 'w-full max-w-[300px] sm:max-w-[320px] mx-auto', 
    large: 'w-full max-w-[340px] sm:max-w-[380px] mx-auto'
  };
  
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    const checkForFarcaster = async () => {
      try {
        const appData = await sdk.app.getFrameData();
        if (appData) setIsFarcaster(true);
      } catch (error) {
        setIsFarcaster(false);
      }
    };
    checkForFarcaster();
  }, []);
  
  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const userProfile = await axios.get("https://api.spotify.com/v1/me", { headers: { Authorization: `Bearer ${token}` } });
        setUserName(userProfile.data.display_name.toUpperCase());
        const { data } = await axios.get("https://api.spotify.com/v1/me/top/artists", {
          headers: { Authorization: `Bearer ${token}` },
          params: { time_range: timeRange, limit: artistLimit }
        });
        setArtists(data.items);
      } catch (err) {
        console.error("Error fetching artist data from Spotify", err);
        setError("Failed to fetch top artists. The Spotify token may have expired. Please try logging in again.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, timeRange, artistLimit]);

  const switchToBaseNetwork = async (provider: BrowserProvider) => {
    try {
      await provider.send('wallet_switchEthereumChain', [{ chainId: baseMainnet.chainId }]);
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await provider.send('wallet_addEthereumChain', [baseMainnet]);
        } catch (addError) { throw new Error("Failed to add Base network."); }
      } else { throw new Error("Failed to switch to Base network."); }
    }
  };

  const connectWallet = async () => {
    if (isFarcaster) {
      try {
        const walletData = await sdk.wallet.connect();
        if (walletData) setWalletAddress(walletData.address);
      } catch (error) {
        console.error("Farcaster wallet connection failed:", error);
        alert("Could not connect Farcaster wallet.");
      }
    } else {
      if (typeof window.ethereum === 'undefined') {
        return alert("Please install MetaMask to use this feature.");
      }
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        if (accounts.length > 0) setWalletAddress(accounts[0]);
      } catch (error) {
        console.error("Browser wallet connection failed", error);
        alert("Wallet connection failed.");
      }
    }
  };

  const downloadImage = async () => {
    if (!receiptRef.current) return;
    try {
      const canvas = await html2canvas(receiptRef.current, { 
        scale: 2, 
        backgroundColor: null,
        useCORS: true 
      });
      const link = document.createElement('a');
      link.download = `${userName}-receiptify-artists-${timeRange}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to download image. Please try again.");
    }
  };

  const mintNFT = async () => {
    if (!walletAddress || !receiptRef.current) {
        return alert("Please connect your wallet before minting.");
    }
    setIsMinting(true);
    setMintingStep(1);
    setMintingStatus("Preparing the receipt...");
    try {
        setMintingStep(2);
        setMintingStatus("Generating receipt image...");
        const canvas = await html2canvas(receiptRef.current, { scale: 2, backgroundColor: null, useCORS: true });
        const imageData = canvas.toDataURL('image/png').split(',')[1];

        setMintingStep(3);
        setMintingStatus("Uploading receipt to IPFS...");
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8888';
        const response = await axios.post(`${backendUrl}/upload-to-ipfs`, {
            imageData,
            userName,
            timeRange: timeRangeLabels[timeRange],
            artists: artists,
            receiptType: 'artists',
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
        if (!tokenURI) throw new Error("Failed to get a valid tokenURI from the backend.");

        if (isFarcaster) {
            setMintingStep(4);
            setMintingStatus("Preparing Farcaster transaction...");
            const provider = new ethers.JsonRpcProvider(baseMainnet.rpcUrls[0]);
            const contract = new ethers.Contract(contractAddress, contractABI, provider);
            const unpopulatedTx = await contract.safeMint.populateTransaction(tokenURI);

            setMintingStep(5);
            setMintingStatus("Please confirm in your Farcaster client...");
            const txResponse = await sdk.wallet.sendTransaction({ to: contractAddress, data: unpopulatedTx.data as `0x${string}` });

            setMintingStep(6);
            setMintingStatus(`Transaction sent! Waiting for confirmation...`);
            await provider.waitForTransaction(txResponse.hash);
        } else {
            setMintingStep(4);
            setMintingStatus("Connecting to MetaMask...");
            if (typeof window.ethereum === 'undefined') throw new Error("MetaMask is not installed.");
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();

            const network = await provider.getNetwork();
            if (network.chainId !== BigInt(baseMainnet.chainId)) {
                setMintingStatus("Incorrect network. Please switch to Base Mainnet.");
                await switchToBaseNetwork(provider);
            }

            setMintingStep(5);
            setMintingStatus("Please confirm in MetaMask...");
            const contract = new ethers.Contract(contractAddress, contractABI, signer);
            const transaction = await contract.safeMint(tokenURI);

            setMintingStep(6);
            setMintingStatus("Transaction sent! Waiting for confirmation...");
            await transaction.wait();
        }
        setMintingStep(7);
        setMintingStatus("Success! Your NFT has been minted.");
        alert("NFT minted successfully!");
    } catch (error: any) {
        console.error("Minting process error:", error);
        alert(`Minting failed: ${error.message || "An unknown error occurred."}`);
        setMintingStatus('Minting failed. Please try again.');
    } finally {
        setIsMinting(false);
        setMintingStep(0);
    }
  };
  
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
        <div className="text-center p-6 bg-red-900/20 backdrop-blur-lg rounded-2xl border border-red-500/20 max-w-sm mx-auto">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-red-400 mb-2">Something went wrong</h3>
          <p className="text-red-300 mb-4 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-lg border-b border-white/10 sticky top-0 z-40">
        <div className="px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Mic className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
              <span className="text-lg sm:text-xl font-bold text-white">Receiptify</span>
              <span className="hidden xs:inline text-sm text-gray-400">• Artists</span>
            </div>
            <button
              onClick={() => setShowCustomization(!showCustomization)}
              className={`flex items-center space-x-2 px-3 py-2 sm:px-4 rounded-full transition-colors border text-xs sm:text-sm ${
                showCustomization
                  ? 'bg-green-500 text-white border-green-500'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Customize</span>
              <span className="sm:hidden">Edit</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Customization Panel (Full Screen Overlay) */}
      {showCustomization && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-900">
          <div className="flex flex-col h-full">
            {/* Mobile customization header */}
            <div className="flex items-center justify-between p-4 bg-black/20 backdrop-blur-lg border-b border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Palette className="h-5 w-5" />
                <span>Customization</span>
              </h3>
              <button
                onClick={() => setShowCustomization(false)}
                className="text-white hover:text-gray-300 p-1"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Mobile customization content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Appearance Section */}
              <div className="mb-6">
                <button
                  onClick={() => toggleSection('appearance')}
                  className="flex items-center justify-between w-full text-left text-white font-medium mb-4 hover:text-green-400 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <Palette className="h-4 w-4" />
                    <span>Appearance</span>
                  </div>
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
                            className="w-full h-12 rounded-lg border border-white/20 cursor-pointer"
                            style={{ backgroundColor: primaryColor }}
                          />
                          {showPrimaryPicker && (
                            <div className="absolute z-10 mt-2 left-1/2 transform -translate-x-1/2">
                              <div className="fixed inset-0" onClick={() => setShowPrimaryPicker(false)} />
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
                            className="w-full h-12 rounded-lg border border-white/20 cursor-pointer"
                            style={{ backgroundColor: backgroundColor }}
                          />
                          {showBackgroundPicker && (
                            <div className="absolute z-10 mt-2 left-1/2 transform -translate-x-1/2">
                              <div className="fixed inset-0" onClick={() => setShowBackgroundPicker(false)} />
                              <SketchPicker color={backgroundColor} onChange={(color: ColorResult) => setBackgroundColor(color.hex)} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-2">Paper Effect</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['clean', 'torn', 'stacked'] as PaperEffect[]).map(effect => (
                          <button
                            key={effect}
                            onClick={() => setPaperEffect(effect)}
                            className={`py-3 px-2 rounded-lg text-xs font-medium transition-colors capitalize ${
                              paperEffect === effect ? 'bg-green-500 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'
                            }`}
                          >
                            {effect}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Content Section */}
              <div className="mb-6">
                <button
                  onClick={() => toggleSection('content')}
                  className="flex items-center justify-between w-full text-left text-white font-medium mb-4 hover:text-green-400 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <Type className="h-4 w-4" />
                    <span>Content</span>
                  </div>
                  {expandedSections.content ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {expandedSections.content && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-2">Receipt Title</label>
                      <input
                        type="text"
                        value={customTitle}
                        onChange={(e) => setCustomTitle(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-2">Footer Text</label>
                      <input
                        type="text"
                        value={customFooter}
                        onChange={(e) => setCustomFooter(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Layout Section */}
              <div className="mb-6">
                <button
                  onClick={() => toggleSection('layout')}
                  className="flex items-center justify-between w-full text-left text-white font-medium mb-4 hover:text-green-400 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <Layout className="h-4 w-4" />
                    <span>Layout</span>
                  </div>
                  {expandedSections.layout ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {expandedSections.layout && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-2">Receipt Size</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['compact', 'standard', 'large'] as ReceiptSize[]).map(size => (
                          <button
                            key={size}
                            onClick={() => setReceiptSize(size)}
                            className={`py-3 px-2 rounded-lg text-xs font-medium transition-colors capitalize ${
                              receiptSize === size ? 'bg-green-500 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-2">
                        Number of Artists: {artistLimit}
                      </label>
                      <input
                        type="range"
                        min="5"
                        max="50"
                        value={artistLimit}
                        onChange={(e) => setArtistLimit(Number(e.target.value))}
                        className="w-full h-3 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>5</span>
                        <span>50</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <ImageIcon className="h-4 w-4 text-gray-400" />
                        <label className="text-sm text-white">Show Artist Image</label>
                      </div>
                      <button
                        onClick={() => setShowArtistImage(!showArtistImage)}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                          showArtistImage ? 'bg-green-500' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                            showArtistImage ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile customization footer */}
            <div className="p-4 bg-black/20 backdrop-blur-lg border-t border-white/10">
              <button
                onClick={() => setShowCustomization(false)}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="px-4 sm:px-6 py-4 sm:py-6">
        <div className={`${showCustomization ? 'hidden lg:grid lg:grid-cols-3 lg:gap-8' : 'max-w-2xl mx-auto'}`}>
          {/* Receipt Display Column */}
          <div className={showCustomization ? 'lg:col-span-2' : 'w-full'}>
            {/* Time Range Selector */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 border border-white/20">
              <div className="flex items-center space-x-2 mb-3 sm:mb-4">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
                <span className="text-white font-medium text-sm sm:text-base">Time Period</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(timeRangeLabels).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setTimeRange(key as TimeRange)}
                    className={`py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg font-medium transition-all text-xs sm:text-sm ${
                      timeRange === key
                        ? 'bg-green-500 text-white shadow-lg'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="block sm:hidden">
                      {key === 'short_term' ? 'Month' : key === 'medium_term' ? '6 Mo.' : 'All Time'}
                    </span>
                    <span className="hidden sm:block">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Receipt Component */}
            <div className="flex justify-center mb-6 sm:mb-8">
              <div
                ref={receiptRef}
                className={`font-mono shadow-2xl relative transition-transform duration-300 hover:scale-[1.02] ${sizeClasses[receiptSize]}`}
                style={{ backgroundColor: paperEffect === 'clean' ? backgroundColor : 'transparent' }}
              >
                {paperEffect === 'stacked' && (
                  <>
                    <div 
                      className="absolute top-1 left-1 w-full h-full rounded-sm" 
                      style={{ backgroundColor: backgroundColor, transform: 'rotate(-1.5deg)', zIndex: 1 }}
                    ></div>
                    <div 
                      className="absolute top-0 left-0 w-full h-full rounded-sm" 
                      style={{ backgroundColor: backgroundColor, transform: 'rotate(1deg)', zIndex: 1 }}
                    ></div>
                  </>
                )}
                <div
                  className={`p-4 sm:p-6 relative ${paperEffect === 'torn' ? 'torn-edge' : ''}`}
                  style={{ backgroundColor: backgroundColor, color: primaryColor, zIndex: 2 }}
                >
                  <div className="text-center mb-4 sm:mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold uppercase mb-1 sm:mb-2">{customTitle}</h2>
                    <p className="text-xs sm:text-sm opacity-80">{timeRangeLabels[timeRange]}</p>
                    <p className="text-xs sm:text-sm opacity-80">ORDER FOR {userName}</p>
                    <div className="mt-3 sm:mt-4 h-px bg-current opacity-20"></div>
                  </div>
                  <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                    {artists.length > 0 ? (
                      artists.map((artist, index) => (
                        <div key={artist.id} className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                          <span className="font-bold w-5 sm:w-6 text-center flex-shrink-0">{index + 1}.</span>
                          {showArtistImage && artist.images.length > 0 && (
                            <img
                              src={artist.images[0].url}
                              alt={artist.name}
                              className="w-8 h-8 sm:w-10 sm:h-10 object-cover rounded-sm flex-shrink-0"
                              crossOrigin="anonymous"
                            />
                          )}
                          <div className="flex-grow min-w-0">
                            <p className="font-bold uppercase truncate leading-tight">{artist.name}</p>
                            <p className="opacity-70 capitalize text-xs leading-tight truncate">
                              {artist.genres.slice(0, 2).join(', ')}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 sm:py-8">
                        <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mx-auto mb-2 opacity-50" />
                        <p className="opacity-50 text-xs sm:text-sm">Loading artists...</p>
                      </div>
                    )}
                  </div>
                  <div className="text-center pt-3 sm:pt-4 border-t border-current border-opacity-20">
                    <p className="text-xs uppercase opacity-80">{customFooter}</p>
                    <div className="mt-1 sm:mt-2 text-xs opacity-60">
                      {new Date().toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button 
                onClick={downloadImage}
                className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 sm:px-6 rounded-lg sm:rounded-full transition-colors shadow-lg w-full sm:w-auto"
              >
                <Download className="h-4 w-4" />
                <span>Download Image</span>
              </button>
              {!walletAddress ? (
                <button
                  onClick={connectWallet}
                  className="flex items-center justify-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 sm:px-6 rounded-lg sm:rounded-full transition-colors shadow-lg w-full sm:w-auto"
                >
                  <Wallet className="h-4 w-4" />
                  <span>Connect Wallet</span>
                </button>
              ) : (
                <button
                  onClick={mintNFT}
                  disabled={isMinting}
                  className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold py-3 px-4 sm:px-6 rounded-lg sm:rounded-full transition-colors shadow-lg w-full sm:w-auto"
                >
                  {isMinting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                  <span>{isMinting ? 'Minting...' : 'Mint as NFT'}</span>
                </button>
              )}
            </div>

            {/* Minting Progress */}
            {isMinting && (
              <div className="mt-6 bg-white/10 backdrop-blur-lg rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/20">
                <div className="flex items-center space-x-3 mb-4">
                  <Loader2 className="h-5 w-5 animate-spin text-green-400" />
                  <span className="text-white font-medium text-sm sm:text-base">Minting Progress</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-gray-300">Step {mintingStep} of 7</span>
                    <span className="text-white">{Math.round((mintingStep / 7) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(mintingStep / 7) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-gray-300 text-xs sm:text-sm">{mintingStatus}</p>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Customization Panel */}
          {showCustomization && (
            <div className="hidden lg:block lg:col-span-1">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden sticky top-24">
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                    <Palette className="h-5 w-5" />
                    <span>Customization</span>
                  </h3>

                  {/* Appearance Section */}
                  <div className="mb-6">
                    <button
                      onClick={() => toggleSection('appearance')}
                      className="flex items-center justify-between w-full text-left text-white font-medium mb-4 hover:text-green-400 transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <Palette className="h-4 w-4" />
                        <span>Appearance</span>
                      </div>
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
                                  <div className="fixed inset-0" onClick={() => setShowPrimaryPicker(false)} />
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
                                  <div className="fixed inset-0" onClick={() => setShowBackgroundPicker(false)} />
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
                              <button
                                key={effect}
                                onClick={() => setPaperEffect(effect)}
                                className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors capitalize ${
                                  paperEffect === effect ? 'bg-green-500 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'
                                }`}
                              >
                                {effect}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Content Section */}
                  <div className="mb-6">
                    <button
                      onClick={() => toggleSection('content')}
                      className="flex items-center justify-between w-full text-left text-white font-medium mb-4 hover:text-green-400 transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <Type className="h-4 w-4" />
                        <span>Content</span>
                      </div>
                      {expandedSections.content ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {expandedSections.content && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-2">Receipt Title</label>
                          <input
                            type="text"
                            value={customTitle}
                            onChange={(e) => setCustomTitle(e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-2">Footer Text</label>
                          <input
                            type="text"
                            value={customFooter}
                            onChange={(e) => setCustomFooter(e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Layout Section */}
                  <div className="mb-6">
                    <button
                      onClick={() => toggleSection('layout')}
                      className="flex items-center justify-between w-full text-left text-white font-medium mb-4 hover:text-green-400 transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <Layout className="h-4 w-4" />
                        <span>Layout</span>
                      </div>
                      {expandedSections.layout ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {expandedSections.layout && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-2">Receipt Size</label>
                          <div className="grid grid-cols-3 gap-1">
                            {(['compact', 'standard', 'large'] as ReceiptSize[]).map(size => (
                              <button
                                key={size}
                                onClick={() => setReceiptSize(size)}
                                className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors capitalize ${
                                  receiptSize === size ? 'bg-green-500 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'
                                }`}
                              >
                                {size}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-2">
                            Number of Artists: {artistLimit}
                          </label>
                          <input
                            type="range"
                            min="5"
                            max="50"
                            value={artistLimit}
                            onChange={(e) => setArtistLimit(Number(e.target.value))}
                            className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                          />
                           <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>5</span>
                            <span>50</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <ImageIcon className="h-4 w-4 text-gray-400" />
                            <label className="text-sm text-white">Show Artist Image</label>
                          </div>
                          <button
                            onClick={() => setShowArtistImage(!showArtistImage)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              showArtistImage ? 'bg-green-500' : 'bg-gray-600'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                showArtistImage ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
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