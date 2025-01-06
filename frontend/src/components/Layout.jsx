import { Link, useLocation } from 'react-router-dom';
import { Music2, Settings, User, LogOut, Home, Wand2 } from 'lucide-react';
import { useState } from 'react';

const Layout = ({ currentUser, handleLogout }) => {
  return (
    <div className="fixed left-0 top-0 h-[calc(100vh-5rem)] w-[19rem] border-r border-white/10">
      <div className="flex flex-col h-full p-5">
        <Link to="/" className="text-2xl font-bold text-[#F2E6D8] mb-8">
          LLM Synth
        </Link>
        
        <nav className="flex-1">
          <div className="space-y-1">
            <Link 
              to="/" 
              className="flex items-center gap-3 px-4 py-3 text-[#F2E6D8] rounded-xl hover:bg-white/5 transition-colors"
            >
              <Home className="h-5 w-5" />
              <span className="text-lg">Home</span>
            </Link>

            <Link 
              to="/generate" 
              className="flex items-center gap-3 px-4 py-3 text-[#F2E6D8] rounded-xl hover:bg-white/5 transition-colors"
            >
              <Wand2 className="h-5 w-5" />
              <span className="text-lg">Generate Music</span>
            </Link>

            <Link 
              to="/synthesize" 
              className="flex items-center gap-3 px-4 py-3 text-[#F2E6D8] rounded-xl hover:bg-white/5 transition-colors"
            >
              <Music2 className="h-5 w-5" />
              <span className="text-lg">Synthesizer</span>
            </Link>

            <Link 
              to="/settings" 
              className="flex items-center gap-3 px-4 py-3 text-[#F2E6D8] rounded-xl hover:bg-white/5 transition-colors"
            >
              <Settings className="h-5 w-5" />
              <span className="text-lg">Settings</span>
            </Link>
          </div>
        </nav>

        <div className="border-t border-white/10 pt-5 mb-5">
          <div className="flex items-center gap-3 px-4 py-3 text-[#F2E6D8] rounded-xl bg-white/5">
            <User className="h-5 w-5" />
            <div className="flex-1 min-w-0">
              <p className="text-lg truncate">
                {currentUser?.username || currentUser?.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-white/10 text-[#F2E6D8]/60 hover:text-red-500 transition-colors"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout; 