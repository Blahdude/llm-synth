import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Music2, User, LogOut, History, Trash2, Menu, Home, Settings } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { auth, db, storage } from '../firebase';  // if in components folder
import { onAuthStateChanged, getAuth } from 'firebase/auth';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, orderBy, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import LoginPage from './LoginPage';
import Layout from './Layout';
import GenerationsSidebar from './GenerationsSidebar';

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
      <Layout handleLogout={handleLogout} currentUser={currentUser} />

      <div className="flex">
        <div className="ml-[0rem] w-[37.5rem] min-h-screen">
          <div className="w-full flex flex-col p-4">
            <h1 className="text-xl text-[#F2E6D8] font-normal mb-4">
              Tell me what kind of music to create
            </h1>
            
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the music you want to generate..."
              className="w-full h-32 px-4 py-3 text-lg text-black border border-gray-200 rounded-2xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors resize-none bg-gray-50"
              disabled={isLoading}
            />

            <div className="w-full mt-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-lg text-[#F2E6D8] font-normal">
                  Duration
                </span>
                <span className="text-lg text-[#F2E6D8] font-normal">
                  {duration} seconds
                </span>
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
              className={`w-full mt-4 py-3 px-4 rounded-full flex items-center justify-center gap-2 text-[#F2E6D8] font-medium text-lg transition
                ${
                  isLoading || !prompt
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
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
              <div className="w-full mt-4">
                <audio ref={audioRef} controls className="w-full" src={audioUrl} />
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="fixed right-0 top-0 h-full w-[22rem]">
          <div className="h-[calc(107vh-4rem)] pt-4 px-4">
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