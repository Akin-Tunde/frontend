import React, { useState } from 'react';
import axios from 'axios';

// Type definitions for the Last.fm API response
interface LastFmArtist {
  name: string;
}
interface LastFmTrack {
  name: string;
  artist: LastFmArtist;
  playcount: string;
  duration: string;
}

type TimeRange = '7day' | '1month' | '6month' | '12month' | 'overall';

const LastFmReceipt: React.FC = () => {
  const [username, setUsername] = useState<string>('');
  const [tracks, setTracks] = useState<LastFmTrack[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('1month');
  const [error, setError] = useState<string | null>(null);
  const [submittedUsername, setSubmittedUsername] = useState<string>('');

  const apiKey = import.meta.env.VITE_LASTFM_API_KEY;

  const timeRangeLabels: { [key in TimeRange]: string } = {
    '7day': 'LAST 7 DAYS',
    '1month': 'LAST MONTH',
    '6month': 'LAST 6 MONTHS',
    '12month': 'LAST YEAR',
    'overall': 'ALL TIME',
  };

  const fetchData = async (user: string, period: TimeRange) => {
    if (!user) return;
    setError(null);
    setTracks([]);
    try {
      const { data } = await axios.get('https://ws.audioscrobbler.com/2.0/', {
        params: {
          method: 'user.gettoptracks',
          user: user,
          period: period,
          api_key: apiKey,
          format: 'json',
          limit: 10,
        },
      });

      if (data.error) {
        setError(data.message);
      } else {
        setTracks(data.toptracks.track);
        setSubmittedUsername(user.toUpperCase());
      }
    } catch (err) {
      setError('Failed to fetch data. Please check the username and try again.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(username, timeRange);
  };

  const handleTimeRangeChange = (period: TimeRange) => {
    setTimeRange(period);
    if (submittedUsername) {
        fetchData(username, period);
    }
  };

  const formatDuration = (secondsStr: string): string => {
    const secondsTotal = parseInt(secondsStr, 10);
    if (isNaN(secondsTotal) || secondsTotal === 0) return 'N/A';
    const minutes = Math.floor(secondsTotal / 60);
    const seconds = secondsTotal % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className="bg-gray-900 min-h-screen flex flex-col items-center justify-center text-white p-4">
        <h1 className="text-4xl md:text-5xl font-bold">Last.fm Receipt</h1>
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col sm:flex-row items-center gap-2">
            <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter Last.fm Username"
                className="bg-gray-800 text-white px-4 py-2 rounded-md border border-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-md transition-colors">
                Get Receipt
            </button>
        </form>

        {error && <p className="mt-4 text-red-400">{error}</p>}

        {tracks.length > 0 && (
            <div className="mt-8">
                <div className="p-6 bg-white text-black font-mono w-full max-w-sm mx-auto shadow-lg">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold">RECEIPTIFY</h2>
                        <p className="text-sm">{timeRangeLabels[timeRange]}</p>
                        <p className="text-sm">FOR {submittedUsername}</p>
                    </div>
                    <div className="my-4 border-t border-b border-dashed border-black py-2">
                        {tracks.map((track, index) => (
                            <div key={track.name + index} className="flex justify-between items-start text-sm my-2">
                                <div className="flex">
                                    <span className="mr-2 font-bold">{track.playcount}x</span>
                                    <div className="pr-2 text-left">
                                        <p className="font-bold uppercase break-words">{track.name}</p>
                                        <p className="text-gray-600 uppercase break-words">{track.artist.name}</p>
                                    </div>
                                </div>
                                <span className="font-bold whitespace-nowrap">{formatDuration(track.duration)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="text-center mt-6">
                        <p className="text-xs">THANK YOU FOR VISITING!</p>
                    </div>
                </div>
                <div className="mt-4 flex justify-center space-x-1 sm:space-x-2">
                    {Object.keys(timeRangeLabels).map((period) => (
                        <button key={period} onClick={() => handleTimeRangeChange(period as TimeRange)} className={`px-2 py-1 text-xs sm:px-3 sm:py-1 sm:text-sm rounded transition-colors ${timeRange === period ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
                            {timeRangeLabels[period as TimeRange].split(' ')[1] || 'All'}
                        </button>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
};

export default LastFmReceipt;