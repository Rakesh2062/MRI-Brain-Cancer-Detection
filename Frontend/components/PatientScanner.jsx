"use client";

import { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { ScanLine, XCircle, FileWarning } from "lucide-react";
import { motion } from "framer-motion";

export default function PatientScanner({ onScan, onCancel }) {
  const [error, setError] = useState(null);
  const [manualId, setManualId] = useState("");

  const handleScan = (text) => {
    try {
      const data = JSON.parse(text);
      if (data && data.id) {
        onScan(data.id);
      } else {
        setError("Invalid QR format. Expected Vaidyanetra ID.");
      }
    } catch {
      if (text.startsWith("VN-")) {
        onScan(text);
      } else {
        setError("Unrecognized QR Code content.");
      }
    }
  };

  const handleManualSubmit = () => {
    if (!manualId.trim()) {
      setError("Please enter a valid Patient ID");
      return;
    }
    // Clean up input and assume it's valid to let the root page handle routing
    const cleanedId = manualId.trim().toUpperCase();
    onScan(cleanedId);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl max-w-sm w-full mx-auto relative z-10"
    >
      <div className="flex items-center justify-between p-4 border-b border-white/5 bg-black/20">
        <div className="flex items-center gap-2">
          <ScanLine className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-white">Find Patient</h3>
        </div>
        <button onClick={onCancel} className="text-slate-400 hover:text-white transition">
          <XCircle className="w-5 h-5" />
        </button>
      </div>
      
      <div className="relative aspect-[4/3] bg-black">
        <Scanner
          onScan={(result) => handleScan(result[0].rawValue)}
          onError={(err) => console.error(err)}
          components={{ 
            audio: false, 
            finder: true, 
            tracker: undefined 
          }}
          styles={{ 
            container: { width: "100%", height: "100%" },
            video: { objectFit: "cover" }
          }}
        />
      </div>

      {error && (
        <div className="bg-red-500/10 border-t border-red-500/20 p-3 flex gap-2 items-center text-sm text-red-400">
          <FileWarning className="w-4 h-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="p-4 bg-black/20 flex flex-col gap-4">
        <div className="text-center text-xs text-slate-400">
          Position the QR code within the frame to scan.
        </div>
        
        <div className="flex items-center gap-4">
          <div className="h-px bg-white/10 flex-1"></div>
          <span className="text-xs text-slate-500 font-medium">OR</span>
          <div className="h-px bg-white/10 flex-1"></div>
        </div>

        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Enter Patient ID (e.g. VN-1234)" 
            className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400/50"
            value={manualId}
            onChange={(e) => {
              setManualId(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
          />
          <button 
            onClick={handleManualSubmit}
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Search
          </button>
        </div>
      </div>
    </motion.div>
  );
}
