"use client";

import { useEffect, useState } from 'react';
import { getPatients } from '../lib/store';
import { Activity, Users, FileSearch, ArrowRight, Brain, HeartPulse } from 'lucide-react';
import Link from 'next/link';
import Card from '../components/Card';
import { motion } from 'framer-motion';

export default function DashboardOverview() {
  const [patients, setPatients] = useState([]);
  const [stats, setStats] = useState({ total: 0, detected: 0, recent: 0 });

  useEffect(() => {
    const data = getPatients();
    setPatients(data.reverse()); // latest first

    const total = data.length;
    const detected = data.filter(p => p.history?.some(h => h.status === 'Detected')).length;
    const recent = data.filter(p => {
      const lastScan = new Date(p.lastScanDate);
      const now = new Date();
      return (now - lastScan) / (1000 * 60 * 60 * 24) < 7; // Within 7 days
    }).length;

    setStats({ total, detected, recent });
  }, []);

  const statCards = [
    { title: 'Total Patients', value: stats.total, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { title: 'Recent Scans (7d)', value: stats.recent, icon: FileSearch, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { title: 'Anomalies Detected', value: stats.detected, icon: Activity, color: 'text-red-400', bg: 'bg-red-500/10' },
  ];

  return (
    <div className="space-y-6">

      {/* Welcome Banner */}
      <Card className="bg-gradient-to-r from-blue-900/40 via-purple-900/40 to-slate-900/50 p-8 border-none relative">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-400/20 via-transparent to-transparent pointer-events-none" />
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Dashboard</h2>
        <p className="text-slate-300 max-w-xl">
          Here is what's happening with your patients today. You have {stats.recent} recent scans requiring review.
        </p>
        <div className="mt-6 flex gap-4">
          <Link href="/upload" className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition-colors flex items-center gap-2">
            Upload New Scan <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} key={stat.title}>
              <Card className="p-6 flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${stat.bg}`}>
                  <Icon className={`w-7 h-7 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-400">{stat.title}</p>
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Recent Patients Table */}
      <h3 className="text-xl font-bold text-white mt-8 mb-4">Recent Patients</h3>
      <Card className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-sm font-semibold text-slate-400 bg-white/5">
              <th className="p-4">Patient Info</th>
              <th className="p-4 hidden sm:table-cell">ID</th>
              <th className="p-4">Latest Scan</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {patients.slice(0, 5).map((patient) => {
              const hasTumor = patient.status === 'Detected';
              const lastScanType = patient.history?.[patient.history.length - 1]?.type || 'N/A';

              return (
                <tr key={patient.id} className="hover:bg-white/5 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-slate-300 font-bold">
                        {patient.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-white group-hover:text-cyan-400 transition-colors">{patient.name}</p>
                        <p className="text-xs text-slate-500">{patient.age} yrs</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 hidden sm:table-cell text-sm text-slate-400 font-mono tracking-wide">
                    {patient.id}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      {lastScanType.includes('Brain') ? <Brain className="w-4 h-4 text-purple-400" /> : <HeartPulse className="w-4 h-4 text-pink-400" />}
                      <div className="flex flex-col">
                        <span>{lastScanType}</span>
                        <span className="text-xs text-slate-500">{patient.lastScanDate}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${hasTumor
                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                      {patient.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <Link href={`/results?id=${patient.id}`} className="inline-flex items-center justify-center px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors">
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
            {patients.length === 0 && (
              <tr>
                <td colSpan="5" className="p-8 text-center text-slate-400">
                  No patients found. Click 'Upload New Scan' to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {patients.length > 5 && (
          <div className="p-4 border-t border-white/5 text-center">
            <Link href="/history" className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
              View All Patients →
            </Link>
          </div>
        )}
      </Card>

    </div>
  );
}
