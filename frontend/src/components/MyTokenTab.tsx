'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, User, ArrowRight, Info, Check, Shield } from 'lucide-react';

interface TokenDetails {
  token_number: number;
  patient_name: string;
  status: string;
  position: number;
  estimated_turn: string;
  patients_before: number;
  queue_status: string;
}

interface MyTokenTabProps {
  myTokenNumber: number | null;
  setMyTokenNumber: (num: number) => void;
  queueData: {
    current_token: number | null;
    next_token: number | null;
    patients_waiting: number;
    queue_speed: string;
    last_updated: string;
  };
}

export default function MyTokenTab({ myTokenNumber, setMyTokenNumber, queueData }: MyTokenTabProps) {
  const [tokenInput, setTokenInput] = useState(myTokenNumber?.toString() || '27');
  const [phoneInput, setPhoneInput] = useState('');
  const [tokenDetails, setTokenDetails] = useState<TokenDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Notification States
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [notifyType, setNotifyType] = useState<'patients_left' | 'doctor_arrival'>('patients_left');
  const [threshold, setThreshold] = useState(3);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubmittingSub, setIsSubmittingSub] = useState(false);

  // Sync state with global myTokenNumber
  useEffect(() => {
    if (myTokenNumber) {
      setTokenInput(myTokenNumber.toString());
      fetchTokenDetails(myTokenNumber);
    } else {
      setTokenDetails(null);
    }
  }, [myTokenNumber, queueData.current_token]); // re-fetch when current token shifts

  // Check browser notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        new Notification("ParchiTrack Alerts Active", {
          body: "You will be notified when your turn is near!",
          icon: "/favicon.ico"
        });
      }
    }
  };

  const fetchTokenDetails = async (num: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`http://localhost:8000/api/token/${num}`);
      if (!res.ok) {
        throw new Error('Token not found. Verify your number.');
      }
      const data = await res.json();
      setTokenDetails(data);
    } catch (e: any) {
      setError(e.message || 'Error fetching token details.');
      setTokenDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(tokenInput, 10);
    if (isNaN(num) || num <= 0) {
      setError('Please enter a valid positive number');
      return;
    }
    
    if (phoneInput.trim()) {
      setLoading(true);
      try {
        await fetch('http://localhost:8000/api/token/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token_number: num,
            phone_number: phoneInput.trim()
          })
        });
      } catch (err) {
        console.error('Error claiming token:', err);
      }
    }

    setMyTokenNumber(num);
  };

  const handleSubscribe = async () => {
    if (!myTokenNumber) return;
    setIsSubmittingSub(true);
    try {
      const res = await fetch('http://localhost:8000/api/notify/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: 'client-browser-uuid-12345',
          token_number: myTokenNumber,
          trigger_type: notifyType,
          threshold: notifyType === 'patients_left' ? threshold : null,
        }),
      });
      if (res.ok) {
        setIsSubscribed(true);
        // Fire immediate notification confirmation
        if (permission === 'granted') {
          new Notification("Subscription Activated", {
            body: notifyType === 'patients_left' 
              ? `We will alert you when there are ${threshold} patients ahead of you!` 
              : "We will alert you when the doctor arrives!",
            icon: "/favicon.ico"
          });
        }
        setTimeout(() => setIsSubscribed(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingSub(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Token Input Form */}
      <form onSubmit={handleTokenSubmit} className="flex flex-col gap-3 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-xs">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 pl-2 border border-zinc-200 dark:border-zinc-800 rounded-xl py-1.5 px-3">
            <User size={16} className="text-zinc-400 flex-shrink-0" />
            <input
              type="number"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Token No."
              className="w-full text-xs font-semibold bg-transparent border-0 outline-hidden focus:ring-0 text-zinc-800 dark:text-zinc-100 focus:outline-hidden"
              required
            />
          </div>
          
          <div className="flex items-center gap-2 pl-2 border border-zinc-200 dark:border-zinc-800 rounded-xl py-1.5 px-3">
            <input
              type="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="Phone (Optional)"
              className="w-full text-xs font-semibold bg-transparent border-0 outline-hidden focus:ring-0 text-zinc-800 dark:text-zinc-100 focus:outline-hidden"
            />
          </div>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-1 transition-all shadow-xs"
        >
          {loading ? 'Searching...' : 'Track & Claim Token'}
          <ArrowRight size={14} />
        </button>
      </form>

      {error && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-800 dark:text-rose-400 rounded-xl text-xs font-medium flex items-start gap-2">
          <Info size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {tokenDetails ? (
        <>
          {/* Main Token Display Card */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-xs border border-zinc-100 dark:border-zinc-800 text-center relative overflow-hidden flex flex-col items-center">
            <div className="absolute top-4 right-4">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                Walk-in Token
              </span>
            </div>
            
            <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-2">Your Token Number</span>
            <div className="text-7xl font-extrabold text-blue-900 dark:text-white my-4 font-mono">
              {tokenDetails.token_number}
            </div>

            <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 capitalize">
              {tokenDetails.patient_name}
            </div>
            
            <span className={`inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
              tokenDetails.status === 'serving' 
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400 animate-pulse'
                : tokenDetails.status === 'done'
                ? 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800/80 dark:text-zinc-500'
                : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400'
            }`}>
              {tokenDetails.status === 'serving' ? 'You are being served!' : tokenDetails.status === 'done' ? 'Completed' : 'You are in queue'}
            </span>
          </div>

          {/* Stat details grid */}
          {tokenDetails.status === 'waiting' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-xs border border-zinc-100 dark:border-zinc-800 flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Patients Before You</span>
                  <span className="text-2xl font-bold text-zinc-800 dark:text-white font-mono">
                    {tokenDetails.patients_before}
                  </span>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-xs border border-zinc-100 dark:border-zinc-800 flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Estimated Turn</span>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 font-mono">
                    {tokenDetails.estimated_turn}
                  </span>
                </div>
              </div>

              {/* Notification Permission & Subscription */}
              <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 shadow-xs border border-zinc-100 dark:border-zinc-800 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600">
                      <Bell size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Alert Manager</h4>
                      <p className="text-[10px] text-zinc-400">Manage queue push notifications</p>
                    </div>
                  </div>
                  
                  {permission !== 'granted' && (
                    <button
                      onClick={requestNotificationPermission}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold uppercase transition-all"
                    >
                      <Shield size={12} />
                      Enable API
                    </button>
                  )}
                </div>

                {permission === 'granted' ? (
                  <div className="flex flex-col gap-3 mt-1 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setNotifyType('patients_left')}
                        className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                          notifyType === 'patients_left'
                            ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-900/50'
                            : 'border-zinc-200 dark:border-zinc-800 text-zinc-500'
                        }`}
                      >
                        Patients Left
                      </button>
                      <button
                        onClick={() => setNotifyType('doctor_arrival')}
                        className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                          notifyType === 'doctor_arrival'
                            ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-900/50'
                            : 'border-zinc-200 dark:border-zinc-800 text-zinc-500'
                        }`}
                      >
                        Doctor Arrival
                      </button>
                    </div>

                    {notifyType === 'patients_left' && (
                      <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-850">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Trigger alert when patients ahead &lt;=</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setThreshold(Math.max(1, threshold - 1))}
                            className="w-7 h-7 rounded bg-white dark:bg-zinc-800 text-zinc-700 border border-zinc-200 dark:border-zinc-750 flex items-center justify-center text-sm font-bold"
                          >
                            -
                          </button>
                          <span className="w-6 text-center text-sm font-bold font-mono text-zinc-800 dark:text-white">{threshold}</span>
                          <button
                            onClick={() => setThreshold(threshold + 1)}
                            className="w-7 h-7 rounded bg-white dark:bg-zinc-800 text-zinc-700 border border-zinc-200 dark:border-zinc-750 flex items-center justify-center text-sm font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleSubscribe}
                      disabled={isSubmittingSub}
                      className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        isSubscribed 
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                      }`}
                    >
                      {isSubmittingSub ? 'Subscribing...' : isSubscribed ? (
                        <>
                          <Check size={14} />
                          Alert Set!
                        </>
                      ) : (
                        <>
                          <Bell size={14} />
                          Subscribe to Alerts
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100/50 dark:border-amber-900/30">
                    <BellOff size={16} className="text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-amber-800 dark:text-amber-400 leading-normal">
                      Notification permissions are required to receive real-time alerts. Please click "Enable API" above or update your site settings.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-10 shadow-xs border border-zinc-100 dark:border-zinc-800 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center">
            <User size={20} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">No active token tracked</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-500 max-w-xs mt-1">
              Enter your token number in the form above to see your live place, estimated wait times, and register browser notifications.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
