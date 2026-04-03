import { BrainCircuit } from 'lucide-react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-white/10 pt-16 pb-8 relative overflow-hidden" id="contact">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-500/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="container mx-auto px-4 lg:px-8 grid md:grid-cols-4 gap-12 relative z-10">
        <div className="col-span-2">
          <Link href="/" className="flex items-center gap-2 font-bold text-2xl text-white mb-6">
            <BrainCircuit className="w-8 h-8 text-cyan-500" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
              Vaidyanetra AI
            </span>
          </Link>
          <p className="text-slate-400 max-w-sm leading-relaxed">
            Advanced MRI Brain Tumor Detection. Empowering healthcare professionals with lightning-fast, high-accuracy AI diagnostic insights.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-white/90 mb-6 text-lg">Platform</h4>
          <div className="flex flex-col gap-3 text-slate-400">
            <Link href="/" className="hover:text-cyan-400 transition-colors">Home</Link>
            <Link href="/#features" className="hover:text-cyan-400 transition-colors">Features</Link>
            <Link href="/#how-it-works" className="hover:text-cyan-400 transition-colors">How It Works</Link>
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-white/90 mb-6 text-lg">Contact & Resources</h4>
          <div className="flex flex-col gap-3 text-slate-400">
            <a href="#" className="hover:text-cyan-400 transition-colors">Research Papers</a>
            <a href="#" className="hover:text-cyan-400 transition-colors">API Documentation</a>
            <a href="mailto:support@vaidyanetra.ai" className="hover:text-cyan-400 transition-colors">support@vaidyanetra.ai</a>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 lg:px-8 mt-12 pt-8 border-t border-white/10 text-center text-sm text-slate-500 relative z-10">
        &copy; {new Date().getFullYear()} Vaidyanetra AI. Built for the Hackathon.
      </div>
    </footer>
  );
}
