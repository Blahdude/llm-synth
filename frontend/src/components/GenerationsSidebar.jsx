import React from 'react';
import { History, Music2, Trash2 } from 'lucide-react';

const GenerationsSidebar = ({ generations, onDelete, onUseSynthesizer }) => {
  return (
    <aside className="bg-white/5 rounded-xl border border-white/10 p-4 h-full overflow-y-auto">
      <div className="space-y-4 pb-8">
        <h2 className="text-[1.25rem] font-bold text-[#F2E6D8] px-4 flex items-center gap-2">
          <History className="h-[1.25rem] w-[1.25rem]" />
          Your Generations
        </h2>

        {generations.length === 0 ? (
          <p className="text-[#F2E6D8] text-center p-4">No generations yet</p>
        ) : (
          <div className="space-y-1">
            {generations.map((gen) => (
              <div key={gen.id} className="p-4 hover:bg-white/5 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-[0.875rem] text-[#F2E6D8]/60">
                      {new Date(gen.timestamp.seconds * 1000).toLocaleString()}
                    </p>
                    <p className="text-[1rem] text-[#F2E6D8]">{gen.prompt}</p>
                    <p className="text-[0.875rem] text-[#F2E6D8]/60">
                      Duration: {gen.duration}s
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onUseSynthesizer(gen.id)}
                      className="p-2 text-[#F2E6D8]/60 hover:text-[#F2E6D8] transition"
                      title="Use in Synthesizer"
                    >
                      <Music2 className="h-[1.25rem] w-[1.25rem]" />
                    </button>
                    <button
                      onClick={() => onDelete(gen.id)}
                      className="p-2 text-[#F2E6D8]/60 hover:text-red-500 transition"
                      title="Delete generation"
                    >
                      <Trash2 className="h-[1.25rem] w-[1.25rem]" />
                    </button>
                  </div>
                </div>

                {gen.audioUrl && (
                  <div className="mt-2">
                    <audio controls src={gen.audioUrl} className="w-full" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};

export default GenerationsSidebar; 