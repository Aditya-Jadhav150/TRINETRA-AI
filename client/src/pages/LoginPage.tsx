import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { Shield, Lock, User, Info, Cpu, Eye, EyeOff, CheckCircle2, ShieldCheck, Database } from 'lucide-react'
import { useAuth } from '../App'

const LoginPage: React.FC = () => {
  const { login, isKannada } = useAuth();
  const navigate = useNavigate();

  const translations: Record<string, string> = {
    'Node Status Overview': 'ನೋಡ್ ಸ್ಥಿತಿ ಅವಲೋಕನ',
    'Seeing Beyond the Evidence.': 'ಸಾಕ್ಷ್ಯಾಧಾರಗಳನ್ನು ಮೀರಿ ನೋಡುವುದು.',
    'Encryption Standard': 'ಎನ್‌ಕ್ರಿಪ್ಶನ್ ಗುಣಮಟ್ಟ',
    'AI Processor': 'ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ ಪ್ರೊಸೆಸರ್',
    'Relational Ledger': 'ಸಂಬಂಧಿತ ಲೆಡ್ಜರ್',
    'Graph Topology': 'ಗ್ರಾಫ್ ಟೋಪೋಲಜಿ',
    'Vector Store': 'ವೆಕ್ಟರ್ ಸ್ಟೋರ್',
    'Authorized Personnel Only. All activities on this node are logged and monitored under Sec 66, IT Act.': 'ಅಧಿಕೃತ ಸಿಬ್ಬಂದಿಗೆ ಮಾತ್ರ ಪ್ರವೇಶ. ಈ ನೋಡ್‌ನಲ್ಲಿನ ಎಲ್ಲಾ ಚಟುವಟಿಕೆಗಳನ್ನು ಐಟಿ ಕಾಯ್ದೆಯ ಸೆಕ್ಷನ್ ೬೬ ರ ಅಡಿಯಲ್ಲಿ ಮೇಲ್ವಿಚಾರಣೆ ಮಾಡಲಾಗುತ್ತದೆ.',
    'Establishing Workspace Connection': 'ಕಾರ್ಯಕ್ಷೇತ್ರ ಸಂಪರ್ಕವನ್ನು ಸ್ಥಾಪಿಸಲಾಗುತ್ತಿದೆ',
    'WORKSPACE ACCESS': 'ಕಾರ್ಯಕ್ಷೇತ್ರದ ಪ್ರವೇಶ',
    'State Police Department': 'ರಾಜ್ಯ ಪೊಲೀಸ್ ಇಲಾಖೆ',
    'Security Role Selection': 'ಭದ್ರತಾ ಪಾತ್ರದ ಆಯ್ಕೆ',
    'Officer Credentials / Username': 'ಅಧಿಕಾರಿಯ ಲಾಗಿನ್ ಹೆಸರು / ಬಳಕೆದಾರ ಹೆಸರು',
    'Security Passcode / Password': 'ಭದ್ರತಾ ಗುಪ್ತಪದ / ಪಾಸ್‌ವರ್ಡ್',
    'Establish Connection': 'ಸಂಪರ್ಕವನ್ನು ಸ್ಥಾಪಿಸಿ',
    'Evaluator Access Accounts': 'ಮೌಲ್ಯಮಾಪಕರ ಪ್ರವೇಶ ಖಾತೆಗಳು',
    'Autofill access level credentials (Passcode:': 'ಪ್ರವೇಶ ಮಟ್ಟದ ರುಜುವಾತುಗಳನ್ನು ಸ್ವಯಂ ಭರ್ತಿ ಮಾಡಿ (ಪಾಸ್‌ವರ್ಡ್:',
    'Investigator': 'ತನಿಖಾಧಿಕಾರಿ',
    'Case Lodging & AI Assistance': 'ಪ್ರಕರಣ ದಾಖಲಾತಿ ಮತ್ತು AI ನೆರವು',
    'Analyst': 'ವಿಶ್ಲೇಷಕ',
    'Link Networks & Heatmaps': 'ನೆಟ್‌ವರ್ಕ್‌ಗಳು ಮತ್ತು ಹೀಟ್‌ಮ್ಯಾಪ್‌ಗಳು',
    'Supervisor': 'ಮೇಲ್ವಿಚಾರಕ',
    'Copilot Approvals & Forecasts': 'ಅನುಮೋದನೆಗಳು ಮತ್ತು ಮುನ್ಸೂಚನೆಗಳು',
    'Administrator': 'ವ್ಯವಸ್ಥಾಪಕ (ಅಡ್ಮಿನ್)',
    'System Audit Logs & Controls': 'ಸಿಸ್ಟಮ್ ಆಡಿಟ್ ಲಾಗ್‌ಗಳು ಮತ್ತು ನಿಯಂತ್ರಣಗಳು'
  };

  const t = (key: string) => {
    return isKannada ? (translations[key] || key) : key;
  };

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('Investigator')
  const [showPassword, setShowPassword] = useState(false)
  
  const [loading, setLoading] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const roles = isKannada ? [
    { name: 'Investigator', desc: 'ಪ್ರಕರಣ ದಾಖಲಾತಿ ಮತ್ತು AI ನೆರವು', perm: 'Read/Write Cases' },
    { name: 'Analyst', desc: 'ನೆಟ್‌ವರ್ಕ್‌ಗಳು ಮತ್ತು ಹೀಟ್‌ಮ್ಯಾಪ್‌ಗಳು', perm: 'Access Analytics' },
    { name: 'Supervisor', desc: 'ಅನುಮೋದನೆಗಳು ಮತ್ತು ಮುನ್ಸೂಚನೆಗಳು', perm: 'Approve Dossiers' },
    { name: 'Administrator', desc: 'ಸಿಸ್ಟಮ್ ಆಡಿಟ್ ಲಾಗ್‌ಗಳು ಮತ್ತು ನಿಯಂತ್ರಣಗಳು', perm: 'Full Access' }
  ] : [
    { name: 'Investigator', desc: 'Case Lodging & AI Assistance', perm: 'Read/Write Cases' },
    { name: 'Analyst', desc: 'Link Networks & Heatmaps', perm: 'Access Analytics' },
    { name: 'Supervisor', desc: 'Copilot Approvals & Forecasts', perm: 'Approve Dossiers' },
    { name: 'Administrator', desc: 'System Audit Logs & Controls', perm: 'Full Access' }
  ];

  const authSteps = isKannada ? [
    "ಬಳಕೆದಾರರ ರುಜುವಾತುಗಳನ್ನು ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...",
    "ಕ್ರಿಪ್ಟೋಗ್ರಾಫಿಕ್ ಕೀಲಿಯನ್ನು ಮೌಲ್ಯೀಕರಿಸಲಾಗುತ್ತಿದೆ...",
    "ಪಾತ್ರದ ಅನುಮತಿಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ...",
    "ಸ್ಥಳೀಯ NLP ಏಜೆಂಟ್‌ಗಳನ್ನು ಪ್ರಾರಂಭಿಸಲಾಗುತ್ತಿದೆ...",
    "ಗ್ರಾಫ್ ಮತ್ತು ವೆಕ್ಟರ್ ಲಿಂಕ್‌ಗಳನ್ನು ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...",
    "ಕಾರ್ಯಕ್ಷೇತ್ರವನ್ನು ಪ್ರಾರಂಭಿಸಲಾಗುತ್ತಿದೆ..."
  ] : [
    "Authenticating User Credentials...",
    "Validating Cryptographic Key...",
    "Loading Role Permissions...",
    "Initializing Local NLP Agents...",
    "Verifying Graph & Vector Links...",
    "Launching Intelligence Workspace..."
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setActiveStep((prev) => {
          if (prev < authSteps.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 400);
    } else {
      setActiveStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/auth/login', {
        username: username.toLowerCase().trim(),
        password,
        role
      });
      
      const { access_token, role: userRole } = response.data;
      
      // Allow the animation pipeline to complete before navigation
      setTimeout(() => {
        login(access_token, username.trim(), userRole);
        navigate('/');
      }, 2500);
    } catch (err: any) {
      logger_error(err);
      setError(
        err.response?.data?.detail || 
        "Failed to authenticate. Verify credentials and selected role."
      );
      setLoading(false);
    }
  };

  const autofillDemo = (demoUser: string, demoRole: string) => {
    setUsername(demoUser);
    setPassword('password123');
    setRole(demoRole);
  };

  return (
    <div className="min-h-screen bg-police-darkest flex items-center justify-center p-6 relative overflow-hidden select-none">
      {/* Cyber animated grid background */}
      <div className="absolute inset-0 bg-[radial-gradient(#0c1e35_1.2px,transparent_1.2px)] [background-size:24px_24px] opacity-25 pointer-events-none"></div>
      
      <div className="flex flex-col md:flex-row gap-6 w-full max-w-4xl z-10">
        
        {/* Left Panel: Security & Health Status Panel */}
        <motion.div 
          initial={{ opacity: 0, x: -35 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="flex-1 glass-panel p-8 rounded-2xl border-white/5 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-2 text-police-accent mb-6">
              <ShieldCheck className="h-6 w-6" />
              <span className="text-xs uppercase font-mono tracking-widest font-bold">{t("Node Status Overview")}</span>
            </div>
            
            <h1 className="text-3xl font-bold tracking-wider font-mono text-white mb-2">
              TRINETRA <span className="text-police-accent">AI</span>
            </h1>
            <p className="text-xs text-police-gold font-mono uppercase tracking-widest mb-6">
              {t("Seeing Beyond the Evidence.")}
            </p>

            <div className="space-y-4 font-mono text-[11px]">
              <div className="flex items-center justify-between p-2 border border-white/5 bg-white/5 rounded-lg">
                <span className="text-police-muted">{t("Encryption Standard")}</span>
                <span className="text-police-accent font-bold">AES-256 Active</span>
              </div>
              <div className="flex items-center justify-between p-2 border border-white/5 bg-white/5 rounded-lg">
                <span className="text-police-muted">{t("AI Processor")}</span>
                <span className="text-police-accent font-bold">Local Model CPU</span>
              </div>
              <div className="flex items-center justify-between p-2 border border-white/5 bg-white/5 rounded-lg">
                <span className="text-police-muted">{t("Relational Ledger")}</span>
                <span className="text-emerald-500 font-bold flex items-center gap-1.5">
                  <Database className="h-3 w-3" /> postgresql
                </span>
              </div>
              <div className="flex items-center justify-between p-2 border border-white/5 bg-white/5 rounded-lg">
                <span className="text-police-muted">{t("Graph Topology")}</span>
                <span className="text-emerald-500 font-bold flex items-center gap-1.5">
                  <Database className="h-3 w-3" /> neo4j
                </span>
              </div>
              <div className="flex items-center justify-between p-2 border border-white/5 bg-white/5 rounded-lg">
                <span className="text-police-muted">{t("Vector Store")}</span>
                <span className="text-emerald-500 font-bold flex items-center gap-1.5">
                  <Database className="h-3 w-3" /> qdrant
                </span>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-police-muted font-mono mt-6 border-t border-white/5 pt-4">
            {t("Authorized Personnel Only. All activities on this node are logged and monitored under Sec 66, IT Act.")}
          </div>
        </motion.div>

        {/* Right Panel: Active Auth Forms */}
        <div className="flex-1 flex flex-col justify-between gap-6">
          <motion.div 
            initial={{ opacity: 0, x: 35 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="glass-panel p-8 rounded-2xl border-white/5 flex-1 relative"
          >
            <AnimatePresence mode="wait">
              {loading ? (
                /* Sequenced Authentication Step Animation */
                <motion.div 
                  key="loader"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col justify-center items-center py-12 space-y-6"
                >
                  <Cpu className="h-10 w-10 text-police-accent animate-spin" />
                  <div className="space-y-2 text-center font-mono">
                    <div className="text-xs text-white uppercase font-bold tracking-wider">{t("Establishing Workspace Connection")}</div>
                    <div className="text-[10px] text-police-accent h-4">{authSteps[activeStep]}</div>
                  </div>
                  <div className="w-full max-w-xs h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-police-accent"
                      initial={{ width: '0%' }}
                      animate={{ width: `${((activeStep + 1) / authSteps.length) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </motion.div>
              ) : (
                /* Standard Credentials Form */
                <motion.div 
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-5"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-police-accent/10 rounded-full border border-police-accent/20 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-police-accent" />
                    </div>
                    <div className="text-left">
                      <h2 className="text-md font-bold tracking-wider font-mono text-white">{t("WORKSPACE ACCESS")}</h2>
                      <p className="text-[9px] text-police-muted font-mono uppercase tracking-widest">{t("State Police Department")}</p>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-lg text-center font-medium font-mono">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Role Description Cards Selection Grid */}
                    <div>
                      <label className="block text-[9px] font-mono uppercase tracking-wider text-police-muted mb-2">
                        {t("Security Role Selection")}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {roles.map((r) => (
                          <button
                            key={r.name}
                            type="button"
                            onClick={() => setRole(r.name)}
                            className={`p-2.5 rounded-lg text-left border flex flex-col justify-between transition-all duration-150 ${
                              role === r.name 
                                ? 'bg-police-accent/15 border-police-accent/30 text-police-accent shadow-neon' 
                                : 'bg-police-darkest/40 border-white/5 text-police-muted hover:border-white/10'
                            }`}
                          >
                            <span className="text-xs font-bold font-mono">{isKannada && r.name === 'Investigator' ? 'ತನಿಖಾಧಿಕಾರಿ' : isKannada && r.name === 'Analyst' ? 'ವಿಶ್ಲೇಷಕ' : isKannada && r.name === 'Supervisor' ? 'ಮೇಲ್ವಿಚಾರಕ' : isKannada && r.name === 'Administrator' ? 'ವ್ಯವಸ್ಥಾಪಕ' : r.name}</span>
                            <span className="text-[9px] text-police-muted mt-0.5 leading-tight">{r.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Username Input */}
                    <div>
                      <label className="block text-[9px] font-mono uppercase tracking-wider text-police-muted mb-1.5">
                        {t("Officer Credentials / Username")}
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-4 w-4 text-police-muted" />
                        </span>
                        <input
                          type="text"
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="e.g. investigator"
                          className="w-full glass-input pl-10 pr-4 py-2 rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    {/* Password Input */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-[9px] font-mono uppercase tracking-wider text-police-muted">
                          {t("Security Passcode / Password")}
                        </label>
                      </div>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-4 w-4 text-police-muted" />
                        </span>
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full glass-input pl-10 pr-10 py-2 rounded-lg text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-police-muted hover:text-police-text"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 bg-gradient-to-r from-police-accent to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg text-xs font-semibold transition-all duration-150 shadow-neon glow-btn disabled:opacity-50 font-mono"
                    >
                      {t("Establish Connection")}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Quick Demopass Access Helper */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="glass-card border-police-accent/15 p-4 rounded-xl text-xs"
          >
            <div className="flex gap-2 items-center text-police-accent font-semibold mb-2 font-mono">
              <Info className="h-4 w-4" />
              <span>{t("Evaluator Access Accounts")}</span>
            </div>
            <p className="text-[10px] text-police-muted mb-2 font-mono">
              {t("Autofill access level credentials (Passcode:")} <code>password123</code>)
            </p>
            <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
              <button 
                onClick={() => autofillDemo('investigator', 'Investigator')}
                className="p-1.5 bg-police-darkest/50 border border-white/5 hover:border-police-accent/30 rounded text-left"
              >
                <div className="font-semibold text-police-text">{isKannada ? 'ತನಿಖಾಧಿಕಾರಿ' : 'Investigator'}</div>
                <div className="text-police-muted">User: investigator</div>
              </button>
              <button 
                onClick={() => autofillDemo('analyst', 'Analyst')}
                className="p-1.5 bg-police-darkest/50 border border-white/5 hover:border-police-accent/30 rounded text-left"
              >
                <div className="font-semibold text-police-text">{isKannada ? 'ವಿಶ್ಲೇಷಕ' : 'Analyst'}</div>
                <div className="text-police-muted">User: analyst</div>
              </button>
              <button 
                onClick={() => autofillDemo('supervisor', 'Supervisor')}
                className="p-1.5 bg-police-darkest/50 border border-white/5 hover:border-police-accent/30 rounded text-left"
              >
                <div className="font-semibold text-police-text">{isKannada ? 'ಮೇಲ್ವಿಚಾರಕ' : 'Supervisor'}</div>
                <div className="text-police-muted">User: supervisor</div>
              </button>
              <button 
                onClick={() => autofillDemo('admin', 'Administrator')}
                className="p-1.5 bg-police-darkest/50 border border-white/5 hover:border-police-accent/30 rounded text-left"
              >
                <div className="font-semibold text-police-text">{isKannada ? 'ವ್ಯವಸ್ಥಾಪಕ' : 'Administrator'}</div>
                <div className="text-police-muted">User: admin</div>
              </button>
            </div>
          </motion.div>
        </div>
        
      </div>
    </div>
  )
}

function logger_error(err: any) {
  console.error("Login Error Details:", err);
}

export default LoginPage;
