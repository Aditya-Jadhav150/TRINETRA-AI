import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { 
  MessageSquare, 
  Send, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Download, 
  Plus, 
  Database, 
  Code, 
  Network, 
  Cpu, 
  CheckCircle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Compass,
  FileSearch,
  Activity
} from 'lucide-react'
import { useAuth } from '../App'

interface Message {
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isNew?: boolean; // flag to trigger typing stream
  evidence?: {
    sql_executed?: string;
    cypher_executed?: string;
    database_records?: any[];
    confidence_score?: number;
    reasoning_path?: string;
  };
}

// Custom typing stream simulation for new messages
const TypingText: React.FC<{ text: string; onComplete?: () => void }> = ({ text, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    let i = 0;
    // Fast word or char typing speed
    const interval = setInterval(() => {
      setDisplayedText((prev) => prev + text.charAt(i));
      i++;
      if (i >= text.length) {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, 4);
    
    return () => clearInterval(interval);
  }, [text]);
  
  return <p className="whitespace-pre-line leading-relaxed">{displayedText}</p>;
};

const AIAssistant: React.FC = () => {
  const { token, isKannada, setIsKannada, speechEnabled, setSpeechEnabled } = useAuth();
  
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [explorerOpen, setExplorerOpen] = useState(true);
  
  // Selected message for Evidence Explorer
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0); // 1: Intent, 2: SQL, 3: Graph, 4: RAG, 5: Merge
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    fetchSessions();
    setupSpeechRecognition();
  }, [token]);

  useEffect(() => {
    if (activeSessionId) {
      fetchMessages(activeSessionId);
    } else {
      setMessages([]);
      setSelectedMessage(null);
    }
  }, [activeSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Handle loading steps simulation when loading is true
  useEffect(() => {
    let stepTimer: NodeJS.Timeout;
    if (loading) {
      setLoadingStep(1);
      const scheduleStep = (step: number, delay: number) => {
        stepTimer = setTimeout(() => {
          setLoadingStep(step);
        }, delay);
      };
      
      scheduleStep(2, 600);
      scheduleStep(3, 1400);
      scheduleStep(4, 2200);
      scheduleStep(5, 3000);
    } else {
      setLoadingStep(0);
    }
    return () => clearTimeout(stepTimer);
  }, [loading]);

  const fetchSessions = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get('/api/chat/sessions', { headers });
      setSessions(response.data);
      if (response.data.length > 0 && !activeSessionId) {
        setActiveSessionId(response.data[0].session_id);
      }
    } catch (err) {
      console.error("Failed to load sessions list:", err);
    }
  };

  const fetchMessages = async (sessId: string) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`/api/chat/sessions/${sessId}/messages`, { headers });
      
      // Load historical messages without typing stream flag
      const loaded = response.data.map((m: any) => ({ ...m, isNew: false }));
      setMessages(loaded);
      
      const assistantMsgs = loaded.filter((m: any) => m.sender === 'assistant');
      if (assistantMsgs.length > 0) {
        setSelectedMessage(assistantMsgs[assistantMsgs.length - 1]);
      }
    } catch (err) {
      console.error("Failed to load messages history:", err);
    }
  };

  const handleNewSession = () => {
    const newId = `session_${Date.now()}`;
    setActiveSessionId(newId);
    setMessages([]);
    setSelectedMessage(null);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim()) return;
    
    const sessId = activeSessionId || `session_${Date.now()}`;
    if (!activeSessionId) {
      setActiveSessionId(sessId);
    }

    const userText = inputValue;
    setInputValue('');
    
    const localUserMsg: Message = {
      sender: 'user',
      content: userText,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, localUserMsg]);
    setLoading(true);

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post('/api/chat/query', {
        session_id: sessId,
        query: userText
      }, { headers });
      
      const assistantMsg: Message = {
        sender: 'assistant',
        content: response.data.content,
        timestamp: response.data.evidence.timestamp,
        isNew: true, // mark new to type stream
        evidence: response.data.evidence
      };
      
      setMessages(prev => [...prev, assistantMsg]);
      setSelectedMessage(assistantMsg);
      
      if (speechEnabled) {
        speakResponse(response.data.content);
      }
      
      fetchSessions();
    } catch (err) {
      console.error("Failed to process query:", err);
      setMessages(prev => [...prev, {
        sender: 'assistant',
        content: "Error: Could not retrieve a response from the intelligence node.",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerPinnedQuery = async (queryText: string) => {
    setInputValue(queryText);
    const sessId = activeSessionId || `session_${Date.now()}`;
    if (!activeSessionId) {
      setActiveSessionId(sessId);
    }
    const localUserMsg: Message = {
      sender: 'user',
      content: queryText,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, localUserMsg]);
    setLoading(true);

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post('/api/chat/query', {
        session_id: sessId,
        query: queryText
      }, { headers });
      
      const assistantMsg: Message = {
        sender: 'assistant',
        content: response.data.content,
        timestamp: response.data.evidence.timestamp,
        isNew: true,
        evidence: response.data.evidence
      };
      
      setMessages(prev => [...prev, assistantMsg]);
      setSelectedMessage(assistantMsg);
      fetchSessions();
    } catch (err) {
      console.error("Failed to process query:", err);
      setMessages(prev => [...prev, {
        sender: 'assistant',
        content: "Error: Could not retrieve a response from the intelligence node.",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
      setInputValue('');
    }
  };

  // HTML5 Voice Input
  const setupSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = isKannada ? 'kn-IN' : 'en-IN';
      
      rec.onstart = () => setIsListening(true);
      rec.onend = () => setIsListening(false);
      rec.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setInputValue(prev => prev + " " + text);
      };
      
      recognitionRef.current = rec;
    }
  };

  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = isKannada ? 'kn-IN' : 'en-IN';
    }
  }, [isKannada]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition not supported in this browser. Please use Chrome or Edge.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  // HTML5 Speech Output
  const speakResponse = (text: string) => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    
    synth.cancel();
    const cleanText = text.replace(/[*#`>_-]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = isKannada ? 'kn-IN' : 'en-IN';
    
    const voices = synth.getVoices();
    const targetVoice = voices.find(v => v.lang.startsWith(isKannada ? 'kn' : 'en'));
    if (targetVoice) utterance.voice = targetVoice;
    
    synth.speak(utterance);
  };

  const handleExportPDF = (type: 'default' | 'technical') => {
    if (!activeSessionId) return;
    window.open(`/api/reports/pdf?session_id=${activeSessionId}&token=${token}&export_type=${type}`, '_blank');
  };

  const sampleQueries = [
    "Show repeat offenders in Mysore.",
    "Show dacoity crimes involving Sunil Gowda.",
    "burglary scene forensic investigation procedure manual",
    "Predict emerging hotspots next month."
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-police-darkest select-none overflow-hidden">
      {/* 1. Left Sidebar: Chat History sessions */}
      <div className="w-64 border-r border-white/5 bg-police-darkest/95 flex flex-col justify-between h-full shrink-0">
        <div className="p-4 flex flex-col gap-3">
          <button 
            onClick={handleNewSession}
            className="w-full py-2 bg-police-accent/10 border border-police-accent/20 hover:bg-police-accent/20 text-police-accent rounded-lg flex items-center justify-center gap-2 text-xs font-mono font-semibold transition"
          >
            <Plus className="h-4 w-4" />
            <span>New Investigation</span>
          </button>
          
          <div className="text-[10px] font-mono uppercase tracking-widest text-police-muted mt-2">
            Ledger Sessions
          </div>
          
          <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-14rem)]">
            {sessions.map((sess) => (
              <button
                key={sess.session_id}
                onClick={() => setActiveSessionId(sess.session_id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs truncate flex items-center gap-2 font-mono border ${
                  activeSessionId === sess.session_id
                    ? 'bg-police-accent/10 border-police-accent/20 text-police-accent shadow-neon'
                    : 'border-transparent text-police-muted hover:bg-white/5 hover:text-police-text'
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{sess.title}</span>
              </button>
            ))}
          </div>

          <div className="text-[10px] font-mono uppercase tracking-widest text-police-gold mt-4">
            Pinned Intelligence
          </div>
          <div className="space-y-1">
            <button 
              onClick={() => handleTriggerPinnedQuery("Show profile for suspect Sunil Gowda")}
              className="w-full text-left px-3 py-1.5 rounded-lg text-xs truncate flex items-center gap-2 font-mono border border-transparent text-police-muted hover:bg-white/5 hover:text-police-text"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-police-gold"></span>
              <span className="truncate">CASE 2026/01 - Sunil Gowda</span>
            </button>
            <button 
              onClick={() => handleTriggerPinnedQuery("Show gang connections for Karan Mehta")}
              className="w-full text-left px-3 py-1.5 rounded-lg text-xs truncate flex items-center gap-2 font-mono border border-transparent text-police-muted hover:bg-white/5 hover:text-police-text"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-police-gold"></span>
              <span className="truncate">DRUGS CARTEL - Karan Mehta</span>
            </button>
          </div>

          {/* Active Session Investigation Timeline */}
          {activeSessionId && messages.filter(m => m.sender === 'user').length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/5 space-y-2 select-none">
              <div className="text-[10px] font-mono uppercase tracking-widest text-police-accent flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5" />
                <span>Session Timeline</span>
              </div>
              <div className="relative pl-3 border-l border-white/5 space-y-2.5 font-mono text-[9px] text-police-muted max-h-36 overflow-y-auto">
                {messages.filter(m => m.sender === 'user').map((m, idx) => {
                  const date = new Date(m.timestamp);
                  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={idx} className="relative">
                      <span className="absolute -left-[16px] top-1.5 h-1.5 w-1.5 rounded-full bg-police-accent"></span>
                      <div className="font-semibold text-white/90">{timeStr}</div>
                      <div className="truncate text-police-muted max-w-[180px]">{m.content}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        
        {activeSessionId && (
          <div className="p-4 border-t border-white/5 space-y-2">
            <button
              onClick={() => handleExportPDF('default')}
              className="w-full py-1.5 bg-police-accent/15 hover:bg-police-accent/25 border border-police-accent/20 text-police-accent rounded-lg flex items-center justify-center gap-2 text-[10.5px] font-mono transition font-semibold"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Dossier PDF</span>
            </button>
            <button
              onClick={() => handleExportPDF('technical')}
              className="w-full py-1.5 bg-police-darkest hover:bg-white/5 border border-white/10 text-police-muted hover:text-police-text rounded-lg flex items-center justify-center gap-2 text-[10.5px] font-mono transition"
            >
              <FileSearch className="h-3.5 w-3.5" />
              <span>Export Technical Audit</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Center: Chat Box */}
      <div className="flex-1 flex flex-col justify-between h-full bg-police-darkest/40 relative">
        {/* Toggle bar */}
        <div className="h-12 border-b border-white/5 px-6 flex items-center justify-between z-10 bg-police-darkest/80 backdrop-blur">
          <div className="flex items-center gap-4 text-xs font-mono select-none">
            <span className="text-[10px] font-mono text-police-accent uppercase tracking-wider">
              {isKannada ? "ಐಐ ತನಿಖಾ ಸಹಾಯ" : "AI INVESTIGATION ASSISTANCE"}
            </span>
            <span className="text-[8.5px] text-police-muted hidden lg:inline border-l border-white/10 pl-3 font-mono">
              {isKannada 
                ? "ಧ್ವನಿ ನಿಯಂತ್ರಣ: ಕನ್ನಡ (kn-IN) ಸಕ್ರಿಯವಾಗಿದೆ. ಮೈಕ್ ಬಟನ್ ಒತ್ತಿ ಮಾತನಾಡಿ." 
                : "Voice control: English (en-IN) active. Press microphone to dictate."}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setExplorerOpen(!explorerOpen)}
              className="p-1 text-police-muted hover:text-white border border-transparent hover:border-white/10 rounded transition flex items-center gap-1 text-[10px] font-mono"
            >
              {explorerOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              <span>{isKannada ? "ಸಾಕ್ಷ್ಯ ಎಕ್ಸ್‌ಪ್ಲೋರರ್" : "Evidence Explorer"}</span>
            </button>
            <span className="h-4 border-l border-white/10"></span>
            <div className="text-[10px] font-mono text-police-muted uppercase tracking-widest flex items-center gap-1.5">
              <Cpu className="h-4.5 w-4.5 text-police-accent animate-pulse" />
              <span>{isKannada ? "ಮಲ್ಟಿ-ಏಜೆಂಟ್ ಕೋರ್" : "Multi-Agent Core"}</span>
            </div>
          </div>
        </div>

        {/* Messages List Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="max-w-md mx-auto text-center py-12 space-y-6">
              <div className="h-14 w-14 bg-police-accent/10 border border-police-accent/20 rounded-full flex items-center justify-center mx-auto shadow-neon">
                <MessageSquare className="h-7 w-7 text-police-accent" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-white text-sm font-mono uppercase tracking-wider">Trinetra Intelligence Node</h3>
                <p className="text-[11px] text-police-muted leading-relaxed font-mono">
                  Enter your inquiry using natural language. The coordinator routes query intent to compile relational SQL records, Neo4j network paths, or Qdrant vector spaces.
                </p>
              </div>
              
              <div className="grid grid-cols-1 gap-2 text-left">
                <div className="text-[9px] uppercase font-mono tracking-widest text-police-muted mb-1">Recommended ledgers queries:</div>
                {sampleQueries.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setInputValue(q)}
                    className="p-2 bg-police-darkest/50 border border-white/5 hover:border-police-accent/30 rounded-lg text-xs font-mono text-police-muted hover:text-police-text transition text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div 
                  onClick={() => msg.sender === 'assistant' && setSelectedMessage(msg)}
                  className={`max-w-xl p-4 rounded-xl text-xs font-mono border ${
                    msg.sender === 'user'
                      ? 'bg-police-accent/5 border-police-accent/20 text-white rounded-br-none'
                      : `glass-card border-white/5 text-police-text rounded-bl-none cursor-pointer ${
                          selectedMessage === msg ? 'border-police-accent/40 shadow-neon' : ''
                        }`
                  }`}
                >
                  {/* Stream/Type only the last message if it's newly received */}
                  {msg.sender === 'assistant' && msg.isNew ? (
                    <TypingText 
                      text={msg.content} 
                      onComplete={() => {
                        msg.isNew = false; // set false so it doesn't re-type on state refresh
                      }} 
                    />
                  ) : (
                    <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 px-1 select-none">
                  <span className="text-[9px] font-mono text-police-muted">
                    {msg.sender === 'user' ? 'Investigator' : 'TRINETRA Core'} • {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                  {msg.sender === 'assistant' && (
                    <div className="flex gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(msg.content);
                        }}
                        className="text-[9px] font-mono text-police-accent hover:text-white transition flex items-center gap-1 border border-police-accent/20 bg-police-accent/5 px-1.5 py-0.5 rounded"
                      >
                        Copy Response
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          speakResponse(msg.content);
                        }}
                        className="text-[9px] font-mono text-police-accent hover:text-white transition flex items-center gap-1 border border-police-accent/20 bg-police-accent/5 px-1.5 py-0.5 rounded"
                        title="Read message response aloud"
                      >
                        <Volume2 className="h-3 w-3" />
                        <span>Speak</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* AI Orchestrator Execution Steps visual trace cards */}
          {loading && (
            <div className="space-y-2.5 max-w-sm mt-4 p-4 border border-police-accent/10 bg-police-accent/5 rounded-xl font-mono text-[10px]">
              <div className="flex items-center gap-2 font-bold text-police-accent border-b border-police-accent/10 pb-1.5 mb-2">
                <Activity className="h-4 w-4 animate-pulse" />
                <span>ROUTING EXECUTION ENGINE</span>
              </div>
              
              <div className="space-y-2">
                {[
                  { step: 1, label: "Intent Classifier", desc: "Recognizing verbal query structure..." },
                  { step: 2, label: "SQL Schema Compilation", desc: "Checking relational column matrices..." },
                  { step: 3, label: "Neo4j Graph Resolver", desc: "Tracing syndicates & degree links..." },
                  { step: 4, label: "Qdrant Semantic Matcher", desc: "Searching facts embedding vector space..." },
                  { step: 5, label: "Synthesis Compiler", desc: "Merging intelligence inputs into summary..." }
                ].map((s) => {
                  const isActive = loadingStep === s.step;
                  const isDone = loadingStep > s.step;
                  
                  return (
                    <div 
                      key={s.step} 
                      className={`flex gap-3 items-start transition-opacity duration-300 ${
                        isDone ? 'opacity-90' : isActive ? 'opacity-100' : 'opacity-40'
                      }`}
                    >
                      <div className="shrink-0 mt-0.5">
                        {isDone ? (
                          <span className="h-3.5 w-3.5 rounded-full bg-[#10b981] flex items-center justify-center text-[8px] text-white">✓</span>
                        ) : isActive ? (
                          <span className="h-3.5 w-3.5 rounded-full border border-police-accent flex items-center justify-center text-[7px] text-police-accent animate-spin mx-auto border-t-transparent"></span>
                        ) : (
                          <span className="h-3.5 w-3.5 rounded-full border border-white/10 flex items-center justify-center text-[8px] text-police-muted">{s.step}</span>
                        )}
                      </div>
                      <div>
                        <div className={`font-semibold ${isActive ? 'text-police-accent font-bold' : isDone ? 'text-[#10b981]' : 'text-police-muted'}`}>
                          {s.label}
                        </div>
                        {isActive && <p className="text-[9px] text-police-text mt-0.5 leading-tight">{s.desc}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips */}
        <div className="px-4 py-2 bg-police-darkest/60 border-t border-white/5 flex flex-wrap gap-2 select-none z-10">
          {(isKannada ? [
            { label: "ಸಹಚರರನ್ನು ಹುಡುಕಿ", query: "ಸುನಿಲ್ ಗೌಡ ಅವರ ಅಪರಾಧ ಸಹಚರರನ್ನು ತೋರಿಸಿ" },
            { label: "ಶಾರ್ಟೆಸ್ಟ್ ಪಾತ್", query: "ಸುನಿಲ್ ಗೌಡ ಮತ್ತು ರಾಜು ಕಪ್ಪೆ ನಡುವಿನ ಶಾರ್ಟೆಸ್ಟ್ ಪಾತ್ ತೋರಿಸಿ" },
            { label: "ಹಾಟ್‌ಸ್ಪಾಟ್ ಮುನ್ಸೂಚನೆ", query: "ಜುಲೈ 2026 ರ ಅಪರಾಧ ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳನ್ನು ಊಹಿಸಿ" },
            { label: "ಇದೇ ರೀತಿಯ ಪ್ರಕರಣಗಳು", query: "ಚಿನ್ನದ ಕಳ್ಳತನಕ್ಕೆ ಹೋಲುವ ಪ್ರಕರಣಗಳನ್ನು ತೋರಿಸಿ" }
          ] : [
            { label: "Find associates", query: "Show active criminal associates for Sunil Gowda" },
            { label: "Show shortest path", query: "Solve shortest connection path between Sunil Gowda and Raju Kappe" },
            { label: "Forecast hotspot", query: "Forecast crime density hotspots for July 2026" },
            { label: "Search similar FIRs", query: "Show similar cases resembling jewelry theft break-ins" },
            { label: "Compare crime pattern", query: "Show repeat offender metrics in Mysore City" }
          ]).map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleTriggerPinnedQuery(chip.query)}
              className="px-2.5 py-1 bg-police-accent/10 border border-police-accent/20 hover:bg-police-accent/25 hover:border-police-accent/40 text-police-accent text-[9px] font-mono rounded-lg transition-all"
            >
              + {chip.label}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-4 border-t border-white/5 bg-police-darkest/80 backdrop-blur z-10 flex gap-2">
          <button
            type="button"
            onClick={toggleListening}
            className={`p-3 rounded-lg border transition ${
              isListening 
                ? 'bg-red-500/10 border-red-500/20 text-red-500 animate-pulse' 
                : 'bg-police-darkest border-white/5 text-police-muted hover:text-police-text'
            }`}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
          
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={
              isListening 
                ? (isKannada ? "ಕನ್ನಡ ಧ್ವನಿ ಇನ್‌ಪುಟ್‌ಗಾಗಿ ಆಲಿಸಲಾಗುತ್ತಿದೆ..." : "Listening to voice input...") 
                : (isKannada ? "ಅಪರಾಧ ಡೇಟಾಬೇಸ್‌ಗಳನ್ನು ಕ್ವೆರಿ ಮಾಡಿ, ನೆಟ್‌ವರ್ಕ್ ಶಾರ್ಟೆಸ್ಟ್ ಪಾತ್ ಅಥವಾ ಫೋರ್‌ಕಾಸ್ಟ್ ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳನ್ನು ಪಡೆಯಿರಿ..." : "Query criminal databases, network shortest path, or forecast hotspots...")
            }
            className="flex-1 glass-input px-4 py-2.5 rounded-lg text-xs font-mono"
          />
          
          <button
            type="submit"
            className="p-3 bg-police-accent/15 border border-police-accent/25 hover:bg-police-accent/25 text-police-accent rounded-lg transition"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>

      {/* 3. Right Sidebar: Evidence Explorer (Collapsible) */}
      <AnimatePresence>
        {explorerOpen && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="border-l border-white/5 bg-police-darkest/95 flex flex-col p-4 overflow-y-auto shrink-0 select-none"
          >
            <div className="flex gap-2 items-center text-police-accent font-mono font-semibold border-b border-white/5 pb-3 mb-4">
              <Database className="h-4.5 w-4.5" />
              <span>EVIDENCE EXPLORER</span>
            </div>
            
            {selectedMessage?.evidence ? (
              <div className="space-y-5 text-xs font-mono">
                {/* Confidence Score Bar */}
                <div>
                  <div className="text-[10px] text-police-muted uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>Confidence Score</span>
                    <span className="text-police-accent font-semibold">{int_score(selectedMessage.evidence.confidence_score)}%</span>
                  </div>
                  <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className={`h-full ${
                        int_score(selectedMessage.evidence.confidence_score) >= 85 ? 'bg-[#10b981]' : 'bg-[#f59e0b]'
                      }`} 
                      style={{ width: `${(selectedMessage.evidence.confidence_score || 0.9) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Reasoning Path */}
                <div className="space-y-1">
                  <div className="text-[10px] text-police-muted uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5 text-police-accent" />
                    <span>Reasoning Pathway</span>
                  </div>
                  <p className="text-police-text leading-relaxed p-2.5 bg-white/5 border border-white/5 rounded-lg text-[10px]">
                    {selectedMessage.evidence.reasoning_path}
                  </p>
                </div>

                {/* SQL Executed */}
                {selectedMessage.evidence.sql_executed && (
                  <div className="space-y-1">
                    <div className="text-[10px] text-police-muted uppercase tracking-wider flex items-center gap-1.5">
                      <Code className="h-3.5 w-3.5 text-police-accent" />
                      <span>Compiled SQL Query</span>
                    </div>
                    <div className="p-2.5 bg-police-darkest border border-white/5 rounded-lg overflow-x-auto text-[9.5px] text-police-accent max-h-32">
                      <pre>{selectedMessage.evidence.sql_executed}</pre>
                    </div>
                  </div>
                )}

                {/* Cypher Executed */}
                {selectedMessage.evidence.cypher_executed && (
                  <div className="space-y-1">
                    <div className="text-[10px] text-police-muted uppercase tracking-wider flex items-center gap-1.5">
                      <Network className="h-3.5 w-3.5 text-police-accent" />
                      <span>Compiled Cypher Script</span>
                    </div>
                    <div className="p-2.5 bg-police-darkest border border-white/5 rounded-lg overflow-x-auto text-[9.5px] text-police-accent max-h-32">
                      <pre>{selectedMessage.evidence.cypher_executed}</pre>
                    </div>
                  </div>
                )}

                {/* Database Records returned */}
                {selectedMessage.evidence.database_records && selectedMessage.evidence.database_records.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] text-police-muted uppercase tracking-wider flex items-center gap-1.5 mb-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-[#10b981]" />
                      <span>Retrieved Records ({selectedMessage.evidence.database_records.length})</span>
                    </div>
                    <div className="max-h-40 overflow-y-auto border border-white/5 rounded-lg text-[9.5px]">
                      <table className="w-full text-left divide-y divide-white/5">
                        <thead>
                          <tr className="bg-white/5 text-police-muted font-mono text-[9px]">
                            <th className="p-1.5">Label/No</th>
                            <th className="p-1.5">Type/Scope</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 bg-police-darkest/40">
                          {selectedMessage.evidence.database_records.map((rec: any, i: number) => (
                            <tr key={i} className="hover:bg-white/5">
                              <td className="p-1.5 text-police-text max-w-[120px] truncate">
                                {rec.CaseNo || rec.name || rec.filename || rec.CrimeNo || "Record Detail"}
                              </td>
                              <td className="p-1.5 text-police-muted max-w-[120px] truncate">
                                {rec.crime_type || rec.type || rec.category || "Scope Detail"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center items-center text-center text-police-muted p-4">
                <HelpCircle className="h-10 w-10 text-white/5 mb-3" />
                <p className="text-[10px]">Select any assistant response message bubble to inspect compiled queries and dataset traces.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

function int_score(score: number | undefined) {
  if (score === undefined) return 90;
  return Math.round(score * 100);
}

export default AIAssistant;
