import React from 'react';
import { History, Music2, Trash2 } from 'lucide-react';

const GenerationsSidebar = ({ generations, onDelete, onUseSynthesizer }) => {
  return (
    <aside className="bg-white/5 rounded-lg border border-white/10 p-4 md:sticky md:top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
      <h2 className="text-xl font-merriweather text-[#F2E6D8] mb-4 flex items-center gap-2">
        <History className="h-5 w-5" />
        Your Generations
      </h2>

      {generations.length === 0 ? (
        <p className="text-[#F2E6D8] text-center">No generations yet</p>
      ) : (
        <div className="space-y-4">
          {generations.map((gen) => (
            <div key={gen.id} className="p-4 bg-white/5 rounded-xl space-y-2">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <p className="text-sm text-[#F2E6D8]/80">
                    {new Date(gen.timestamp.seconds * 1000).toLocaleString()}
                  </p>
                  <p className="text-[#F2E6D8]">{gen.prompt}</p>
                  <p className="text-sm text-[#F2E6D8]/80">
                    Duration: {gen.duration}s
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onUseSynthesizer(gen.id)}
                    className="p-2 text-[#F2E6D8]/80 hover:text-[#F2E6D8] transition"
                    title="Use in Synthesizer"
                  >
                    <Music2 className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => onDelete(gen.id)}
                    className="p-2 text-[#F2E6D8]/80 hover:text-red-500 transition"
                    title="Delete generation"
                  >
                    <Trash2 className="h-5 w-5" />
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
    </aside>
  );
};

export default GenerationsSidebar; 