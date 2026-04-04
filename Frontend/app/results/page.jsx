"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle2, AlertTriangle, Download, Share2, Clock, FileText, Brain, UploadCloud, AlertCircle, ImageIcon, Activity, HeartPulse, Stethoscope } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useEffect, useState, Suspense, useMemo } from 'react';
import ECard from '../../components/ECard.jsx';
import { getPatient, savePatient } from '../../lib/store';
import { predictMRI, getReportURL } from '../../lib/api';

function DashboardContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [patient, setPatient] = useState(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [organType, setOrganType] = useState('brain');

  // Build chart data from ALL history records, sorted chronologically
  const chartData = useMemo(() => {
    if (!patient?.history) return [];
    return [...patient.history]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((record, idx) => {
        const hasRealSize = record.tumor_size > 0;
        const isDetected = record.status === 'Detected';
        // Real size wins; for old Detected records without size, scale confidence as proxy
        const tumor_size = isDetected
          ? (hasRealSize ? parseFloat(record.tumor_size.toFixed(2)) : parseFloat(((record.confidence || 0) * 8).toFixed(2)))
          : 0;
        return {
          label: `Scan ${idx + 1}`,
          date: record.date,
          tumor_size,
          isEstimated: isDetected && !hasRealSize,
          status: record.status,
        };
      });
  }, [patient?.history]);

  // Derive step-by-step clinical insights from chart data
  const insights = useMemo(() => {
    if (!chartData || chartData.length === 0) return null;

    const detected = chartData.filter(d => d.status === 'Detected');
    const detectionRate = Math.round((detected.length / chartData.length) * 100);
    const peak = detected.reduce((max, d) => d.tumor_size > max.tumor_size ? d : max, detected[0] || { tumor_size: 0 });
    const latestStatus = chartData[chartData.length - 1]?.status;

    // Step-by-step analysis: compare each detected scan to the previous one
    const steps = [];
    for (let i = 1; i < detected.length; i++) {
      const prev = detected[i - 1];
      const curr = detected[i];
      if (prev.tumor_size > 0) {
        const pct = parseFloat((((curr.tumor_size - prev.tumor_size) / prev.tumor_size) * 100).toFixed(1));
        steps.push({
          from: prev.label, to: curr.label,
          fromDate: prev.date, toDate: curr.date,
          change: pct,
          direction: pct > 5 ? 'up' : pct < -5 ? 'down' : 'stable',
        });
      }
    }

    const upSteps = steps.filter(s => s.direction === 'up').length;
    const downSteps = steps.filter(s => s.direction === 'down').length;
    const latestStep = steps[steps.length - 1] || null;
    const biggestJump = steps.reduce((max, s) => Math.abs(s.change) > Math.abs(max.change) ? s : max, steps[0] || { change: 0 });

    // Overall trend: weight the most recent step double
    let trendScore = upSteps - downSteps;
    if (latestStep?.direction === 'up') trendScore += 1;
    if (latestStep?.direction === 'down') trendScore -= 1;

    let trend = 'stable', trendColor = 'text-amber-400';
    if (trendScore > 0) { trend = 'growing'; trendColor = 'text-red-400'; }
    else if (trendScore < 0) { trend = 'shrinking'; trendColor = 'text-emerald-400'; }

    // Build step-by-step summary
    let summary = '';
    if (detected.length === 0) {
      summary = 'No tumor activity detected across all scans. Patient appears clear — routine follow-up recommended.';
    } else if (latestStatus === 'Not Detected') {
      summary = 'Tumor was previously detected but the latest scan shows no activity. Continued monitoring advised to confirm remission.';
    } else if (steps.length === 0) {
      summary = 'Only one detected scan available. Upload more scans to track growth over time.';
    } else {
      const stepDesc = steps.map(s =>
        `${s.from}→${s.to}: ${s.change > 0 ? '+' : ''}${s.change}%`
      ).join(', ');
      const recentNote = latestStep
        ? `Most recent change (${latestStep.from} → ${latestStep.to}): ${latestStep.change > 0 ? '+' : ''}${latestStep.change}%.`
        : '';
      const biggestNote = biggestJump?.change !== 0
        ? ` Largest single step: ${biggestJump.from} → ${biggestJump.to} (${biggestJump.change > 0 ? '+' : ''}${biggestJump.change}%).`
        : '';
      if (trend === 'growing') {
        summary = `Tumor is growing — ${upSteps} of ${steps.length} scan steps show increase. ${recentNote}${biggestNote} Immediate clinical review recommended.`;
      } else if (trend === 'shrinking') {
        summary = `Positive response — ${downSteps} of ${steps.length} scan steps show reduction. ${recentNote}${biggestNote} Continue current treatment protocol.`;
      } else {
        summary = `Tumor size is stable across ${steps.length} step(s). ${recentNote}${biggestNote} Regular monitoring advised.`;
      }
    }

    return { detectionRate, peak, trend, trendColor, steps, summary, detectedCount: detected.length, totalCount: chartData.length, latestStatus, latestStep };
  }, [chartData]);

  useEffect(() => {
    if (id) {
      const p = getPatient(id);
      if (p) setPatient(p);
    }
  }, [id]);

  const handleNewScan = async (file) => {
    if (!patient || !file) return;
    setUploadError(null);
    setIsUploading(true);
    setUploadProgress(10);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => (prev < 85 ? prev + Math.random() * 8 : prev));
      }, 600);

      const result = await predictMRI(patient.id, file, organType);
      clearInterval(progressInterval);
      setUploadProgress(100);

      const status = result.tumor_detected ? 'Detected' : 'Not Detected';
      const newDate = new Date().toISOString().split('T')[0];

      const updatedPatient = {
        ...patient,
        status,
        confidence: result.confidence * 100,
        lastScanDate: newDate,
        history: [
          ...patient.history,
          {
            id: result.scan_id,
            date: newDate,
            type: `${organType.charAt(0).toUpperCase() + organType.slice(1)} MRI`,
            status,
            confidence: result.confidence * 100,
            details: result.explanation,
            heatmap_url: result.heatmap_url,
            mri_image_url: result.mri_image_url,
            tumor_size: result.tumor_size,
            growth_trend: result.growth_trend
          }
        ]
      };

      savePatient(updatedPatient);
      setPatient(updatedPatient);
      setIsUploading(false);
      setUploadProgress(0);
    } catch (err) {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadError(err.message || 'Upload failed. Please try again.');
    }
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
                    className="flex flex-col gap-3"
                  >
                    {/* Organ Selector */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1">
                        <Stethoscope className="w-3 h-3" /> Scan Type
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          id="dash-organ-brain-btn"
                          onClick={() => setOrganType('brain')}
                          className={`flex items-center gap-1.5 justify-center px-3 py-2 rounded-lg border text-xs font-semibold transition-all duration-200 ${
                            organType === 'brain'
                              ? 'bg-purple-600/20 border-purple-500/50 text-purple-300'
                              : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                          }`}
                        >
                          <Brain className="w-3 h-3" /> Brain MRI
                        </button>
                        <button
                          id="dash-organ-breast-btn"
                          onClick={() => setOrganType('breast')}
                          className={`flex items-center gap-1.5 justify-center px-3 py-2 rounded-lg border text-xs font-semibold transition-all duration-200 ${
                            organType === 'breast'
                              ? 'bg-pink-600/20 border-pink-500/50 text-pink-300'
                              : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                          }`}
                        >
                          <HeartPulse className="w-3 h-3" /> Breast Scan
                        </button>
                      </div>
                    </div>
                    {/* Upload Button */}
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="w-full flex flex-col items-center justify-center gap-2 py-6 bg-white/5 hover:bg-white/10 border-2 border-dashed border-white/20 hover:border-cyan-400/50 rounded-2xl text-white transition-all group shadow-lg relative overflow-hidden"
                    >
                      <input
                        type="file"
                        accept=".dcm,.jpg,.jpeg,.png"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        onClick={(e) => { e.target.value = null; }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleNewScan(file);
                        }}
                      />
                      <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 group-hover:scale-110 transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] pointer-events-none">
                        <UploadCloud className="w-6 h-6 text-cyan-400 pointer-events-none" />
                      </div>
                      <span className="font-medium mt-2 pointer-events-none">Upload New {organType === 'brain' ? 'Brain' : 'Breast'} Scan</span>
                      <span className="text-xs text-slate-400 pointer-events-none">JPG / PNG / DICOM</span>
                    </motion.div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="uploading-state"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="w-full p-6 bg-slate-900 border border-white/10 rounded-2xl flex flex-col items-center justify-center text-center shadow-inner"
                  >
                    {organType === 'breast'
                      ? <HeartPulse className="w-10 h-10 text-pink-400 animate-pulse mb-4" />
                      : <Brain className="w-10 h-10 text-purple-400 animate-pulse mb-4" />
                    }
                    <div className="w-full flex justify-between text-xs mb-2 text-slate-300 font-mono">
                      <span>Analyzing {organType === 'breast' ? 'Breast' : 'Brain'} Scan...</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          organType === 'breast'
                            ? 'bg-gradient-to-r from-pink-500 to-rose-500'
                            : 'bg-gradient-to-r from-blue-500 to-purple-500'
                        }`}
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-3">Running {organType.charAt(0).toUpperCase() + organType.slice(1)} AI pipeline...</p>
                  </motion.div>
                )}
              </AnimatePresence>
              {uploadError && (
                <div className="mt-3 flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Scan History & Insights */}
          <div className="lg:col-span-2 flex flex-col gap-8">

            {/* Tumor Growth Graph */}
            <motion.div
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
              className="bg-white/5 border border-white/10 rounded-3xl p-6 lg:p-8 backdrop-blur-md"
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                <h3 className="font-semibold text-xl text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-400" />
                  Tumor Growth Tracker
                </h3>
                <span className="text-xs font-mono text-slate-400 bg-slate-900/50 px-3 py-1 rounded-full border border-white/5">Size in mm²</span>
              </div>
              <div className="h-64 w-full">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis
                        dataKey="label"
                        stroke="rgba(255,255,255,0.3)"
                        fontSize={11}
                        tickMargin={10}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="rgba(192,132,252,0.4)"
                        fontSize={11}
                        axisLine={false}
                        tickLine={false}
                        unit=" mm²"
                        width={60}
                        domain={[0, 'auto']}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }}
                        labelStyle={{ color: '#94a3b8', marginBottom: '6px', fontSize: '12px' }}
                        cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 2 }}
                        formatter={(value, name, props) => {
                          const isEst = props?.payload?.isEstimated;
                          return [`${value} mm²${isEst ? ' (est.)' : ''}`, 'Tumor Size'];
                        }}
                        labelFormatter={(label, payload) => {
                          const entry = payload?.[0]?.payload;
                          return entry ? `${entry.label} · ${entry.date} · ${entry.status}` : label;
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="tumor_size"
                        stroke="#c084fc"
                        strokeWidth={3}
                        dot={(props) => {
                          const { cx, cy, payload } = props;
                          const color = payload.status === 'Detected' ? '#f87171' : '#34d399';
                          return <circle key={`dot-${props.index}`} cx={cx} cy={cy} r={5} fill="#0f172a" stroke={color} strokeWidth={2.5} />;
                        }}
                        activeDot={{ r: 7, fill: '#c084fc', stroke: '#0f172a', strokeWidth: 2 }}
                        name="Tumor Size"
                        animationDuration={1200}
                        animationEasing="ease-out"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-500">
                    <Activity className="w-8 h-8 opacity-30" />
                    <p className="text-sm">No timeline data yet — upload an MRI to begin tracking.</p>
                  </div>
                )}
              </div>

              {/* Insights Section */}
              {insights && (
                <div className="mt-6 space-y-4">
                  {/* Stat Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-900/60 rounded-xl p-3 border border-white/5">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Detection Rate</p>
                      <p className="text-xl font-bold text-white font-mono">{insights.detectionRate}%</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{insights.detectedCount}/{insights.totalCount} scans</p>
                    </div>
                    <div className="bg-slate-900/60 rounded-xl p-3 border border-white/5">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Peak Size</p>
                      <p className="text-xl font-bold text-white font-mono">{insights.peak?.tumor_size ?? 0} <span className="text-xs text-slate-400">mm²</span></p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{insights.peak?.date || '—'}</p>
                    </div>
                    <div className="bg-slate-900/60 rounded-xl p-3 border border-white/5">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Growth Trend</p>
                      <p className={`text-xl font-bold font-mono capitalize ${insights.trendColor}`}>{insights.trend}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {insights.latestStep
                          ? `Last step: ${insights.latestStep.change > 0 ? '+' : ''}${insights.latestStep.change}%`
                          : insights.detectedCount >= 2 ? `${insights.steps?.length ?? 0} step(s) tracked` : 'Need more scans'}
                      </p>
                    </div>
                  </div>

                  {/* Summary Banner */}
                  <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${insights.trend === 'growing' ? 'bg-red-500/5 border-red-500/20 text-red-300'
                      : insights.trend === 'shrinking' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                        : insights.detectedCount === 0 ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/5 border-amber-500/20 text-amber-300'
                    }`}>
                    <Brain className="w-4 h-4 mt-0.5 shrink-0" />
                    <p className="leading-relaxed">
                      <span className="font-semibold">AI Insight: </span>{insights.summary}
                    </p>
                  </div>
                </div>
              )}
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
                          {record.tumor_size > 0 && (
                            <p className="text-xs text-slate-400 mt-1">Tumor Size: {record.tumor_size.toFixed(2)} mm²</p>
                          )}
                          {record.growth_trend && record.growth_trend !== "No History" && (
                            <p className={`text-xs mt-1 font-bold ${record.growth_trend.includes('Increase') ? 'text-red-400'
                                : record.growth_trend.includes('Decrease') ? 'text-emerald-400'
                                  : 'text-amber-400'
                              }`}>
                              Growth Trend: {record.growth_trend}
                            </p>
                          )}
                        </div>

                        {/* Heatmap & MRI Images */}
                        {(record.heatmap_url || record.mri_image_url) && (
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            {record.mri_image_url && (
                              <div className="rounded-xl overflow-hidden border border-white/10">
                                <p className="text-[10px] text-slate-400 px-2 pt-1 pb-0.5 flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Original MRI</p>
                                <img src={record.mri_image_url} alt="MRI Scan" className="w-full object-cover" />
                              </div>
                            )}
                            {record.heatmap_url && (
                              <div className="rounded-xl overflow-hidden border border-white/10">
                                <p className="text-[10px] text-slate-400 px-2 pt-1 pb-0.5 flex items-center gap-1"><Brain className="w-3 h-3" /> AI Diagnostic Heatmap</p>
                                <img src={record.heatmap_url} alt="AI Heatmap" className="w-full object-cover" />
                              </div>
                            )}
                          </div>
                        )}

                        <div className="mt-3 flex justify-end">
                          {record.id?.startsWith('SCAN_') ? (
                            <a
                              href={getReportURL(record.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-purple-400 hover:scale-105 transition-all duration-300 font-medium"
                            >
                              <FileText className="w-3.5 h-3.5" /> Download PDF Report
                            </a>
                          ) : (
                            <span className="text-xs text-slate-600">No report available</span>
                          )}
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
