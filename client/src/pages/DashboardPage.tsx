import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import axios from 'axios'
import { 
  ShieldAlert, 
  FileText, 
  TrendingUp, 
  Users, 
  MapPin, 
  AlertTriangle, 
  Zap, 
  ArrowRight,
  Database,
  Terminal,
  Activity
} from 'lucide-react'
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import { useAuth } from '../App'

const COLORS = ['#00f0ff', '#f59e0b', '#e11d48', '#10b981', '#8b5cf6'];

const DashboardPage: React.FC = () => {
  const { token, isKannada } = useAuth();
  
  const translations: Record<string, string> = {
    'COMMAND OVERVIEW': 'ಕಮಾಂಡ್ ಅವಲೋಕನ',
    'Real-time crime intelligence dashboard for Karnataka State Command Center.': 'ಕರ್ನಾಟಕ ರಾಜ್ಯ ಕಮಾಂಡ್ ಸೆಂಟರ್‌ಗಾಗಿ ನೈಜ-ಸಮಯದ ಅಪರಾಧ ಗುಪ್ತಚರ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್.',
    'System Status: SECURE & ACTIVE': 'ಸಿಸ್ಟಮ್ ಸ್ಥಿತಿ: ಸುರಕ್ಷಿತ ಮತ್ತು ಸಕ್ರಿಯ',
    'CRITICAL OPERATIONS ADVISORY': 'ನಿರ್ಣಾಯಕ ಕಾರ್ಯಾಚರಣೆಗಳ ಸಲಹೆ',
    "Today's Ledger (FIRs)": 'ಇಂದಿನ ಎಫ್‌ಐಆರ್ ದಾಖಲೆಗಳು',
    'Under Active Investigation': 'ಸಕ್ರಿಯ ತನಿಖೆಯಲ್ಲಿದೆ',
    'Active Warrants': 'ಸಕ್ರಿಯ ವಾರಂಟ್‌ಗಳು',
    'Identified Repeat Suspects': 'ಗುರುತಿಸಲಾದ ಪುನರಾವರ್ತಿತ ಶಂಕಿತರು',
    'Priority Intelligence Feed': 'ಆದ್ಯತೆಯ ಗುಪ್ತಚರ ಫೀಡ್',
    'Surveillance Hotlist': 'ಕಣ್ಗಾವಲು ಪಟ್ಟಿ',
    'RESOURCE ALLOCATION': 'ಸಂಪನ್ಮೂಲ ಹಂಚಿಕೆ',
    'Beat Patrolling Coverage': 'ಬೀಟ್ ಪೆಟ್ರೋಲಿಂಗ್ ವ್ಯಾಪ್ತಿ',
    'CCTV Node Availability': 'CCTV ನೋಡ್ ಲಭ್ಯತೆ',
    'Crime Classification Ratio': 'ಅಪರಾಧ ವರ್ಗೀಕರಣ ಅನುಪಾತ',
    'District Incidence Ranking': 'ಜಿಲ್ಲಾವಾರು ಅಪರಾಧ ಸೂಚ್ಯಂಕ ಶ್ರೇಯಾಂಕ',
    'Active Incident Ledger': 'ಸಕ್ರಿಯ ಅಪರಾಧಗಳ ದಾಖಲೆ ಪುಸ್ತಕ',
    'Case No': 'ಪ್ರಕರಣ ಸಂಖ್ಯೆ',
    'Classification': 'ವರ್ಗೀಕರಣ',
    'Police Station': 'ಪೊಲೀಸ್ ಠಾಣೆ',
    'Registered': 'ನೋಂದಾಯಿಸಲಾಗಿದೆ',
    'Status': 'ಸ್ಥಿತಿ',
    'Gravity': 'ಗುರುತ್ವ',
    'LIVE LOG STREAM': 'ನೈಜ-ಸಮಯದ ಲಾಗ್ ಸ್ಟ್ರೀಮ್',
    'AI Decision Agent Pulse': 'AI ಕಾರ್ಯಾಚರಣೆ ಪಲ್ಸ್',
    'ACTIVE': 'ಸಕ್ರಿಯ',
    'Under Investigation': 'ತನಿಖೆಯಲ್ಲಿದೆ',
    'Chargesheeted': 'ಚಾರ್ಜ್‌ಶೀಟ್ ಆಗಿದೆ',
    'Heinous': 'ಘೋರ ಅಪರಾಧ',
    'Non-Heinous': 'ಸಾಮಾನ್ಯ ಅಪರಾಧ'
  };

  const t = (key: string) => {
    return isKannada ? (translations[key] || key) : key;
  };

  const [metrics, setMetrics] = useState<any>({
    total_cases: 0,
    under_investigation: 0,
    chargesheeted: 0,
    heinous_crimes: 0,
    repeat_offenders_count: 0,
    recent_cases: []
  });
  
  const [categories, setCategories] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [offenders, setOffenders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Monospace feed logs
  const [logs, setLogs] = useState<string[]>([
    "SYS_START: Establishing connection to Trinetra operational matrices...",
    "DB_HEALTH: Postgres CaseMaster ledger online. 25 primary registers found.",
    "DB_HEALTH: Neo4j Cypher Daemon listener initialized on port 7687.",
    "DB_HEALTH: Qdrant vector spaces populated: collection 'cases_collection' OK.",
    "INTEL: Agent orchestrator ready. Natural language parser mapping set to 302/379/395.",
  ]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        
        const [overviewRes, catRes, distRes, offenderRes] = await Promise.all([
          axios.get('/api/analytics/overview', { headers }),
          axios.get('/api/analytics/categories', { headers }),
          axios.get('/api/analytics/districts', { headers }),
          axios.get('/api/analytics/repeat-offenders', { headers })
        ]);
        
        setMetrics(overviewRes.data);
        setCategories(catRes.data);
        setDistricts(distRes.data);
        setOffenders(offenderRes.data);
      } catch (err) {
        console.error("Failed to load dashboard statistics:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [token]);

  // Periodic scrolling terminal logs simulation
  useEffect(() => {
    const logInterval = setInterval(() => {
      const mockEvents = [
        "PARSING Case facts for newly logged FIR dacoity report...",
        "VECTOR_SEARCH: Qdrant similarity lookup matched index with 87.5% score.",
        "CYPHER: shortestPath((a:Accused)-[*]-(b:Accused)) solved. Graph updated.",
        "RAG: Chunk parsing IPC Section 395 (Punishment for dacoity).",
        "SECURITY: Login credentials validated for session token [INVESTIGATOR].",
        "AUDIT: PDF report compilation initiated for case index 202600001.",
      ];
      const randomMsg = mockEvents[Math.floor(Math.random() * mockEvents.length)];
      const timestamp = new Date().toLocaleTimeString();
      setLogs((prev) => [...prev.slice(-8), `[${timestamp}] ${randomMsg}`]);
    }, 4500);

    return () => clearInterval(logInterval);
  }, []);

  const systemHealth = [
    { name: "Postgres Core", ping: "2ms", status: "ONLINE", color: "text-[#10b981]" },
    { name: "Neo4j Graph", ping: "5ms", status: "ONLINE", color: "text-[#10b981]" },
    { name: "Qdrant Vector", ping: "7ms", status: "ONLINE", color: "text-[#10b981]" },
    { name: "Redis Cache", ping: "1ms", status: "ONLINE", color: "text-[#10b981]" },
  ];

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-police-darkest">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 border-4 border-police-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="text-sm font-mono text-police-accent uppercase tracking-widest">Accessing Intelligence Ledgers...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-wide font-mono text-white">{t("COMMAND OVERVIEW")}</h2>
          <p className="text-xs text-police-muted">{t("Real-time crime intelligence dashboard for Karnataka State Command Center.")}</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-police-accent px-3 py-1.5 bg-police-accent/5 border border-police-accent/15 rounded-lg">
          <Zap className="h-4 w-4 animate-pulse" />
          <span>{t("System Status: SECURE & ACTIVE")}</span>
        </div>
      </div>

      {/* 2. Critical Threat Alerts Banner */}
      <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 animate-threat-card text-xs font-mono flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 animate-bounce" />
        <div className="space-y-1">
          <div className="font-bold text-red-500 uppercase tracking-wider">{t("CRITICAL OPERATIONS ADVISORY")}</div>
          <p className="text-police-text">
            {isKannada 
              ? "ಶಂಕಿತ ಸುನಿಲ್ ಗೌಡ (ಅಪಾಯದ ಅಂಕ 9.5) ಸಹ-ಆರೋಪಿ ರಾಜು ಕಪ್ಪೆ ಜೊತೆಗೂಡಿ ಅಪರಾಧ ಎಸಗಿರುವುದು ಪತ್ತೆಯಾಗಿದೆ. ಕಬ್ಬನ್ ಪಾರ್ಕ್ ಪೊಲೀಸ್ ಠಾಣೆ ವ್ಯಾಪ್ತಿಯಲ್ಲಿ ಬಹು-ಹಂತದ ಗ್ಯಾಂಗ್ ಜಾಲ ಪತ್ತೆಯಾಗಿದೆ. ಜಾಲದ ಶಾರ್ಟೆಸ್ಟ್ ಪಾತ್ ತಕ್ಷಣ ಪರಿಶೀಲಿಸಿ." 
              : "Suspect Sunil Gowda (Risk Score 9.5) co-offending with Raju Kappe identified. Multi-hop gang structure detected in Cubbon Park PS jurisdiction. Focus shortest-path networks immediately."}
          </p>
        </div>
      </div>

      {/* 3. System Health status grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {systemHealth.map((sh, idx) => (
          <div key={idx} className="glass-card p-3 rounded-xl border-white/5 flex items-center justify-between">
            <div>
              <div className="text-[9px] uppercase font-mono tracking-widest text-police-muted">{sh.name}</div>
              <div className="text-xs font-mono font-bold text-white mt-0.5">{sh.ping} latency</div>
            </div>
            <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-emerald-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{t("ONLINE")}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 4. Key Statistics Indicator Cards & Warrants */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { 
            title: t("Today's Ledger (FIRs)"), 
            value: metrics.total_cases, 
            trend: "+8.4%", 
            trendColor: "text-emerald-500", 
            sparkline: "M0,15 L10,12 L20,18 L30,5 L40,8 L50,2",
            sparklineColor: "#00f0ff",
            icon: <FileText className="h-5 w-5 text-police-accent" />, 
            color: "border-police-accent/10" 
          },
          { 
            title: t("Under Active Investigation"), 
            value: metrics.under_investigation, 
            trend: "+3.2%", 
            trendColor: "text-emerald-500", 
            sparkline: "M0,18 L10,14 L20,12 L30,8 L40,10 L50,5",
            sparklineColor: "#f59e0b",
            icon: <TrendingUp className="h-5 w-5 text-police-gold" />, 
            color: "border-police-gold/10" 
          },
          { 
            title: t("Active Warrants"), 
            value: isKannada ? "೧೪ ಬಾಕಿ ಇದೆ" : "14 Pending", 
            trend: "-12.5%", 
            trendColor: "text-red-500", 
            sparkline: "M0,2 L10,5 L20,12 L30,10 L40,15 L50,18",
            sparklineColor: "#e11d48",
            icon: <ShieldAlert className="h-5 w-5 text-red-500" />, 
            color: "border-red-500/10" 
          },
          { 
            title: t("Identified Repeat Suspects"), 
            value: metrics.repeat_offenders_count, 
            trend: "+1.8%", 
            trendColor: "text-emerald-500", 
            sparkline: "M0,15 L10,10 L20,12 L30,5 L40,2 L50,8",
            sparklineColor: "#10b981",
            icon: <Users className="h-5 w-5 text-yellow-500" />, 
            color: "border-yellow-500/10" 
          }
        ].map((card, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`glass-card p-4 rounded-xl flex items-center justify-between border ${card.color}`}
          >
            <div className="space-y-1">
              <div className="text-[10px] uppercase font-mono tracking-wider text-police-muted">{card.title}</div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold tracking-tight text-white">{card.value}</span>
                <span className={`text-[9px] font-mono font-bold ${card.trendColor}`}>{card.trend}</span>
              </div>
              {/* Dynamic Sparkline */}
              <div className="h-5 w-16 pt-1">
                <svg className="h-full w-full overflow-visible">
                  <path 
                    d={card.sparkline} 
                    fill="none" 
                    stroke={card.sparklineColor} 
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
            <div className="p-2 bg-white/5 rounded-lg border border-white/5 shrink-0 ml-2">{card.icon}</div>
          </motion.div>
        ))}
      </div>

      {/* Live AI Recommendations & Alerts / Priority Intelligence Feed */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-4 rounded-xl border-police-accent/10 flex flex-col justify-between col-span-2 font-mono text-xs">
          <div>
            <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
              <h3 className="text-xs font-bold tracking-wider text-police-accent uppercase flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-red-500 animate-pulse" />
                <span>{t("Priority Intelligence Feed")}</span>
              </h3>
              <span className="text-[8px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-semibold uppercase">{t("Surveillance Hotlist")}</span>
            </div>
            
            <div className="space-y-2.5">
              {[
                { time: "22:45", event: isKannada ? "ಹೊಸ ನೋಂದಣಿ" : "NEW REGISTRATION", details: isKannada ? "ಎಫ್‌ಐಆರ್ 202600021 (ಕಬ್ಬನ್ ಪಾರ್ಕ್ ಪೊಲೀಸ್ ಠಾಣೆ) ಸುನಿಲ್ ಗೌಡ ಅವರ ವಿರುದ್ಧ ದಾಖಲಾಗಿದೆ." : "FIR 202600021 (Dacoity at Cubbon Park PS) registered involving primary suspect Sunil Gowda.", priority: isKannada ? "ನಿರ್ಣಾಯಕ" : "CRITICAL", color: "text-red-400 bg-red-500/5 border-red-500/15" },
                { time: "20:12", event: isKannada ? "ಶಂಕಿತ ಪತ್ತೆ" : "WANTED SIGHTING", details: isKannada ? "ಬೆಂಗಳೂರು ಹೆದ್ದಾರಿ ನಿರ್ಗಮನದ ಬಳಿ ರಾಜು ಕಪ್ಪೆ ಅವರ ಸಿಸಿಟಿವಿ ಮುಖ ಹೋಲಿಕೆ ಪತ್ತೆಯಾಗಿದೆ." : "CCTV facial match trigger logged for offender Raju Kappe near Bangalore Highway exit.", priority: isKannada ? "ಹೆಚ್ಚು" : "HIGH", color: "text-yellow-400 bg-yellow-500/5 border-yellow-500/15" },
                { time: "18:30", event: isKannada ? "ನ್ಯಾಯಾಲಯ ಗಡುವು" : "COURT DEADLINE", details: isKannada ? "ಶಂಕಿತ ಕರಣ್ ಮೆಹ್ತಾ ಅವರ ಚಾರ್ಜ್‌ಶೀಟ್ ಸಲ್ಲಿಕೆ ಗಡುವು 48 ಗಂಟೆಗಳಲ್ಲಿ ಮುಕ್ತಾಯಗೊಳ್ಳುತ್ತದೆ." : "Chargesheet filing window expires in 48 hours for suspect Karan Mehta.", priority: isKannada ? "ಹೆಚ್ಚು" : "HIGH", color: "text-yellow-400 bg-yellow-500/5 border-yellow-500/15" },
                { time: "15:14", event: isKannada ? "ಅಪರಾಧ ಸೂಚನೆ" : "ANOMALY SIGHTING", details: isKannada ? "ಮಂಗಳೂರು ಕೇಂದ್ರ ಭಾಗದಲ್ಲಿ 15% ಅಪರಾಧ ಸಾಂದ್ರತೆಯ ಹೆಚ್ಚಳ ಮುನ್ಸೂಚನೆ ಪತ್ತೆಯಾಗಿದೆ." : "Forecasting anomaly detected: Sudden 15% crime density spike projected in Mangalore Central.", priority: isKannada ? "ಮಧ್ಯಮ" : "MEDIUM", color: "text-police-accent bg-police-accent/5 border-police-accent/15" }
              ].map((feed, i) => (
                <div key={i} className={`p-2.5 border rounded-lg flex items-start justify-between gap-3 ${feed.color}`}>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] opacity-60 font-bold">{feed.time}</span>
                      <span className="text-[9px] font-bold tracking-wider uppercase">{feed.event}</span>
                    </div>
                    <p className="text-[10px] text-police-text leading-tight">{feed.details}</p>
                  </div>
                  <span className="text-[8px] px-1.5 py-0.5 bg-white/5 border border-white/5 rounded font-bold shrink-0">{feed.priority}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-card p-4 rounded-xl border-police-gold/15 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold font-mono tracking-wider text-police-gold uppercase mb-2">{t("RESOURCE ALLOCATION")}</h3>
            <div className="space-y-2 text-[11px] font-mono">
              <div className="flex justify-between text-police-text">
                <span>{t("Beat Patrolling Coverage")}</span>
                <span className="text-police-accent font-bold">92%</span>
              </div>
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                <div className="bg-police-accent h-full w-[92%]"></div>
              </div>
              <div className="flex justify-between text-police-text mt-2">
                <span>{t("CCTV Node Availability")}</span>
                <span className="text-emerald-500 font-bold">98.4%</span>
              </div>
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-[98.4%]"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Charts & Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Crime Head Breakdown (Pie) */}
        <div className="glass-card p-4 rounded-xl flex flex-col justify-between h-80">
          <div>
            <h3 className="text-xs font-bold font-mono tracking-wider text-white uppercase mb-3">{t("Crime Classification Ratio")}</h3>
          </div>
          <div className="flex-1 min-h-[160px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categories}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {categories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0e1726', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', fontFamily: 'JetBrains Mono', fontSize: '10px' }}
                  itemStyle={{ color: '#00f0ff' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-[9px] uppercase font-mono text-police-muted font-bold">{isKannada ? "ಅಪರಾಧ ವಿಧ" : "Crime Head"}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[9px] font-mono mt-2">
            {categories.map((c, i) => (
              <div key={i} className="flex items-center gap-1.5 text-police-muted">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                <span className="truncate">{c.category}: {c.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* District Rankings (Bar) */}
        <div className="glass-card p-4 rounded-xl flex flex-col justify-between h-80 lg:col-span-2">
          <div>
            <h3 className="text-xs font-bold font-mono tracking-wider text-white uppercase mb-3">{t("District Incidence Ranking")}</h3>
          </div>
          <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={districts} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <XAxis dataKey="district" stroke="#94a3b8" fontSize={9} fontFamily="JetBrains Mono" />
                <YAxis stroke="#94a3b8" fontSize={9} fontFamily="JetBrains Mono" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0e1726', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', fontFamily: 'JetBrains Mono', fontSize: '10px' }}
                  labelStyle={{ color: '#00f0ff' }}
                />
                <Bar dataKey="count" fill="url(#cyanGradient)">
                  {districts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#00f0ff' : '#0e1726'} stroke="#00f0ff" strokeWidth={0.5} />
                  ))}
                </Bar>
                <defs>
                  <linearGradient id="cyanGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00f0ff" stopOpacity={0.6}/>
                    <stop offset="100%" stopColor="#00f0ff" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 6. Active Queue & Live Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Cases Table */}
        <div className="glass-card p-4 rounded-xl lg:col-span-2 flex flex-col justify-between min-h-[300px]">
          <div>
            <h3 className="text-xs font-bold font-mono tracking-wider text-white uppercase mb-3">{t("Active Incident Ledger")}</h3>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/5 text-police-muted">
                  <th className="py-2 pr-2">{t("Case No")}</th>
                  <th className="py-2 pr-2">{t("Classification")}</th>
                  <th className="py-2 pr-2">{t("Police Station")}</th>
                  <th className="py-2 pr-2">{t("Registered")}</th>
                  <th className="py-2 pr-2">{t("Status")}</th>
                  <th className="py-2">{t("Gravity")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-police-text">
                {metrics.recent_cases.map((c: any, i: number) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
                    <td className="py-2.5 pr-2 font-semibold text-police-accent">{c.case_no}</td>
                    <td className="py-2.5 pr-2">{c.category}</td>
                    <td className="py-2.5 pr-2 text-police-muted">{c.station}</td>
                    <td className="py-2.5 pr-2 text-police-muted">{c.date}</td>
                    <td className="py-2.5 pr-2">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                        c.status === 'Under Investigation' ? 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/25' : 'bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/25'
                      }`}>
                        {t(c.status)}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                        c.gravity === 'Heinous' ? 'bg-red-500/10 text-red-500 border border-red-500/20 font-bold' : 'bg-police-muted/10 text-police-muted'
                      }`}>
                        {t(c.gravity)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Monospace Terminal Intel Ticker */}
        <div className="glass-card p-4 rounded-xl flex flex-col justify-between min-h-[300px] border-police-accent/15">
          <div>
            <h3 className="text-xs font-bold font-mono tracking-wider text-white uppercase mb-3 flex items-center gap-1.5">
              <Terminal className="h-4.5 w-4.5 text-police-accent" />
              <span>{t("LIVE LOG STREAM")}</span>
            </h3>
            
            <div className="bg-black/40 border border-white/5 rounded-lg p-3 font-mono text-[9px] text-[#00f0ff] h-52 overflow-y-auto space-y-2 leading-relaxed">
              {logs.map((log, idx) => (
                <div key={idx} className="truncate select-text">
                  <span className="text-police-muted">&gt;</span> {log}
                </div>
              ))}
            </div>
          </div>
          
          <div className="p-2.5 bg-police-accent/5 border border-police-accent/10 rounded-lg flex items-center justify-between text-[10px] font-mono">
            <span className="text-police-accent">{t("AI Decision Agent Pulse")}</span>
            <div className="flex items-center gap-1.5 text-police-accent">
              <Activity className="h-3.5 w-3.5 animate-pulse" />
              <span>{t("ACTIVE")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
