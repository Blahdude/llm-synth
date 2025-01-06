import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Music2 } from 'lucide-react';

const PlayBar = ({ currentTrack, onClose }) => {
  console.log('PlayBar received track:', currentTrack);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(new Audio());

  useEffect(() => {
    if (currentTrack?.audioUrl) {
      audioRef.current.src = currentTrack.audioUrl;
      audioRef.current.play();
      setIsPlaying(true);
    }

    return () => {
      audioRef.current.pause();
      audioRef.current.src = '';
    };
  }, [currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e) => {
    const newTime = e.target.value;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 border-t border-white/10 bg-[#0E1117]">
      <div className="flex items-center h-full px-4 gap-4 max-w-screen-xl mx-auto">
        {/* Album Art */}
        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
          {currentTrack?.imageUrl ? (
            <img
              src={currentTrack.imageUrl}
              alt="Album art"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-white/5 flex items-center justify-center">
              <Music2 className="h-6 w-6 text-white/40" />
            </div>
          )}
        </div>

        {/* Track Info */}
        <div className="flex-1">
          <p className="text-sm font-medium text-[#F2E6D8] line-clamp-1">
            {currentTrack ? currentTrack.prompt : 'No track selected'}
          </p>
          <p className="text-xs text-[#F2E6D8]/60">
            {currentTrack ? (currentTrack.username || 'Anonymous') : 'Select a track to play'}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6 w-1/2">
          <button
            onClick={togglePlay}
            className="p-2 rounded-full hover:bg-white/5"
            disabled={!currentTrack}
          >
            {isPlaying ? (
              <Pause className="h-6 w-6 text-[#F2E6D8]" />
            ) : (
              <Play className="h-6 w-6 text-[#F2E6D8]" />
            )}
          </button>

          {/* Progress Bar */}
          <div className="flex-1 flex items-center gap-2">
            <span className="text-xs text-[#F2E6D8]/60 w-10">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
              disabled={!currentTrack}
            />
            <span className="text-xs text-[#F2E6D8]/60 w-10">
              {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const formatTime = (time) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export default PlayBar; 