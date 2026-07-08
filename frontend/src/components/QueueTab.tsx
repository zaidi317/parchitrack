'use client';

import React, { useState } from 'react';
import { Search, Clock, CheckCircle2, User } from 'lucide-react';

interface TokenData {
  id: number;
  token_number: number;
  patient_name: string;
  status: string;
  created_at: string;
}

interface QueueTabProps {
  tokens: TokenData[];
  myTokenNumber: number | null;
}

export default function QueueTab({ tokens, myTokenNumber }: QueueTabProps) {
  const [filter, setFilter] = useState<'all' | 'waiting' | 'serving' | 'done'>('all');
  const [search, setSearch] = useState('');

  const filteredTokens = tokens.filter((t) => {
    const matchesFilter = filter === 'all' || t.status === filter;
    const matchesSearch = t.patient_name.toLowerCase().includes(search.toLowerCase()) || 
                          t.token_number.toString().includes(search);
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'serving':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
            Serving
          </span>
        );
      case 'waiting':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            <Clock size={12} />
            Waiting
          </span>
        );
      case 'done':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
            <CheckCircle2 size={12} />
            Completed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in h-full">
      {/* Search and Filters */}
      <div className="flex flex-col gap-3">
        {/* Search Input */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by name or token..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-1.5 bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl">
          {(['all', 'serving', 'waiting', 'done'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`flex-1 py-1.5 text-xs font-medium capitalize rounded-lg transition-all ${
                filter === type
                  ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Queue List */}
      <div className="flex-1 overflow-y-auto max-h-[460px] pr-1 flex flex-col gap-2.5">
        {filteredTokens.length === 0 ? (
          <div className="text-center py-12 text-zinc-400 dark:text-zinc-600 flex flex-col items-center justify-center gap-2">
            <User size={32} strokeWidth={1.5} />
            <span className="text-sm">No tokens match your criteria.</span>
          </div>
        ) : (
          filteredTokens.map((t) => {
            const isMyToken = t.token_number === myTokenNumber;
            return (
              <div
                key={t.id}
                className={`flex items-center justify-between p-4 rounded-xl shadow-xs border transition-all ${
                  isMyToken
                    ? 'bg-blue-50/70 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/50 ring-1 ring-blue-500/20'
                    : 'bg-white dark:bg-zinc-900 border-zinc-100/50 dark:border-zinc-800/80 hover:border-zinc-200 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  {/* Token circle badge */}
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold font-mono text-sm border-2 ${
                    isMyToken
                      ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                      : t.status === 'serving'
                      ? 'bg-blue-50 text-blue-600 border-blue-500 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-700'
                      : t.status === 'done'
                      ? 'bg-zinc-50 text-zinc-400 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-500 dark:border-zinc-800'
                      : 'bg-zinc-50 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
                  }`}>
                    {t.token_number}
                  </div>
                  
                  {/* Patient Name */}
                  <div className="flex flex-col">
                    <span className={`text-sm font-semibold flex items-center gap-1.5 ${
                      isMyToken ? 'text-blue-950 dark:text-blue-100' : 'text-zinc-800 dark:text-zinc-200'
                    }`}>
                      {t.patient_name}
                      {isMyToken && (
                        <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded-sm uppercase tracking-wide">
                          You
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      Walk-in Patient
                    </span>
                  </div>
                </div>

                <div>{getStatusBadge(t.status)}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
