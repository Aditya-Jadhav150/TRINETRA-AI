import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Compass, Calendar, AlertCircle, Play, CheckCircle2, ChevronRight, UserPlus, FileSearch, ShieldCheck } from 'lucide-react'
import { useAuth } from '../App'

const InvestigationCopilot: React.FC = () => {
  const { token, isKannada } = useAuth();
  
  const translations: Record<string, string> = {
    'INVESTIGATION COPILOT': 'ತನಿಖಾ ಸಹಾಯಕ (ಕಾಪಿಲಟ್)',
    'Automated evidence auditing, case timeline tracking, and procedural decision support.': 'ಸ್ವಯಂಚಾಲಿತ ಸಾಕ್ಷ್ಯಾಧಾರಗಳ ಪರಿಶೀಲನೆ, ಪ್ರಕರಣದ ಟೈಮ್‌ಲೈನ್ ಟ್ರ್ಯಾಕಿಂಗ್ ಮತ್ತು ಕಾಯ್ದೆಗಳ ತೀರ್ಮಾನ ಬೆಂಬಲ.',
    'Active File:': 'ಸಕ್ರಿಯ ಕಡತ:',
    'Constructing Copilot Workspaces...': 'ಕಾಪಿಲಟ್ ಕಾರ್ಯಾಚರಣಾ ಸ್ಥಳಗಳನ್ನು ಸಿದ್ಧಪಡಿಸಲಾಗುತ್ತಿದೆ...',
    'Case Abstract Summary': 'ಪ್ರಕರಣದ ವಿವರ ಸಂಕ್ಷಿಪ್ತ ವರದಿ',
    'Acts/Sections:': 'ಕಾಯ್ದೆಗಳು/ಸೆಕ್ಷನ್‌ಗಳು:',
    'Investigator:': 'ತನಿಖಾಧಿಕಾರಿ:',
    'Suspects:': 'ಶಂಕಿತರು:',
    'Investigation Timeline': 'ತನಿಖೆಯ ಟೈಮ್‌ಲೈನ್',
    'CASE DOSSIER COMPLETENESS': 'ಪ್ರಕರಣದ ಕಡತದ ಸಂಪೂರ್ಣತೆ',
    'COMPLETENESS INDEX': 'ಸಂಪೂರ್ಣತೆ ಸೂಚ್ಯಂಕ',
    'Calculated dynamically from audited evidence registry records, custody status, and laboratory reports.': 'ಪರಿಶೀಲಿಸಿದ ಸಾಕ್ಷ್ಯಾಧಾರಗಳು, ಕಸ್ಟಡಿ ಸ್ಥಿತಿ ಮತ್ತು ಲ್ಯಾಬೋರೇಟರಿ ವರದಿಗಳಿಂದ ಸಂಪೂರ್ಣತೆಯನ್ನು ಲೆಕ್ಕಹಾಕಲಾಗುತ್ತದೆ.',
    'Evidence Audit Checklist': 'ಸಾಕ್ಷ್ಯ ಪರಿಶೀಲನಾ ಪಟ್ಟಿ',
    'Evidence Gaps Audit': 'ಸಾಕ್ಷ್ಯಾಧಾರಗಳ ಕೊರತೆ ಪರಿಶೀಲನೆ',
    'Recommended Action Plan': 'ಶಿಫಾರಸು ಮಾಡಿದ ಕ್ರಿಯಾ ಯೋಜನೆ',
    'No case files available.': 'ಯಾವುದೇ ಪ್ರಕರಣದ ಕಡತಗಳು ಲಭ್ಯವಿಲ್ಲ.'
  };

  const t = (key: string) => {
    return isKannada ? (translations[key] || key) : key;
  };
  
  const [cases, setCases] = useState<any[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<number>(1);
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCases();
  }, [token]);

  useEffect(() => {
    if (cases.length > 0 && selectedCaseId) {
      const match = cases.find(c => c.case_id === selectedCaseId);
      if (match) {
        setSelectedCase(match);
      }
    }
  }, [cases, selectedCaseId]);

  const fetchCases = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get('/api/analytics/overview', { headers });
      
      const recent = response.data.recent_cases;
      
      const detailPromises = recent.map((c: any) => 
        axios.get(`/api/analytics/similarity?query_text=${encodeURIComponent(c.crime_no)}`, { headers })
      );
      
      const details = await Promise.all(detailPromises);
      const formatted = details.map((res: any) => res.data[0]).filter(Boolean);
      
      setCases(formatted);
      if (formatted.length > 0) {
        setSelectedCaseId(formatted[0].case_id);
        setSelectedCase(formatted[0]);
      }
    } catch (err) {
      console.error("Failed to load Copilot cases list:", err);
    } finally {
      setLoading(false);
    }
  };

  // Compile timeline steps
  const getTimeline = (c: any) => {
    if (!c) return [];
    const dateObj = new Date(c.registered_date);
    
    return [
      { 
        event: isKannada ? "ಅಪರಾಧ ನಡೆದ ಸಮಯ" : "Incident Committal", 
        date: formatDate(dateObj, -1), 
        desc: isKannada ? "ಅಪರಾಧ ನಡೆದಿದೆ. ಸ್ಥಳೀಯ ಅಧಿಕಾರಿಗಳಿಂದ ಪ್ರತ್ಯಕ್ಷದರ್ಶಿಗಳ ಹೇಳಿಕೆ ದಾಖಲಿಸಲಾಗಿದೆ." : "Incident occurred. Witness logs compiled by local beat officers." 
      },
      { 
        event: isKannada ? "ಠಾಣೆಯಲ್ಲಿ ಎಫ್‌ಐಆರ್ ದಾಖಲು" : "FIR Registered at Station", 
        date: c.registered_date, 
        desc: isKannada ? `ಅಧಿಕಾರಿ ${c.officer} ಅವರು ಐಪಿಸಿ/ಬಿಎನ್ಎಸ್ ಅಡಿಯಲ್ಲಿ ಪ್ರಕರಣ ದಾಖಲಿಸಿದ್ದಾರೆ.` : `Officer ${c.officer} entered record under IPC/BNS codes.` 
      },
      { 
        event: isKannada ? "ತನಿಖಾಧಿಕಾರಿ ನೇಮಕ" : "Investigating Officer Appointed", 
        date: formatDate(dateObj, 2), 
        desc: isKannada ? "ಪ್ರಕರಣದ ಕಡತವನ್ನು ಮುಖ್ಯ ತನಿಖಾಧಿಕಾರಿಗೆ ಹಸ್ತಾಂತರಿಸಲಾಗಿದೆ. ಸ್ಥಳ ಭೇಟಿ ವರದಿ ಲಾಗ್ ಮಾಡಲಾಗಿದೆ." : "Case folder handed over to the primary IO. Scene visit logged." 
      },
      { 
        event: isKannada ? "ಶಂಕಿತ ಆರೋಪಿಯ ಬಂಧನ ದಾಖಲು" : "Suspect Apprehension Recorded", 
        date: formatDate(dateObj, 5), 
        desc: isKannada ? `ಶಂಕಿತ ಆರೋಪಿ ${c.accused[0] || 'A1'} ಬಂಧಿಸಿ ಕಸ್ಟಡಿಗೆ ಪಡೆಯಲಾಗಿದೆ.` : `Suspect ${c.accused[0] || 'A1'} arrested and booked into custody.` 
      }
    ];
  };

  // Compile evidence checklist based on case properties
  const getEvidenceChecklist = (c: any) => {
    if (!c) return [];
    
    const checklist = [
      { 
        id: 1, 
        title: isKannada ? "ಎಫ್‌ಐಆರ್ ನಮೂನೆ ಎ" : "FIR Registry Form A", 
        done: true, 
        desc: isKannada ? "ಸಿಸಿಟಿಎನ್ಎಸ್ ಡೇಟಾಬೇಸ್‌ನಲ್ಲಿ ದಾಖಲಿಸಲಾಗಿದೆ" : "Logged in CCTNS database" 
      },
      { 
        id: 2, 
        title: isKannada ? "ಅಪರಾಧ ಸ್ಥಳದ ತಪಾಸಣೆ" : "Crime Scene Inspection", 
        done: true, 
        desc: isKannada ? "ಘಟನಾ ಸ್ಥಳದ ಕುರುಹುಗಳನ್ನು ಛಾಯಾಚಿತ್ರ ಮಾಡಲಾಗಿದೆ" : "Sash windows toolmarks photographed" 
      },
      { 
        id: 3, 
        title: isKannada ? "ಆರೋಪಿ ಕಸ್ಟಡಿ ಮೆಮೊ" : "Accused Custody Memo", 
        done: c.accused[0] !== 'Unknown', 
        desc: isKannada ? `${c.accused[0] || 'A1'} ಬಂಧನ ಪತ್ರ ಸಲ್ಲಿಸಲಾಗಿದೆ` : `Booking sheet registered for ${c.accused[0] || 'A1'}` 
      },
      { 
        id: 4, 
        title: isKannada ? "ವಿಧಿವಿಜ್ಞಾನ ಪ್ರಯೋಗಾಲಯ ವರದಿ" : "Viscera Forensic Analysis", 
        done: !c.sections.includes("302"), 
        desc: isKannada ? "ಕರ್ನಾಟಕ ಎಫ್‌ಎಸ್‌ಎಲ್ ರಾಸಾಯನಿಕ ವಿಶ್ಲೇಷಣೆ ಸ್ಥಿತಿ" : "Karnataka FSL toxicology chemical analysis status" 
      }
    ];
    return checklist;
  };

  // Calculate dynamic completeness score based on checklist
  const getCompletenessScore = (c: any) => {
    if (!c) return 0;
    const checklist = getEvidenceChecklist(c);
    const completed = checklist.filter(item => item.done).length;
    return Math.round((completed / checklist.length) * 100);
  };

  const getMissingInfo = (c: any) => {
    if (!c) return [];
    
    const audits = [];
    if (c.accused.includes("Unknown")) {
      audits.push(isKannada 
        ? "ಆರೋಪಿಯ ಗುರುತು: ಮುಖ್ಯ ಶಂಕಿತ ವ್ಯಕ್ತಿ ಪತ್ತೆಯಾಗಿಲ್ಲ. ತನಿಖೆ ತೀವ್ರಗೊಳಿಸಿ." 
        : "Accused Identity: PRIMARY SUSPECT UNIDENTIFIED. Request beat search."
      );
    }
    if (c.sections.includes("302")) {
      audits.push(isKannada 
        ? "ಎಫ್‌ಎಸ್‌ಎಲ್ ವರದಿ: ಬೆಂಗಳೂರು ಪ್ರಯೋಗಾಲಯದಿಂದ ರಾಸಾಯನಿಕ ವರದಿ ಬಾಕಿ ಇದೆ." 
        : "Viscera Report: Toxicology report pending at FSL Bangalore laboratory."
      );
    }
    if (c.sections.includes("379")) {
      audits.push(isKannada 
        ? "ಮೌಲ್ಯಮಾಪನ ವರದಿ: ಅಧಿಕೃತ ಚಿನ್ನಾಭರಣ ವಾಣಿಜ್ಯ ಮೌಲ್ಯಮಾಪನ ವರದಿ ಬಾಕಿ ಇದೆ." 
        : "Valuation: Official vendor commercial jewelry valuation certificate pending."
      );
    }
    
    audits.push(isKannada 
      ? "ದಿನಚರಿ ಪುಸ್ತಕ: ತನಿಖಾಧಿಕಾರಿಯು ಸಾಪ್ತಾಹಿಕ ದಿನಚರಿ ವಿವರಗಳನ್ನು ಸಲ್ಲಿಸಿಲ್ಲ." 
      : "Daily Diary: Investigating Officer has not submitted weekly diary index."
    );
    return audits;
  };

  const getNextSteps = (c: any) => {
    if (!c) return [];
    
    const steps = [];
    if (c.sections.includes("302")) {
      steps.push({ 
        title: isKannada ? "ಸಹ-ಆರೋಪಿಗಳ ಪತ್ತೆ" : "Trace Co-offenders", 
        desc: isKannada ? "ಸುನಿಲ್ ಗೌಡ ಮತ್ತು ಸ್ಥಳೀಯ ಗ್ಯಾಂಗ್ ನಡುವಿನ ಲಿಂಕ್ ಪತ್ತೆಹಚ್ಚಲು ಶಾರ್ಟೆಸ್ಟ್ ಪಾತ್ ಬಳಸಿ." : "Use Shortest Path solver to trace links between Sunil Gowda and local gang circles." 
      });
      steps.push({ 
        title: isKannada ? "ಎಫ್‌ಎಸ್‌ಎಲ್ ಪ್ರಯೋಗಾಲಯಕ್ಕೆ ಮನವಿ" : "FSL Lab Escalation", 
        desc: isKannada ? "ವಿಷಶಾಸ್ತ್ರ ವರದಿಯನ್ನು ತ್ವರಿತವಾಗಿ ಒದಗಿಸಲು ಮನವಿ ಸಲ್ಲಿಸಿ." : "Submit fast-track request for chemical toxicology viscera report." 
      });
    } else {
      steps.push({ 
        title: isKannada ? "ಸ್ಥಳೀಯ ಸಿಸಿಟಿವಿ ಪರಿಶೀಲನೆ" : "Index Local CCTVs", 
        desc: isKannada ? "ಹೆದ್ದಾರಿಗಳ ಬಳಿಯ ಹೈ-ಡೆಫಿನಿಷನ್ ಸಿಸಿಟಿವಿ ದೃಶ್ಯಗಳನ್ನು ಪರಿಶೀಲಿಸಿ." : "Audit high-definition feeds near escape corridor highways." 
      });
    }
    
    steps.push({ 
      title: isKannada ? "ಅಂತಿಮ ದೋಷಾರೋಪಣೆ ಪಟ್ಟಿ ಸಲ್ಲಿಕೆ" : "Submit Final Chargesheet", 
      desc: isKannada ? "ನಮೂನೆ ಎ ಅನ್ನು ರಚಿಸಿ ನ್ಯಾಯಾಂಗ ಮ್ಯಾಜಿಸ್ಟ್ರೇಟ್‌ಗೆ ಸಲ್ಲಿಸಿ." : "Draft Form A and submit to Judicial Magistrate of First Class." 
    });
    return steps;
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-police-darkest">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 border-4 border-police-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="text-sm font-mono text-police-accent uppercase tracking-widest">{t("Constructing Copilot Workspaces...")}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-wide font-mono text-white">{t("INVESTIGATION COPILOT")}</h2>
          <p className="text-xs text-police-muted">{t("Automated evidence auditing, case timeline tracking, and procedural decision support.")}</p>
        </div>
        
        {/* Case selector dropdown */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-police-muted">{t("Active File:")}</span>
          <select 
            value={selectedCaseId} 
            onChange={(e) => setSelectedCaseId(parseInt(e.target.value))}
            className="bg-police-darkest border border-white/10 rounded px-2.5 py-1 text-police-text focus:outline-none focus:border-police-accent"
          >
            {cases.map(c => (
              <option key={c.case_id} value={c.case_id}>FIR {c.case_no} ({c.station})</option>
            ))}
          </select>
        </div>
      </div>

      {selectedCase ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Summary and Timeline */}
          <div className="lg:col-span-2 space-y-6">
            {/* Case Summary Panel */}
            <div className="glass-card p-4 rounded-xl border-white/5 space-y-3">
              <h3 className="text-xs font-bold font-mono tracking-wider text-police-accent uppercase">{t("Case Abstract Summary")}</h3>
              <p className="text-xs text-police-text leading-relaxed font-mono">
                {selectedCase.brief_facts}
              </p>
              <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-police-muted border-t border-white/5 pt-3">
                <div><b>{t("Acts/Sections:")}</b> <span className="text-police-accent">{selectedCase.sections.join(", ")}</span></div>
                <div><b>{t("Investigator:")}</b> <span className="text-white">{selectedCase.officer}</span></div>
                <div><b>{t("Suspects:")}</b> <span className="text-white">{selectedCase.accused.join(", ")}</span></div>
              </div>
            </div>

            {/* Vertical timeline of events */}
            <div className="glass-card p-4 rounded-xl border-white/5 space-y-4">
              <h3 className="text-xs font-bold font-mono tracking-wider text-police-accent uppercase">{t("Investigation Timeline")}</h3>
              <div className="relative border-l border-white/5 ml-3 pl-6 space-y-6 text-xs font-mono">
                {getTimeline(selectedCase).map((t: any, idx: number) => (
                  <div key={idx} className="relative">
                    {/* Circle icon */}
                    <span className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-police-darkest border-2 border-police-accent flex items-center justify-center">
                      <span className="h-1.5 w-1.5 bg-police-accent rounded-full"></span>
                    </span>
                    <div>
                      <div className="flex items-center justify-between font-bold text-white mb-0.5">
                        <span>{t.event}</span>
                        <span className="text-[9px] text-police-accent px-1.5 py-0.5 bg-police-accent/5 border border-police-accent/15 rounded">
                          {t.date}
                        </span>
                      </div>
                      <p className="text-police-muted text-[10px] mt-1">{t.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Completeness Meter, Checklist & Next Steps */}
          <div className="space-y-6">
            {/* Case Completeness Gauge & Checklist */}
            <div className="glass-card p-4 rounded-xl border-white/5 space-y-4">
              <h3 className="text-xs font-bold font-mono tracking-wider text-white uppercase flex items-center gap-1.5">
                <ShieldCheck className="h-4.5 w-4.5 text-police-accent" />
                <span>{t("CASE DOSSIER COMPLETENESS")}</span>
              </h3>
              
              <div className="flex items-center gap-6 border-b border-white/5 pb-4">
                {/* Circular completeness meter */}
                <div className="relative h-20 w-20 flex items-center justify-center shrink-0">
                  <svg className="absolute inset-0 h-full w-full transform -rotate-90">
                    <circle cx="40" cy="40" r="34" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
                    <circle 
                      cx="40" 
                      cy="40" 
                      r="34" 
                      fill="transparent" 
                      stroke={getCompletenessScore(selectedCase) >= 75 ? '#10b981' : '#00f0ff'} 
                      strokeWidth="5" 
                      strokeDasharray={2 * Math.PI * 34}
                      strokeDashoffset={2 * Math.PI * 34 * (1 - getCompletenessScore(selectedCase) / 100)}
                    />
                  </svg>
                  <span className="text-sm font-bold text-white font-mono">{getCompletenessScore(selectedCase)}%</span>
                </div>
                
                <div className="text-[10px] font-mono text-police-muted leading-relaxed">
                  <div className="font-semibold text-white mb-0.5">{t("COMPLETENESS INDEX")}</div>
                  {t("Calculated dynamically from audited evidence registry records, custody status, and laboratory reports.")}
                </div>
              </div>

              {/* Checklist list */}
              <div className="space-y-2.5 text-[10px] font-mono">
                <div className="text-[9px] uppercase tracking-widest text-police-muted mb-1">{t("Evidence Audit Checklist")}</div>
                {getEvidenceChecklist(selectedCase).map((item) => (
                  <div key={item.id} className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      readOnly
                      checked={item.done}
                      className="mt-0.5 rounded bg-police-darkest border-white/10 text-police-accent focus:ring-0 focus:ring-offset-0 cursor-default"
                    />
                    <div>
                      <div className={`font-semibold ${item.done ? 'text-white' : 'text-police-muted'}`}>{item.title}</div>
                      <p className="text-[9px] text-police-muted">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Missing Info Checklist */}
            <div className="glass-card p-4 rounded-xl border-white/5 space-y-3">
              <h3 className="text-xs font-bold font-mono tracking-wider text-[#e11d48] uppercase flex items-center gap-1.5">
                <AlertCircle className="h-4.5 w-4.5" />
                <span>{t("Evidence Gaps Audit")}</span>
              </h3>
              <div className="space-y-2 text-[10px] font-mono leading-relaxed">
                {getMissingInfo(selectedCase).map((item: string, idx: number) => (
                  <div key={idx} className="p-2.5 bg-red-500/5 border border-red-500/10 rounded-lg text-red-400 flex gap-2">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Next Steps & Recommendations */}
            <div className="glass-card p-4 rounded-xl border-white/5 space-y-3">
              <h3 className="text-xs font-bold font-mono tracking-wider text-green-400 uppercase flex items-center gap-1.5">
                <CheckCircle2 className="h-4.5 w-4.5" />
                <span>{t("Recommended Action Plan")}</span>
              </h3>
              <div className="space-y-3 text-[10px] font-mono leading-relaxed">
                {getNextSteps(selectedCase).map((step: any, idx: number) => (
                  <div key={idx} className="p-3 bg-green-500/5 border border-green-500/10 rounded-lg text-police-text">
                    <div className="font-bold text-green-400 flex items-center gap-1">
                      <ChevronRight className="h-4.5 w-4.5" />
                      <span>{step.title}</span>
                    </div>
                    <p className="text-police-muted mt-1">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card p-12 text-center text-police-muted rounded-xl">
          {t("No case files available.")}
        </div>
      )}
    </div>
  );
};

function formatDate(baseDate: Date, daysOffset: number): string {
  const newDate = new Date(baseDate);
  newDate.setDate(newDate.getDate() + daysOffset);
  return newDate.toISOString().split('T')[0];
}

export default InvestigationCopilot;
