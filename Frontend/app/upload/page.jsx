"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, Brain, HeartPulse, Stethoscope, AlertCircle, ScanSearch, UserPlus, QrCode } from 'lucide-react';
import { generatePatientId, savePatient, getPatient } from '../../lib/store';
import { predictMRI } from '../../lib/api';
import Card from '../../components/Card';
import PatientScanner from '../../components/PatientScanner';

export default function UploadPage() {
  const router = useRouter();

  // Mode Selection: 'new' or 'existing'
  const [patientMode, setPatientMode] = useState('new');

  // Registration states (for 'new' mode)
  const [regName, setRegName] = useState('');
  const [regAge, setRegAge] = useState('');
  
  // Selection states (for 'existing' mode)
  const [existingId, setExistingId] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  // Scan / Upload states
  const [organType, setOrganType] = useState('brain');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);

  const handlePatientScan = (scannedId) => {
    setExistingId(scannedId);
    setShowScanner(false);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validation based on mode
    if (patientMode === 'new' && (!regName.trim() || !regAge)) {
      setUploadError("Please enter Patient Name and Age before uploading a scan.");
      return;
    }
    if (patientMode === 'existing' && !existingId.trim()) {
      setUploadError("Please enter or scan an existing Patient ID.");
      return;
    }

    setUploadError(null);
    setIsUploading(true);
    setUploadProgress(10);

    try {
      let targetPatientId = '';
      let existingPatientRec = null;

      if (patientMode === 'existing') {
        existingPatientRec = getPatient(existingId);
        if (!existingPatientRec) {
          throw new Error(`Patient ID ${existingId} not found in the system.`);
        }
        targetPatientId = existingId;
      } else {
        targetPatientId = generatePatientId();
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => (prev < 85 ? prev + Math.random() * 8 : prev));
      }, 600);

      // Call API (backend unchanged)
      const result = await predictMRI(targetPatientId, file, organType);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      const status = result.tumor_detected ? 'Detected' : 'Not Detected';
      const newScanDate = new Date().toISOString().split('T')[0];
      const newHistoryItem = {
        id: result.scan_id,
        date: newScanDate,
        type: `${organType.charAt(0).toUpperCase() + organType.slice(1)} MRI`,
        status,
        confidence: result.confidence * 100,
        details: result.explanation,
        heatmap_url: result.heatmap_url,
        mri_image_url: result.mri_image_url,
        tumor_size: result.tumor_size,
        growth_trend: result.growth_trend // if present
      };

      if (patientMode === 'existing') {
        // Append to existing patient
        const updatedPatient = {
          ...existingPatientRec,
          status, // update latest status
          confidence: result.confidence * 100,
          lastScanDate: newScanDate,
          history: [...existingPatientRec.history, newHistoryItem]
        };
        savePatient(updatedPatient);
      } else {
        // Create new patient
        const newPatient = {
          id: targetPatientId,
          name: regName,
          age: parseInt(regAge, 10),
          status,
          confidence: result.confidence * 100,
          lastScanDate: newScanDate,
          history: [newHistoryItem]
        };
        savePatient(newPatient);
      }
      
      // Redirect to results
      setTimeout(() => router.push(`/results?id=${targetPatientId}`), 400);

    } catch (err) {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadError(err.message || 'Upload failed. Please try again.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Upload New Scan</h2>
        <p className="text-slate-400">Run an immediate AI assessment for a new or existing patient.</p>
      </div>

      <AnimatePresence mode="wait">
        {isUploading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-12"
          >
            <Card className="p-12 flex flex-col items-center justify-center text-center">
              <div className="relative mb-8">
                {organType === 'breast'
                  ? <HeartPulse className="w-20 h-20 text-pink-400 animate-pulse relative z-10" />
                  : <Brain className="w-20 h-20 text-purple-400 animate-pulse relative z-10" />
                }
                <div className="absolute inset-0 bg-cyan-500 blur-3xl opacity-20 animate-pulse" />
              </div>
              
              <div className="w-full max-w-md">
                <div className="flex justify-between text-sm mb-3 text-slate-300 font-mono tracking-widest uppercase">
                  <span>Analyzing {organType === 'breast' ? 'Breast' : 'Brain'} Scan...</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <div className="h-2.5 w-full bg-slate-900 border border-white/10 rounded-full overflow-hidden shadow-inner">
                  <div
                    className={`h-full transition-all duration-300 ease-out ${
                      organType === 'breast'
                        ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-pink-500'
                        : 'bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500'
                    }`}
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-slate-400 text-sm mt-6">Running VaidhyaNetra Neural Networks — please wait</p>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Patient Info Card */}
            <Card className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <ScanSearch className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">1. Patient Details</h3>
                </div>

                {/* Mode Toggles */}
                <div className="flex bg-slate-900 border border-white/5 rounded-xl p-1 shrink-0">
                  <button
                    onClick={() => { setPatientMode('new'); setUploadError(null); }}
                    className={`flex flex-1 items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      patientMode === 'new' 
                        ? 'bg-blue-500/20 text-blue-400 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <UserPlus className="w-4 h-4" /> New Patient
                  </button>
                  <button
                    onClick={() => { setPatientMode('existing'); setUploadError(null); }}
                    className={`flex flex-1 items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      patientMode === 'existing' 
                        ? 'bg-purple-500/20 text-purple-400 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <QrCode className="w-4 h-4" /> Existing ID
                  </button>
                </div>
              </div>
              
              {/* Conditional Content based on Mode */}
              {patientMode === 'new' ? (
                <div className="grid md:grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-200">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Patient Full Name</label>
                    <input
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Jane Doe"
                      className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Age</label>
                    <input
                      type="number"
                      value={regAge}
                      onChange={(e) => setRegAge(e.target.value)}
                      placeholder="e.g. 45"
                      className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-medium"
                    />
                  </div>
                </div>
              ) : (
                <div className="animate-in fade-in zoom-in-95 duration-200 space-y-4">
                  {showScanner ? (
                    <PatientScanner 
                      onScan={handlePatientScan} 
                      onCancel={() => setShowScanner(false)} 
                    />
                  ) : (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Select Patient ID</label>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={existingId}
                          onChange={(e) => setExistingId(e.target.value.toUpperCase())}
                          placeholder="e.g. VN-2026-1234"
                          className="flex-1 bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono tracking-widest"
                        />
                        <button
                          onClick={() => setShowScanner(true)}
                          className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl border border-white/5 transition-colors flex items-center justify-center gap-2 shrink-0"
                        >
                          <QrCode className="w-5 h-5" /> Scan QR
                        </button>
                      </div>
                      {existingId && getPatient(existingId) && (
                        <p className="text-sm text-emerald-400 mt-2 flex items-center gap-1.5">
                          ✔ Patient found: {getPatient(existingId).name}
                        </p>
                      )}
                      {existingId && !getPatient(existingId) && existingId.length > 5 && (
                        <p className="text-sm text-red-400 mt-2">
                          Patient ID not found in database.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Scan Setup Card */}
            <Card className="p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Stethoscope className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white">2. Organ &amp; Scan File</h3>
              </div>

              {uploadError && (
                <div className="mb-6 flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span className="text-sm font-medium">{uploadError}</span>
                </div>
              )}

              <div className="flex flex-col gap-6">
                {/* Organ Selector */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setOrganType('brain')}
                    className={`flex flex-col items-center gap-3 justify-center p-6 rounded-2xl border-2 transition-all duration-200 ${
                      organType === 'brain'
                        ? 'bg-purple-600/10 border-purple-500 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
                        : 'bg-slate-950/50 border-white/5 text-slate-400 hover:border-white/20 hover:text-white hover:bg-slate-900/80'
                    }`}
                  >
                    <Brain className={`w-8 h-8 ${organType === 'brain' ? 'text-purple-400' : ''}`} /> 
                    <span className="font-bold tracking-wide">Brain MRI</span>
                  </button>
                  <button
                    onClick={() => setOrganType('breast')}
                    className={`flex flex-col items-center gap-3 justify-center p-6 rounded-2xl border-2 transition-all duration-200 ${
                      organType === 'breast'
                        ? 'bg-pink-600/10 border-pink-500 text-pink-300 shadow-[0_0_20px_rgba(236,72,153,0.15)]'
                        : 'bg-slate-950/50 border-white/5 text-slate-400 hover:border-white/20 hover:text-white hover:bg-slate-900/80'
                    }`}
                  >
                    <HeartPulse className={`w-8 h-8 ${organType === 'breast' ? 'text-pink-400' : ''}`} /> 
                    <span className="font-bold tracking-wide">Breast Scan</span>
                  </button>
                </div>

                {/* Upload Button Area */}
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  className="w-full relative group"
                >
                  <input
                    type="file"
                    accept=".dcm,.jpg,.jpeg,.png"
                    onChange={handleUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    title="Click to select file"
                  />
                  <div className="border-2 border-dashed border-white/10 group-hover:border-cyan-500/50 rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-colors bg-slate-950/30 group-hover:bg-cyan-500/5">
                    <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg group-hover:shadow-cyan-500/20">
                      <UploadCloud className="w-8 h-8 text-cyan-400" />
                    </div>
                    <h4 className="text-xl font-bold text-white mb-2">Upload {organType === 'brain' ? 'Brain' : 'Breast'} Scan</h4>
                    <p className="text-sm text-slate-400 max-w-sm mb-6">Drag and drop a patient scan or click to browse. Supports DICOM, JPG, PNG formats.</p>
                    <div className="px-6 py-2.5 bg-slate-800 text-slate-200 text-sm font-bold rounded-full group-hover:bg-cyan-500 group-hover:text-cyan-950 transition-colors pointer-events-none">
                      Select File
                    </div>
                  </div>
                </motion.div>
                
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
