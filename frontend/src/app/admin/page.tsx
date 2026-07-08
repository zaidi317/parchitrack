'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Users, Stethoscope, TrendingUp, Settings, Bell, LogOut, Lock, Mail,
  Plus, AlertCircle, Check, Play, Ban, ShieldAlert, Download, QrCode, Trash2
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

export default function AdminDashboard() {
  // Auth states
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [clinicId, setClinicId] = useState(1);

  // Layout states
  const [activeTab, setActiveTab] = useState<'queue' | 'doctor' | 'analytics' | 'settings' | 'notifications'>('queue');
  const [isMounted, setIsMounted] = useState(false);

  // Queue states
  const [tokensList, setTokensList] = useState<any[]>([]);
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [walkinPosition, setWalkinPosition] = useState('');
  const [queueLoading, setQueueLoading] = useState(false);

  // Doctor status states
  const [docStatus, setDocStatus] = useState('Available');
  const [delayMinutes, setDelayMinutes] = useState(20);
  const [delayReason, setDelayReason] = useState('previous consultation');
  const [expectedStart, setExpectedStart] = useState('10:30 AM');
  const [docMsg, setDocMsg] = useState('');

  // Analytics states
  const [rangeFilter, setRangeFilter] = useState<'today' | 'week' | 'month'>('today');
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  // Settings states
  const [clinicName, setClinicName] = useState('CareFirst Clinic');
  const [dailyStart, setDailyStart] = useState('09:00 AM');
  const [slotDuration, setSlotDuration] = useState(10);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('receptionist');
  const [settingsMsg, setSettingsMsg] = useState('');

  // Notifications states
  const [notificationsLog, setNotificationsLog] = useState<any[]>([]);

  // WebSocket connection
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('parchitrack_admin_token');
      const savedRole = localStorage.getItem('parchitrack_admin_role');
      const savedClinicId = localStorage.getItem('parchitrack_admin_clinic_id');
      if (savedToken) {
        setToken(savedToken);
        setUserRole(savedRole || '');
        setClinicId(savedClinicId ? parseInt(savedClinicId, 10) : 1);
      }
    }
  }, []);

  // Fetch all dashboard data when token/tab changes
  useEffect(() => {
    if (!token) return;
    fetchData();

    // Setup WebSocket listener for live sync
    const ws = new WebSocket(`ws://localhost:8000/ws/clinic/${clinicId}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'QUEUE_UPDATE') {
          fetchData();
        }
      } catch (e) {
        console.error(e);
      }
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [token, activeTab, rangeFilter, clinicId]);

  const fetchData = async () => {
    if (!token) return;
    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      // Tab-specific API queries
      if (activeTab === 'queue') {
        const res = await fetch(`http://localhost:8000/api/clinic/${clinicId}/tokens`);
        if (res.ok) setTokensList(await res.json());
      } else if (activeTab === 'doctor') {
        const res = await fetch(`http://localhost:8000/api/clinic/${clinicId}/status`);
        if (res.ok) {
          const data = await res.json();
          setDocStatus(data.doctor_status);
          setDelayMinutes(data.doctor_delay_minutes || 20);
          setDelayReason(data.delay_reason || 'previous consultation');
          setExpectedStart(data.expected_start_time || '10:30 AM');
        }
      } else if (activeTab === 'analytics') {
        const res = await fetch(`http://localhost:8000/api/admin/analytics?range=${rangeFilter}`, { headers });
        if (res.ok) setAnalyticsData(await res.json());
      } else if (activeTab === 'settings') {
        const [settingsRes, staffRes] = await Promise.all([
          fetch(`http://localhost:8000/api/admin/clinic/${clinicId}/settings`, { headers }),
          fetch('http://localhost:8000/api/admin/staff', { headers })
        ]);
        if (settingsRes.ok) {
          const data = await settingsRes.json();
          setClinicName(data.name);
          setDailyStart(data.expected_daily_start);
          setSlotDuration(data.avg_slot_duration);
        }
        if (staffRes.ok) setStaffList(await staffRes.json());
      } else if (activeTab === 'notifications') {
        const res = await fetch('http://localhost:8000/api/admin/notifications-log', { headers });
        if (res.ok) setNotificationsLog(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        throw new Error('Incorrect email or password');
      }

      const data = await res.json();
      setToken(data.access_token);
      setUserRole(data.role);
      setClinicId(data.clinic_id);

      if (typeof window !== 'undefined') {
        localStorage.setItem('parchitrack_admin_token', data.access_token);
        localStorage.setItem('parchitrack_admin_role', data.role);
        localStorage.setItem('parchitrack_admin_clinic_id', data.clinic_id.toString());
      }
    } catch (err: any) {
      setAuthError(err.message || 'Login failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUserRole('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('parchitrack_admin_token');
      localStorage.removeItem('parchitrack_admin_role');
      localStorage.removeItem('parchitrack_admin_clinic_id');
    }
  };

  // Queue Operations
  const handleCallNext = async () => {
    setQueueLoading(true);
    try {
      await fetch('http://localhost:8000/api/admin/queue/call-next', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setQueueLoading(false);
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await fetch(`http://localhost:8000/api/admin/token/${id}/status?status=${status}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddWalkin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkinName) return;
    try {
      const body: any = { patient_name: walkinName };
      if (walkinPhone) body.phone_number = walkinPhone;
      if (walkinPosition) body.position = parseInt(walkinPosition, 10);

      const res = await fetch('http://localhost:8000/api/admin/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setWalkinName('');
        setWalkinPhone('');
        setWalkinPosition('');
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Doctor Updates
  const handleUpdateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setDocMsg('');
    try {
      const query = docStatus === 'Delayed'
        ? `?status=Delayed&delay_minutes=${delayMinutes}&delay_reason=${encodeURIComponent(delayReason)}&expected_start=${encodeURIComponent(expectedStart)}`
        : `?status=${docStatus}`;

      const res = await fetch(`http://localhost:8000/api/admin/clinic/${clinicId}/doctor-status${query}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setDocMsg('Doctor status updated successfully.');
        setTimeout(() => setDocMsg(''), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Settings Updates
  const handleUpdateClinicSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsMsg('');
    try {
      const res = await fetch(`http://localhost:8000/api/admin/clinic/${clinicId}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: clinicName,
          expected_daily_start: dailyStart,
          avg_slot_duration: slotDuration
        })
      });
      if (res.ok) {
        setSettingsMsg('Clinic settings updated.');
        setTimeout(() => setSettingsMsg(''), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Staff Management
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffEmail || !newStaffPassword) return;
    try {
      const res = await fetch('http://localhost:8000/api/admin/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: newStaffEmail,
          password: newStaffPassword,
          role: newStaffRole
        })
      });
      if (res.ok) {
        setNewStaffEmail('');
        setNewStaffPassword('');
        setNewStaffRole('receptionist');
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteStaff = async (id: number) => {
    try {
      const res = await fetch(`http://localhost:8000/api/admin/staff/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Helper to format timestamps
  const formatTime = (isoString: string) => {
    if (!isoString) return '---';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '---';
    }
  };

  // If token is null, render Login Page
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col gap-6">
          <div className="absolute -top-16 -right-16 w-36 h-36 bg-blue-600/10 rounded-full blur-2xl"></div>
          
          <div className="text-center flex flex-col gap-1.5">
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
              ParchiTrack Admin
            </h1>
            <p className="text-xs text-zinc-400">Clinic queue management authentication portal</p>
          </div>

          {authError && (
            <div className="p-3.5 bg-rose-950/20 border border-rose-900/30 text-rose-400 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-pulse">
              <AlertCircle size={16} />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Email Address</label>
              <div className="flex items-center gap-2.5 bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-3.5 pl-4 text-zinc-200">
                <Mail size={16} className="text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. admin@parchitrack.test"
                  required
                  className="bg-transparent border-0 outline-hidden focus:ring-0 text-sm w-full focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">PIN / Password</label>
              <div className="flex items-center gap-2.5 bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-3.5 pl-4 text-zinc-200">
                <Lock size={16} className="text-zinc-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-transparent border-0 outline-hidden focus:ring-0 text-sm w-full focus:outline-hidden"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="mt-2 bg-blue-650 hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl text-sm transition-all shadow-md shadow-blue-950/20 active:scale-98"
            >
              {authLoading ? 'Verifying Credentials...' : 'Sign In to Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex font-sans text-zinc-800 dark:text-zinc-150">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col text-zinc-300">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="font-black text-white text-lg tracking-tight">ParchiTrack</span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Staff Console</span>
          </div>
        </div>

        {/* User Card */}
        <div className="px-6 py-4.5 border-b border-slate-800/70 flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-700 rounded-full flex items-center justify-center font-bold text-white uppercase shadow-sm">
            {userRole.slice(0, 2) || 'AD'}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white truncate max-w-[130px]">Staff Account</span>
            <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider mt-0.5">{userRole}</span>
          </div>
        </div>

        {/* Sidebar Tabs */}
        <nav className="flex-1 px-4 py-6 flex flex-col gap-1.5">
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'queue' ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users size={16} />
            Queue Manager
          </button>
          <button
            onClick={() => setActiveTab('doctor')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'doctor' ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Stethoscope size={16} />
            Doctor Status
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'analytics' ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <TrendingUp size={16} />
            Clinic Analytics
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'settings' ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Settings size={16} />
            Clinic Settings
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'notifications' ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Bell size={16} />
            Notifications Log
          </button>
        </nav>

        {/* Logout Footer */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 hover:bg-rose-950/20 text-rose-500 hover:text-rose-450 border border-transparent hover:border-rose-950/30 rounded-xl text-xs font-bold transition-all"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 overflow-y-auto bg-zinc-100/40 dark:bg-zinc-950 p-8 flex flex-col gap-6">
        
        {/* Top Header */}
        <header className="flex justify-between items-center bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 p-5 rounded-2xl shadow-xs">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white capitalize">
              {activeTab === 'queue' ? 'Queue Management' : activeTab === 'doctor' ? 'Doctor Controls' : activeTab === 'analytics' ? 'Analytics Dashboard' : activeTab === 'settings' ? 'Clinic Settings' : 'Notifications Log'}
            </h2>
            <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
              {clinicName} • Dynamic System Controller
            </p>
          </div>

          {activeTab === 'queue' && (
            <button
              onClick={handleCallNext}
              disabled={queueLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/60 text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm shadow-blue-500/10 transition-all cursor-pointer"
            >
              <Play size={14} className="fill-white" />
              Call Next Patient
            </button>
          )}
        </header>

        {/* Tab Subviews */}
        <section className="flex-1 flex flex-col gap-6">

          {/* Subview A: Live Queue Management */}
          {activeTab === 'queue' && (
            <div className="grid grid-cols-3 gap-6 items-start">
              {/* Queue Table */}
              <div className="col-span-2 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800/80 rounded-2xl shadow-xs overflow-hidden">
                <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Active Patient Queue</h3>
                  <span className="text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 font-bold px-2 py-0.5 rounded-full">
                    {tokensList.filter(t => t.status === 'waiting').length} Waiting
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        <th className="py-3 px-4 text-center">Token #</th>
                        <th className="py-3 px-4">Patient Name</th>
                        <th className="py-3 px-4">Phone</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Joined</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                      {tokensList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-zinc-400">No tokens found.</td>
                        </tr>
                      ) : (
                        tokensList.map((t) => (
                          <tr key={t.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                            <td className="py-3.5 px-4 font-mono font-bold text-center text-sm">{t.token_number}</td>
                            <td className="py-3.5 px-4 font-semibold text-zinc-900 dark:text-zinc-200">{t.patient_name}</td>
                            <td className="py-3.5 px-4 font-mono text-zinc-500">{t.phone_number || '---'}</td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                t.status === 'serving' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400' :
                                t.status === 'done' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-450' :
                                t.status === 'no_show' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400' :
                                t.status === 'cancelled' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400' :
                                'bg-zinc-100 text-zinc-650 dark:bg-zinc-850 dark:text-zinc-400'
                              }`}>
                                {t.status === 'serving' ? 'Serving' : t.status === 'done' ? 'Completed' : t.status === 'no_show' ? 'No Show' : t.status === 'cancelled' ? 'Cancelled' : 'Waiting'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-zinc-450">{formatTime(t.arrival_time)}</td>
                            <td className="py-3.5 px-4 text-right flex justify-end gap-1">
                              {t.status === 'waiting' && (
                                <>
                                  <button
                                    onClick={() => handleUpdateStatus(t.id, 'serving')}
                                    className="p-1 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/30 dark:hover:text-blue-400 rounded-lg text-zinc-400 transition-all cursor-pointer"
                                    title="Call in / Serve"
                                  >
                                    <Play size={14} className="fill-current" />
                                  </button>
                                  <button
                                    onClick={() => handleUpdateStatus(t.id, 'cancelled')}
                                    className="p-1 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-455 rounded-lg text-zinc-400 transition-all cursor-pointer"
                                    title="Cancel Token"
                                  >
                                    <Ban size={14} />
                                  </button>
                                </>
                              )}
                              {t.status === 'serving' && (
                                <>
                                  <button
                                    onClick={() => handleUpdateStatus(t.id, 'done')}
                                    className="p-1 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-450 rounded-lg text-zinc-400 transition-all cursor-pointer"
                                    title="Mark Completed"
                                  >
                                    <Check size={14} strokeWidth={3} />
                                  </button>
                                  <button
                                    onClick={() => handleUpdateStatus(t.id, 'no_show')}
                                    className="p-1 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/30 dark:hover:text-amber-400 rounded-lg text-zinc-400 transition-all cursor-pointer"
                                    title="Mark No Show"
                                  >
                                    <AlertCircle size={14} />
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Walk-in Creator Form */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Create Walk-in Token</h3>
                  <p className="text-[10px] text-zinc-400">Manually insert a patient into the live queue</p>
                </div>

                <form onSubmit={handleAddWalkin} className="flex flex-col gap-3.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-0.5">Patient Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Mary Jane"
                      value={walkinName}
                      onChange={(e) => setWalkinName(e.target.value)}
                      required
                      className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-3 text-xs w-full text-zinc-800 dark:text-zinc-100 focus:outline-hidden"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-0.5">Phone Number (Optional)</label>
                    <input
                      type="tel"
                      placeholder="e.g. +1 555-0199"
                      value={walkinPhone}
                      onChange={(e) => setWalkinPhone(e.target.value)}
                      className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-3 text-xs w-full text-zinc-800 dark:text-zinc-100 focus:outline-hidden"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-0.5">Queue Position (Optional)</label>
                    <input
                      type="number"
                      placeholder="e.g. 2 (inserts at second in waiting)"
                      value={walkinPosition}
                      onChange={(e) => setWalkinPosition(e.target.value)}
                      className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-3 text-xs w-full text-zinc-800 dark:text-zinc-100 focus:outline-hidden"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-1 bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-750 dark:hover:bg-zinc-700 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1 transition-all shadow-xs cursor-pointer"
                  >
                    <Plus size={14} />
                    Insert Walk-in Token
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Subview B: Doctor Status Control */}
          {activeTab === 'doctor' && (
            <div className="max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800/80 rounded-2xl p-6 shadow-xs flex flex-col gap-6">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Doctor Status Updates</h3>
                <p className="text-[10px] text-zinc-400">Controls what is broadcasted to patients on the Doctor tab</p>
              </div>

              {docMsg && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-150 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400 text-xs font-semibold rounded-xl flex items-center gap-1.5">
                  <Check size={14} />
                  <span>{docMsg}</span>
                </div>
              )}

              <form onSubmit={handleUpdateDoctor} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Availability Toggles</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['Available', 'Delayed', 'On Break', 'Not Started'].map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setDocStatus(status)}
                        className={`py-2 px-3 border text-xs font-bold rounded-xl transition-all cursor-pointer ${
                          docStatus === status
                            ? 'bg-blue-650 border-blue-500 text-white shadow-xs'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-950 dark:border-zinc-800'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {docStatus === 'Delayed' && (
                  <div className="grid grid-cols-2 gap-4 border border-zinc-100 dark:border-zinc-800 p-4 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/20 animate-fade-in">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-0.5">Delay Duration (Minutes)</label>
                      <input
                        type="number"
                        value={delayMinutes}
                        onChange={(e) => setDelayMinutes(parseInt(e.target.value, 10))}
                        required
                        className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-3 text-xs w-full text-zinc-800 dark:text-zinc-100 focus:outline-hidden"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-0.5">Delay Reason</label>
                      <select
                        value={delayReason}
                        onChange={(e) => setDelayReason(e.target.value)}
                        className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-3 text-xs w-full text-zinc-800 dark:text-zinc-100 focus:outline-hidden"
                      >
                        <option value="previous consultation">Previous Consultation</option>
                        <option value="emergency">Emergency Case</option>
                        <option value="personal">Personal / Appointment</option>
                        <option value="other">Other Reason</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1 col-span-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-0.5">Expected Start Time</label>
                      <input
                        type="text"
                        value={expectedStart}
                        onChange={(e) => setExpectedStart(e.target.value)}
                        placeholder="e.g. 10:30 AM"
                        required
                        className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-3 text-xs w-full text-zinc-800 dark:text-zinc-100 focus:outline-hidden"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer w-full mt-2"
                >
                  Update Doctor Status
                </button>
              </form>
            </div>
          )}

          {/* Subview C: Analytics */}
          {activeTab === 'analytics' && analyticsData && (
            <div className="flex flex-col gap-6">
              {/* Range Selector header */}
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-400 font-semibold">Clinic Wait Time and Speed Reports</span>
                <div className="flex gap-1 bg-zinc-150/70 p-1 rounded-lg border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-850">
                  {(['today', 'week', 'month'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRangeFilter(r)}
                      className={`px-3.5 py-1 text-[10px] font-bold capitalize rounded-md transition-all cursor-pointer ${
                        rangeFilter === r
                          ? 'bg-white dark:bg-zinc-850 text-blue-600 dark:text-blue-400 shadow-xs'
                          : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-355'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-6 gap-4">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800/80 rounded-xl p-4.5 shadow-xs flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Avg Consult</span>
                  <span className="text-xl font-black font-mono text-indigo-950 dark:text-zinc-100 mt-1">{analyticsData.today_average}m</span>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800/80 rounded-xl p-4.5 shadow-xs flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Fastest Consult</span>
                  <span className="text-xl font-black font-mono text-emerald-600 mt-1">{analyticsData.fastest}m</span>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800/80 rounded-xl p-4.5 shadow-xs flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Longest Consult</span>
                  <span className="text-xl font-black font-mono text-rose-605 mt-1">{analyticsData.longest}m</span>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800/80 rounded-xl p-4.5 shadow-xs flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Patients Served</span>
                  <span className="text-xl font-black font-mono text-zinc-900 dark:text-white mt-1">{analyticsData.total_served}</span>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800/80 rounded-xl p-4.5 shadow-xs flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">No-Show Rate</span>
                  <span className="text-xl font-black font-mono text-amber-600 mt-1">{analyticsData.no_show_rate}%</span>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800/80 rounded-xl p-4.5 shadow-xs flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Avg Wait Time</span>
                  <span className="text-xl font-black font-mono text-blue-650 mt-1">{analyticsData.average_wait_time}m</span>
                </div>
              </div>

              {/* Charts grid */}
              <div className="grid grid-cols-2 gap-6">
                {/* Line Chart */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Consultation Durations Trend</h4>
                  <div className="h-60 w-full text-xs">
                    {isMounted && analyticsData.trend && analyticsData.trend.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analyticsData.trend}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F1F4" className="dark:stroke-zinc-800" />
                          <XAxis dataKey="time" tickLine={false} axisLine={false} stroke="#A1A1AA" fontSize={10} dy={8} />
                          <YAxis tickLine={false} axisLine={false} stroke="#A1A1AA" fontSize={10} dx={-4} />
                          <Tooltip />
                          <Line type="monotone" dataKey="duration" stroke="#4F46E5" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-full h-full rounded-xl flex items-center justify-center text-zinc-450 border border-dashed border-zinc-200">
                        Insufficient trend data.
                      </div>
                    )}
                  </div>
                </div>

                {/* Heatmap Bar Chart */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Busiest Hours Heatmap</h4>
                  <div className="h-60 w-full text-xs">
                    {isMounted && analyticsData.busiest_hours && analyticsData.busiest_hours.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsData.busiest_hours}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F1F4" className="dark:stroke-zinc-800" />
                          <XAxis dataKey="hour" tickLine={false} axisLine={false} stroke="#A1A1AA" fontSize={9} dy={8} />
                          <YAxis tickLine={false} axisLine={false} stroke="#A1A1AA" fontSize={10} dx={-4} allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-full h-full rounded-xl flex items-center justify-center text-zinc-450 border border-dashed border-zinc-200">
                        Insufficient hour data.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Subview D: Clinic Settings & Staff Management */}
          {activeTab === 'settings' && (
            <div className="grid grid-cols-2 gap-6 items-start">
              <div className="flex flex-col gap-6">
                
                {/* Edit Clinic Settings */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Clinic Profile</h3>
                    <p className="text-[10px] text-zinc-400">Configure clinic information and operational settings</p>
                  </div>

                  {settingsMsg && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-150 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400 text-xs font-semibold rounded-xl flex items-center gap-1.5">
                      <Check size={14} />
                      <span>{settingsMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleUpdateClinicSettings} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-0.5">Clinic Name</label>
                      <input
                        type="text"
                        value={clinicName}
                        onChange={(e) => setClinicName(e.target.value)}
                        required
                        className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-3 text-xs w-full text-zinc-800 dark:text-zinc-100 focus:outline-hidden"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-0.5">Expected Daily Start Time</label>
                      <input
                        type="text"
                        value={dailyStart}
                        onChange={(e) => setDailyStart(e.target.value)}
                        required
                        className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-3 text-xs w-full text-zinc-800 dark:text-zinc-100 focus:outline-hidden"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-0.5">Avg Slot Duration (Minutes)</label>
                      <input
                        type="number"
                        value={slotDuration}
                        onChange={(e) => setSlotDuration(parseInt(e.target.value, 10))}
                        required
                        className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-3 text-xs w-full text-zinc-800 dark:text-zinc-100 focus:outline-hidden"
                      />
                    </div>

                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer w-full mt-2"
                    >
                      Update Profile
                    </button>
                  </form>
                </div>

                {/* Patient QR Code Generator Card */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Waiting Room QR Code</h3>
                    <p className="text-[10px] text-zinc-400">Print or download this QR code for your waiting room wall</p>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center p-6 border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/20 rounded-2xl gap-3">
                    <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 rounded-2xl shadow-sm text-center">
                      <QrCode size={140} className="text-zinc-900 dark:text-zinc-100 mx-auto" />
                      <span className="text-[10px] font-mono font-bold text-zinc-450 tracking-tight block mt-2">
                        http://localhost:3000/clinic/{clinicId}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => alert('Download triggered for ParchiTrack-QR.png')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 border border-zinc-200 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900 text-xs font-bold text-zinc-650 dark:text-zinc-350 rounded-xl transition-all shadow-2xs"
                    >
                      <Download size={14} />
                      Download QR Code
                    </button>
                  </div>
                </div>
              </div>

              {/* Staff Accounts Management */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs flex flex-col gap-5">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Staff User Management</h3>
                  <p className="text-[10px] text-zinc-400">Add or remove logins for receptionist, doctor, and admin roles</p>
                </div>

                {/* Add Staff form */}
                <form onSubmit={handleAddStaff} className="flex flex-col gap-3.5 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/10">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-0.5">Register New Account</span>
                  <div className="flex flex-col gap-1">
                    <input
                      type="email"
                      placeholder="Staff Email"
                      value={newStaffEmail}
                      onChange={(e) => setNewStaffEmail(e.target.value)}
                      required
                      className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-2.5 text-xs w-full text-zinc-800 dark:text-zinc-100 focus:outline-hidden"
                    />
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <input
                      type="password"
                      placeholder="Password"
                      value={newStaffPassword}
                      onChange={(e) => setNewStaffPassword(e.target.value)}
                      required
                      className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-2.5 text-xs w-full text-zinc-800 dark:text-zinc-100 focus:outline-hidden"
                    />
                  </div>

                  <div className="flex gap-2 items-center">
                    <select
                      value={newStaffRole}
                      onChange={(e) => setNewStaffRole(e.target.value)}
                      className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-2.5 text-xs text-zinc-800 dark:text-zinc-100 focus:outline-hidden"
                    >
                      <option value="receptionist">Receptionist</option>
                      <option value="doctor">Doctor</option>
                      <option value="admin">Administrator</option>
                    </select>

                    <button
                      type="submit"
                      className="px-5 bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-700 dark:hover:bg-zinc-650 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <Plus size={14} />
                      Add
                    </button>
                  </div>
                </form>

                {/* Staff List Table */}
                <div className="overflow-hidden border border-zinc-100 dark:border-zinc-800 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Email Address</th>
                        <th className="py-2.5 px-3">Role</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {staffList.map((s) => (
                        <tr key={s.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                          <td className="py-3 px-3 font-semibold truncate max-w-[150px]">{s.email}</td>
                          <td className="py-3 px-3 capitalize text-zinc-500 font-semibold">{s.role}</td>
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteStaff(s.id)}
                              className="p-1 text-zinc-400 hover:text-rose-500 transition-all cursor-pointer"
                              title="Delete Account"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Subview E: Notifications Log */}
          {activeTab === 'notifications' && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800/80 rounded-2xl shadow-xs overflow-hidden max-w-3xl">
              <div className="p-5 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Active Push Notification Subscriptions</h3>
                <p className="text-[10px] text-zinc-400">View pending patient alerts triggered when the queue moves</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Patient Client UUID</th>
                      <th className="py-3 px-4 text-center">Tracked Token</th>
                      <th className="py-3 px-4">Alert Trigger Type</th>
                      <th className="py-3 px-4 text-center">Threshold</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {notificationsLog.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-zinc-400">No active notification alert requests found.</td>
                      </tr>
                    ) : (
                      notificationsLog.map((sub) => (
                        <tr key={sub.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 font-mono text-[11px]">
                          <td className="py-3 px-4 text-zinc-850 dark:text-zinc-300 font-semibold">{sub.patient_id}</td>
                          <td className="py-3 px-4 font-bold text-center text-sm">{sub.token_number}</td>
                          <td className="py-3 px-4 font-sans text-zinc-500">
                            {sub.trigger_type === 'patients_left' ? 'Patients remaining ahead' : 'Doctor arrives in clinic'}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-zinc-700 dark:text-zinc-350">
                            {sub.threshold !== null ? `<= ${sub.threshold}` : '---'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </section>
      </main>
    </div>
  );
}
