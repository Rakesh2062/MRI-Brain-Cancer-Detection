"use client";

import { Bell, Search, Menu, User, Activity } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { getPatient, getPatients } from '../lib/store';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef(null);

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef(null);

  // Real-time search effect
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const allPatients = getPatients();
      const query = searchQuery.toLowerCase();
      const matches = allPatients.filter(p => 
        p.name.toLowerCase().includes(query) || p.id.toLowerCase().includes(query)
      ).slice(0, 5); // Limit to top 5 matches
      
      setSearchResults(matches);
      setIsSearchOpen(true);
    } else {
      setSearchResults([]);
      setIsSearchOpen(false);
    }
  }, [searchQuery]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchEnter = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const q = searchQuery.trim();
      setIsSearchOpen(false);
      if (getPatient(q.toUpperCase())) {
        router.push(`/results?id=${q.toUpperCase()}`);
      } else {
        router.push(`/history?q=${encodeURIComponent(q)}`);
      }
      setSearchQuery('');
    }
  };

  const getPageTitle = () => {
    if (pathname === '/') return 'Dashboard Overview';
    if (pathname === '/upload') return 'Scan Upload';
    if (pathname.startsWith('/results')) return 'Patient Analysis';
    if (pathname === '/history') return 'Patient History';
    if (pathname === '/settings') return 'System Settings';
    return 'VaidyaNetra';
  };

  return (
    <nav className="h-20 border-b border-white/5 bg-slate-950/50 backdrop-blur-xl shrink-0 flex items-center px-4 md:px-8 justify-between z-40 sticky top-0">
      
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button - visible only on small screens */}
        <button className="lg:hidden p-2 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition">
          <Menu className="w-5 h-5 text-slate-300" />
        </button>
        
        {/* Dynamic Page Title */}
        <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
          {getPageTitle()}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Global Search with Live Dropdown */}
        <div className="hidden md:flex items-center relative" ref={searchRef}>
          <Search className="w-4 h-4 text-slate-400 absolute left-3" />
          <input 
            type="text" 
            placeholder="Search patient ID or name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchEnter}
            onFocus={() => { if (searchQuery.trim().length > 0) setIsSearchOpen(true); }}
            className={`w-72 bg-slate-900/80 border transition-all py-2 pl-10 pr-4 text-sm text-slate-300 focus:outline-none placeholder:text-slate-600 ${
              isSearchOpen ? 'rounded-t-2xl border-cyan-500/50 border-b-transparent' : 'rounded-full border-white/10 focus:border-cyan-500/50'
            }`}
          />
          
          {/* Live Search Dropdown */}
          {isSearchOpen && (
            <div className="absolute top-full left-0 w-full bg-slate-900 border border-cyan-500/50 border-t-0 rounded-b-2xl shadow-2xl overflow-hidden mt-0">
              {searchResults.length > 0 ? (
                <div className="flex flex-col">
                  {searchResults.map(p => (
                    <button 
                      key={p.id}
                      onClick={() => {
                        setSearchQuery('');
                        setIsSearchOpen(false);
                        router.push(`/results?id=${p.id}`);
                      }}
                      className="flex items-center justify-between px-4 py-3 hover:bg-slate-800 transition text-left group border-t border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/5 flex items-center justify-center text-slate-400 group-hover:text-cyan-400 transition-colors">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors">{p.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono tracking-wide">{p.id}</span>
                        </div>
                      </div>
                      <div className={`px-2 text-[10px] uppercase tracking-wider font-bold rounded ${p.status === 'Detected' ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                        {p.status}
                      </div>
                    </button>
                  ))}
                  <button 
                    onClick={() => {
                      setIsSearchOpen(false);
                      router.push(`/history?q=${encodeURIComponent(searchQuery)}`);
                      setSearchQuery('');
                    }}
                    className="px-4 py-3 text-xs font-semibold text-center text-cyan-400 hover:bg-cyan-500/10 transition border-t border-white/5 bg-slate-900/50"
                  >
                    View all matching results ({searchResults.length})
                  </button>
                </div>
              ) : (
                <div className="p-4 text-sm text-slate-400 text-center border-t border-white/5">
                  No patients found matching "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative" ref={notificationsRef}>
          <button 
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className={`relative p-2.5 bg-slate-900 border transition-colors shadow-inner ${isNotificationsOpen ? 'border-cyan-500/50 rounded-t-2xl' : 'border-white/10 rounded-full hover:bg-white/10'}`}
          >
            <Bell className="w-5 h-5 text-slate-300" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-slate-950 shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
          </button>
          
          {/* Notifications Dropdown */}
          {isNotificationsOpen && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-slate-950/50">
                <span className="text-sm font-bold text-white">Notifications</span>
                <span className="text-xs text-cyan-400 cursor-pointer hover:underline">Mark all as read</span>
              </div>
              <div className="flex flex-col max-h-80 overflow-y-auto">
                {/* Mock Notification 1 */}
                <div className="p-4 border-b border-white/5 hover:bg-slate-800 transition cursor-pointer flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm text-white font-semibold">High Confidence Match</p>
                    <p className="text-xs text-slate-400 mt-1">AI detected a tumor probability of 98.7% on scan for Patient ID: VN-2026-9281.</p>
                    <p className="text-[10px] text-slate-500 mt-2">12 mins ago</p>
                  </div>
                </div>
                {/* Mock Notification 2 */}
                <div className="p-4 border-b border-white/5 hover:bg-slate-800 transition cursor-pointer flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-cyan-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm text-white font-semibold">System Updated</p>
                    <p className="text-xs text-slate-400 mt-1">Multi-organ support for Breast and Brain pipelines has been initialized successfully.</p>
                    <p className="text-[10px] text-slate-500 mt-2">1 hour ago</p>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsNotificationsOpen(false)} className="w-full py-2.5 text-xs font-semibold text-center text-slate-400 hover:text-white transition bg-slate-950/50 border-t border-white/5">
                Close
              </button>
            </div>
          )}
        </div>
      </div>

    </nav>
  );
}
