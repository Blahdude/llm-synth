import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Music2, User, LogOut, History, Trash2, Menu, Home, Settings } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { dbService } from '../services/DatabaseService';

const MusicGenInterface = () => {
  const location = useLocation();
  const navigate = useNavigate();

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

  // Add this new state for dropdown
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Add state for mobile sidebar toggle
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Add state for audio URLs
  const [generationUrls, setGenerationUrls] = useState(new Map());

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
    generationUrls.forEach(url => URL.revokeObjectURL(url));
    setGenerationUrls(new Map());
    localStorage.removeItem('currentUser');
    localStorage.removeItem('selectedAudioForSynth'); // Clear selected audio
  };

  const loadUserGenerations = async (username) => {
    try {
      const generations = await dbService.getUserGenerations(username);
      
      // Clear old URLs
      generationUrls.forEach(url => URL.revokeObjectURL(url));
      
      // Create new URL map
      const newUrls = new Map();
      generations.forEach(gen => {
        newUrls.set(gen.id, URL.createObjectURL(gen.audioBlob));
      });
      
      setGenerationUrls(newUrls);
      setGenerations(generations);
    } catch (error) {
      console.error('Error loading generations:', error);
      setError('Failed to load generations');
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

  const handleUseSynthesizer = async (generationId) => {
    try {
      // Get the audio blob URL from our map
      const audioUrl = generationUrls.get(generationId);
      if (!audioUrl) {
        throw new Error('Audio URL not found');
      }

      // Store both the ID and the URL
      localStorage.setItem('selectedAudioForSynth', generationId);
      localStorage.setItem('selectedAudioUrl', audioUrl);
      
      navigate('/synthesize');
    } catch (error) {
      console.error('Error preparing audio for synthesizer:', error);
      setError('Failed to prepare audio for synthesizer');
    }
  };

  // Clean up URLs when component unmounts
  useEffect(() => {
    return () => {
      generationUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [generationUrls]);

  // Login Screen
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#2C3E50] flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#2C3E50] flex">
      {/* Mobile sidebar toggle button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-4 left-4 inline-flex items-center p-2 text-sm text-[#F2E6D8] rounded-lg sm:hidden hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/10"
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="w-6 h-6" />
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 w-64 h-screen transition-transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } sm:translate-x-0`}
        aria-label="Sidebar"
      >
        <div className="h-full px-3 py-4 overflow-y-auto bg-[#1a2733]">
          <div className="flex items-center mb-5 ps-2">
            <Music2 className="h-6 w-6 text-[#F2E6D8]" />
            <span className="ms-3 text-xl font-semibold text-[#F2E6D8]">LLM Synth</span>
          </div>
          
          <ul className="space-y-2 font-medium">
            <li>
              <Link
                  to="/"
                  className={`flex items-center p-2 text-[#F2E6D8] rounded-lg hover:bg-white/10 group ${
                    location.pathname === '/' ? 'bg-white/10' : ''
                  }`}
                >
                  <Music2 className="w-5 h-5" />
                  <span className="ms-3">Generate Music</span>
              </Link>
            </li>
            <li>
              <Link
                  to="/synthesize"
                  className={`flex items-center p-2 text-[#F2E6D8] rounded-lg hover:bg-white/10 group ${
                    location.pathname === '/synthesize' ? 'bg-white/10' : ''
                  }`}
                >
                  <Music2 className="w-5 h-5" />
                  <span className="ms-3">Synthesize</span>
              </Link>
            </li>
            <li>
              <Link
                  to="/settings"
                  className={`flex items-center p-2 text-[#F2E6D8] rounded-lg hover:bg-white/10 group ${
                    location.pathname === '/settings' ? 'bg-white/10' : ''
                  }`}
                >
                  <Settings className="w-5 h-5" />
                  <span className="ms-3">Settings</span>
              </Link>
            </li>
          </ul>

          {/* User section at bottom */}
          <div className="absolute bottom-0 left-0 w-full p-4">
            <div className="flex items-center gap-2 text-[#F2E6D8] mb-2">
              <User className="h-4 w-4" />
              <span>{currentUser?.username}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full p-2 text-[#F2E6D8] rounded-lg hover:bg-white/10"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="p-4 sm:ml-64 flex-1 flex items-center justify-center">
        <div className="flex gap-6 items-start justify-between w-full max-w-6xl mx-auto">
          <div className="flex-1 flex flex-col items-center justify-center gap-6 max-w-3xl">
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
                  : 'bg-blue-600 hover:bg-blue-700 transform hover:-translate-y-0.5'}`}
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
            
            {audioUrl && !isLoading && (
              <div className="w-full">
                <audio ref={audioRef} controls className="w-full" src={audioUrl} />
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Right sidebar for generations */}
          <div className="w-80 flex-shrink-0">
            <div className="sticky top-20">
              <button
                onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                className="w-full px-4 py-2 text-[#F2E6D8] bg-white/10 rounded-md hover:bg-[#C8A951] transition text-center flex items-center justify-center gap-2"
              >
                <History className="h-5 w-5" />
                Your Generations
              </button>

              {isHistoryOpen && (
                <div className="max-h-[calc(100vh-120px)] overflow-y-auto border border-white/10 rounded-md mt-2">
                  {generations.length === 0 ? (
                    <p className="text-[#F2E6D8] p-4 text-center">No generations yet</p>
                  ) : (
                    <div className="space-y-4 p-4">
                      {generations.map((gen) => (
                        <div key={gen.id} className="p-4 bg-white/5 rounded-xl space-y-2">
                          <div className="flex justify-between items-start">
                            <div className="space-y-2">
                              <p className="text-sm text-[#F2E6D8]/80">
                                {new Date(gen.timestamp).toLocaleString()}
                              </p>
                              <p className="text-[#F2E6D8]">{gen.prompt}</p>
                              <p className="text-sm text-[#F2E6D8]/80">Duration: {gen.duration}s</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUseSynthesizer(gen.id)}
                                className="p-2 text-[#F2E6D8]/80 hover:text-[#F2E6D8] transition"
                                title="Use in Synthesizer"
                              >
                                <Music2 className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => deleteGeneration(index)}
                                className="p-2 text-[#F2E6D8]/80 hover:text-red-500 transition"
                                title="Delete generation"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                          <audio 
                            controls 
                            src={generationUrls.get(gen.id)} 
                            className="w-full" 
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicGenInterface;