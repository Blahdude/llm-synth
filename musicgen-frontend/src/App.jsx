import React from 'react'
import MusicGenInterface from './components/MusicGenInterface'
import './App.css'

function App() {
  return (
    <div id="root" className="w-screen h-screen bg-[#2C3E50] text-white flex items-center justify-center overflow-hidden">
      <MusicGenInterface />
    </div>
  )
}

export default App