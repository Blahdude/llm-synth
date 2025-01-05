import { Link, useLocation } from 'react-router-dom';
import { Music2, Settings, User, LogOut, Home } from 'lucide-react';
import { useState } from 'react';

const Layout = ({ currentUser, handleLogout }) => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="fixed left-0 top-0 h-full w-[21rem] border-r border-white/10">
      <div className="flex flex-col h-full p-2">
        <Link to="/" className="text-2xl font-bold text-[#F2E6D8] p-3 mb-2">
          LLM Synth
        </Link>
        
        <nav className="flex flex-col">
          <Link to="/" className="flex items-center gap-3 px-3 py-2.5 text-[#F2E6D8] rounded-full hover:bg-white/10">
            <Home className="h-[1.25rem] w-[1.25rem]" />
            <span className="text-[1rem]">Home</span>
          </Link>
          <Link to="/generate" className="flex items-center gap-3 px-3 py-2.5 text-[#F2E6D8] rounded-full hover:bg-white/10">
            <Music2 className="h-[1.25rem] w-[1.25rem]" />
            <span className="text-[1rem]">Generate Music</span>
          </Link>
          <Link to="/synthesize" className="flex items-center gap-3 px-3 py-2.5 text-[#F2E6D8] rounded-full hover:bg-white/10">
            <Music2 className="h-[1.25rem] w-[1.25rem]" />
            <span className="text-[1rem]">Synthesize</span>
          </Link>
        </nav>

        <div className="mt-auto mb-4">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <User className="h-[1.25rem] w-[1.25rem] text-[#F2E6D8]" />
            <span className="text-[#F2E6D8]">{currentUser?.username}</span>
            <button
              onClick={handleLogout}
              className="ml-auto text-[#F2E6D8] hover:text-red-500"
            >
              <LogOut className="h-[1.25rem] w-[1.25rem]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout; 