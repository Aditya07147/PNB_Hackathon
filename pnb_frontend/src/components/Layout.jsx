import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Home, Shield, Search, FileText, Activity, Star, BarChart3 } from 'lucide-react';
import pnbLogo from './pnb.png'; 

const Layout = () => {
  const menuItems =[
    { name: 'Home', icon: <Home size={20} />, path: '/' },
    { name: 'Asset Inventory', icon: <Search size={20} />, path: '/inventory' },
    { name: 'Asset Discovery', icon: <Activity size={20} />, path: '/discovery' },
    { name: 'CBOM', icon: <FileText size={20} />, path: '/cbom' },
    { name: 'Posture of PQC', icon: <Shield size={20} />, path: '/pqc-posture' },
    { name: 'Cyber Rating', icon: <Star size={20} />, path: '/rating' },
    { name: 'Reporting', icon: <BarChart3 size={20} />, path: '/reporting' },
  ];

  return (
    <div className="flex h-screen w-full bg-pnb-bg overflow-hidden">
      
      {/* Sidebar - PNB Maroon */}
      <div className="w-64 bg-pnb-maroon text-white flex flex-col shadow-xl z-20">
        <div className="h-20 flex items-center justify-center border-b border-red-800 bg-black/10">
          {/* Mock Logo Space */}
          <h1 className="text-2xl font-bold tracking-wider text-pnb-gold">
            <span className="text-white">PNB</span> PQC
          </h1>
        </div>
        
        <nav className="flex-1 pt-6 space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-6 py-3 transition-colors duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-r from-pnb-gold to-yellow-500 text-pnb-maroon font-bold shadow-md border-l-4 border-white' 
                    : 'hover:bg-white/10 text-gray-200'
                }`
              }
            >
              <span className="mr-3">{item.icon}</span>
              {item.name}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Header - Golden Gradient */}
        <header className="h-20 bg-gradient-to-r from-yellow-400 via-pnb-gold to-yellow-600 shadow-md flex items-center justify-between px-8 z-10">
          <div className="flex items-center space-x-4">
             <img src={pnbLogo} alt="PNB Logo" className="h-9 w-auto object-"   />
            <h2 className="text-xl font-bold text-pnb-maroon hidden md:block">
              PSB HACKATHON SERIES 2026
            </h2>
          </div>
          <div className="text-pnb-maroon font-semibold bg-white/40 px-4 py-2 rounded-full backdrop-blur-sm shadow-sm">
            Welcome User: hackathon_user..!
          </div>
        </header>

        {/* Dynamic Page Content goes here */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
