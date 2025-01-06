import React, { useState, useEffect, useRef } from 'react';
import { auth, db, storage } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, orderBy, getDocs, where, deleteDoc, doc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import Layout from './Layout';
import GenerationsSidebar from './GenerationsSidebar';
import { useNavigate } from 'react-router-dom';
import LoginPage from './LoginPage';
import { History, Music2, User, Clock } from 'lucide-react';
import PlayBar from './PlayBar';

const Home = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [allGenerations, setAllGenerations] = useState([]);
  const [generations, setGenerations] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(new Audio());
  const [currentTrack, setCurrentTrack] = useState(null);

  // Add effect to check current user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userData = {
          username: user.displayName || user.email,
          uid: user.uid,
          email: user.email
        };
        setCurrentUser(userData);
        setIsAuthenticated(true);
      } else {
        setCurrentUser(null);
        setIsAuthenticated(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch all generations
  useEffect(() => {
    const fetchAllGenerations = async () => {
      try {
        const generationsRef = collection(db, 'generatedAudio');
        const q = query(
          generationsRef,
          orderBy('timestamp', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const fetchedGenerations = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log('Fetched all generations:', fetchedGenerations);
        setAllGenerations(fetchedGenerations);
      } catch (error) {
        console.error("Error fetching all generations:", error);
      }
    };

    fetchAllGenerations();
  }, []);

  // Fetch generations for sidebar (copied from GranularSynth)
  useEffect(() => {
    const fetchGenerations = async () => {
      if (!currentUser) return;
      
      try {
        const generationsRef = collection(db, 'generatedAudio');
        const q = query(
          generationsRef,
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const fetchedGenerations = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setGenerations(fetchedGenerations);
      } catch (error) {
        console.error("Error fetching generations:", error);
      }
    };

    fetchGenerations();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleUseSynthesizer = (generationId) => {
    navigate(`/synthesizer/${generationId}`);
  };

  const deleteGeneration = async (id) => {
    try {
      const generation = allGenerations.find(gen => gen.id === id);
      if (!generation) {
        throw new Error('Generation not found');
      }

      await deleteDoc(doc(db, 'generatedAudio', id));
      
      if (generation.audioPath) {
        const storageRef = ref(storage, generation.audioPath);
        await deleteObject(storageRef);
      }

      // Update both lists
      setAllGenerations(prev => prev.filter(gen => gen.id !== id));
      setGenerations(prev => prev.filter(gen => gen.id !== id));
      
    } catch (error) {
      console.error('Error deleting generation:', error);
    }
  };

  // Add audio control functions
  const handlePlay = (generation) => {
    setCurrentTrack(generation);
  };

  // Clean up audio when component unmounts
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Add event listener for when audio ends
  useEffect(() => {
    const handleAudioEnd = () => {
      setPlayingId(null);
    };

    audioRef.current.addEventListener('ended', handleAudioEnd);
    return () => {
      audioRef.current.removeEventListener('ended', handleAudioEnd);
    };
  }, []);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen">
      <Layout currentUser={currentUser} handleLogout={handleLogout} />

      <div className="flex">
        <div className="ml-[-11rem] w-[41rem] min-h-[calc(100vh-5rem)] border-r border-white/10">
          <div className="w-full flex flex-col p-5 pb-24">
            <h2 className="text-[1.25rem] font-bold text-[#F2E6D8] px-2 flex items-center gap-2 mb-4">
              <History className="h-5 w-5" />
              Community Generations
            </h2>

            <div className="space-y-3">
              {allGenerations.map((generation) => (
                <div 
                  key={generation.id} 
                  className="p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/[0.07] transition-all cursor-pointer"
                  onClick={() => handlePlay(generation)}
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="px-2 py-1 rounded-md bg-white/10 text-xs text-[#F2E6D8]/60">
                        {generation.duration}s
                      </div>
                    </div>

                    <p className="text-sm text-[#F2E6D8] line-clamp-2">
                      {generation.prompt}
                    </p>

                    <div className="pt-2 border-t border-white/5 space-y-1.5">
                      <div className="flex items-center gap-2 text-xs text-[#F2E6D8]/60">
                        <User className="h-3 w-3" />
                        {generation.username || 'Anonymous'}
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-[#F2E6D8]/40">
                        <div className="flex items-center gap-2">
                          <span>{generation.model?.split('/')[1] || 'Unknown'}</span>
                        </div>
                        <span>{generation.timestamp?.toDate().toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="fixed right-0 mr-[3rem] top-0 h-[calc(100vh-5rem)]">
          <div className="h-full pt-5 px-5 pb-24">
            <GenerationsSidebar 
              generations={generations}
              onDelete={deleteGeneration}
              onUseSynthesizer={handleUseSynthesizer}
            />
          </div>
        </div>
      </div>

      <PlayBar 
        currentTrack={currentTrack} 
        onClose={() => setCurrentTrack(null)} 
      />
    </div>
  );
};

export default Home;