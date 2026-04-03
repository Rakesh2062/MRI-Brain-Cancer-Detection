"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, Activity, Brain, Zap, HeartPulse, FileText, Upload, ScanSearch, UserPlus, QrCode } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PatientScanner from "../components/PatientScanner";
import { generatePatientId, savePatient } from "../lib/store";

export default function Home() {
  const router = useRouter();
  
  // UI States
  const [viewState, setViewState] = useState('default'); // 'default', 'scanner', 'register', 'success'
  
  // Register States
  const [regName, setRegName] = useState('');
  const [regAge, setRegAge] = useState('');
  const [newPatientId, setNewPatientId] = useState('');
  
  // Upload States
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleScanSuccess = (patientId) => {
    router.push(`/results?id=${patientId}`);
  };

  const handleRegisterSubmit = () => {
    if (!regName || !regAge) return alert("Please fill name and age.");
    // Generate new patient record immediately
    const generatedId = generatePatientId();
    setNewPatientId(generatedId);
    setViewState('success');
  };

  const handleUploadAfterRegister = () => {
    setIsUploading(true);
    setUploadProgress(0);
    
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        const next = prev + Math.random() * 20;
        if (next >= 100) {
          clearInterval(interval);
          
          const mockResult = Math.random() > 0.5 ? 'Detected' : 'Not Detected';
          const mockConfidence = Math.random() * 20 + 80;
          
          const newPatient = {
            id: newPatientId,
            name: regName,
            age: parseInt(regAge, 10),
            status: mockResult,
            confidence: mockConfidence,
            lastScanDate: new Date().toISOString().split('T')[0],
            history: [
              {
                id: `SCAN-${Math.floor(Math.random() * 1000)}`,
                date: new Date().toISOString().split('T')[0],
                type: 'T2-Weighted MRI',
                status: mockResult,
                confidence: mockConfidence,
                details: mockResult === 'Detected' ? 'Meningioma indicators present' : 'Clear scan'
              }
            ]
          };
          
          savePatient(newPatient);
          setTimeout(() => router.push(`/results?id=${newPatientId}`), 400);
          return 100;
        }
        return next;
      });
    }, 400);
  };

  return (
    <div className="flex flex-col min-h-screen pt-20">
      
      {/* 1. HERO SECTION */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden px-4">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 bg-slate-950 -z-20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.03)_0%,transparent_70%)] -z-10" />
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/20 blur-[120px] rounded-full -z-10 pointer-events-none"
        />
        
        <div className="container mx-auto grid lg:grid-cols-2 gap-12 items-center z-10">
          {/* Left Text */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col gap-6 text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 w-fit mx-auto lg:mx-0 backdrop-blur-md">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium text-cyan-50">Next-Generation AI Diagnostic</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-tight text-white">
              AI-Powered <br/>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400">
                Brain Tumor Detection
              </span> <br/>
              From MRI Scans
            </h1>
            
            <p className="text-lg text-slate-400 max-w-xl mx-auto lg:mx-0">
              Upload an MRI scan to our high-accuracy AI platform and receive instant diagnostic insights. Engineered for precision and speed.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mt-4 justify-center lg:justify-start">
              <button 
                onClick={() => { document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' }); setViewState('scanner'); }} 
                className="px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 font-bold text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:shadow-[0_0_25px_rgba(168,85,247,0.6)] hover:scale-105 transition-all duration-300 flex items-center gap-2 justify-center"
              >
                <QrCode className="w-5 h-5" /> Scan / Register
              </button>
              <a href="#how-it-works" className="px-8 py-4 rounded-full bg-white/5 border border-white/10 font-bold text-white hover:bg-white/10 hover:scale-105 transition-all duration-300 backdrop-blur-md flex items-center gap-2 justify-center">
                 How It Works
              </a>
            </div>
          </motion.div>

          {/* Right Floating Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative lg:ml-auto w-full max-w-md mx-auto"
          >
            <motion.div 
              animate={{ y: [-10, 10, -10] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-[0_0_50px_rgba(168,85,247,0.15)]"
            >
              <div className="relative aspect-square rounded-xl bg-slate-900 border border-white/5 overflow-hidden flex items-center justify-center">
                <Brain className="w-32 h-32 text-slate-800" />
                
                {/* Mock Scan Overlay Effect */}
                <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Normal_axial_T2-weighted_MR_image_of_the_brain.jpg/640px-Normal_axial_T2-weighted_MR_image_of_the_brain.jpg')] bg-cover bg-center opacity-40 mix-blend-screen" />
                
                {/* AI Bounding Box Tracker */}
                <motion.div 
                  initial={{ opacity: 0, scale: 2 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1, duration: 1 }}
                  className="absolute top-1/3 right-1/3 w-24 h-24 border-2 border-red-500 rounded-lg shadow-[0_0_20px_rgba(239,68,68,0.5)] flex items-end justify-center pb-1"
                >
                  <span className="bg-red-500/80 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-md translate-y-4">Anomaly 98%</span>
                </motion.div>

                {/* HUD Elements */}
                <div className="absolute top-4 left-4 flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] text-green-400 font-mono">SYS.ONLINE</span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between px-2">
                <div>
                  <h4 className="text-white font-semibold flex items-center gap-2">T2-Weighted Axial</h4>
                  <p className="text-xs text-slate-400">Processing AI overlay...</p>
                </div>
                <Activity className="text-purple-400 w-5 h-5 mr-1" />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 2. HOW IT WORKS */}
      <section id="how-it-works" className="py-24 relative bg-slate-900 border-t border-white/5 overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[200px] bg-blue-600/10 blur-[100px] pointer-events-none" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-3xl lg:text-5xl font-bold text-white mb-4 tracking-tight">How It Works</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">From upload to complete analysis in under 10 seconds.</p>
          </div>

          <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-0 max-w-5xl mx-auto relative">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="flex-1 flex flex-col items-center text-center z-10">
              <div className="w-20 h-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mb-6 shadow-lg relative">
                <Upload className="w-8 h-8 text-blue-400" />
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold font-mono text-sm border-2 border-slate-900">1</div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Upload MRI</h3>
              <p className="text-slate-400 text-sm max-w-[250px]">Provide the patient scan through our secure platform.</p>
            </motion.div>
            <div className="hidden lg:block w-32 h-[2px] bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-cyan-500/50 relative top-[-40px]" />
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} className="flex-1 flex flex-col items-center text-center z-10">
              <div className="w-20 h-20 rounded-full bg-slate-800 border border-purple-500/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(168,85,247,0.2)] relative">
                <ScanSearch className="w-8 h-8 text-purple-400" />
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold font-mono text-sm border-2 border-slate-900">2</div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">AI Analysis</h3>
              <p className="text-slate-400 text-sm max-w-[250px]">Our deep learning model identifies patterns and anomalies.</p>
            </motion.div>
            <div className="hidden lg:block w-32 h-[2px] bg-gradient-to-r from-purple-500/50 to-cyan-500/50 relative top-[-40px]" />
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="flex-1 flex flex-col items-center text-center z-10">
              <div className="w-20 h-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mb-6 shadow-lg relative">
                <FileText className="w-8 h-8 text-cyan-400" />
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-cyan-600 text-white flex items-center justify-center font-bold font-mono text-sm border-2 border-slate-900">3</div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Get Results</h3>
              <p className="text-slate-400 text-sm max-w-[250px]">Review highly accurate diagnostic output and scores.</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 3. FEATURES SECTION */}
      <section id="features" className="py-24 relative z-10 bg-slate-950 border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 mb-4 tracking-tight">
              Platform Features
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Empowering clinics with state-of-the-art computer vision models for neuro-oncology.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "MRI Scan Upload", desc: "Securely drag & drop DICOM or standard image formats directly into our encrypted platform.", icon: UploadCloud, color: "text-blue-400" },
              { title: "AI Tumor Detection", desc: "Advanced neural networks instantly segment and highlight potential tumor boundaries.", icon: Brain, color: "text-purple-400" },
              { title: "Instant Insights", desc: "Receive immediate comprehensive diagnostic reports without hours of manual review.", icon: Zap, color: "text-yellow-400" },
              { title: "High Accuracy", desc: "Trained on millions of clinical scans to ensure top-tier sensitivity and specificity.", icon: HeartPulse, color: "text-red-400" }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                whileHover={{ y: -5, scale: 1.03 }}
                className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 hover:shadow-[0_0_30px_rgba(56,189,248,0.1)] transition-all duration-300"
              >
                <div className={`w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 ${feature.color}`}>
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed text-sm">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. DEMO SECTION (PATIENT E-CARD & SCANNER) */}
      <section id="demo" className="py-32 relative bg-slate-900 border-t border-white/5 min-h-[80vh] flex items-center">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-5xl font-bold text-white mb-4">Patient Portal Gateway</h2>
            <p className="text-slate-400 text-lg">Scan an existing E-Card or register a new patient to begin analysis.</p>
          </div>

          <motion.div 
            className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 lg:p-12 text-center shadow-[0_0_40px_rgba(0,0,0,0.3)] min-h-[400px] flex flex-col focus-within:ring-2 focus-within:ring-cyan-500/50 transition-all"
          >
            <AnimatePresence mode="wait">
              {viewState === 'default' && (
                <motion.div 
                  key="default"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col md:flex-row items-center justify-center gap-6 h-full flex-1 w-full"
                >
                  <button 
                    onClick={() => setViewState('scanner')}
                    className="w-full md:w-1/2 flex flex-col items-center justify-center p-12 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/50 rounded-2xl transition-all duration-300 group"
                  >
                    <div className="w-20 h-20 rounded-full bg-cyan-500/10 flex items-center justify-center mb-6 border border-cyan-500/20 group-hover:scale-110 shadow-lg group-hover:shadow-cyan-400/20 transition-all">
                      <ScanSearch className="w-10 h-10 text-cyan-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Scan E-Card</h3>
                    <p className="text-sm text-slate-400">Scan QR to load patient records instantly.</p>
                  </button>

                  <button 
                    onClick={() => setViewState('register')}
                    className="w-full md:w-1/2 flex flex-col items-center justify-center p-12 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-400/50 rounded-2xl transition-all duration-300 group"
                  >
                    <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center mb-6 border border-purple-500/20 group-hover:scale-110 shadow-lg group-hover:shadow-purple-400/20 transition-all">
                      <UserPlus className="w-10 h-10 text-purple-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">New Patient</h3>
                    <p className="text-sm text-slate-400">Register and upload initial MRI scan.</p>
                  </button>
                </motion.div>
              )}

              {viewState === 'scanner' && (
                <motion.div 
                  key="scanner"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="w-full max-w-lg mx-auto flex flex-col justify-center"
                >
                  <PatientScanner 
                    onScan={handleScanSuccess} 
                    onCancel={() => setViewState('default')} 
                  />
                  <div className="mt-8 border-t border-white/10 pt-8">
                    <p className="text-slate-400 text-sm mb-4">Don't have a card?</p>
                    <button 
                      onClick={() => setViewState('register')}
                      className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 hover:scale-105 hover:shadow-lg text-white rounded-full font-medium transition-all duration-300"
                    >
                      New User? Register
                    </button>
                  </div>
                </motion.div>
              )}

              {viewState === 'register' && (
                <motion.div 
                  key="register"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="w-full max-w-lg mx-auto flex flex-col flex-1"
                >
                  <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                    <h3 className="text-xl lg:text-2xl font-bold text-white text-left">Patient Registration</h3>
                    <button onClick={() => {setViewState('default'); setRegName(''); setRegAge('')}} className="text-slate-400 hover:text-white px-3 py-1 rounded-md bg-white/5 text-sm transition-colors">Cancel</button>
                  </div>

                  <div className="space-y-6 text-left flex-1 flex flex-col justify-center">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="text-xs text-slate-400 mb-1 block uppercase tracking-wider font-semibold">Full Name</label>
                        <input 
                          type="text" 
                          className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-colors" 
                          placeholder="John Doe"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-slate-400 mb-1 block uppercase tracking-wider font-semibold">Age</label>
                        <input 
                          type="number" 
                          className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-colors" 
                          placeholder="45"
                          value={regAge}
                          onChange={(e) => setRegAge(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <button 
                      onClick={handleRegisterSubmit}
                      className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white font-bold hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:scale-[1.02] transition-all"
                    >
                      Register Patient
                    </button>
                  </div>
                </motion.div>
              )}

              {viewState === 'success' && (
                <motion.div 
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="w-full max-w-lg mx-auto flex flex-col flex-1 pb-4"
                >
                  {/* Success Card */}
                  <motion.div 
                    initial={{ y: 20 }}
                    animate={{ y: 0 }}
                    className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-8 mb-8 text-center"
                  >
                    <div className="w-16 h-16 bg-emerald-500 flex items-center justify-center rounded-full mx-auto mb-4 shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                      <UserPlus className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">New Patient Detected</h3>
                    <p className="text-slate-400 text-sm mb-4">Patient profile successfully created pending scan.</p>
                    
                    <div className="bg-slate-900/80 px-4 py-3 rounded-xl border border-white/5 inline-block">
                      <span className="text-xs text-slate-400 block mb-1">Your Registration ID:</span>
                      <span className="text-xl font-mono font-bold text-emerald-400 tracking-wider shadow-emerald-400/20 drop-shadow-lg">{newPatientId}</span>
                    </div>
                  </motion.div>

                  {!isUploading ? (
                    <motion.div 
                      whileHover={{ scale: 1.01 }}
                      className="border-2 border-dashed border-white/20 hover:border-cyan-400/50 rounded-2xl p-8 text-center transition-colors cursor-pointer bg-white/5 relative group overflow-hidden" 
                    >
                      <input 
                        type="file" 
                        accept=".dcm,.jpg,.jpeg,.png"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleUploadAfterRegister();
                          }
                        }}
                      />
                      <UploadCloud className="w-10 h-10 text-cyan-400 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                      <h4 className="text-white font-medium mb-1">Upload Initial MRI Scan</h4>
                      <p className="text-xs text-slate-500 mb-6">Drag & Drop or Click to Select</p>
                      <button className="px-8 py-3 bg-white/10 group-hover:bg-cyan-500/20 rounded-full text-white font-medium transition-all text-sm pointer-events-none">
                        Select File
                      </button>
                    </motion.div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-8 py-10">
                      <Brain className="w-16 h-16 text-purple-400 animate-pulse" />
                      
                      <div className="w-full">
                        <div className="flex justify-between text-sm mb-2 text-slate-300 font-mono">
                          <span>Analyzing Scan...</span>
                          <span>{Math.round(uploadProgress)}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 ease-out" 
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                      <p className="text-slate-400 text-sm">Processing neural networks...</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

    </div>
  );
}
