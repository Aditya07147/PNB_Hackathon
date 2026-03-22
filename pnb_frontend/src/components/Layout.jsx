import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Home, Shield, Search, FileText, Activity, Star, BarChart3 } from 'lucide-react';

// 1. IMPORT THE LOGO HERE (This guarantees Vite finds it!)
import pnbLogo from '../assets/pnb_logo.png';

const Layout = () => {
  const menuItems = [
    { name: 'Home', icon: <Home size={20} />, path: '/' },
    { name: 'Asset Inventory', icon: <Search size={20} />, path: '/inventory' },
    { name: 'Asset Discovery', icon: <Activity size={20} />, path: '/discovery' },
    { name: 'CBOM', icon: <FileText size={20} />, path: '/cbom' },
    { name: 'Posture of PQC', icon: <Shield size={20} />, path: '/pqc-posture' },
    { name: 'Cyber Rating', icon: <Star size={20} />, path: '/rating' },
    { name: 'Reporting', icon: <BarChart3 size={20} />, path: '/reporting' },
  ];

  return (
    <div className="flex h-screen w-full bg-gray-100 overflow-hidden">
      
      {/* SIDEBAR - PNB Maroon */}
      <div className="w-64 bg-[#8b1528] text-white flex flex-col shadow-2xl z-20">
        <div className="h-20 flex items-center justify-center border-b border-red-900 bg-black/10">
          <h1 className="text-2xl font-black tracking-widest text-yellow-500">
            <span className="text-white">PNB</span> PQC
          </h1>
        </div>
        
        <nav className="flex-1 pt-6 space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-6 py-4 transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-[#8b1528] font-black shadow-lg border-l-4 border-white' 
                    : 'hover:bg-white/10 text-gray-200 font-medium'
                }`
              }
            >
              <span className="mr-4">{item.icon}</span>
              {item.name}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* HEADER - Golden Gradient with Fixed Logo */}
        <header className="h-20 bg-gradient-to-r from-[#d9a05b] via-[#e2b144] to-[#d9a05b] shadow-md flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4">
            
            {/* 2. USE THE IMPORTED LOGO HERE */}
            <div className="bg-white p-1.5 rounded-lg shadow-sm">
              <img 
                src={pnbLogo} 
                alt="PNB Logo" 
                className="h-10 w-auto object-contain"
              />
            </div>

            <h2 className="text-2xl font-black text-[#8b1528] tracking-wide hidden md:block">
              PSB HACKATHON SERIES 2026
            </h2>
          </div>
          <div className="text-[#8b1528] font-bold bg-white/50 px-5 py-2 rounded-full backdrop-blur-sm shadow-sm border border-white/40">
            Welcome User: hackathon_user..!
          </div>
        </header>

        {/* DYNAMIC PAGE CONTENT */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[#f4f6f8] p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
