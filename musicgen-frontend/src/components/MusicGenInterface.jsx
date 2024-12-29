import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Music2, User, LogOut, History, Trash2 } from 'lucide-react';

const MusicGenInterface = () => {
  // User state
  const [currentUser, setCurrentUser] = useState(null);
  const [username, setUsername] = useState('');
  const [userError, setUserError] = useState('');
  
  // Music generation state
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [error, setError] = useState('');
  const audioRef = useRef(null);

  // Generations history
  const [generations, setGenerations] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load user data from localStorage on startup
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      loadUserGenerations(user.username);
    }
  }, []);

  const handleLogin = () => {
    if (!username.trim()) {
      setUserError('Please enter a username');
      return;
    }

    const userData = {
      username: username.trim(),
      createdAt: new Date().toISOString()
    };

    setCurrentUser(userData);
    localStorage.setItem('currentUser', JSON.stringify(userData));
    loadUserGenerations(userData.username);
    setUserError('');
    setUsername('');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setGenerations([]);
    localStorage.removeItem('currentUser');
  };

  const loadUserGenerations = (username) => {
    const savedGenerations = localStorage.getItem(`generations_${username}`);
    if (savedGenerations) {
      setGenerations(JSON.parse(savedGenerations));
    }
  };

  const saveGeneration = (generationData) => {
    const newGenerations = [...generations, generationData];
    setGenerations(newGenerations);
    localStorage.setItem(`generations_${currentUser.username}`, JSON.stringify(newGenerations));
  };

  const deleteGeneration = (index) => {
    const newGenerations = generations.filter((_, i) => i !== index);
    setGenerations(newGenerations);
    localStorage.setItem(`generations_${currentUser.username}`, JSON.stringify(newGenerations));
    
    // Clean up the audio URL to prevent memory leaks
    if (generations[index].audioUrl) {
      URL.revokeObjectURL(generations[index].audioUrl);
    }
  };

  const handleGenerate = async () => {
    if (!currentUser) {
      setError('Please log in to generate music');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:8000/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          duration: parseInt(duration),
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to generate music: ${errorData}`);
      }

      const data = await response.blob();
      const url = URL.createObjectURL(data);
      setAudioUrl(url);

      // Save the generation
      saveGeneration({
        prompt,
        duration,
        timestamp: new Date().toISOString(),
        audioUrl: url
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Login Screen
  if (!currentUser) {
    return (
    <div>
      <div className="flex items-center justify-center overflow-hidden">
        <h1 className="text-2xl font-merriweather text-[#F2E6D8] text-center">
          Login to LLM Synth
        </h1>
      </div>
      
      <div className="bg-[#2C3E50] rounded-xl overflow-hidden">
        <div className="p-6 space-y-4">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full px-4 py-2 text-black rounded-xl focus:border-color-white/10 focus:ring-2 focus:ring-white/10 focus:outline-none"
            />

          <button
            onClick={handleLogin}
            className="w-full py-3 px-4 bg-white/10 text-[#F2E6D8] rounded-xl"
          >
            Continue
          </button>

          {userError && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
              {userError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

return (
    <div className="bg-[#2C3E50]">
      <header className="fixed top-0 left-0 w-full flex items-center justify-between bg-[#2C3E50] p-4">
        {/* Left Section: Icon */}
        <div className="bg-white/10 p-2 rounded-lg">
          <Music2 className="h-5 w-5 text-[#F2E6D8]" />
        </div>

        {/* Right Section: Controls */}
        <div className="flex items-center gap-4">
          {/* User Info */}
          <div className="flex items-center gap-2 text-white/80">
            <User className="h-4 w-4" />
            {currentUser.username}
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-white/10 text-[#F2E6D8] px-3 py-1 rounded-md hover:bg-[#2C3E50] transition"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </header>

      <div className="flex-1 p-6">
        {showHistory ? (
          <div className="h-full overflow-auto">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold font-merriweather text-gray-700">Your Previous Generations</h2>
              {generations.length === 0 ? (
                <p className="text-gray-500">No generations yet</p>
              ) : (
                <div className="space-y-4">
                  {generations.map((gen, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600">
                            {new Date(gen.timestamp).toLocaleString()}
                          </p>
                          <p className="text-gray-800">{gen.prompt}</p>
                          <p className="text-sm text-gray-600">Duration: {gen.duration}s</p>
                        </div>
                        <button
                          onClick={() => deleteGeneration(index)}
                          className="p-2 text-gray-500 hover:text-red-500 transition"
                          title="Delete generation"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                      <audio controls src={gen.audioUrl} className="w-full" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-6 max-w-3xl mx-auto">
            <div className="w-full space-y-2">
              <label className="block text-xl font-medium font-merriweather text-[#F2E6D8]">
                Tell me what kind of music to create
              </label>
              <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the music you want to generate... (e.g., 'A soft piano melody with gentle strings')"
                className="w-full h-24 px-4 py-3 text-black border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors resize-none bg-gray-50"
                disabled={isLoading}
              />
              </div>
            </div>

            <div className="w-full space-y-2">
              <div className="flex justify-between">
                <label className="text-lg font-medium font-merriweather text-[#F2E6D8]">Duration</label>
                <span className="text-[#F2E6D8] font-medium font-merriweather">{duration} seconds</span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                disabled={isLoading}
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={isLoading || !prompt}
              className={`w-64 py-4 px-6 rounded-xl flex items-center justify-center gap-2 text-[#F2E6D8] font-medium font-merriweather text-lg transition hover:bg-[#2F4F4F]
                ${isLoading || !prompt 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-[#2F4F4F] hover:bg-blue-700 transform hover:-translate-y-0.5'}`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5" />
                  Generating...
                </>
              ) : (
                <>
                  <Music2 className="h-5 w-5" />
                  Generate Music
                </>
              )}
            </button>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex-1 px-4 py-2 text-[#F2E6D8] bg-white/10 rounded-md hover:bg-[#C8A951] transition text-center"
              >
                Your Generations
              </button>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex-1 px-4 py-2 text-[#F2E6D8] bg-white/10 rounded-md hover:bg-[#8A4B2C] transition text-center"
              >
                Synthesize
              </button>
            </div>

            {isLoading && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-600">Creating your music...</p>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
                {error}
              </div>
            )}

            {audioUrl && !isLoading && (
              <div className="w-full">
                <audio
                  ref={audioRef}
                  controls
                  className="w-full"
                  src={audioUrl}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MusicGenInterface;