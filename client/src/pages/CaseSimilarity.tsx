import React, { useState } from 'react'
import axios from 'axios'
import { FolderSearch, Sparkles, CheckCircle2, AlertTriangle, ArrowRight, HelpCircle } from 'lucide-react'
import { useAuth } from '../App'

interface SimilarCase {
  case_id: number;
  crime_no: string;
  case_no: string;
  brief_facts: string;
  registered_date: string;
  score: number;
  station: string;
  sections: string[];
  accused: string[];
  officer: string;
  reason: string;
}

const CaseSimilarity: React.FC = () => {
  const { token, isKannada } = useAuth();
  
  const translations: Record<string, string> = {
    'CASE SIMILARITY MATCHER': 'ಪ್ರಕರಣದ ಹೋಲಿಕೆ ಹೊಂದಾಣಿಕೆದಾರ',
    'Semantic embedding comparisons across Brief Facts, Acts, and Sections to identify overlapping Modus Operandi (MO).': 'ಒಂದೇ ರೀತಿಯ ಅಪರಾಧ ವಿಧಾನಗಳನ್ನು (MO) ಪತ್ತೆಹಚ್ಚಲು ಪ್ರಕರಣದ ಸಾರಾಂಶ, ಕಾಯ್ದೆಗಳು ಮತ್ತು ಸೆಕ್ಷನ್‌ಗಳಾದ್ಯಂತ ಸೆಮ್ಯಾಂಟಿಕ್ ಎಂಬೆಡಿಂಗ್ ಹೋಲಿಕೆ.',
    'MO Fact Input': 'ಅಪರಾಧ ವಿಧಾನ (MO) ಸತ್ಯಗಳ ಇನ್‌ಪುಟ್',
    'Enter Case Brief Facts / MO': 'ಪ್ರಕರಣದ ವಿವರಗಳು / ಅಪರಾಧ ವಿಧಾನವನ್ನು ನಮೂದಿಸಿ',
    'Describe the incident: entry points, weapon used, threats, items stolen, or target demographics...': 'ಘಟನೆಯನ್ನು ವಿವರಿಸಿ: ಪ್ರವೇಶ ಬಿಂದುಗಳು, ಬಳಸಿದ ಆಯುಧ, ಬೆದರಿಕೆಗಳು, ಕಳುವಾದ ವಸ್ತುಗಳು ಅಥವಾ ಸಂತ್ರಸ್ತರ ವಿವರಗಳು...',
    'Generating Embeddings...': 'ಎಂಬೆಡಿಂಗ್‌ಗಳನ್ನು ರಚಿಸಲಾಗುತ್ತಿದೆ...',
    'Search Similar Cases': 'ಇದೇ ರೀತಿಯ ಪ್ರಕರಣಗಳನ್ನು ಹುಡುಕಿ',
    'Demo Scenarios (Autofill):': 'ಡೆಮೊ ಸನ್ನಿವೇಶಗಳು (ಆಟೋಫಿಲ್):',
    'INTELLIGENCE MATCH LEDGER': 'ಹೊಂದಿಕೆಯಾಗುವ ಪ್ರಕರಣಗಳ ಪುಸ್ತಕ',
    'Enter the brief facts description of an active investigation in the left panel to query vector embeddings and display matching records.': 'ವೆಕ್ಟರ್ ಎಂಬೆಡಿಂಗ್‌ಗಳನ್ನು ಕ್ವೆರಿ ಮಾಡಲು ಮತ್ತು ಹೊಂದಿಕೆಯಾಗುವ ದಾಖಲೆಗಳನ್ನು ಪ್ರದರ್ಶಿಸಲು ಎಡ ಪ್ಯಾನಲ್‌ನಲ್ಲಿ ತನಿಖೆಯ ವಿವರಗಳನ್ನು ನಮೂದಿಸಿ.',
    'No matching case records met the similarity thresholds in the embedding index.': 'ಎಂಬೆಡಿಂಗ್ ಸೂಚ್ಯಂಕದಲ್ಲಿ ಯಾವುದೇ ಪ್ರಕರಣಗಳು ಹೊಂದಿಕೆಯಾಗಿಲ್ಲ.',
    'Date:': 'ದಿನಾಂಕ:',
    'Facts:': 'ಸತ್ಯಗಳು:',
    'Sections:': 'ಸೆಕ್ಷನ್‌ಗಳು:',
    'Accused:': 'ಆರೋಪಿಗಳು:',
    'IO Officer:': 'ತನಿಖಾಧಿಕಾರಿ:',
    'EXPLAINABLE AI SIMILARITY SUMMARY:': 'AI ಹೋಲಿಕೆ ಸಾರಾಂಶ:',
    'Similarity Score': 'ಹೋಲಿಕೆ ಸ್ಕೋರ್'
  };

  const t = (key: string) => {
    return isKannada ? (translations[key] || key) : key;
  };
  
  const [queryText, setQueryText] = useState('')
  const [results, setResults] = useState<SimilarCase[]>([])
  
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryText.trim()) return;
    setLoading(true);
    setSearched(true);
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(
        `/api/analytics/similarity?query_text=${encodeURIComponent(queryText)}`,
        { headers }
      );
      setResults(response.data);
    } catch (err) {
      console.error("Failed to run vector similarity search:", err);
    } finally {
      setLoading(false);
    }
  };

  const sampleScenarios = isKannada ? [
    { title: "ಕೋರಮಂಗಲ ಕತ್ತು ಹಿಸುಕಿ ಕೊಲೆ", text: "ಕಾಲುವೆಯಲ್ಲಿ ವಿದ್ಯಾರ್ಥಿನಿಯ ಶವ ಪತ್ತೆಯಾಗಿದೆ. ಶವಪರೀಕ್ಷೆಯು ಕೊಲೆಯನ್ನು ದೃಢಪಡಿಸಿದೆ. ಇದು ದ್ವೇಷದ ಹಿನ್ನೆಲೆಯಲ್ಲಿ ನಡೆದ ಕೊಲೆಯಾಗಿದೆ." },
    { title: "ಮೈಸೂರು ಚಿನ್ನದ ಅಂಗಡಿ ದರೋಡೆ", text: "ದರೋಡೆಕೋರರು ರಾತ್ರಿ ವೇಳೆ ಹಿಂಬಾಗಿಲಿನ ಕಿಟಕಿ ಒಡೆದು ನುಗ್ಗಿ, ಲಾಕರ್‌ನಲ್ಲಿದ್ದ ಚಿನ್ನಾಭರಣ ಹಾಗೂ ನಗದು ದೋಚಿದ್ದಾರೆ." },
    { title: "ಇಂದಿರಾನಗರ ರಸ್ತೆ ದರೋಡೆ", text: "ಮೋಟಾರ್ ಸೈಕಲ್ ಸವಾರನು ಪಾದಚಾರಿಯನ್ನು ತಡೆದು ಚಾಕು ತೋರಿಸಿ ಬೆದರಿಸಿ ಆಕೆಯ ಪರ್ಸ್ ಹಾಗೂ ಮೊಬೈಲ್ ಕಸಿದುಕೊಂಡಿದ್ದಾನೆ." }
  ] : [
    { title: "Koramangala Strangling", text: "A female student body was discovered in a drain canal. Post-mortem reports indicate strangulation prior to being dumped, pointing to personal enmity rather than theft." },
    { title: "Mysore Gold Lockup Break-in", text: "Thieves bypassed the front gate at night, broke a wooden window sash at the rear, and looted 100g of gold jewelry along with cash from a steel bedroom wardrobe." },
    { title: "Indiranagar Highway Knifepoint Robbery", text: "A pedestrian was stopped by a motorcycle rider in a dark alley. The rider brandished a large dagger and snatched her leather purse and mobile phone." }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="border-b border-white/5 pb-4">
        <h2 className="text-xl font-bold tracking-wide font-mono text-white">{t("CASE SIMILARITY MATCHER")}</h2>
        <p className="text-xs text-police-muted">{t("Semantic embedding comparisons across Brief Facts, Acts, and Sections to identify overlapping Modus Operandi (MO).")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Input Panel */}
        <div className="glass-card p-4 rounded-xl border-white/5 space-y-5 h-fit">
          <div className="flex items-center gap-1.5 text-xs text-police-accent font-mono font-semibold">
            <FolderSearch className="h-4.5 w-4.5" />
            <span>{t("MO Fact Input")}</span>
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-police-muted mb-2">
                {t("Enter Case Brief Facts / MO")}
              </label>
              <textarea
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                rows={6}
                required
                placeholder={t("Describe the incident: entry points, weapon used, threats, items stolen, or target demographics...")}
                className="w-full glass-input p-3 rounded-lg text-xs resize-none"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-police-accent/15 border border-police-accent/25 hover:bg-police-accent/25 text-police-accent font-mono font-semibold rounded-lg text-xs transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="h-3 w-3 border-2 border-police-accent border-t-transparent rounded-full animate-spin"></span>
                  <span>{t("Generating Embeddings...")}</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>{t("Search Similar Cases")}</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Scenario Fillers */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            <div className="text-[9px] uppercase font-mono tracking-wider text-police-muted">{t("Demo Scenarios (Autofill):")}</div>
            {sampleScenarios.map((sc, i) => (
              <button
                key={i}
                onClick={() => setQueryText(sc.text)}
                className="w-full p-2.5 bg-police-darkest/40 border border-white/5 hover:border-police-accent/20 rounded-lg text-left text-[10px] text-police-muted hover:text-police-text transition"
              >
                <div className="font-semibold text-police-accent mb-0.5">{sc.title}</div>
                <p className="line-clamp-2 leading-tight">{sc.text}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Right Output Panel: Matches list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            <h3 className="text-sm font-bold font-mono tracking-wider text-white">{t("INTELLIGENCE MATCH LEDGER")}</h3>
          </div>

          {!searched ? (
            <div className="glass-card rounded-xl p-12 text-center text-police-muted border-white/5 flex flex-col items-center justify-center min-h-[350px]">
              <HelpCircle className="h-10 w-10 text-white/5 mb-3" />
              <p className="text-xs max-w-sm">{t("Enter the brief facts description of an active investigation in the left panel to query vector embeddings and display matching records.")}</p>
            </div>
          ) : results.length === 0 ? (
            <div className="glass-card rounded-xl p-12 text-center text-red-400 border-white/5 flex flex-col items-center justify-center min-h-[350px]">
              <AlertTriangle className="h-10 w-10 text-red-500/20 mb-3" />
              <p className="text-xs">{t("No matching case records met the similarity thresholds in the embedding index.")}</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[calc(100vh-14rem)] overflow-y-auto pr-1">
              {results.map((c) => (
                <div 
                  key={c.case_id}
                  className="glass-card p-4 rounded-xl border-white/5 flex flex-col sm:flex-row gap-4 justify-between hover:border-police-accent/25 transition"
                >
                  <div className="flex-1 space-y-3">
                    {/* Header: Case details */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-sm font-bold text-white font-mono">{c.crime_no}</span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-white/5 border border-white/5 text-police-muted rounded font-mono">
                        {c.station}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-police-accent/10 border border-police-accent/20 text-police-accent rounded font-mono">
                        {t("Date:")} {c.registered_date}
                      </span>
                    </div>

                    {/* Brief facts snippet */}
                    <p className="text-xs text-police-text leading-relaxed font-mono p-2.5 bg-police-darkest/40 rounded-lg border border-white/5">
                      <b>{t("Facts:")}</b> {c.brief_facts}
                    </p>

                    {/* Metadata tags */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono">
                      <div className="text-police-muted">
                        <b>{t("Sections:")}</b> <span className="text-police-accent">{c.sections.join(", ")}</span>
                      </div>
                      <div className="text-police-muted">
                        <b>{t("Accused:")}</b> <span className="text-white">{c.accused.join(", ")}</span>
                      </div>
                      <div className="text-police-muted">
                        <b>{t("IO Officer:")}</b> <span className="text-police-muted">{c.officer}</span>
                      </div>
                    </div>

                    {/* Explainable AI block */}
                    <div className="p-3 bg-police-accent/5 border border-police-accent/10 rounded-lg text-[10px] leading-relaxed text-police-text font-mono flex gap-2.5">
                      <Sparkles className="h-4.5 w-4.5 text-police-accent shrink-0" />
                      <div>
                        <div className="font-semibold text-police-accent">{t("EXPLAINABLE AI SIMILARITY SUMMARY:")}</div>
                        <p className="mt-0.5 text-police-muted">{c.reason}</p>
                      </div>
                    </div>
                  </div>

                  {/* Score gauge right */}
                  <div className="sm:w-28 flex flex-col items-center justify-center shrink-0 border-t sm:border-t-0 sm:border-l border-white/5 pt-3 sm:pt-0 sm:pl-4">
                    <div className="relative h-16 w-16 flex items-center justify-center">
                      {/* circular track */}
                      <svg className="absolute inset-0 h-full w-full transform -rotate-90">
                        <circle cx="32" cy="32" r="28" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                        <circle 
                          cx="32" 
                          cy="32" 
                          r="28" 
                          fill="transparent" 
                          stroke={c.score >= 0.8 ? '#10b981' : '#00d2ff'} 
                          strokeWidth="4" 
                          strokeDasharray={2 * Math.PI * 28}
                          strokeDashoffset={2 * Math.PI * 28 * (1 - c.score)}
                        />
                      </svg>
                      <span className="text-xs font-bold text-white font-mono">{Math.round(c.score * 100)}%</span>
                    </div>
                    <span className="text-[9px] font-mono text-police-muted mt-2 text-center uppercase tracking-widest">{t("Similarity Score")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CaseSimilarity;
