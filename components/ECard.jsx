import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { User, Calendar, Activity, ShieldCheck, ShieldAlert, Download, Share2 } from 'lucide-react';

export default function ECard({ patient, onDownload }) {
  if (!patient) return null;

  const qrData = JSON.stringify({ id: patient.id });
  const isDetected = patient.status === 'Detected';

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, type: 'spring' }}
      className="w-full max-w-sm mx-auto bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative"
    >
      {/* Header Bar */}
      <div className={`h-2 w-full ${isDetected ? 'bg-red-500' : 'bg-emerald-500'}`} />

      <div className="p-6">
        {/* Top Info */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">{patient.name}</h2>
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <User className="w-4 h-4" />
              <span>{patient.age} years old</span>
            </div>
          </div>
          <div className="bg-slate-900/80 px-3 py-1.5 rounded-lg border border-white/5">
            <span className="text-xs text-slate-400 block mb-0.5">Registration ID</span>
            <span className="text-sm font-mono font-bold text-cyan-400">{patient.id}</span>
          </div>
        </div>

        {/* QR Code Container */}
        <div className="flex justify-center mb-8 relative">
          <div className="absolute inset-0 bg-blue-500/20 blur-[40px] rounded-full pointer-events-none" />
          <div className="bg-white p-3 rounded-2xl shadow-xl relative z-10 border-4 border-slate-900">
            <QRCodeSVG 
              value={qrData} 
              size={140} 
              level="H" 
              fgColor="#020617" 
              bgColor="#ffffff"
            />
          </div>
        </div>

        {/* Latest Scan Status */}
        <div className="bg-slate-900/50 rounded-2xl p-4 border border-white/5 mb-6">
          <div className="text-xs text-slate-400 mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Latest Scan</span>
            <span className="font-mono">{patient.lastScanDate || 'No scans yet'}</span>
          </div>

          {patient.status ? (
            <div className={`flex items-center gap-3 p-3 rounded-xl border ${isDetected ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
              <div className={`p-2 rounded-lg ${isDetected ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                {isDetected ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <p className={`font-bold text-sm ${isDetected ? 'text-red-400' : 'text-emerald-400'}`}>
                  {patient.status}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-slate-400">AI Confidence</span>
                  <span className={`text-xs font-mono font-semibold ${isDetected ? 'text-red-400' : 'text-emerald-400'}`}>
                    {patient.confidence?.toFixed(1) || 0}%
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
              <Activity className="w-5 h-5 text-slate-400" />
              <p className="text-sm text-slate-400">Scan required to active status</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button 
            onClick={onDownload}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-blue-600/80 to-purple-600/80 hover:from-blue-600 hover:to-purple-600 border border-purple-500/30 rounded-xl text-white text-sm font-medium transition-all shadow-[0_0_15px_rgba(147,51,234,0.15)]"
          >
            <Download className="w-4 h-4" /> Download Card
          </button>
          <button className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 transition-colors">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
