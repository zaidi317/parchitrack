'use client';

import React from 'react';
import { Play, Flame, Users, Clock } from 'lucide-react';

interface HomeTabProps {
  queueData: {
    current_token: number | null;
    next_token: number | null;
    patients_waiting: number;
    queue_speed: string;
    last_updated: string;
  };
  myTokenNumber: number | null;
}

export default function HomeTab({ queueData, myTokenNumber }: HomeTabProps) {
  const formatTime = (isoString: string) => {
    if (!isoString) return '--:--';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return '--:--';
    }
  };

  const current = queueData.current_token || 0;
  const next = queueData.next_token || (current ? current + 1 : 1);
  const userToken = myTokenNumber || 27;

  // Determine progress states
  const isUserTurn = current === userToken;
  const isUserNext = next === userToken;

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Now Serving Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-xs border border-blue-50 dark:border-zinc-800 text-center flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-blue-500/10 rounded-full blur-xl"></div>
        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Now Serving</span>
        <div className="text-6xl font-extrabold text-blue-900 dark:text-white my-2 transition-all duration-500 font-mono">
          {current || '--'}
        </div>
        <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Live Counter
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 gap-3">
        {/* Next Token */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-xs border border-zinc-100/50 dark:border-zinc-800 flex flex-col gap-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium">Next Token</span>
            <Play size={16} className="text-blue-500" />
          </div>
          <span className="text-xl font-bold text-zinc-800 dark:text-white font-mono">{next || '--'}</span>
        </div>

        {/* Queue Speed */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-xs border border-zinc-100/50 dark:border-zinc-800 flex flex-col gap-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium">Queue Speed</span>
            <Flame size={16} className={
              queueData.queue_speed === 'Fast' ? 'text-emerald-500' :
              queueData.queue_speed === 'Slow' ? 'text-rose-500' : 'text-amber-500'
            } />
          </div>
          <span className={`text-xl font-bold ${
            queueData.queue_speed === 'Fast' ? 'text-emerald-600 dark:text-emerald-400' :
            queueData.queue_speed === 'Slow' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
          }`}>{queueData.queue_speed || 'Normal'}</span>
        </div>

        {/* Patients Waiting */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-xs border border-zinc-100/50 dark:border-zinc-800 flex flex-col gap-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium">Waiting</span>
            <Users size={16} className="text-indigo-500" />
          </div>
          <span className="text-xl font-bold text-zinc-800 dark:text-white font-mono">{queueData.patients_waiting}</span>
        </div>

        {/* Last Updated */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-xs border border-zinc-100/50 dark:border-zinc-800 flex flex-col gap-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium">Updated</span>
            <Clock size={16} className="text-zinc-500" />
          </div>
          <span className="text-sm font-semibold text-zinc-800 dark:text-white font-mono mt-1">
            {formatTime(queueData.last_updated)}
          </span>
        </div>
      </div>

      {/* Progress Tracker */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 shadow-xs border border-zinc-100/50 dark:border-zinc-800">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Queue Progress</h3>
        
        <div className="relative flex items-center justify-between px-2">
          {/* Progress bar line */}
          <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-0.5 bg-zinc-200 dark:bg-zinc-800 z-0">
            <div 
              className="h-full bg-blue-600 transition-all duration-500" 
              style={{
                width: isUserTurn ? '100%' : isUserNext ? '50%' : '0%'
              }}
            ></div>
          </div>

          {/* Node 1: Current */}
          <div className="flex flex-col items-center gap-1 z-10">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-all duration-300 ${
              isUserTurn ? 'bg-blue-100 text-blue-700 border-2 border-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-blue-600 text-white'
            }`}>
              {current}
            </div>
            <span className="text-[10px] font-semibold text-zinc-500">Current</span>
          </div>

          {/* Node 2: Next */}
          <div className="flex flex-col items-center gap-1 z-10">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-all duration-300 ${
              isUserTurn ? 'bg-blue-600 text-white' : 
              isUserNext ? 'bg-blue-100 text-blue-700 border-2 border-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
              'bg-zinc-100 text-zinc-400 border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700'
            }`}>
              {next}
            </div>
            <span className="text-[10px] font-semibold text-zinc-500">Next</span>
          </div>

          {/* Node 3: Your Turn */}
          <div className="flex flex-col items-center gap-1 z-10">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-all duration-300 ${
              isUserTurn ? 'bg-emerald-600 text-white border-2 border-emerald-400 animate-pulse' :
              'bg-zinc-100 text-zinc-400 border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700'
            }`}>
              {userToken}
            </div>
            <span className="text-[10px] font-semibold text-zinc-500">Your Turn</span>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 rounded-xl p-4 flex gap-3 items-start">
        <span className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-blue-500"></span>
        <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
          Live queue updates are active. You will receive an alert when your turn is near.
        </p>
      </div>
    </div>
  );
}
