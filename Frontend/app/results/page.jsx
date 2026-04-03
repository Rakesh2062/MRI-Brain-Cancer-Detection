"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle2, AlertTriangle, Download, Share2, Clock, FileText, Brain, UploadCloud } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import ECard from '../components/ECard.jsx';
import { getPatient, savePatient } from '../lib/store';

function DashboardContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [patient, setPatient] = useState(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (id) {
      const p = getPatient(id);
      if (p) setPatient(p);
    }
  }, [id]);

  const handleNewScan = () => {
    if (!patient) return;
    setIsUploading(true);
    setUploadProgress(0);
    
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        const next = prev + Math.random() * 20;
        if (next >= 100) {
          clearInterval(interval);
          
          const mockResult = Math.random() > 0.5 ? 'Detected' : 'Not Detected';
          const mockConfidence = Math.random() * 20 + 80;
          const newDate = new Date().toISOString().split('T')[0];
          
          const updatedPatient = {
            ...patient,
            status: mockResult,
            confidence: mockConfidence,
            lastScanDate: newDate,
            history: [
              ...patient.history,
              {
                id: `SCAN-${Math.floor(Math.random() * 1000)}`,
                date: newDate,
                type: 'T2-Weighted MRI',
                status: mockResult,
                confidence: mockConfidence,
                details: mockResult === 'Detected' ? 'Meningioma indicators present' : 'Clear scan'
              }
            ]
          };
          
          savePatient(updatedPatient);
          setPatient(updatedPatient);
          setIsUploading(false);
          return 100;
        }
        return next;
      });
    }, 300);
  };

  if (!patient && id) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        Loading patient data...
      </div>
    );
  }

  if (!patient && !id) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white gap-4">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <h2>No patient ID provided.</h2>
        <Link href="/" className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition">Go Home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pt-24 pb-12 px-4">
      <div className="container mx-auto max-w-6xl">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/10">
              <ArrowLeft className="text-white w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">Patient Dashboard</h1>
              <p className="text-slate-400 text-sm">Managing records for {patient?.name}</p>
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8 items-start">
          
          {/* Left Column: E-Card */}
          <div className="lg:sticky lg:top-24">
            <ECard patient={patient} />
            
            <div className="mt-6">
              <AnimatePresence mode="wait">
                {!isUploading ? (
                  <motion.div 
                    key="upload-btn"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    whileHover={{ scale: 1.02 }}
                    className="w-full flex flex-col items-center justify-center gap-2 py-6 bg-white/5 hover:bg-white/10 border-2 border-dashed border-white/20 hover:border-cyan-400/50 rounded-2xl text-white transition-all group shadow-lg relative overflow-hidden"
                  >
                    <input 
                      type="file" 
                      accept=".dcm,.jpg,.jpeg,.png"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleNewScan();
                        }
                      }}
                    />
                    <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 group-hover:scale-110 transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] pointer-events-none">
                      <UploadCloud className="w-6 h-6 text-cyan-400 pointer-events-none" />
                    </div>
                    <span className="font-medium mt-2 pointer-events-none">Upload New Scan</span>
                    <span className="text-xs text-slate-400 pointer-events-none">Add a new MRI to patient record</span>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="uploading-state"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="w-full p-6 bg-slate-900 border border-white/10 rounded-2xl flex flex-col items-center justify-center text-center shadow-inner"
                  >
                    <Brain className="w-10 h-10 text-purple-400 animate-pulse mb-4" />
                    <div className="w-full flex justify-between text-xs mb-2 text-slate-300 font-mono">
                      <span>Analyzing...</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Column: Scan History & Insights */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            
            {/* History Feed */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/5 border border-white/10 rounded-3xl p-6 lg:p-8 backdrop-blur-md"
            >
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                <h3 className="font-semibold text-xl text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-cyan-400" />
                  Clinical History
                </h3>
                <span className="text-xs font-mono text-slate-400">{patient?.history.length} Record(s)</span>
              </div>

              <div className="space-y-6">
                {[...patient.history].reverse().map((record, idx) => {
                  const isDetected = record.status === 'Detected';
                  return (
                    <motion.div 
                      key={record.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="relative pl-8"
                    >
                      {/* Timeline Line */}
                      {idx !== patient.history.length - 1 && (
                        <div className="absolute left-[11px] top-6 bottom-[-24px] w-0.5 bg-white/10" />
                      )}
                      
                      {/* Timeline Dot */}
                      <div className={`absolute left-0 top-1.5 w-6 h-6 rounded-full border-4 border-slate-950 flex items-center justify-center ${isDetected ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-emerald-500 shadow-[0_0_10px_rgb(16,185,129)]'}`}>
                        {isDetected ? <AlertTriangle className="w-3 h-3 text-white" /> : <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>

                      <div className="bg-slate-900 border border-white/5 hover:border-white/20 transition-colors duration-300 rounded-2xl p-5 shadow-lg group">
                        <div className="flex flex-wrap justify-between items-start gap-4 mb-3">
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h4 className="font-semibold text-white group-hover:text-cyan-400 transition-colors">{record.type}</h4>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-slate-300 border border-white/10">{record.id}</span>
                            </div>
                            <p className="text-sm text-slate-400">{record.date}</p>
                          </div>
                          
                          <div className={`px-3 py-1 rounded-full text-xs font-bold border ${isDetected ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                            {record.status}
                          </div>
                        </div>

                        <div className="bg-white/[0.02] rounded-xl p-3 border border-white/[0.03]">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-slate-400">Analysis Details</span>
                            <span className="text-xs font-mono text-white">Confidence: {record.confidence.toFixed(1)}%</span>
                          </div>
                          <p className="text-sm text-slate-300">{record.details}</p>
                        </div>
                        
                        <div className="mt-3 flex justify-end">
                          <button className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-purple-400 hover:scale-105 transition-all duration-300 font-medium">
                            <FileText className="w-3.5 h-3.5" /> View Full Report
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>

            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Results() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  )
}
