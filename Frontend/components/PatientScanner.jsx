"use client";

import { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { ScanLine, XCircle, FileWarning } from "lucide-react";
import { motion } from "framer-motion";

export default function PatientScanner({ onScan, onCancel }) {
  const [error, setError] = useState(null);

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

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl max-w-sm w-full mx-auto relative z-10"
    >
      <div className="flex items-center justify-between p-4 border-b border-white/5 bg-black/20">
        <div className="flex items-center gap-2">
          <ScanLine className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-white">Scan Patient Card</h3>
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

      <div className="p-4 text-center bg-black/20 text-xs text-slate-400">
        Position the QR code within the frame to scan.
      </div>
    </motion.div>
  );
}
