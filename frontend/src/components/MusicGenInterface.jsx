import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Music2, User, LogOut, History, Trash2, Menu, Home, Settings, Play, Pause, Volume2, Image } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { auth, db, storage } from '../firebase';  // if in components folder
import { onAuthStateChanged, getAuth } from 'firebase/auth';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, orderBy, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import LoginPage from './LoginPage';
import Layout from './Layout';
import GenerationsSidebar from './GenerationsSidebar';

const AVAILABLE_MODELS = [
  { 
    id: "facebook/musicgen-small", 
    name: "MusicGen Small",
    description: "Faster generation, lighter model" 
  },
  { 
    id: "facebook/musicgen-medium", 
    name: "MusicGen Medium",
    description: "Better quality, slower generation" 
  },
  { 
    id: "facebook/musicgen-large", 
    name: "MusicGen Large",
    description: "Best quality, slowest generation" 
  }
];

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

  // Add state for mobile sidebar toggle
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Add state for audio URLs
  const [generationUrls, setGenerationUrls] = useState(new Map());

  // Add state for authentication
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Add state for audio player
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioLength, setAudioLength] = useState(0);

  // Add state for selected model
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id);

  // Replace localStorage useEffect with Firebase auth listener
  useEffect(() => {
    const auth = getAuth();
    console.log('Setting up auth listener');
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed:', user);
      if (user) {
        setIsAuthenticated(true);
        const userData = {
          username: user.displayName,
          uid: user.uid,
          email: user.email
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
        username: currentUser.username || currentUser.displayName || 'Anonymous',
        prompt: generationData.prompt,
        duration: parseInt(generationData.duration),
        timestamp: Timestamp.now(),
        audioPath: `audio/${filename}`,
        audioUrl: downloadURL,
        imageUrl: generationData.imageUrl,
        model: selectedModel
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
      // Generate music
      const musicResponse = await fetch('http://localhost:8000/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          duration: parseInt(duration),
          model: selectedModel
        }),
      });

      if (!musicResponse.ok) {
        throw new Error('Failed to generate music');
      }

      const audioBlob = await musicResponse.blob();
      const wavFile = new File([audioBlob], 'generated_music.wav', {
        type: 'audio/wav'
      });

      const tempUrl = URL.createObjectURL(wavFile);
      setAudioUrl(tempUrl);

      // Save audio only
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

  const handleUseSynthesizer = (generationId) => {
    if (!generationId) {
      console.error('No generationId provided to handleUseSynthesizer');
      return;
    }
    console.log('Navigating to synthesizer with ID:', generationId);
    console.log('Navigation path:', `/synthesizer/${generationId}`);
    navigate(`/synthesizer/${generationId}`);
  };

  // Clean up URLs when component unmounts
  useEffect(() => {
    return () => {
      generationUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [generationUrls]);

  // Add handlers for audio player
  const handlePlayPause = () => {
    if (isAudioPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsAudioPlaying(!isAudioPlaying);
  };

  const handleTimeUpdate = () => {
    setAudioCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    setAudioLength(audioRef.current.duration);
  };

  const handleSeek = (e) => {
    const time = (e.target.value / 100) * audioLength;
    audioRef.current.currentTime = time;
    setAudioCurrentTime(time);
  };

  // Format time function
  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Login Screen
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (!auth) {
    console.log('Firebase auth not initialized');
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#2C3E50]">
      <Layout currentUser={currentUser} handleLogout={handleLogout} />

      <div className="flex">
        <div className="ml-[-11rem] w-[41rem] min-h-screen border-r border-white/10">
          <div className="w-full flex flex-col p-5">
            <h2 className="text-2xl mb-5 text-[#F2E6D8]">
              Tell me what kind of music to create
            </h2>

            <div className="mb-5 flex items-start gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-[#F2E6D8]/60 mb-2">
                  Model
                </label>
                <div className="relative">
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-[#F2E6D8] rounded-xl px-4 py-2.5 appearance-none cursor-pointer hover:bg-white/[0.07] transition-colors"
                  >
                    {AVAILABLE_MODELS.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="h-4 w-4 text-[#F2E6D8]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <p className="mt-2 text-sm text-[#F2E6D8]/40">
                  {AVAILABLE_MODELS.find(m => m.id === selectedModel)?.description}
                </p>
              </div>
              
              <div className="w-48">
                <label className="block text-sm font-medium text-[#F2E6D8]/60 mb-2">
                  Duration
                </label>
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full accent-[#F2E6D8] h-2 rounded-lg appearance-none cursor-pointer"
                />
                <div className="mt-2 text-sm text-[#F2E6D8]/40 text-center">
                  {duration} seconds
                </div>
              </div>
            </div>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the music you want to generate..."
              className="w-full h-36 px-5 py-4 text-xl bg-white/10 text-[#F2E6D8] border border-white/10 rounded-xl focus:border-white/20 focus:ring-1 focus:ring-white/20 focus:outline-none transition-colors resize-none placeholder:text-[#F2E6D8]/60"
              disabled={isLoading}
            />

            <button
              onClick={handleGenerate}
              disabled={isLoading || !prompt}
              className={`w-full mt-5 py-4 px-5 rounded-xl flex items-center justify-center gap-3 text-[#F2E6D8] font-medium text-xl transition-colors
                ${isLoading || !prompt
                  ? 'bg-white/10 cursor-not-allowed'
                  : 'bg-white/10 hover:bg-white/20'
                }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin h-6 w-6" />
                  Generating...
                </>
              ) : (
                <>
                  <Music2 className="h-6 w-6" />
                  Generate Music
                </>
              )}
            </button>

            {audioUrl && !isLoading && (
              <div className="w-full mt-5 p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#F2E6D8]/60">Preview</span>
                    <span className="text-sm text-[#F2E6D8]/60">
                      {formatTime(audioCurrentTime)} / {formatTime(audioLength)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handlePlayPause}
                      className="p-2 rounded-full bg-[#F2E6D8] hover:bg-[#E5D9CC] transition-colors"
                    >
                      {isAudioPlaying ? (
                        <Pause className="h-4 w-4 text-[#2C3E50]" />
                      ) : (
                        <Play className="h-4 w-4 text-[#2C3E50]" />
                      )}
                    </button>

                    <div className="flex-1">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={(audioCurrentTime / audioLength) * 100 || 0}
                        onChange={handleSeek}
                        className="w-full accent-[#F2E6D8] h-1.5 rounded-lg appearance-none cursor-pointer bg-white/10"
                      />
                    </div>

                    <Volume2 className="h-4 w-4 text-[#F2E6D8]/60" />
                  </div>
                </div>

                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={() => setIsAudioPlaying(false)}
                  className="hidden"
                />
              </div>
            )}

            {error && (
              <div className="mt-5 p-3 bg-red-500 text-white rounded-xl text-lg">
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="fixed right-0 mr-[3rem] top-0 h-full w-[24rem]">
          <div className="h-[calc(100vh-4rem)] pt-5 px-5">
            <GenerationsSidebar 
              generations={generations}
              onDelete={deleteGeneration}
              onUseSynthesizer={handleUseSynthesizer}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicGenInterface;