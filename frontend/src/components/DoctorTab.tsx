'use client';

import React, { useState, useEffect } from 'react';
import { Stethoscope, AlertTriangle, Play, Sparkles, TrendingUp, Info } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ClinicStatus {
  id: number;
  name: string;
  doctor_status: string;
  expected_start_time: string | null;
  delay_reason: string | null;
  doctor_delay_minutes: number;
}

interface AnalyticsData {
  today_average: number;
  fastest: number;
  longest: number;
  queue_speed: string;
  trend: { time: string; duration: number }[];
}

interface DoctorTabProps {
  clinicStatus: ClinicStatus | null;
  analytics: AnalyticsData | null;
  loading: boolean;
}

export default function DoctorTab({ clinicStatus, analytics, loading }: DoctorTabProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900';
      case 'Delayed':
        return 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900';
      case 'On Break':
        return 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900';
      default:
        return 'text-zinc-500 bg-zinc-50 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800';
    }
  };

  const getStatusPill = (status: string) => {
    switch (status) {
      case 'Available':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
            On Duty
          </span>
        );
      case 'Delayed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
            Delayed
          </span>
        );
      case 'On Break':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
            On Break
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
            Offline
          </span>
        );
    }
  };

  if (loading || !clinicStatus) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400 gap-2">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
        <span className="text-xs">Fetching doctor status...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Doctor Status Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-xs border border-zinc-100 dark:border-zinc-800">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600">
              <Stethoscope size={22} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Dr. Sarah Rahman</h3>
              <p className="text-[10px] text-zinc-400">Lead Consultant physician</p>
            </div>
          </div>
          {getStatusPill(clinicStatus.doctor_status)}
        </div>

        {clinicStatus.doctor_status === 'Delayed' && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/15 border border-amber-100 dark:border-amber-900/30 flex gap-3">
            <AlertTriangle className="text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" size={18} />
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-amber-900 dark:text-amber-400">
                Doctor Delay Notice: ~{clinicStatus.doctor_delay_minutes} Mins
              </span>
              <span className="text-[11px] text-amber-800/95 dark:text-amber-500/90 leading-normal">
                Dr. Sarah is currently delayed due to {clinicStatus.delay_reason || 'a previous consultation'}.
              </span>
              <span className="text-[10px] text-amber-600 dark:text-amber-600 font-semibold mt-1">
                Expected start: {clinicStatus.expected_start_time || '10:30 AM'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Consultation Analytics */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-xs border border-zinc-100 dark:border-zinc-800 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600">
              <TrendingUp size={16} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Consultation Times</h4>
              <p className="text-[10px] text-zinc-400">Statistics from today's logs</p>
            </div>
          </div>
          <span className="text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 font-bold px-2 py-0.5 rounded-full">
            Today
          </span>
        </div>

        {analytics ? (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-850 p-2.5 rounded-xl text-center flex flex-col gap-0.5">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Average</span>
                <span className="text-base font-extrabold text-indigo-950 dark:text-zinc-100 font-mono">
                  {analytics.today_average}m
                </span>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-850 p-2.5 rounded-xl text-center flex flex-col gap-0.5">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Fastest</span>
                <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-450 font-mono">
                  {analytics.fastest}m
                </span>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-850 p-2.5 rounded-xl text-center flex flex-col gap-0.5">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Longest</span>
                <span className="text-base font-extrabold text-rose-600 dark:text-rose-455 font-mono">
                  {analytics.longest}m
                </span>
              </div>
            </div>

            {/* Line Chart */}
            <div className="h-44 w-full mt-2 pr-2 text-xs">
              {isMounted && analytics.trend && analytics.trend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.trend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E4E7" className="dark:stroke-zinc-800" />
                    <XAxis
                      dataKey="time"
                      tickLine={false}
                      axisLine={false}
                      stroke="#888888"
                      fontSize={10}
                      dy={8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      stroke="#888888"
                      fontSize={10}
                      dx={-4}
                      label={{ value: 'min', angle: -90, position: 'insideLeft', offset: 0, fill: '#888888', fontSize: 9 }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        color: '#1E293B',
                        fontSize: '11px',
                      }}
                      labelStyle={{ fontWeight: 'bold' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="duration"
                      stroke="#4F46E5"
                      strokeWidth={2}
                      dot={{ r: 3, strokeWidth: 1 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-center text-zinc-400">
                  <span className="text-[11px]">Insufficient data for trend analysis.</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-zinc-400">No analytics data available</div>
        )}
      </div>
    </div>
  );
}
