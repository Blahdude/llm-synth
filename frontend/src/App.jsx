import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MusicGenInterface from './components/MusicGenInterface';
import GranularSynth from './components/GranularSynth';
import Settings from './components/Settings';
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MusicGenInterface />} />
        <Route path="/synthesize" element={<GranularSynth />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;