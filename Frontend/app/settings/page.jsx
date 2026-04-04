"use client";

import Card from '../../components/Card';
import { Settings, User, BellRing, Shield, Database, Monitor } from 'lucide-react';
import { useState } from 'react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">System Settings</h2>
        <p className="text-slate-400">Manage your profile, preferences, and system integrations.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Settings Navigation */}
        <Card className="w-full md:w-64 shrink-0 flex flex-col overflow-hidden">
          {[
            { id: 'general', icon: Settings, label: 'General' },
            { id: 'account', icon: User, label: 'Account Profile' },
            { id: 'notifications', icon: BellRing, label: 'Notifications' },
            { id: 'security', icon: Shield, label: 'Security & Privacy' },
            { id: 'database', icon: Database, label: 'Data Management' },
            { id: 'display', icon: Monitor, label: 'Display Settings' },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors text-left ${activeTab === tab.id ? 'bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-400' : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border-l-2 border-transparent'}`}
              >
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            )
          })}
        </Card>

        {/* Settings Content Area */}
        <Card className="flex-1 p-8 w-full">
          <div className="animate-in fade-in zoom-in-95 duration-200">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white border-b border-white/10 pb-4 mb-6">General System Preferences</h3>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white text-sm">Automatic Patient Sync</p>
                    <p className="text-xs text-slate-400 mt-1">Keep patient lists updated instantly using mock WebSockets.</p>
                  </div>
                  <div className="w-10 h-5 bg-cyan-500 rounded-full relative cursor-pointer shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                    <div className="absolute top-1 right-1 w-3 h-3 bg-white rounded-full"></div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white text-sm">Enable AI Explainability (Grad-CAM)</p>
                    <p className="text-xs text-slate-400 mt-1">Generate deep learning heatmaps for all uploaded MRI scans.</p>
                  </div>
                  <div className="w-10 h-5 bg-cyan-500 rounded-full relative cursor-pointer shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                    <div className="absolute top-1 right-1 w-3 h-3 bg-white rounded-full"></div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white text-sm">Strict Diagnostic Thresholds</p>
                    <p className="text-xs text-slate-400 mt-1">Require 98%+ confidence for automated 'Detected' status.</p>
                  </div>
                  <div className="w-10 h-5 bg-slate-700 rounded-full relative cursor-pointer">
                    <div className="absolute top-1 left-1 w-3 h-3 bg-slate-400 rounded-full"></div>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10 flex justify-end">
                  <button className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-cyan-950 font-bold rounded-lg transition-colors text-sm">
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {activeTab !== 'general' && (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <Settings className="w-12 h-12 text-slate-700 mb-4 animate-[spin_4s_linear_infinite]" />
                <h4 className="text-lg font-semibold text-slate-300">Section Under Construction</h4>
                <p className="text-sm text-slate-500 mt-2 max-w-sm">
                  The {activeTab} settings panel is currently being developed for the production backend release.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
