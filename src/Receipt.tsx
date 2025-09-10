import React, { useState, useEffect, useRef } from 'react'; // Import useRef
import axios from 'axios';
import html2canvas from 'html2canvas'; // Import html2canvas

// Define the shape of a single track object from the Spotify API
interface Track {
  id: string;
  name: string;
  artists: { name: string }[];
  duration_ms: number;
}

// Define the props that this component will accept
interface ReceiptProps {
  token: string;
}

// Define the possible time ranges for the API call
type TimeRange = 'short_term' | 'medium_term' | 'long_term';

const Receipt: React.FC<ReceiptProps> = ({ token }) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('short_term');
  const [userName, setUserName] = useState<string>('YOUR');
  const receiptRef = useRef<HTMLDivElement>(null); // Create a ref for the receipt container

  // This function converts milliseconds to a MM:SS format
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

  // Function to handle the download
  const downloadReceipt = () => {
    if (receiptRef.current) {
      html2canvas(receiptRef.current, {
        // Optional: Improve image quality
        scale: 2, 
        backgroundColor: null, // Use the element's background
      }).then(canvas => {
        const image = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = image;
        link.download = `receiptify-${timeRange}.png`;
        link.click();
      });
    }
  };

  return (
    <div className="w-full mt-8">
      {/* Assign the ref to the receipt container */}
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
          <p className="text-xs lowercase">your-app-url.com</p>
        </div>
      </div>

      {/* UI Controls: Time Range Selector and Download Button */}
      <div className="mt-8 flex flex-col items-center space-y-4">
        <div className="flex justify-center space-x-2">
          <button onClick={() => setTimeRange('short_term')} className={`px-3 py-1 text-sm rounded transition-colors ${timeRange === 'short_term' ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300'}`}>Month</button>
          <button onClick={() => setTimeRange('medium_term')} className={`px-3 py-1 text-sm rounded transition-colors ${timeRange === 'medium_term' ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300'}`}>6 Months</button>
          <button onClick={() => setTimeRange('long_term')} className={`px-3 py-1 text-sm rounded transition-colors ${timeRange === 'long_term' ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300'}`}>All Time</button>
        </div>
        <button 
          onClick={downloadReceipt}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-full transition-colors duration-300"
        >
          Download Receipt
        </button>
      </div>
    </div>
  );
};

export default Receipt;