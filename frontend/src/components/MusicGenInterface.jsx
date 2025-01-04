import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Music2, User, LogOut, History, Trash2, Menu, Home, Settings } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { auth, db, storage } from '../firebase';  // if in components folder
import { onAuthStateChanged, getAuth } from 'firebase/auth';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, orderBy, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import LoginPage from './LoginPage';

const MusicGenInterface = () => {
  console.log('MusicGenInterface rendering');

  const location = useLocation();
  const navigate = useNavigate();

  // User state
  const [currentUser, setCurrentUser] = useState(null);
  const [username, setUsername] = useState('');
  const [userError, setUserError] = useState('');
  
  // Music generation
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

  // Add state for authentication
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Replace localStorage useEffect with Firebase auth listener
  useEffect(() => {
    const auth = getAuth();
    console.log('Setting up auth listener');
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed:', user);
      if (user) {
        setIsAuthenticated(true);
        const userData = {
          username: user.displayName || user.email,
          uid: user.uid
        };
        setCurrentUser(userData);
        loadUserGenerations(user.uid);
      } else {
        setIsAuthenticated(false);
        setCurrentUser(null);
        setGenerations([]);
      }
    });

    return () => unsubscribe();
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

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setCurrentUser(null);
      setGenerations([]);
      generationUrls.forEach(url => URL.revokeObjectURL(url));
      setGenerationUrls(new Map());
      localStorage.removeItem('selectedAudioForSynth');
      navigate('/'); // Redirect to home/login page
    } catch (error) {
      console.error('Error signing out:', error);
      setError('Failed to sign out');
    }
  };

  const loadUserGenerations = async (uid) => {
    console.log('Loading generations for uid:', uid);

    if (!uid) {
      console.error('UID is undefined or null. Cannot fetch generations.');
      return;
    }

    try {
      console.log('accessing collection');
      const generationsRef = collection(db, 'generatedAudio');
      console.log('accessed collection');
      const q = query(generationsRef, 
        where('userId', '==', uid)
      );

      console.log('accessed query');
      
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach((doc) => {
        console.log(doc.id, " => ", doc.data());
      });

      console.log('accessed querySnapshot');

      if (querySnapshot.empty) {
        console.log('No generations found for this user.');
        setGenerations([]);
        return;
      }

      const generationsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setGenerations(generationsData);
    } catch (error) {
      console.error('Error fetching user generations:', error.message);
      setError('Failed to load generations');
    }
  };

  const saveGeneration = async (generationData) => {
    try {
      if (!isAuthenticated || !currentUser) {
        throw new Error('User not authenticated');
      }

      console.log('Starting save generation process...', generationData);
      console.log('Current user:', currentUser);

      const timestamp = new Date().getTime();
      const filename = `audio_${currentUser.uid}_${timestamp}.wav`;
      
      // Create a reference to Firebase Storage
      const storageRef = ref(storage, `audio/${filename}`);

      // Upload the audio file to Firebase Storage
      const uploadResult = await uploadBytes(storageRef, generationData.wavFile);
      console.log('Audio uploaded successfully', uploadResult);

      // Get the download URL
      const downloadURL = await getDownloadURL(uploadResult.ref);
      console.log('Got download URL:', downloadURL);

      // Create the generation document
      const generationDoc = {
        userId: currentUser.uid,
        prompt: generationData.prompt,
        duration: parseInt(generationData.duration),
        timestamp: Timestamp.now(),
        audioPath: `audio/${filename}`,
        audioUrl: downloadURL
      };

      console.log('Generation doc to save:', generationDoc);

      try {
        // Changed collection name here
        const generationsRef = collection(db, 'generatedAudio');
        const docRef = await addDoc(generationsRef, generationDoc);
        console.log('Saved to Firestore with ID:', docRef.id);

        // Update local state with new generation
        const newGeneration = {
          ...generationDoc,
          id: docRef.id
        };
        
        setGenerations(prev => [...prev, newGeneration]);
        console.log('Local state updated');
      } catch (firestoreError) {
        console.error('Specific Firestore error:', firestoreError);
        throw new Error(`Firestore save failed: ${firestoreError.message}`);
      }

    } catch (error) {
      console.error('Error in saveGeneration:', error);
      setError(`Failed to save generation: ${error.message}`);
      throw error;
    }
  };

  const deleteGeneration = async (generationId) => {
    try {
      const generation = generations.find(gen => gen.id === generationId);
      if (!generation) {
        throw new Error('Generation not found');
      }

      // Delete from Firestore (updated collection name)
      await deleteDoc(doc(db, 'generatedAudio', generationId));
      
      // Delete from Storage if there's a storage path
      if (generation.audioPath) {
        const storageRef = ref(storage, generation.audioPath);
        await deleteObject(storageRef);
      }

      // Update local state
      setGenerations(prev => prev.filter(gen => gen.id !== generationId));
      
    } catch (error) {
      console.error('Error deleting generation:', error);
      setError('Failed to delete generation');
    }
  };

  const handleGenerate = async () => {
    if (!isAuthenticated || !currentUser) {
      setError('Please log in to generate music');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      console.log('Starting generation with prompt:', prompt);
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

      const audioBlob = await response.blob();
      console.log('Received audio blob:', audioBlob);

      const wavFile = new File([audioBlob], 'generated_music.wav', {
        type: 'audio/wav'
      });
      console.log('Created WAV file:', wavFile);

      const tempUrl = URL.createObjectURL(wavFile);
      setAudioUrl(tempUrl);

      await saveGeneration({
        prompt,
        duration,
        timestamp: new Date().toISOString(),
        wavFile
      });

    } catch (err) {
      console.error('Error in handleGenerate:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseSynthesizer = async (generationId) => {
    try {
      const generation = generations.find(gen => gen.id === generationId);
      if (!generation) {
        throw new Error('Generation not found');
      }

      // Store the generation ID and URL for reference
      localStorage.setItem('selectedAudioForSynth', generationId);
      localStorage.setItem('selectedAudioUrl', generation.audioUrl);
      
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
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (!auth) {
    console.log('Firebase auth not initialized');
    return <div>Loading...</div>;
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
                                {new Date(gen.timestamp.seconds * 1000).toLocaleString()}
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
                                onClick={() => deleteGeneration(gen.id)}
                                className="p-2 text-[#F2E6D8]/80 hover:text-red-500 transition"
                                title="Delete generation"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                          {gen.audioUrl && (
                            <div className="mt-2">
                              <audio 
                                controls 
                                src={gen.audioUrl}
                                className="w-full" 
                              />
                            </div>
                          )}
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