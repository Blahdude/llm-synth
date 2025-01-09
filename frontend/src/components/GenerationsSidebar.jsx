import React, { useState, useRef } from 'react';
import { History, Music2, Trash2, Play, Pause, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AudioPlayer = ({ audioUrl }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(new Audio(audioUrl));

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  audioRef.current.onended = () => setIsPlaying(false);

  return (
    <button
      onClick={togglePlay}
      className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
    >
      {isPlaying ? (
        <Pause className="h-4 w-4 text-[#F2E6D8]" />
      ) : (
        <Play className="h-4 w-4 text-[#F2E6D8]" />
      )}
    </button>
  );
};

const GenerationsSidebar = ({ generations, onDelete }) => {
  const recentGenerations = [...generations]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);

  return (
    <aside className="bg-white/5 rounded-xl border border-white/10 p-4 h-full overflow-y-auto">
      <div className="space-y-4">
        <h2 className="text-[1.25rem] font-bold text-[#F2E6D8] px-2 flex items-center gap-2">
          <History className="h-5 w-5" />
          Recent Generations
        </h2>

        {generations.length === 0 ? (
          <div className="text-center py-8">
            <Music2 className="h-12 w-12 text-white/10 mx-auto mb-3" />
            <p className="text-[#F2E6D8]/60">No generations yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentGenerations.map((gen) => (
              <div 
                key={gen.id} 
                className="p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/[0.07] transition-all"
              >
                <div className="space-y-3">
                  {/* Generated Image */}
                  {gen.imageUrl && (
                    <div className="w-24 h-24 rounded-lg overflow-hidden bg-black/20 mx-auto">
                      <img 
                        src={gen.imageUrl} 
                        alt="Generated artwork"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Audio Controls and Duration */}
                  <div className="flex items-center gap-3">
                    {gen.audioUrl && (
                      <>
                        <AudioPlayer audioUrl={gen.audioUrl} />
                        <div className="px-2 py-1 rounded-md bg-white/10 text-xs text-[#F2E6D8]/60">
                          {gen.duration}s
                        </div>
                      </>
                    )}
                    <button
                      onClick={() => onDelete(gen.id)}
                      className="ml-auto p-2 rounded-full hover:bg-white/10 text-[#F2E6D8]/40 hover:text-red-400 transition-colors"
                      title="Delete generation"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Prompt */}
                  <p className="text-sm text-[#F2E6D8] line-clamp-2">
                    {gen.prompt}
                  </p>

                  {/* Metadata */}
                  <div className="pt-2 border-t border-white/5 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-[#F2E6D8]/60">
                      <User className="h-3 w-3" />
                      {gen.username || 'Anonymous'}
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-[#F2E6D8]/40">
                      <div className="flex items-center gap-2">
                        <span>{gen.model?.split('/')[1] || 'Unknown'}</span>
                      </div>
                      <span>{gen.timestamp?.toDate().toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};

export default GenerationsSidebar; 