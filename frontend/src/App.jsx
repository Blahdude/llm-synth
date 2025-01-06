import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MusicGenInterface from './components/MusicGenInterface';
import GranularSynth from './components/GranularSynth';
import Settings from './components/Settings';
import Home from './components/Home';
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/generate" element={<MusicGenInterface />} />
        <Route path="/synthesize" element={<GranularSynth />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/synthesizer/:generationId" element={<GranularSynth />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;