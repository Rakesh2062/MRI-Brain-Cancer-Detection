"use client";

import { useEffect, useState, Suspense } from 'react';
import { getPatients } from '../../lib/store';
import { ClipboardList, ArrowUpRight, Search, Activity, User } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Card from '../../components/Card';

function HistoryContent() {
  const searchParams = useSearchParams();
  const queryQ = searchParams.get('q') || '';
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState(queryQ);

  useEffect(() => {
    setPatients(getPatients().reverse());
  }, []);

  // Update searchTerm if query param changes
  useEffect(() => {
    if (queryQ) setSearchTerm(queryQ);
  }, [queryQ]);

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3 mb-2">
            <ClipboardList className="w-8 h-8 text-cyan-400" /> Patient History
          </h2>
          <p className="text-slate-400">View and search through past patient analyses.</p>
        </div>
        
        <div className="relative">
          <Search className="w-5 h-5 text-slate-500 absolute left-3 top-3" />
          <input 
            type="text" 
            placeholder="Search by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-80 pl-10 pr-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-medium"
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900/80 border-b border-white/10">
              <tr>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Patient Name</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Patient ID</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Age</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Scans</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Latest Status</th>
                <th className="py-4 px-6 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredPatients.map((patient) => {
                const scanCount = patient.history?.length || 0;
                const hasTumor = patient.status === 'Detected';
                
                return (
                  <tr key={patient.id} className="hover:bg-white/5 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-slate-300">
                          <User className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-white group-hover:text-cyan-400 transition-colors">{patient.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 hidden sm:table-cell text-sm text-slate-400 font-mono tracking-wider">
                      {patient.id}
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-300">
                      {patient.age}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Activity className="w-4 h-4 text-purple-400" />
                        <span>{scanCount} {scanCount === 1 ? 'Scan' : 'Scans'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                        hasTumor 
                          ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {patient.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link href={`/results?id=${patient.id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/15 border border-white/10 text-white text-sm font-medium rounded-lg transition-colors">
                        View <ArrowUpRight className="w-4 h-4 text-slate-400" />
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {filteredPatients.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    No patients found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="text-white p-8">Loading...</div>}>
      <HistoryContent />
    </Suspense>
  );
}
