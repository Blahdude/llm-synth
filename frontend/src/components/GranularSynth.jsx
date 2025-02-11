import React, { useEffect, useRef, useState } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db, storage } from '../firebase';
import Layout from './Layout';
import { useParams, useNavigate } from 'react-router-dom';
import GenerationsSidebar from './GenerationsSidebar';
import { onAuthStateChanged } from 'firebase/auth';

const GranularSynth = () => {
  const { generationId } = useParams();
  const navigate = useNavigate();
  console.log('URL Parameter generationId:', generationId);
  const [error, setError] = useState(null);
  const [audioBuffer, setAudioBuffer] = useState(null);
  const canvasRef = useRef(null);
  const canvas2Ref = useRef(null);
  const audioContextRef = useRef(null);
  const masterGainRef = useRef(null);
  
  // Synthesis parameters
  const [attack, setAttack] = useState(0.40);
  const [release, setRelease] = useState(0.40);
  const [density, setDensity] = useState(0.85);
  const [spread, setSpread] = useState(0.2);
  const [pan, setPan] = useState(0.1);
  const [transpose, setTranspose] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);

  // Add touch tracking
  const touchesRef = useRef(new Map());

  // Add state for current user
  const [currentUser, setCurrentUser] = useState(null);

  // Add state for generations
  const [generations, setGenerations] = useState([]);

  // Add state for filename
  const [audioFileName, setAudioFileName] = useState(null);

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
      } else {
        setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Grain creation with spread and pan
  const createGrain = (positionX, positionY) => {
    if (!audioBuffer) return;

    const now = audioContextRef.current.currentTime;
    const source = audioContextRef.current.createBufferSource();
    const gainNode = audioContextRef.current.createGain();
    const panner = audioContextRef.current.createStereoPanner();

    // Apply transpose
    source.playbackRate.value = transpose;
    
    source.buffer = audioBuffer;
    source.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(masterGainRef.current);

    // Calculate parameters
    const duration = attack + release;
    const randomOffset = (Math.random() * spread * 2) - spread;
    const offset = ((positionX / canvasRef.current.width) * audioBuffer.duration) + randomOffset;
    
    // Use fixed amplitude instead of Y-based
    const amplitude = 1.0;
    
    // Random pan based on pan parameter
    const randomPan = (Math.random() * pan * 2) - pan;
    panner.pan.value = randomPan;

    // Schedule envelope
    source.start(now, Math.max(0, offset), duration);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(amplitude, now + attack);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    // Visual feedback with colorful lines
    const ctx2 = canvas2Ref.current.getContext('2d');
    
    // Random colors like the original
    const randomColor = `rgb(
      ${Math.random() * 125 + 125},
      ${Math.random() * 250},
      ${Math.random() * 250}
    )`;
    
    // Draw initial line
    ctx2.strokeStyle = randomColor;
    ctx2.lineWidth = 2;
    ctx2.beginPath();
    const xWithOffset = positionX + (randomOffset / (audioBuffer.duration / canvasRef.current.width));
    ctx2.moveTo(xWithOffset, 0);
    ctx2.lineTo(xWithOffset, canvasRef.current.height);
    ctx2.stroke();

    // Clear line after delay
    setTimeout(() => {
      ctx2.clearRect(xWithOffset - 2, 0, 4, canvasRef.current.height);
    }, 200);

    // Cleanup
    setTimeout(() => {
      gainNode.disconnect();
      panner.disconnect();
    }, duration * 1000 + 100);
  };

  // Transpose handlers
  const handleTransposeDown = () => {
    setTranspose(prev => prev / 2);
  };

  const handleTransposeUp = () => {
    setTranspose(prev => prev * 2);
  };

  // Modified pointer handlers to match original behavior
  const handlePointerDown = (e) => {
    setIsPlaying(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    touchesRef.current.set(e.pointerId, {
      x,
      y,
      timeoutId: setInterval(() => {
        const touch = touchesRef.current.get(e.pointerId);
        if (touch) {
          createGrain(touch.x, touch.y);
        }
      }, 1000 / (density * 10))
    });
    
    createGrain(x, y);
  };

  const handlePointerMove = (e) => {
    if (!isPlaying) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    const touch = touchesRef.current.get(e.pointerId);
    if (touch) {
      touch.x = x;
      touch.y = y;
    }
  };

  const handlePointerUp = (e) => {
    // Clear specific touch point
    const touch = touchesRef.current.get(e.pointerId);
    if (touch) {
      clearInterval(touch.timeoutId);
      touchesRef.current.delete(e.pointerId);
    }
    
    // Only stop playing if no touches remain
    if (touchesRef.current.size === 0) {
      setIsPlaying(false);
    }
  };

  // Cleanup function for touch events
  const cleanupTouches = () => {
    touchesRef.current.forEach(touch => {
      clearInterval(touch.timeoutId);
    });
    touchesRef.current.clear();
    setIsPlaying(false);
  };

  // Draw waveform
  const drawWaveform = (audioBuffer) => {
    if (!canvasRef.current) {
      console.error('Canvas reference not available');
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Could not get canvas context');
      return;
    }

    console.log('Drawing waveform with buffer:', audioBuffer);
    const data = audioBuffer.getChannelData(0);
    const step = Math.ceil(data.length / canvas.width);
    const amp = canvas.height / 2;

    // Set new background color
    ctx.fillStyle = '#2C3E50';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw waveform in new color
    ctx.beginPath();
    ctx.strokeStyle = '#F2E6D8';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < canvas.width; i++) {
      let min = 1.0;
      let max = -1.0;
      
      for (let j = 0; j < step; j++) {
        const datum = data[(i * step) + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      
      ctx.moveTo(i, (1 + min) * amp);
      ctx.lineTo(i, (1 + max) * amp);
    }
    
    ctx.stroke();
    console.log('Waveform drawing complete');
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setAudioFileName(file.name); // Store filename
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      setAudioBuffer(audioBuffer);
      drawWaveform(audioBuffer);
    } catch (err) {
      console.error("Error loading audio file:", err);
      setError("Failed to load audio file");
    }
  };

  // Update the effect that loads selected audio
  useEffect(() => {
    const loadSelectedAudio = async () => {
      if (!generationId) {
        console.log('No generationId found, returning early');
        return;
      }

      try {
        const docRef = doc(db, 'generatedAudio', generationId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          console.log('No generation found with this ID');
          setError('Generation not found');
          return;
        }

        const generationData = {
          id: docSnap.id,
          ...docSnap.data()
        };
        
        setAudioFileName(generationData.prompt || 'Generated Audio');
        
        // Modified fetch request
        const response = await fetch(generationData.audioUrl, {
          headers: {
            'Accept': 'audio/*'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch audio file: ${response.status} ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }

        const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
        console.log('Successfully loaded audio buffer');
        setAudioBuffer(audioBuffer);
        drawWaveform(audioBuffer);
      } catch (err) {
        console.error("Error loading selected audio:", err);
        setError(`Failed to load selected audio: ${err.message}`);
      }
    };

    loadSelectedAudio();
  }, [generationId]);

  // Add cleanup for component unmount
  useEffect(() => {
    return () => {
      // Clean up localStorage when component unmounts
      localStorage.removeItem('selectedAudioUrl');
    };
  }, []);

  useEffect(() => {
    try {
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
      masterGainRef.current = audioContextRef.current.createGain();
      masterGainRef.current.connect(audioContextRef.current.destination);
      
      if (canvasRef.current && canvas2Ref.current) {
        const ctx = canvasRef.current.getContext('2d');
        const ctx2 = canvas2Ref.current.getContext('2d');
        
        // Set initial background color
        ctx.fillStyle = '#2C3E50';
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        ctx2.fillStyle = 'rgba(44, 62, 80, 0)'; // Transparent background for grain canvas
        ctx2.fillRect(0, 0, canvas2Ref.current.width, canvas2Ref.current.height);
      }
    } catch (err) {
      console.error("Error initializing:", err);
      setError(err.message);
    }
  }, []);

  // Add cleanup to useEffect
  useEffect(() => {
    return () => {
      cleanupTouches();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Prevent default touch behaviors
  useEffect(() => {
    const preventDefault = (e) => e.preventDefault();
    document.addEventListener('touchmove', preventDefault, { passive: false });
    document.addEventListener('touchstart', preventDefault, { passive: false });
    
    return () => {
      document.removeEventListener('touchmove', preventDefault);
      document.removeEventListener('touchstart', preventDefault);
    };
  }, []);

  // Add functions to handle generations
  const deleteGeneration = async (id) => {
    // Implementation for deleting generations
  };

  const handleUseSynthesizer = (id) => {
    // If we're already looking at this generation, do nothing
    if (id === generationId) {
      return;
    }
    
    // Otherwise, navigate to the new generation
    navigate(`/synthesizer/${id}`);
  };

  // Add useEffect to fetch generations
  useEffect(() => {
    const fetchGenerations = async () => {
      if (!currentUser?.uid) return;
      
      try {
        const q = query(
          collection(db, 'generatedAudio'),
          where('userId', '==', currentUser.uid)
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
      localStorage.removeItem('currentUser');
      window.location.href = '/';
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#2C3E50]">
      <Layout 
        currentUser={currentUser} 
        handleLogout={handleLogout}
      />

      <div className="flex">
        <div className="ml-[-11rem] w-[41rem] min-h-screen border-r border-white/10">
          <div className="w-full flex flex-col p-5">
            <div className="w-full mb-5 bg-white/5 rounded-xl p-4 border border-white/10">
              <h2 className="text-lg font-medium text-[#F2E6D8]/80">Granular Synthesizer</h2>
              {!audioFileName && (
                <p className="mt-1 text-xl text-[#F2E6D8]/80 line-clamp-2 leading-tight">
                  Upload a waveform from the right. Click and drag on the waveform to create grains of sound. Adjust parameters below as desired.
                </p>
              )}
            </div>
            
            {/* Canvas container */}
            <div className="relative w-full h-36 mb-5 rounded-xl overflow-hidden bg-white/10 border border-white/10">
              <canvas 
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full cursor-pointer touch-action-none"
                style={{ 
                  pointerEvents: 'auto', 
                  touchAction: 'none',
                  WebkitTouchCallout: 'none',
                  WebkitUserSelect: 'none',
                  KhtmlUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none',
                  userSelect: 'none'
                }}
                width={800}
                height={400}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onPointerCancel={handlePointerUp}
              />
              <canvas 
                ref={canvas2Ref}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                width={800}
                height={400}
              />
            </div>

            {/* File input moved below canvas */}
            <div className="mb-6 flex items-center gap-4">
              <div>
                <label className="relative inline-block">
                  <span className="bg-[#F2E6D8] text-[#2C3E50] px-6 py-2.5 rounded-lg font-medium cursor-pointer hover:bg-[#E5D9CC] transition-colors duration-200">
                    Choose Audio File
                  </span>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
              {audioFileName && (
                <div className="flex-1 text-[#F2E6D8] text-sm font-medium px-4 py-2 bg-white/5 rounded-lg">
                  <p className="break-words">
                    {audioFileName}
                  </p>
                </div>
              )}
            </div>

            {/* Rest of your controls */}
            <div className="bg-black/10 p-6 rounded-xl border border-[#F2E6D8]/10">
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="block text-[#F2E6D8]/80 text-sm font-medium">
                    Attack
                    <span className="ml-2 text-[#F2E6D8]/60">
                      {(attack * 100).toFixed(0)}%
                    </span>
                  </label>
                  <input 
                    type="range" 
                    min="1" 
                    max="100" 
                    value={attack * 100}
                    onChange={(e) => setAttack(e.target.value / 100)}
                    className="w-full accent-[#F2E6D8] h-2 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[#F2E6D8]/80 text-sm font-medium">
                    Release
                    <span className="ml-2 text-[#F2E6D8]/60">
                      {(release * 100).toFixed(0)}%
                    </span>
                  </label>
                  <input 
                    type="range" 
                    min="1" 
                    max="100" 
                    value={release * 100}
                    onChange={(e) => setRelease(e.target.value / 100)}
                    className="w-full accent-[#F2E6D8] h-2 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[#F2E6D8]/80 text-sm font-medium">
                    Density
                    <span className="ml-2 text-[#F2E6D8]/60">
                      {(density * 100).toFixed(0)}%
                    </span>
                  </label>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={density * 100}
                    onChange={(e) => setDensity(e.target.value / 100)}
                    className="w-full accent-[#F2E6D8] h-2 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="mt-4 text-sm text-[#F2E6D8]/40 space-y-1">
                <div>Status: {audioBuffer ? 'Audio Loaded' : 'Waiting for Audio'}</div>
                <div>Playback: {isPlaying ? 'Active' : 'Inactive'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="fixed right-0 mr-[3rem] top-0 h-full w-[24rem]">
          <div className="h-[calc(100vh-4rem)] pt-5 px-5">
            <GenerationsSidebar 
              generations={generations}
              onDelete={deleteGeneration}
              onUseSynthesizer={handleUseSynthesizer}
              currentGenerationId={generationId}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GranularSynth;