import { Link, useLocation } from 'react-router-dom';
import { Music2, Settings, User, LogOut } from 'lucide-react';
import { useState } from 'react';

const Layout = ({ currentUser, handleLogout }) => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
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
  );
};

export default Layout; 