import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar 
} from 'recharts'
import { 
  User, 
  ShieldAlert, 
  History, 
  AlertTriangle, 
  Fingerprint, 
  Activity, 
  MapPin 
} from 'lucide-react'
import { useAuth } from '../App'

const OffenderProfiling: React.FC = () => {
  const { token, isKannada } = useAuth();
  
  const translations: Record<string, string> = {
    'SUSPECT REGISTRY': 'ಶಂಕಿತರ ನೋಂದಣಿ ಪುಸ್ತಕ',
    'Compiling Suspect Dossiers...': 'ಶಂಕಿತರ ದಾಖಲೆಗಳನ್ನು ಕ್ರೋಢೀಕರಿಸಲಾಗುತ್ತಿದೆ...',
    'Suspect dossier lookup status: SURVEILLANCE ACTIVE': 'ಶಂಕಿತರ ಪ್ರೊಫೈಲ್ ಸ್ಥಿತಿ: ಕಣ್ಗಾವಲು ಸಕ್ರಿಯವಾಗಿದೆ',
    'Demographics Profile': 'ಜನಸಂಖ್ಯಾ ವಿವರಗಳು',
    'Full Name:': 'ಪೂರ್ಣ ಹೆಸರು:',
    'Known Aliases:': 'ತಿಳಿದಿರುವ ಅಡ್ಡಹೆಸರುಗಳು:',
    'No known alias': 'ಯಾವುದೇ ಅಡ್ಡಹೆಸರುಗಳಿಲ್ಲ',
    'Approx Age:': 'ಅಂದಾಜು ವಯಸ್ಸು:',
    'Gender:': 'ಲಿಂಗ:',
    'Repeat Offender Badge:': 'ಪುನರಾವರ್ತಿತ ಅಪರಾಧಿ ವರ್ಗ:',
    'Common Crime Zone:': 'ಸಾಮಾನ್ಯ ಅಪರಾಧ ವಲಯ:',
    'Common Crimes:': 'ಸಾಮಾನ್ಯ ಅಪರಾಧಗಳು:',
    'EXPLAINABLE AI dossier SCORE:': 'AI ಅಪರಾಧ ಸ್ಕೋರ್ ವಿವರಣೆ:',
    'Behavioral Crime Radar': 'ಅಪರಾಧ ನಡವಳಿಕೆ ರೇಡಾರ್',
    'Crime History ledger': 'ಅಪರಾಧ ಇತಿಹಾಸ ದಾಖಲೆ',
    'Incident / Case Code': 'ಘಟನೆ / ಪ್ರಕರಣ ಕೋಡ್',
    'Police Station': 'ಪೊಲೀಸ್ ಠಾಣೆ',
    'Accused Role': 'ಆರೋಪಿಯ ಪಾತ್ರ',
    'Gravity': 'ಗುರುತ್ವ',
    'A1 (Primary Attacker)': 'A1 (ಮುಖ್ಯ ಆರೋಪಿ)',
    'A1 (Snatching/Knife)': 'A1 (ಹಣ ಕೀಳುವಿಕೆ/ಚಾಕು)',
    'A1 (Motorcycle theft)': 'A1 (ಮೋಟರ್ ಸೈಕಲ್ ಕಳ್ಳತನ)',
    'A1 (Armed Robbery)': 'A1 (ಸಶಸ್ತ್ರ ದರೋಡೆ)',
    'Heinous': 'ಘೋರ ಅಪರಾಧ',
    'Non-Heinous': 'ಸಾಮಾನ್ಯ ಅಪರಾಧ',
    'Select a suspect from the registry side-panel to view active dossiers.': 'ಸಕ್ರಿಯ ದಾಖಲೆಗಳನ್ನು ವೀಕ್ಷಿಸಲು ಎಡ ಪ್ಯಾನಲ್‌ನಿಂದ ಶಂಕಿತ ವ್ಯಕ್ತಿಯನ್ನು ಆಯ್ಕೆಮಾಡಿ.'
  };

  const t = (key: string) => {
    return isKannada ? (translations[key] || key) : key;
  };

  const [offenders, setOffenders] = useState<any[]>([]);
  const [selectedOffender, setSelectedOffender] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRepeatOffenders();
  }, [token]);

  const fetchRepeatOffenders = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get('/api/analytics/repeat-offenders', { headers });
      setOffenders(response.data);
      if (response.data.length > 0) {
        setSelectedOffender(response.data[0]); // default select first suspect
      }
    } catch (err) {
      console.error("Failed to load repeat offenders:", err);
    } finally {
      setLoading(false);
    }
  };

  // Compile radar chart dataset for the selected suspect dynamically
  const getRadarData = (off: any) => {
    if (!off) return [];
    
    // Standard mock categories to match radar coordinates
    const categoriesMap = [
      { subject: isKannada ? 'ಹಿಂಸಾತ್ಮಕ ಅಪರಾಧ' : 'Violent Crime', A: 0, fullMark: 5 },
      { subject: isKannada ? 'ಆಸ್ತಿ ಕಳ್ಳತನ' : 'Property Theft', A: 0, fullMark: 5 },
      { subject: isKannada ? 'ಮಾದಕ ದ್ರವ್ಯ' : 'Narcotics', A: 0, fullMark: 5 },
      { subject: isKannada ? 'ಸೈಬರ್ ವಂಚನೆ' : 'Cyber Fraud', A: 0, fullMark: 5 },
      { subject: isKannada ? 'Extortion' : 'Extortion', A: 0, fullMark: 5 }
    ];
    
    // Populate base counts based on offender profile histories
    if (off.name === "Sunil Gowda") {
      categoriesMap[0].A = 2; // violent (murder)
      categoriesMap[1].A = 4; // property (theft, robbery)
      categoriesMap[4].A = 1;
    } else if (off.name === "Vinay Lal") {
      categoriesMap[1].A = 3; // dacoity
      categoriesMap[3].A = 3; // cyber phishing
    } else if (off.name === "Raju Kappe") {
      categoriesMap[0].A = 4; // attempted murder (assault)
      categoriesMap[1].A = 2; // dacoity
      categoriesMap[4].A = 3; // extortion
    } else if (off.name === "Karan Mehta") {
      categoriesMap[0].A = 3; // murder
      categoriesMap[2].A = 3; // drugs ganja
    } else {
      categoriesMap[1].A = off.cases_count;
    }
    
    return categoriesMap;
  };

  // Explains why the AI assigned the specific risk level
  const getRiskExplanation = (off: any) => {
    if (!off) return "";
    
    if (off.risk_level === 'CRITICAL') {
      return isKannada 
        ? `ನಿರ್ಣಾಯಕ ಅಪಾಯ: ಶಂಕಿತ ವ್ಯಕ್ತಿಯು ಅಲ್ಪಾವಧಿಯಲ್ಲಿ ಗಂಭೀರವಾದ ಹಿಂಸಾತ್ಮಕ ಮತ್ತು ಆಸ್ತಿ ಅಪರಾಧಗಳೊಂದಿಗೆ ಹೆಚ್ಚಿನ ಸಹ-ಅಪರಾಧ ಆವರ್ತನವನ್ನು (${off.cases_count} ಪ್ರಕರಣಗಳು) ಹೊಂದಿದ್ದಾನೆ. ತಕ್ಷಣದ ಮಧ್ಯಸ್ಥಿಕೆ ಅಗತ್ಯವಿದೆ.`
        : `CRITICAL RISK: Suspect has a high co-offending frequency (${off.cases_count} cases) with severe violent and property crimes in short succession. Immediate intervention required.`;
    } else if (off.risk_level === 'HIGH') {
      return isKannada 
        ? `ಹೆಚ್ಚಿನ ಅಪಾಯ: ಪುನರಾವರ್ತಿತ ಅಪರಾಧಿಯು ಹಲವಾರು ಸಂಘಟಿತ ದರೋಡೆ ಅಥವಾ ಸುಲಿಗೆ ಪ್ರಕರಣಗಳಿಗೆ ಸಂಬಂಧ ಹೊಂದಿದ್ದಾನೆ. ಸಕ್ರಿಯ ಗ್ಯಾಂಗ್ ಜಾಲದ ಪರಿಚಿತ ಸಹಚರ.`
        : `HIGH RISK: Repeat offender linked to multiple organized dacoity or extortion cases. Known associate of active community gang structures.`;
    }
    return isKannada 
      ? "ಮಧ್ಯಮ ಅಪಾಯ: ಮರುಕಳಿಸುವ ಸಣ್ಣ ಅಪರಾಧಗಳು. ಸಕ್ರಿಯ ಕಣ್ಗಾವಲಿನಲ್ಲಿದೆ." 
      : "MEDIUM RISK: Recurring minor offences. Under active surveillance.";
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-police-darkest">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 border-4 border-police-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="text-sm font-mono text-police-accent uppercase tracking-widest">{t("Compiling Suspect Dossiers...")}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-police-darkest overflow-hidden">
      {/* 1. Left List: Suspects directory */}
      <div className="w-80 border-r border-white/5 bg-police-darkest/95 flex flex-col p-4 overflow-y-auto shrink-0 select-none space-y-4">
        <div className="flex gap-2 items-center text-police-accent font-mono font-semibold border-b border-white/5 pb-3">
          <Fingerprint className="h-4.5 w-4.5" />
          <span>{t("SUSPECT REGISTRY")}</span>
        </div>
        
        <div className="space-y-2">
          {offenders.map((off) => (
            <button
              key={off.name}
              onClick={() => setSelectedOffender(off)}
              className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between text-xs font-mono ${
                selectedOffender?.name === off.name
                  ? 'bg-police-accent/10 border-police-accent/20 text-police-accent shadow-neon'
                  : 'bg-white/5 border-transparent text-police-muted hover:border-white/10 hover:text-police-text'
              }`}
            >
              <div>
                <div className="font-semibold text-police-text">{off.name}</div>
                <div className="text-[9px] text-police-muted">Cases: {off.cases_count} | Age: {off.age}</div>
              </div>
              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                off.risk_level === 'CRITICAL' ? 'bg-red-500/15 text-red-500 border border-red-500/25' : 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/25'
              }`}>
                {off.risk_level}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Right dossier sheet */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {selectedOffender ? (
          <div className="space-y-6">
            {/* Dossier Header Info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-police-accent/10 border border-police-accent/20 flex items-center justify-center">
                  <User className="h-6 w-6 text-police-accent" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-wide text-white">{selectedOffender.name.toUpperCase()}</h2>
                  <p className="text-xs text-police-muted font-mono">{t("Suspect dossier lookup status: SURVEILLANCE ACTIVE")}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-xs font-mono text-red-400 px-3 py-1.5 bg-red-500/5 border border-red-500/15 rounded-lg">
                <ShieldAlert className="h-4 w-4" />
                <span>AI Risk Score: {selectedOffender.risk_score} / 10.0 ({selectedOffender.risk_level})</span>
              </div>
            </div>

            {/* Sub-grid: Demographics and Radar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Demographics card */}
              <div className="glass-card p-4 rounded-xl border-white/5 space-y-4">
                <h3 className="text-xs font-bold font-mono tracking-wider text-police-accent uppercase">{t("Demographics Profile")}</h3>
                <div className="grid grid-cols-2 gap-y-2 gap-x-1 text-xs font-mono">
                  {selectedOffender.name && (
                    <>
                      <div className="text-police-muted">{t("Full Name:")}</div>
                      <div className="text-police-text font-semibold">{selectedOffender.name}</div>
                    </>
                  )}

                  {selectedOffender.name && (
                    <>
                      <div className="text-police-muted">{t("Known Aliases:")}</div>
                      <div className="text-police-gold font-bold">
                        {selectedOffender.name === 'Sunil Gowda' ? 'Sunil G. / Gowdru' : 
                         selectedOffender.name === 'Raju Kappe' ? 'Kappe Raju / Froggy' : t("No known alias")}
                      </div>
                    </>
                  )}
                  
                  {selectedOffender.age && (
                    <>
                      <div className="text-police-muted">{t("Approx Age:")}</div>
                      <div className="text-police-text">{selectedOffender.age} Years</div>
                    </>
                  )}
                  
                  {selectedOffender.gender && (
                    <>
                      <div className="text-police-muted">{t("Gender:")}</div>
                      <div className="text-police-text">{selectedOffender.gender}</div>
                    </>
                  )}

                  <div className="text-police-muted">{t("Repeat Offender Badge:")}</div>
                  <div>
                    <span className="px-1.5 py-0.5 bg-red-500/10 text-red-500 border border-red-500/25 rounded text-[9px] font-bold">
                      HABITUAL CLASS A
                    </span>
                  </div>
                  
                  {selectedOffender.name && (
                    <>
                      <div className="text-police-muted">{t("Common Crime Zone:")}</div>
                      <div className="text-police-text flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-police-accent" />
                        <span>{selectedOffender.name === 'Sunil Gowda' ? 'Bangalore' : 'Mysore'}</span>
                      </div>
                    </>
                  )}
                  
                  {selectedOffender.categories && selectedOffender.categories.length > 0 && (
                    <>
                      <div className="text-police-muted">{t("Common Crimes:")}</div>
                      <div className="text-police-text truncate">{selectedOffender.categories.join(", ")}</div>
                    </>
                  )}
                </div>
                
                {/* AI Score Explainability & Threat History log */}
                <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-lg flex flex-col gap-2 text-[10px] leading-relaxed text-police-text font-mono">
                  <div className="flex gap-2 items-start">
                    <AlertTriangle className="h-4.5 w-4.5 text-red-500 shrink-0" />
                    <div>
                      <div className="font-semibold text-red-400">{t("EXPLAINABLE AI dossier SCORE:")}</div>
                      <p className="mt-0.5 text-police-muted">{getRiskExplanation(selectedOffender)}</p>
                    </div>
                  </div>
                  <div className="border-t border-white/5 pt-2 mt-1 text-[9px] text-police-muted">
                    <b>Threat Log:</b> Risk score elevated from 8.2 to 9.5 on Jul 12, 2026, due to co-offending links matched in Neo4j.
                  </div>
                </div>
              </div>

              {/* Behavioral radar chart */}
              <div className="glass-card p-4 rounded-xl border-white/5 flex flex-col justify-between h-64">
                <h3 className="text-xs font-bold font-mono tracking-wider text-police-accent uppercase mb-2">{t("Behavioral Crime Radar")}</h3>
                <div className="flex-1 min-h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={getRadarData(selectedOffender)}>
                      <PolarGrid stroke="rgba(255,255,255,0.05)" />
                      <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={8} fontFamily="JetBrains Mono" />
                      <PolarRadiusAxis angle={30} domain={[0, 5]} stroke="#94a3b8" fontSize={8} />
                      <Radar
                        name={selectedOffender.name}
                        dataKey="A"
                        stroke="#00f0ff"
                        fill="#00f0ff"
                        fillOpacity={0.25}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Crime History ledger */}
            <div className="glass-card p-4 rounded-xl border-white/5">
              <h3 className="text-xs font-bold font-mono tracking-wider text-police-accent uppercase mb-3 flex items-center gap-1.5">
                <History className="h-4 w-4" />
                <span>{t("Crime History ledger")}</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-white/5 text-police-muted">
                      <th className="py-2">{t("Incident / Case Code")}</th>
                      <th className="py-2">{t("Police Station")}</th>
                      <th className="py-2">{t("Accused Role")}</th>
                      <th className="py-2">{t("Gravity")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-police-text">
                    {selectedOffender.name === 'Sunil Gowda' ? (
                      <>
                        <tr>
                          <td className="py-2 font-semibold text-police-accent">FIR 202600001 (Murder)</td>
                          <td className="py-2 text-police-muted">Cubbon Park PS</td>
                          <td className="py-2 text-red-400">{t("A1 (Primary Attacker)")}</td>
                          <td className="py-2 text-red-500 font-semibold">{t("Heinous")}</td>
                        </tr>
                        <tr>
                          <td className="py-2 font-semibold text-police-accent">FIR 202600003 (Robbery)</td>
                          <td className="py-2 text-police-muted">Indiranagar PS</td>
                          <td className="py-2 text-red-400">{t("A1 (Snatching/Knife)")}</td>
                          <td className="py-2">{t("Non-Heinous")}</td>
                        </tr>
                        <tr>
                          <td className="py-2 font-semibold text-police-accent">FIR 202600008 (Theft)</td>
                          <td className="py-2 text-police-muted">Cubbon Park PS</td>
                          <td className="py-2 text-red-400">{t("A1 (Motorcycle theft)")}</td>
                          <td className="py-2">{t("Non-Heinous")}</td>
                        </tr>
                      </>
                    ) : (
                      <tr>
                        <td className="py-2 font-semibold text-police-accent">FIR 202600009 (Dacoity)</td>
                        <td className="py-2 text-police-muted">Ashokapuram PS</td>
                        <td className="py-2 text-red-400">{t("A1 (Armed Robbery)")}</td>
                        <td className="py-2 text-red-500 font-semibold">{t("Heinous")}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-police-muted">
            {t("Select a suspect from the registry side-panel to view active dossiers.")}
          </div>
        )}
      </div>
    </div>
  );
};

export default OffenderProfiling;
