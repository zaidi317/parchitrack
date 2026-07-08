'use client';

import React, { useState } from 'react';
import { User, ShieldAlert, Sparkles, PlusCircle, RotateCcw, AlertCircle, RefreshCw } from 'lucide-react';

interface ProfileTabProps {
  myTokenNumber: number | null;
  setMyTokenNumber: (num: number) => void;
  triggerRefresh: () => void;
}

export default function ProfileTab({ myTokenNumber, setMyTokenNumber, triggerRefresh }: ProfileTabProps) {
  const [docStatus, setDocStatus] = useState<'Available' | 'Delayed'>('Delayed');
  const [patientNameInput, setPatientNameInput] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const runSimulatorAction = async (action: string, fetchCall: () => Promise<Response>) => {
    setActionLoading(action);
    setSuccessMsg('');
    try {
      const res = await fetchCall();
      if (res.ok) {
        setSuccessMsg(`${action} successful!`);
        triggerRefresh();
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        console.error('Simulator action failed');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleNextToken = () => {
    runSimulatorAction('Advance Queue', () =>
      fetch('http://localhost:8000/api/admin/next-token', { method: 'POST' })
    );
  };

  const handleAddPatient = () => {
    const nameParam = patientNameInput.trim() ? `?name=${encodeURIComponent(patientNameInput.trim())}` : '';
    runSimulatorAction('Add Patient', () =>
      fetch(`http://localhost:8000/api/admin/add-patient${nameParam}`, { method: 'POST' })
    );
    setPatientNameInput('');
  };

  const handleUpdateDoctor = (status: 'Available' | 'Delayed') => {
    setDocStatus(status);
    const query = status === 'Delayed' 
      ? '?status=Delayed&delay_reason=Previous%20consultation&expected_start=10:30%20AM' 
      : '?status=Available';
    
    runSimulatorAction('Update Doctor Status', () =>
      fetch(`http://localhost:8000/api/admin/update-doctor${query}`, { method: 'POST' })
    );
  };

  const handleResetQueue = () => {
    runSimulatorAction('Reset Database', () =>
      fetch('http://localhost:8000/api/admin/reset-queue', { method: 'POST' })
    );
    // Reset local token tracked
    setMyTokenNumber(27);
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Patient Profile Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-xs border border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-base shadow-sm">
            JD
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">John Doe</h3>
            <p className="text-[10px] text-zinc-400">Patient ID: P-98042</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 grid grid-cols-2 gap-2 text-xs">
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Default Tracked Token</span>
            <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono mt-0.5">{myTokenNumber || 'Not set'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Device Status</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              Connected
            </span>
          </div>
        </div>
      </div>

      {/* Admin Queue Simulator */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-xs border border-zinc-100 dark:border-zinc-800 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-600">
            <ShieldAlert size={16} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Admin Queue Simulator</h4>
            <p className="text-[10px] text-zinc-400">Trigger live events to test WebSockets</p>
          </div>
        </div>

        {successMsg && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-150 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400 text-xs font-semibold rounded-xl flex items-center gap-1.5 animate-bounce">
            <Sparkles size={14} />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="flex flex-col gap-3.5 mt-1 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
          
          {/* Action 1: Next Token */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Queue Controls</span>
            <button
              onClick={handleNextToken}
              disabled={actionLoading !== null}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5"
            >
              {actionLoading === 'Advance Queue' ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              Advance Queue (Next Token)
            </button>
          </div>

          {/* Action 2: Add Patient */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Add Patient to Queue</span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Patient Name (e.g. Mary Jane)"
                value={patientNameInput}
                onChange={(e) => setPatientNameInput(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden"
              />
              <button
                onClick={handleAddPatient}
                disabled={actionLoading !== null}
                className="px-4 bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-700 dark:hover:bg-zinc-650 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                {actionLoading === 'Add Patient' ? (
                  <RefreshCw size={12} className="animate-spin" />
                ) : (
                  <PlusCircle size={14} />
                )}
                Add
              </button>
            </div>
          </div>

          {/* Action 3: Doctor Status */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Doctor Availability</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleUpdateDoctor('Available')}
                disabled={actionLoading !== null}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all ${
                  docStatus === 'Available'
                    ? 'bg-emerald-50 border-emerald-350 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/50'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-500'
                }`}
              >
                On Duty (Available)
              </button>
              <button
                onClick={() => handleUpdateDoctor('Delayed')}
                disabled={actionLoading !== null}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all ${
                  docStatus === 'Delayed'
                    ? 'bg-amber-50 border-amber-350 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900/50 font-bold'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-500'
                }`}
              >
                Delayed (20 Min)
              </button>
            </div>
          </div>

          {/* Action 4: Reset DB */}
          <div className="flex flex-col gap-1.5 mt-2 pt-3.5 border-t border-zinc-100 dark:border-zinc-800/80">
            <button
              onClick={handleResetQueue}
              disabled={actionLoading !== null}
              className="w-full py-2.5 border border-dashed border-rose-250 dark:border-rose-900/40 text-rose-600 hover:bg-rose-50/30 dark:hover:bg-rose-950/10 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              {actionLoading === 'Reset Database' ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <RotateCcw size={14} />
              )}
              Reset Queue Database to Seeds
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
