"use client";

import Link from 'next/link';
import { BrainCircuit } from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        scrolled 
        ? 'bg-slate-950/70 backdrop-blur-lg border-b border-white/10 shadow-lg shadow-black/20 py-3' 
        : 'bg-transparent py-5'
      }`}
    >
      <div className="container mx-auto px-4 lg:px-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl md:text-2xl text-white group">
          <BrainCircuit className="w-8 h-8 text-cyan-400 group-hover:text-purple-400 transition-colors" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400">
            Vaidyanetra AI
          </span>
        </Link>
        <div className="hidden md:flex gap-8 text-sm font-medium text-slate-300">
          {[
            { label: 'Home', href: '/' },
            { label: 'Features', href: '/#features' },
            { label: 'How It Works', href: '/#how-it-works' },
            { label: 'Contact Us', href: '#contact' }
          ].map((item) => (
            <Link 
              key={item.label} 
              href={item.href} 
              className="relative group transition-all"
            >
              <span className="group-hover:text-cyan-400 transition-colors block group-hover:-translate-y-0.5 duration-300">
                {item.label}
              </span>
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-cyan-400 group-hover:w-full transition-all duration-300 ease-out" />
            </Link>
          ))}
        </div>
        <Link 
          href="/#demo" 
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:scale-105 hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all duration-300"
        >
          Scan / Register
        </Link>
      </div>
    </motion.nav>
  );
}
