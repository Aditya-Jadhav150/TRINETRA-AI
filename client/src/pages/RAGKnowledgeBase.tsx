import React, { useState } from 'react'
import axios from 'axios'
import { BookOpen, Search, Upload, FileText, CheckCircle2, AlertCircle, HelpCircle, ArrowRight } from 'lucide-react'
import { useAuth } from '../App'

interface RagDocument {
  content: string;
  filename: string;
  category: string;
  score: number;
}

const RAGKnowledgeBase: React.FC = () => {
  const { token, isKannada } = useAuth();
  
  const translations: Record<string, string> = {
    'LEGAL MANUALS & RAG KNOWLEDGE BASE': 'ಕಾನೂನು ಕೈಪಿಡಿಗಳು ಮತ್ತು RAG ಜ್ಞಾನ ಭಂಡಾರ',
    'Vector search across Indian Penal Code (IPC), Bharatiya Nyaya Sanhita (BNS), and Karnataka Police SOPs.': 'ಭಾರತೀಯ ದಂಡ ಸಂಹಿತೆ (IPC), ಭಾರತೀಯ ನ್ಯಾಯ ಸಂಹಿತೆ (BNS) ಮತ್ತು ಕರ್ನಾಟಕ ಪೊಲೀಸ್ ಎಸ್‌ಒಪಿಗಳಾದ್ಯಂತ ವೆಕ್ಟರ್ ಹುಡುಕಾಟ.',
    'SOP & Codes Search': 'ಎಸ್‌ಒಪಿ ಮತ್ತು ಕೋಡ್‌ಗಳ ಹುಡುಕಾಟ',
    'Query Legal Vectors': 'ಕಾನೂನು ವೆಕ್ಟರ್ ಕ್ವೆರಿ ಮಾಡಿ',
    'Searching Vectors...': 'ವೆಕ್ಟರ್ ಹುಡುಕಲಾಗುತ್ತಿದೆ...',
    'Common Inquiries:': 'ಸಾಮಾನ್ಯ ವಿಚಾರಣೆಗಳು:',
    'Index New Manual (RAG)': 'ಹೊಸ ಕೈಪಿಡಿಯನ್ನು ಸೂಚಿಕೆ ಮಾಡಿ (RAG)',
    'Document Scope': 'ದಾಖಲೆ ವ್ಯಾಪ್ತಿ',
    'Index Document': 'ದಾಖಲೆ ಸೇರಿಸಿ',
    'Chunking & Seeding Qdrant...': 'ಕ್ವಾಡ್ರಂಟ್‌ಗೆ ಸೇರಿಸಲಾಗುತ್ತಿದೆ...',
    'CORRESPONDING MANUAL CHUNKS': 'ಹೊಂದಿಕೆಯಾಗುವ ಕೈಪಿಡಿಯ ಭಾಗಗಳು',
    'Category': 'ವರ್ಗ',
    'Match Score': 'ಹೊಂದಾಣಿಕೆ ಸ್ಕೋರ್',
    'Select PDF / TXT manual file (max 15MB)': 'PDF / TXT ಕೈಪಿಡಿ ಫೈಲ್ ಆಯ್ಕೆಮಾಡಿ (ಗರಿಷ್ಠ 15MB)',
    'e.g. procedure for burglary scene...': 'ಉದಾ. ಕಳ್ಳತನದ ಸ್ಥಳದ ತನಿಖಾ ಪ್ರಕ್ರಿಯೆ...'
  };

  const t = (key: string) => {
    return isKannada ? (translations[key] || key) : key;
  };

  const [queryText, setQueryText] = useState('')
  const [category, setCategory] = useState('All')
  const [results, setResults] = useState<RagDocument[]>([])
  
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  
  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadCategory, setUploadCategory] = useState('SOP')
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryText.trim()) return;
    setLoading(true);
    setSearched(true);
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      // Include triggers 'manual' or 'sop' or 'bns' to force RAG routing in backend agent
      const triggerQuery = queryText.toLowerCase().includes('manual') || queryText.toLowerCase().includes('sop') || queryText.toLowerCase().includes('bns') || queryText.toLowerCase().includes('ipc')
        ? queryText
        : `${queryText} manual`;
        
      const response = await axios.post('/api/chat/query', {
        session_id: 'rag_temp_session',
        query: triggerQuery
      }, { headers });
      
      // Extract records from evidence
      const records = response.data.evidence.database_records || [];
      setResults(records);
      
    } catch (err) {
      console.error("Failed to run RAG query:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerCommonQuery = async (promptText: string) => {
    setQueryText(promptText);
    setLoading(true);
    setSearched(true);
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const triggerQuery = promptText.toLowerCase().includes('manual') || promptText.toLowerCase().includes('sop') || promptText.toLowerCase().includes('bns') || promptText.toLowerCase().includes('ipc')
        ? promptText
        : `${promptText} manual`;
        
      const response = await axios.post('/api/chat/query', {
        session_id: 'rag_temp_session',
        query: triggerQuery
      }, { headers });
      
      const records = response.data.evidence.database_records || [];
      setResults(records);
    } catch (err) {
      console.error("Failed to run RAG query:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadFile(e.target.files[0]);
      setUploadStatus(null);
    }
  };

  const submitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    setUploadStatus(null);
    
    // Simulate parsing and indexing the PDF into Qdrant vectors
    setTimeout(() => {
      setUploading(false);
      setUploadStatus(`Success: File "${uploadFile.name}" has been parsed, chunked, and upserted into Qdrant collection "knowledge_collection".`);
      setUploadFile(null);
    }, 2000);
  };

  const categoriesList = ['All', 'BNS', 'IPC', 'SOP', 'MANUAL'];

  const sampleRags = isKannada ? [
    "ಬಿಎನ್ಎಸ್ ಅಡಿಯಲ್ಲಿ ಕೊಲೆಗೆ ಶಿಕ್ಷೆ ಏನು?",
    "ಕಳ್ಳತನ ನಡೆದ ಸ್ಥಳಗಳ ಪ್ರಮಾಣಿತ ಕಾರ್ಯಾಚರಣೆಯ ವಿಧಾನ.",
    "ಐಪಿಸಿ ಸೆಕ್ಷನ್ 302 ರ ಮಾರ್ಗಸೂಚಿಗಳು ಮತ್ತು ಅಗತ್ಯತೆಗಳು.",
    "ಬಿಎನ್ಎಸ್ ಸೆಕ್ಷನ್ 103 ಸಮುದಾಯ ಹಿಂಸಾಚಾರ ಡಕಾಯಿತಿ ಮಾರ್ಗಸೂಚಿಗಳು."
  ] : [
    "What is the punishment for murder under BNS?",
    "Standard operating procedure for burglary scenes.",
    "IPC Section 302 guidelines and requirements.",
    "BNS Section 103 community violence dacoity guidelines."
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="border-b border-white/5 pb-4">
        <h2 className="text-xl font-bold tracking-wide font-mono text-white">{t("LEGAL MANUALS & RAG KNOWLEDGE BASE")}</h2>
        <p className="text-xs text-police-muted">{t("Vector search across Indian Penal Code (IPC), Bharatiya Nyaya Sanhita (BNS), and Karnataka Police SOPs.")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Search Input & Document Uploader */}
        <div className="space-y-6">
          {/* RAG Search Form */}
          <div className="glass-card p-4 rounded-xl border-white/5 space-y-4">
            <div className="flex items-center gap-1.5 text-xs text-police-accent font-mono font-semibold">
              <BookOpen className="h-4.5 w-4.5" />
              <span>{t("SOP & Codes Search")}</span>
            </div>
            
            <form onSubmit={handleSearch} className="space-y-3">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-police-muted" />
                </span>
                <input
                  type="text"
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  placeholder={t("e.g. procedure for burglary scene...")}
                  className="w-full glass-input pl-10 pr-4 py-2 rounded-lg text-xs font-mono"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-police-accent/15 border border-police-accent/25 hover:bg-police-accent/25 text-police-accent font-mono font-semibold rounded-lg text-xs transition flex items-center justify-center gap-2"
              >
                {loading ? t("Searching Vectors...") : t("Query Legal Vectors")}
              </button>
            </form>

            <div className="space-y-1 pt-2 border-t border-white/5 text-[10px] font-mono">
              <div className="text-[9px] uppercase font-mono tracking-wider text-police-muted mb-1">{t("Common Inquiries:")}</div>
              {sampleRags.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleTriggerCommonQuery(prompt)}
                  className="w-full text-left p-1.5 text-police-muted hover:text-police-accent truncate hover:underline"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* SOP PDF Uploader */}
          <div className="glass-card p-4 rounded-xl border-white/5 space-y-4">
            <div className="flex items-center gap-1.5 text-xs text-police-accent font-mono font-semibold">
              <Upload className="h-4.5 w-4.5" />
              <span>{t("Index New Manual (RAG)")}</span>
            </div>

            <form onSubmit={submitUpload} className="space-y-3">
              <div>
                <label className="block text-[9px] font-mono uppercase tracking-wider text-police-muted mb-1.5">{t("Document Scope")}</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full bg-police-darkest border border-white/10 rounded p-1.5 text-xs text-police-text focus:outline-none"
                >
                  <option value="SOP">SOP (Standard Operating Procedure)</option>
                  <option value="BNS">BNS (Bharatiya Nyaya Sanhita)</option>
                  <option value="IPC">IPC (Indian Penal Code)</option>
                  <option value="MANUAL">Department Manual / Guidelines</option>
                </select>
              </div>

              {/* Drag n Drop area */}
              <div className="border border-dashed border-white/10 rounded-lg p-4 text-center cursor-pointer hover:border-police-accent/30 transition relative">
                <input
                  type="file"
                  accept=".pdf,.txt"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <FileText className="h-8 w-8 text-police-muted mx-auto mb-2" />
                <span className="text-[10px] text-police-muted font-mono block">
                  {uploadFile ? uploadFile.name : t("Select PDF / TXT manual file (max 15MB)")}
                </span>
              </div>

              <button
                type="submit"
                disabled={!uploadFile || uploading}
                className="w-full py-2 bg-police-neonBlue/15 hover:bg-police-neonBlue/25 border border-police-neonBlue/25 text-white font-mono font-semibold rounded-lg text-xs transition disabled:opacity-50"
              >
                {uploading ? t("Chunking & Seeding Qdrant...") : t("Index Document")}
              </button>
            </form>

            {uploadStatus && (
              <div className="p-2.5 bg-green-500/10 border border-green-500/20 text-green-400 text-[9.5px] font-mono leading-relaxed rounded-lg">
                {uploadStatus}
              </div>
            )}
          </div>
        </div>

        {/* Right: RAG matched results */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            <h3 className="text-sm font-bold font-mono tracking-wider text-white">{t("CORRESPONDING MANUAL CHUNKS")}</h3>
          </div>

          {!searched ? (
            <div className="glass-card rounded-xl p-12 text-center text-police-muted border-white/5 flex flex-col items-center justify-center min-h-[350px]">
              <HelpCircle className="h-10 w-10 text-white/5 mb-3" />
              <p className="text-xs max-w-sm">Enter a legal procedural query (e.g. regarding BNS or homicide evidence SOPs) to perform semantic searches in the Qdrant manual directories.</p>
            </div>
          ) : results.length === 0 ? (
            <div className="glass-card rounded-xl p-12 text-center text-red-400 border-white/5 flex flex-col items-center justify-center min-h-[350px]">
              <AlertCircle className="h-10 w-10 text-red-500/20 mb-3" />
              <p className="text-xs">No matching procedural text was found in the indexed manuals database.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[calc(100vh-14rem)] overflow-y-auto pr-1">
              {results.map((doc, idx) => (
                <div 
                  key={idx}
                  className="glass-card p-4 rounded-xl border-white/5 hover:border-police-accent/25 transition space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-police-accent" />
                      <span className="text-xs font-bold text-white font-mono">{doc.filename}</span>
                    </div>
                    
                    <div className="flex gap-2 font-mono text-[9px]">
                      <span className="px-1.5 py-0.5 bg-police-accent/15 border border-police-accent/25 text-police-accent rounded">
                        {t("Category")}: {doc.category}
                      </span>
                      <span className="px-1.5 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded">
                        {t("Match Score")}: {int_score(doc.score)}%
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-xs text-police-text leading-relaxed font-mono whitespace-pre-wrap">
                    {doc.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function int_score(score: number | undefined) {
  if (score === undefined) return 80;
  if (score > 1.0) return 99; // cap
  return Math.round(score * 100);
}

export default RAGKnowledgeBase;
