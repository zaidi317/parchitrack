'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Home, ListTodo, Ticket, Stethoscope, User, Bell } from 'lucide-react';
import HomeTab from '../../../components/HomeTab';
import QueueTab from '../../../components/QueueTab';
import MyTokenTab from '../../../components/MyTokenTab';
import DoctorTab from '../../../components/DoctorTab';
import ProfileTab from '../../../components/ProfileTab';

export default function DynamicClinicPage() {
  const params = useParams();
  const clinicId = params?.id ? String(params.id) : '1';

  const [activeTab, setActiveTab] = useState<number>(0);
  const [myTokenNumber, setMyTokenNumber] = useState<number | null>(null);
  
  // App States
  const [queueData, setQueueData] = useState({
    current_token: null as number | null,
    next_token: null as number | null,
    patients_waiting: 0,
    queue_speed: 'Normal',
    last_updated: new Date().toISOString()
  });

  const [clinicStatus, setClinicStatus] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // WebSocket & Polling refs
  const wsRef = useRef<WebSocket | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  // Fetch initial token tracked from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`parchitrack_my_token_${clinicId}`);
      if (stored) {
        setMyTokenNumber(parseInt(stored, 10));
      } else {
        // Seed default patient token
        setMyTokenNumber(27);
        localStorage.setItem(`parchitrack_my_token_${clinicId}`, '27');
      }
    }
  }, [clinicId]);

  const handleSetMyTokenNumber = (num: number) => {
    setMyTokenNumber(num);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`parchitrack_my_token_${clinicId}`, num.toString());
    }
  };

  // Sync API function
  const fetchEverything = async () => {
    try {
      const [queueRes, statusRes, tokensRes, statsRes] = await Promise.all([
        fetch(`http://localhost:8000/api/clinic/${clinicId}/queue`),
        fetch(`http://localhost:8000/api/clinic/${clinicId}/status`),
        fetch(`http://localhost:8000/api/clinic/${clinicId}/tokens`),
        fetch(`http://localhost:8000/api/clinic/${clinicId}/consultation-stats`)
      ]);

      if (queueRes.ok) {
        const data = await queueRes.json();
        setQueueData({
          current_token: data.current_token,
          next_token: data.next_token,
          patients_waiting: data.patients_waiting,
          queue_speed: data.queue_speed,
          last_updated: data.last_updated
        });
      }

      if (statusRes.ok) {
        const data = await statusRes.json();
        setClinicStatus(data);
      }

      if (tokensRes.ok) {
        const data = await tokensRes.json();
        setTokens(data);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setAnalytics(data);
      }
    } catch (e) {
      console.error('Error fetching REST status:', e);
    } finally {
      setLoading(false);
    }
  };

  // Check and trigger notifications if queue moves
  useEffect(() => {
    if (myTokenNumber && queueData.current_token && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        const currentNum = queueData.current_token;
        if (currentNum === myTokenNumber) {
          new Notification("It's Your Turn!", {
            body: `Token number ${myTokenNumber} is now being served! Please proceed immediately.`,
            icon: "/favicon.ico",
            requireInteraction: true
          });
        } else if (myTokenNumber - currentNum > 0 && myTokenNumber - currentNum <= 3) {
          new Notification("ParchiTrack Queue Update", {
            body: `Your turn is near! Only ${myTokenNumber - currentNum} patients ahead of you. Now serving token ${currentNum}.`,
            icon: "/favicon.ico"
          });
        }
      }
    }
  }, [queueData.current_token, myTokenNumber]);

  // Connect WebSocket & fallback polling
  useEffect(() => {
    const connectWS = () => {
      if (wsRef.current) return;
      
      const ws = new WebSocket(`ws://localhost:8000/ws/clinic/${clinicId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'INITIAL_STATE' || message.type === 'QUEUE_UPDATE') {
            fetchEverything();
          }
        } catch (e) {
          console.error('Error parsing WS data:', e);
        }
      };

      ws.onerror = () => {
        setWsConnected(false);
      };

      ws.onclose = () => {
        setWsConnected(false);
        wsRef.current = null;
        startPolling();
        setTimeout(connectWS, 5000);
      };
    };

    const startPolling = () => {
      if (pollIntervalRef.current) return;
      pollIntervalRef.current = setInterval(() => {
        fetchEverything();
      }, 10000);
    };

    // Initialize
    fetchEverything();
    connectWS();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [clinicId]);

  const triggerRefresh = () => {
    fetchEverything();
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 0:
        return <HomeTab queueData={queueData} myTokenNumber={myTokenNumber} />;
      case 1:
        return <QueueTab tokens={tokens} myTokenNumber={myTokenNumber} />;
      case 2:
        return (
          <MyTokenTab
            myTokenNumber={myTokenNumber}
            setMyTokenNumber={handleSetMyTokenNumber}
            queueData={queueData}
          />
        );
      case 3:
        return (
          <DoctorTab
            clinicStatus={clinicStatus}
            analytics={analytics}
            loading={loading}
          />
        );
      case 4:
        return (
          <ProfileTab
            myTokenNumber={myTokenNumber}
            setMyTokenNumber={handleSetMyTokenNumber}
            triggerRefresh={triggerRefresh}
          />
        );
      default:
        return <HomeTab queueData={queueData} myTokenNumber={myTokenNumber} />;
    }
  };

  const tabLabels = ['Home', 'Queue', 'My Token', 'Doctor', 'Profile'];
  const tabIcons = [
    <Home size={20} />,
    <ListTodo size={20} />,
    <Ticket size={20} />,
    <Stethoscope size={20} />,
    <User size={20} />
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-0 sm:p-6 font-sans">
      {/* Phone chassis shell mock container */}
      <div className="w-full max-w-[420px] h-screen sm:h-[860px] bg-gradient-to-br from-blue-50/80 via-sky-50/50 to-blue-100/60 dark:from-zinc-950 dark:via-zinc-900/90 dark:to-zinc-950 sm:rounded-[36px] sm:shadow-2xl border-0 sm:border-[8px] border-zinc-800 dark:border-zinc-800 flex flex-col overflow-hidden relative shadow-blue-500/10">
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Header Card Area */}
          <header className="bg-white dark:bg-zinc-900/95 px-6 pt-5 pb-4 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between z-10">
            <div className="flex flex-col gap-0.5">
              <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-1">
                ParchiTrack
              </h1>
              <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                {clinicStatus?.name || 'Clinic Waiting Room'}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.8 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-150/40 dark:border-emerald-900/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                Live
              </span>
              
              <button 
                onClick={() => {
                  if (typeof window !== 'undefined' && 'Notification' in window) {
                    Notification.requestPermission();
                  }
                }}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all relative"
              >
                <Bell size={18} />
                {wsConnected && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
                )}
              </button>
            </div>
          </header>

          {/* Dynamic Inner Tab View */}
          <main className="flex-1 overflow-y-auto px-5 py-4 pb-20">
            {renderActiveTab()}
          </main>
        </div>

        {/* Bottom Tab Bar Navigation */}
        <nav className="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-zinc-900/95 border-t border-zinc-100 dark:border-zinc-800/80 px-4 py-2 flex items-center justify-between pb-6 sm:pb-3 backdrop-blur-xs z-10">
          {tabLabels.map((label, index) => {
            const isActive = activeTab === index;
            return (
              <button
                key={label}
                onClick={() => setActiveTab(index)}
                className={`flex flex-col items-center gap-1 py-1 px-3.5 rounded-xl transition-all ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
                    : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-350'
                }`}
              >
                <div className={`transition-all duration-300 ${isActive ? 'scale-110 text-blue-600 dark:text-blue-400' : ''}`}>
                  {tabIcons[index]}
                </div>
                <span className="text-[9px] tracking-wide font-medium">
                  {label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
