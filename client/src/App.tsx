import React, { createContext, useContext, useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { Shield, Activity, LogOut, User, Cpu, AlertTriangle } from 'lucide-react'
import axios from 'axios'

// Import Pages (to be created next)
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AIAssistant from './pages/AIAssistant'
import NetworkAnalysis from './pages/NetworkAnalysis'
import AnalyticsPage from './pages/AnalyticsPage'
import HeatmapPage from './pages/HeatmapPage'
import OffenderProfiling from './pages/OffenderProfiling'
import CaseSimilarity from './pages/CaseSimilarity'
import InvestigationCopilot from './pages/InvestigationCopilot'
import ForecastingPage from './pages/ForecastingPage'
import SystemAudit from './pages/SystemAudit'
import RAGKnowledgeBase from './pages/RAGKnowledgeBase'

import Sidebar from './components/Sidebar'

// 1. Auth Context Creation
interface AuthContextType {
  token: string | null;
  username: string | null;
  role: string | null;
  login: (token: string, username: string, role: string) => void;
  logout: () => void;
  isKannada: boolean;
  setIsKannada: (val: boolean) => void;
  speechEnabled: boolean;
  setSpeechEnabled: (val: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

// 2. Main Auth Provider
const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('trinetra_token'));
  const [username, setUsername] = useState<string | null>(localStorage.getItem('trinetra_username'));
  const [role, setRole] = useState<string | null>(localStorage.getItem('trinetra_role'));
  const [isKannada, setIsKannada] = useState<boolean>(localStorage.getItem('trinetra_kannada') === 'true');
  const [speechEnabled, setSpeechEnabled] = useState<boolean>(localStorage.getItem('trinetra_speech') === 'true');

  const login = (newToken: string, newUsername: string, newRole: string) => {
    localStorage.setItem('trinetra_token', newToken);
    localStorage.setItem('trinetra_username', newUsername);
    localStorage.setItem('trinetra_role', newRole);
    setToken(newToken);
    setUsername(newUsername);
    setRole(newRole);
  };

  const logout = () => {
    localStorage.removeItem('trinetra_token');
    localStorage.removeItem('trinetra_username');
    localStorage.removeItem('trinetra_role');
    setToken(null);
    setUsername(null);
    setRole(null);
  };

  const handleSetIsKannada = (val: boolean) => {
    localStorage.setItem('trinetra_kannada', val ? 'true' : 'false');
    setIsKannada(val);
  };

  const handleSetSpeechEnabled = (val: boolean) => {
    localStorage.setItem('trinetra_speech', val ? 'true' : 'false');
    setSpeechEnabled(val);
  };

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          logout();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ 
      token, 
      username, 
      role, 
      login, 
      logout, 
      isKannada, 
      setIsKannada: handleSetIsKannada, 
      speechEnabled, 
      setSpeechEnabled: handleSetSpeechEnabled 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// 3. Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { token, role } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen bg-police-darkest flex flex-col items-center justify-center p-6 text-center">
        <div className="glass-card p-8 rounded-xl max-w-md border-red-500/20 text-police-text">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4 animate-bounce" />
          <h2 className="text-xl font-bold text-red-500 mb-2">ACCESS RESTRICTED</h2>
          <p className="text-police-muted mb-6">
            You do not have the security clearance required to view this intelligence ledger.
            Required clearances: <span className="text-police-accent font-semibold">{allowedRoles.join(", ")}</span>.
          </p>
          <button 
            onClick={() => window.history.back()}
            className="px-6 py-2 bg-police-neonBlue rounded-lg hover:bg-blue-600 transition font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// 4. Master Layout Shell (Includes Header and Sidebar)
const AppLayout: React.FC = () => {
  const { username, role, logout, isKannada, setIsKannada } = useAuth();
  const navigate = useNavigate();
  
  // Enterprise UI states
  const [commandOpen, setCommandOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const notifications = [
    { id: 1, text: "CCTV Alert: Suspect Sunil Gowda identified in Mysore beats.", time: "10m ago", critical: true },
    { id: 2, text: "System check: Postgres & Neo4j sync completed successfully.", time: "42m ago", critical: false },
    { id: 3, text: "Forecast model generated monthly crime indices for August.", time: "2h ago", critical: false }
  ];

  // Listen for Ctrl + K & Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setCommandOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const commandItems = [
    { name: "Go to Dashboard", path: "/", cat: "Navigation" },
    { name: "Go to AI Assistant", path: "/chat", cat: "Navigation" },
    { name: "Go to Knowledge Graph", path: "/graph", cat: "Navigation" },
    { name: "Go to Crime Forecasts", path: "/forecast", cat: "Navigation" },
    { name: "Go to Case Similarity", path: "/similarity", cat: "Navigation" },
    { name: "Go to Offender Profiling", path: "/offenders", cat: "Navigation" },
    { name: "Go to System Audit Log", path: "/audit", cat: "Navigation" },
    { name: "Inspect Suspect: Sunil Gowda", path: "/offenders", cat: "Intelligence" },
    { name: "Inspect Suspect: Raju Kappe", path: "/offenders", cat: "Intelligence" },
    { name: "Inspect Suspect: Vinay Lal", path: "/offenders", cat: "Intelligence" }
  ];

  const filteredCommands = commandItems.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.cat.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-police-darkest text-police-text overflow-hidden font-sans relative">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-white/5 bg-police-darkest/90 backdrop-blur flex items-center justify-between px-6 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <Cpu className="h-5 w-5 text-police-accent animate-pulse" />
            <h1 className="text-lg font-bold tracking-wider font-mono text-transparent bg-clip-text bg-gradient-to-r from-police-accent to-blue-400">
              TRINETRA AI
            </h1>
            <span className="text-xs px-2 py-0.5 bg-police-accent/15 border border-police-accent/25 text-police-accent rounded uppercase tracking-widest font-mono">
              Demo System
            </span>
          </div>

          <div className="flex items-center gap-5">
            {/* Quick search shortcut hint */}
            <button 
              onClick={() => setCommandOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/5 hover:border-white/10 rounded-lg text-xs font-mono text-police-muted transition"
            >
              <span>{isKannada ? "ಪ್ಲಾಟ್‌ಫಾರ್ಮ್ ಹುಡುಕಿ..." : "Search platform..."}</span>
              <span className="bg-police-darkest border border-white/10 px-1.5 py-0.5 rounded text-[10px]">Ctrl+K</span>
            </button>

            {/* Language Selector Toggle */}
            <div className="flex gap-1 bg-white/5 p-1 border border-white/5 rounded-lg text-[9.5px] font-mono select-none">
              <button
                onClick={() => setIsKannada(false)}
                className={`px-2 py-0.5 rounded transition ${!isKannada ? 'bg-police-accent/15 border border-police-accent/25 text-police-accent font-bold' : 'text-police-muted hover:text-white'}`}
              >
                EN
              </button>
              <button
                onClick={() => setIsKannada(true)}
                className={`px-2 py-0.5 rounded transition ${isKannada ? 'bg-police-accent/15 border-police-accent/25 text-police-accent font-bold animate-pulse' : 'text-police-muted hover:text-white'}`}
              >
                ಕನ್ನಡ
              </button>
            </div>

            {/* Notification Bell Center */}
            <div className="relative">
              <button 
                onClick={() => setBellOpen(!bellOpen)}
                className="p-2 text-police-muted hover:text-white border border-transparent hover:border-white/10 rounded-lg transition relative"
              >
                <div className="h-1.5 w-1.5 bg-red-500 rounded-full absolute top-1.5 right-1.5 animate-ping"></div>
                <span className="h-1.5 w-1.5 bg-red-500 rounded-full absolute top-1.5 right-1.5"></span>
                <span className="text-xs font-mono">{isKannada ? "ಎಚ್ಚರಿಕೆಗಳು" : "Alerts"}</span>
              </button>

              {/* Notification Popover Dropdown */}
              {bellOpen && (
                <div className="absolute right-0 mt-2 w-72 glass-panel border-white/10 rounded-xl p-3 z-50 space-y-2 text-xs font-mono shadow-xl">
                  <div className="font-bold text-white border-b border-white/5 pb-1.5">{isKannada ? "ಇತ್ತೀಚಿನ ಬೆದರಿಕೆಗಳು" : "RECENT THREAT EVENTS"}</div>
                  <div className="space-y-2">
                    {notifications.map(n => (
                      <div key={n.id} className={`p-2 rounded border ${n.critical ? 'bg-red-500/5 border-red-500/10 text-red-400' : 'bg-white/5 border-white/5 text-police-text'}`}>
                        <p>{n.text}</p>
                        <span className="text-[8px] text-police-muted block mt-1">{n.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pr-4 border-r border-white/5">
              <div className="h-8 w-8 rounded-full bg-police-accent/15 border border-police-accent/30 flex items-center justify-center">
                <User className="h-4 w-4 text-police-accent" />
              </div>
              <div className="text-left leading-tight hidden md:block">
                <div className="text-sm font-semibold text-white">{username}</div>
                <div className="text-[10px] text-police-accent font-mono uppercase tracking-widest">{role}</div>
              </div>
            </div>

            <button 
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="text-police-muted hover:text-red-500 flex items-center gap-2 text-sm transition-colors duration-150 font-medium"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{isKannada ? "ನಿಷ್ಕ್ರಮಿಸು" : "Logout"}</span>
            </button>
          </div>
        </header>

        {/* Dynamic Nested Route Rendering */}
        <main className="flex-1 overflow-hidden relative">
          {/* Animated cyber grid background */}
          <div className="absolute inset-0 bg-[radial-gradient(#0c1e35_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none"></div>
          <div className="h-full overflow-y-auto">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/chat" element={<AIAssistant />} />
              <Route path="/graph" element={<NetworkAnalysis />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/heatmap" element={<HeatmapPage />} />
              <Route path="/offenders" element={<OffenderProfiling />} />
              <Route path="/similarity" element={<CaseSimilarity />} />
              <Route path="/copilot" element={<InvestigationCopilot />} />
              <Route path="/forecast" element={<ForecastingPage />} />
              <Route path="/knowledge" element={<RAGKnowledgeBase />} />
              <Route 
                path="/audit" 
                element={
                  <ProtectedRoute allowedRoles={["Administrator"]}>
                    <SystemAudit />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </div>
        </main>
      </div>

      {/* Global command palette modal overlay */}
      {commandOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg glass-panel border-white/10 rounded-2xl overflow-hidden shadow-2xl p-4 flex flex-col gap-3 font-mono">
            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
              <span className="text-police-accent">Search & Navigate:</span>
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Type command or suspect name..." 
                className="flex-1 bg-transparent border-none text-white focus:outline-none text-sm placeholder-police-muted"
                autoFocus
              />
              <button 
                onClick={() => setCommandOpen(false)}
                className="text-police-muted hover:text-white text-xs"
              >
                [Esc]
              </button>
            </div>
            
            <div className="max-h-60 overflow-y-auto space-y-1">
              {filteredCommands.length > 0 ? (
                filteredCommands.map((cmd, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      navigate(cmd.path);
                      setCommandOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-police-accent/10 hover:text-police-accent rounded-lg text-xs flex justify-between items-center transition"
                  >
                    <span>{cmd.name}</span>
                    <span className="text-[10px] text-police-muted uppercase border border-white/5 px-1.5 py-0.5 rounded">{cmd.cat}</span>
                  </button>
                ))
              ) : (
                <div className="text-center text-police-muted text-xs py-4">No matching command found.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 5. App Router Shell
const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route 
            path="/*" 
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
