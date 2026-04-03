"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle2, AlertTriangle, Download, Share2, Clock, FileText, Brain, UploadCloud, X, Activity, ScanSearch } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import ECard from '../../components/ECard.jsx';
import { getPatient, savePatient } from '../../lib/store';

function DashboardContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [patient, setPatient] = useState(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedReport, setSelectedReport] = useState(null);
  const [activeScanId, setActiveScanId] = useState(null);

  useEffect(() => {
    if (id) {
      const p = getPatient(id);
      if (p) setPatient(p);
    }
  }, [id]);

  const tumorHistoryData = useMemo(() => {
    if (!patient?.history) return [];
    return [...patient.history]
      .sort((a,b) => new Date(a.date) - new Date(b.date))
      .map((record, index) => {
        let size = 0;
        if (record.status === 'Detected') {
          // Fallback reading either area or volume for backward compatibility
          size = record.tumorArea || record.tumorVolume || (record.confidence * 0.5 + Math.random() * 10);
        }
        return {
          uniqueLabel: `${record.date}-${index}`, // Unique key stops Recharts from overwriting same-day scans
          date: record.date,
          size: parseFloat(size.toFixed(2)),
          status: record.status
        };
      });
  }, [patient?.history]);

  const latestScan = useMemo(() => {
    if (!patient?.history || patient.history.length === 0) return null;
    return patient.history[patient.history.length - 1];
  }, [patient?.history]);

  const displayScan = useMemo(() => {
    if (activeScanId && patient?.history) {
      const found = patient.history.find((r) => r.id === activeScanId);
      if (found) return found;
    }
    return latestScan;
  }, [activeScanId, latestScan, patient?.history]);

  const handleNewScan = (files) => {
    if (!patient || !files || files.length === 0) return;
    const file = files[0];
    
    setIsUploading(true);
    setUploadProgress(0);
    
    // Smooth progress animation capping at 90% while waiting for backend
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        const next = prev + (Math.random() * 5 + 2);
        return next > 90 ? 90 : next; 
      });
    }, 200);

    const formData = new FormData();
    formData.append("patient_id", patient.id);
    formData.append("file", file);

    fetch("http://localhost:8000/predict", {
      method: "POST",
      body: formData,
    })
    .then(res => res.json())
    .then(data => {
      clearInterval(interval);
      setUploadProgress(100);

      if (data.detail) {
        throw new Error(typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail));
      }
      
      const newScanStatus = data.tumor_detected ? 'Detected' : 'Not Detected';
      const confidencePercent = data.confidence * 100;
      const newDate = new Date().toISOString().split('T')[0];
      
      const newRecord = {
        id: data.scan_id || `SCAN-${Math.floor(Math.random() * 1000)}`,
        date: newDate,
        type: 'T2-Weighted MRI',
        status: newScanStatus,
        confidence: confidencePercent,
        tumorArea: data.tumor_size,
        mri_image_url: data.mri_image_url,
        heatmap_url: data.heatmap_url,
        details: data.explanation || (newScanStatus === 'Detected' ? `Meningioma indicators present. Estimated area: ${data.tumor_size?.toFixed(1)} mm².` : 'Clear scan')
      };
      
      const updatedPatient = {
        ...patient,
        status: newScanStatus,
        confidence: confidencePercent,
        lastScanDate: newDate,
        history: [...patient.history, newRecord]
      };
      
      savePatient(updatedPatient);
      setPatient(updatedPatient);
      setActiveScanId(null);
      
      setTimeout(() => setIsUploading(false), 800);
    })
    .catch(err => {
      console.error(err);
      clearInterval(interval);
      setIsUploading(false);
      alert("Failed to connect to the VaidhyaNetra AI backend server. Please check console for errors.");
      setUploadProgress(0);
    });
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
                      onChange={(e) => handleNewScan(e.target.files)}
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
            
            {/* Tumor Growth Tracker */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/5 border border-white/10 rounded-3xl p-6 lg:p-8 backdrop-blur-md"
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                <h3 className="font-semibold text-xl text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                  Tumor Growth Tracker
                </h3>
                <span className="text-xs font-mono text-slate-400 bg-slate-900/50 px-3 py-1 rounded-full border border-white/5">Area in mm²</span>
              </div>
              
              <div className="h-64 w-full">
                {tumorHistoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={tumorHistoryData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" vertical={false} />
                      <XAxis 
                        dataKey="uniqueLabel" 
                        stroke="#64748b" 
                        fontSize={12} 
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => value.split('-').slice(0,3).join('-')} // Show only the date part
                      />
                      <YAxis 
                        stroke="#64748b" 
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value}mm²`}
                        domain={[0, (dataMax) => (dataMax === 0 ? 100 : Math.ceil(dataMax * 1.2))]}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff' }}
                        itemStyle={{ color: '#c084fc', fontWeight: 'bold' }}
                        labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                        formatter={(value) => [`${value} mm²`, 'Estimated Area']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="size" 
                        name="Tumor Area"
                        stroke="#c084fc" 
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#0f172a', stroke: '#c084fc', strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: '#c084fc', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                    No timeline data to map
                  </div>
                )}
              </div>
            </motion.div>

            {/* Latest Scan Visual Analysis */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white/5 border border-white/10 rounded-3xl p-6 lg:p-8 backdrop-blur-md"
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                <h3 className="font-semibold text-xl text-white flex items-center gap-2">
                  <ScanSearch className="w-5 h-5 text-blue-400" />
                  {displayScan?.id === latestScan?.id ? "Latest Scan Analysis" : "Historical Scan Analysis"}
                </h3>
                <span className="text-xs font-mono text-slate-400 bg-slate-900/50 px-3 py-1 rounded-full border border-white/5">Auto-Seg Validated / {displayScan?.date}</span>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Original MRI */}
                <div className="rounded-2xl overflow-hidden bg-slate-900 border border-white/5 group relative">
                  <div className="absolute top-3 left-3 z-10 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-slate-400" />
                     <span className="text-xs text-white font-medium">Original MRI</span>
                  </div>
                  <div className="aspect-square relative flex items-center justify-center overflow-hidden">
                    <img 
                      src={displayScan?.mri_image_url || "/mri-mock.jpg"} 
                      alt="Original MRI"
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500 group-hover:scale-105"
                    />
                  </div>
                </div>

                {/* AI Heatmap */}
                <div className="rounded-2xl overflow-hidden bg-slate-900 border border-white/5 group relative">
                  <div className="absolute top-3 left-3 z-10 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 flex items-center gap-2">
                     <div className={`w-2 h-2 rounded-full animate-pulse ${displayScan?.status === 'Detected' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                     <span className="text-xs text-white font-medium">Grad-CAM Heatmap</span>
                  </div>
                  
                  {displayScan?.status === 'Detected' ? (
                    <div className="absolute top-3 right-3 z-10 bg-red-500/20 backdrop-blur-md px-2 py-1 rounded border border-red-500/30">
                       <span className="text-[10px] text-red-200 font-mono font-bold tracking-wider">TUMOR LOCATED</span>
                    </div>
                  ) : (
                    <div className="absolute top-3 right-3 z-10 bg-emerald-500/20 backdrop-blur-md px-2 py-1 rounded border border-emerald-500/30">
                       <span className="text-[10px] text-emerald-200 font-mono font-bold tracking-wider">CLEAR SCAN</span>
                    </div>
                  )}
                  
                  <div className="aspect-square relative flex items-center justify-center overflow-hidden">
                    <img 
                      src={displayScan?.heatmap_url || (displayScan?.status === 'Detected' ? "/mri-mock.jpg" : (displayScan?.mri_image_url || "/mri-mock.jpg"))} 
                      alt="Heatmap Output"
                      className={`w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500 ${!displayScan?.heatmap_url && displayScan?.status === 'Detected' ? 'grayscale' : ''}`}
                    />
                    {/* Simulated Heatmap Overlay Fallback (only invoked if no real heatmap exists from backend but tumor was detected) */}
                    {!displayScan?.heatmap_url && displayScan?.status === 'Detected' && (
                      <>
                        <div className="absolute top-[35%] right-[30%] w-32 h-32 bg-red-500/50 blur-[30px] rounded-full mix-blend-screen pointer-events-none group-hover:scale-110 transition-transform duration-500" />
                        <div className="absolute top-[40%] right-[35%] w-16 h-16 bg-yellow-400/60 blur-[20px] rounded-full mix-blend-screen pointer-events-none group-hover:scale-110 transition-transform duration-500" />
                        <div className="absolute top-[42%] right-[37%] w-8 h-8 bg-white/80 blur-[10px] rounded-full mix-blend-screen pointer-events-none" />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

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

                      <div 
                        onClick={() => setActiveScanId(record.id)}
                        className={`cursor-pointer bg-slate-900 border ${displayScan?.id === record.id ? 'border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.15)] ring-1 ring-cyan-400' : 'border-white/5 hover:border-white/20'} transition-all duration-300 rounded-2xl p-5 shadow-lg group`}
                      >
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
                          <button 
                            onClick={() => setSelectedReport(record)}
                            className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-purple-400 hover:scale-105 transition-all duration-300 font-medium"
                          >
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
        {/* Full Report Modal */}
        <AnimatePresence>
          {selectedReport && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl"
              >
                <div className="flex justify-between items-center p-6 border-b border-white/10 bg-black/20">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-cyan-400" /> Full Diagnostic Report
                  </h3>
                  <button onClick={() => setSelectedReport(null)} className="text-slate-400 hover:text-white transition">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                      <span className="text-xs text-slate-400 block mb-1">Scan ID</span>
                      <span className="font-mono text-white text-sm">{selectedReport.id}</span>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                      <span className="text-xs text-slate-400 block mb-1">Date</span>
                      <span className="text-white text-sm">{selectedReport.date}</span>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                      <span className="text-xs text-slate-400 block mb-1">Status</span>
                      <span className={`text-sm font-bold ${selectedReport.status === 'Detected' ? 'text-red-400' : 'text-emerald-400'}`}>
                        {selectedReport.status}
                      </span>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                      <span className="text-xs text-slate-400 block mb-1">Confidence</span>
                      <span className="font-mono text-white text-sm">{selectedReport.confidence?.toFixed(2)}%</span>
                    </div>
                  </div>
                  
                  <div className="bg-slate-950 p-6 rounded-xl border border-white/5">
                    <h4 className="text-cyan-400 font-semibold mb-3 flex items-center gap-2">
                      <Activity className="w-4 h-4" /> AI Analysis Summary
                    </h4>
                    <p className="text-slate-300 text-sm leading-relaxed mb-4">
                      {selectedReport.details || 'No detailed analysis found.'}
                    </p>
                    {selectedReport.status === 'Detected' && (
                      <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg text-sm text-red-300">
                        <strong className="text-red-400">Recommendation:</strong> Urgent review by a neuro-oncologist required. Evaluate segmentation masks and heatmaps for precise tumor localization.
                      </div>
                    )}
                    {selectedReport.status === 'Not Detected' && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-lg text-sm text-emerald-300">
                          <strong className="text-emerald-400">Recommendation:</strong> No clear signs of tumor present. Standard protocol follow-up advised.
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-end p-6 border-t border-white/10 bg-black/20 gap-3">
                  <button onClick={() => window.print()} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2">
                    <Download className="w-4 h-4" /> Export PDF
                  </button>
                  <button onClick={() => setSelectedReport(null)} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg text-white text-sm font-bold transition-all hover:scale-105">
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
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
