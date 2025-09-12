// src/GenreReceipt.tsx - FINAL AND COMPLETE REFACTORED CODE

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import html2canvas from 'html2canvas';
import { SketchPicker, type ColorResult } from 'react-color';
import SkeletonReceipt from './SkeletonReceipt';
import {
  Tags,
  Palette,
  Download,
  Wallet,
  Settings,
  ChevronDown,
  ChevronUp,
  Type,
  Layout,
  Loader2,
  AlertCircle,
  Info
} from 'lucide-react';

import { contractAddress, contractABI } from './contract/contractInfo';

// --- WAGMI IMPORTS ---
import { 
  useAccount, 
  useConnect, 
  useWriteContract, 
  useWaitForTransactionReceipt 
} from 'wagmi';

// Interface definitions
interface Genre { name: string; count: number; }
interface Artist { id: string; name: string; genres: string[]; }
interface ReceiptProps { token: string; }
type ReceiptSize = 'compact' | 'standard' | 'large';
type PaperEffect = 'clean' | 'torn' | 'stacked';

const GenreReceipt: React.FC<ReceiptProps> = ({ token }) => {
  // Core and Customization state
  const [genres, setGenres] = useState<Genre[]>([]);
  const [userName, setUserName] = useState<string>('YOUR');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [customTitle, setCustomTitle] = useState<string>('TOP GENRES');
  const [customFooter, setCustomFooter] = useState<string>('THANK YOU FOR VISITING!');
  const [primaryColor, setPrimaryColor] = useState<string>('#000000');
  const [backgroundColor, setBackgroundColor] = useState<string>('#ffffff');
  const [showPrimaryPicker, setShowPrimaryPicker] = useState<boolean>(false);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState<boolean>(false);
  const [genreLimit, setGenreLimit] = useState<number>(10);
  const [receiptSize, setReceiptSize] = useState<ReceiptSize>('standard');
  const [paperEffect, setPaperEffect] = useState<PaperEffect>('clean');
  const [showCustomization, setShowCustomization] = useState<boolean>(false);
  const [expandedSections, setExpandedSections] = useState({ appearance: true, content: false, layout: false });
  const [mintingStatus, setMintingStatus] = useState('');

  // --- WAGMI HOOKS ---
  const { isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { data: hash, isPending: isMinting, writeContract } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ hash });

  // Update the user-facing status message based on wagmi's state
  useEffect(() => {
    if (isMinting) {
      setMintingStatus("Please confirm in your wallet...");
    } else if (isConfirming) {
      setMintingStatus(`Minting on blockchain...`);
    } else if (isConfirmed) {
      setMintingStatus("Success! Your NFT has been minted.");
      alert("NFT minted successfully!");
    }
  }, [isMinting, isConfirming, isConfirmed]);

  // Fetch Spotify data
  useEffect(() => {
    const fetchDataAndProcessGenres = async () => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const userProfile = await axios.get("https://api.spotify.com/v1/me", { headers: { Authorization: `Bearer ${token}` } });
        setUserName(userProfile.data.display_name.toUpperCase());
        const { data } = await axios.get("https://api.spotify.com/v1/me/top/artists", {
          headers: { Authorization: `Bearer ${token}` },
          params: { time_range: 'long_term', limit: 50 }
        });
        const genreCounts: { [key: string]: number } = {};
        data.items.forEach((artist: Artist) => {
          artist.genres.forEach(genreName => { genreCounts[genreName] = (genreCounts[genreName] || 0) + 1; });
        });
        const sortedGenres = Object.entries(genreCounts)
          .sort(([, countA], [, countB]) => countB - countA)
          .map(([name, count]) => ({ name, count }));
        setGenres(sortedGenres);
      } catch (err) {
        console.error("Error fetching or processing genre data", err);
        setError("Failed to calculate top genres. Your Spotify token may be invalid or expired.");
      } finally {
        setLoading(false);
      }
    };
    fetchDataAndProcessGenres();
  }, [token]);
  
  const sizeClasses: Record<ReceiptSize, string> = { compact: 'max-w-xs', standard: 'max-w-sm', large: 'max-w-md' };
  const toggleSection = (section: keyof typeof expandedSections) => setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));

  const handleMint = async () => {
    if (!receiptRef.current) return alert("Receipt component is not ready.");
    
    setMintingStatus("Preparing receipt...");
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2, backgroundColor: null });
      const imageData = canvas.toDataURL('image/png').split(',')[1];
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8888';

      const response = await axios.post(`${backendUrl}/upload-to-ipfs`, {
        imageData,
        userName,
        timeRange: 'All Time',
        genres: genres.slice(0, genreLimit),
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
      if (!tokenURI) throw new Error("Failed to get tokenURI from the backend.");

      writeContract({
        address: contractAddress,
        abi: contractABI,
        functionName: 'safeMint',
        args: [tokenURI],
      });
    } catch (error: any) {
      console.error("Error during mint preparation:", error);
      alert(`Minting failed: ${error.message}`);
      setMintingStatus('Minting failed.');
    }
  };
  
  const handleDownloadImage = async () => {
      if (!receiptRef.current) return;
      const canvas = await html2canvas(receiptRef.current, { scale: 2 });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `spotify-genres-receipt-${userName}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900">
      <header className="bg-black/20 backdrop-blur-lg border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Tags className="h-6 w-6 text-green-400" />
              <span className="text-xl font-bold text-white">Receiptify</span>
              <span className="text-sm text-gray-400">• Genres</span>
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
                    <p className="text-sm opacity-80">BASED ON ALL-TIME LISTENING</p>
                    <p className="text-sm opacity-80">ORDER FOR {userName}</p>
                    <div className="mt-4 h-px bg-current opacity-20"></div>
                  </div>
                  <div className="space-y-2 mb-6">
                    {genres.slice(0, genreLimit).map((genre, index) => (
                      <div key={genre.name} className="flex justify-between items-center text-sm">
                        <div className="flex items-center min-w-0">
                          <span className="font-bold w-6 text-center flex-shrink-0">{index + 1}.</span>
                          <p className="font-bold uppercase truncate ml-2">{genre.name}</p>
                        </div>
                        <span className="font-mono text-xs px-2 py-1 rounded flex-shrink-0" style={{ backgroundColor: `${primaryColor}1A`, color: `${primaryColor}B3` }}>
                          {genre.count} pts
                        </span>
                      </div>
                    ))}
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
              <button onClick={handleDownloadImage} className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-full transition-colors shadow-lg">
                <Download className="h-4 w-4" />
                <span>Download Image</span>
              </button>
              {!isConnected ? (
                <button 
                  onClick={() => connect({ connector: connectors[0] })}
                  className="flex items-center justify-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-full transition-colors shadow-lg"
                >
                  <Wallet className="h-4 w-4" />
                  <span>Connect Farcaster Wallet</span>
                </button>
              ) : (
                <button 
                  onClick={handleMint}
                  disabled={isMinting || isConfirming}
                  className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold py-3 px-6 rounded-full transition-colors shadow-lg"
                >
                  {isMinting || isConfirming ? ( <Loader2 className="h-4 w-4 animate-spin" /> ) : ( <Wallet className="h-4 w-4" /> )}
                  <span>{isMinting || isConfirming ? 'Minting...' : 'Mint as NFT'}</span>
                </button>
              )}
            </div>
            {(isMinting || isConfirming || isConfirmed) && (
              <div className="mt-6 bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 text-center">
                <div className="flex items-center justify-center space-x-3 mb-4">
                  <Loader2 className="h-5 w-5 animate-spin text-green-400" />
                  <span className="text-white font-medium">Minting Progress</span>
                </div>
                <p className="text-gray-300 text-sm mb-2">{mintingStatus}</p>
                {hash && (
                    <a 
                      href={`https://basescan.org/tx/${hash}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-400 hover:underline text-sm break-all"
                    >
                        View on BaseScan
                    </a>
                )}
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
                              <button onClick={() => setShowPrimaryPicker(!showPrimaryPicker)} className="w-full h-10 rounded-lg border border-white/20 cursor-pointer" style={{ backgroundColor: primaryColor }} />
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
                              <button onClick={() => setShowBackgroundPicker(!showBackgroundPicker)} className="w-full h-10 rounded-lg border border-white/20 cursor-pointer" style={{ backgroundColor: backgroundColor }} />
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
                          <label className="block text-xs text-gray-400 mb-2">Number of Genres: {genreLimit}</label>
                          <input type="range" min="5" max="25" value={genreLimit} onChange={(e) => setGenreLimit(Number(e.target.value))} className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer" />
                          <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>5</span>
                            <span>25</span>
                          </div>
                        </div>
                        <div className="flex items-start space-x-2 bg-blue-900/20 text-blue-300 text-xs p-3 rounded-lg border border-blue-500/20">
                          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          <span>Genre data is calculated from your all-time top 50 artists for best accuracy.</span>
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

export default GenreReceipt;
