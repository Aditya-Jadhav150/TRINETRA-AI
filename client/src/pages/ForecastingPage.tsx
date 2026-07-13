import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts'
import { TrendingUp, AlertTriangle, ShieldCheck, MapPin, CalendarDays, HelpCircle } from 'lucide-react'
import { useAuth } from '../App'

const ForecastingPage: React.FC = () => {
  const { token, isKannada } = useAuth();
  
  const translations: Record<string, string> = {
    'CRIME FORECASTING': 'ಅಪರಾಧ ಮುನ್ಸೂಚನೆ',
    'Seasonal forecasting, weekend spike ratios, and localized crime density projections.': 'ಋತುಮಾನದ ಅಪರಾಧ ಮುನ್ಸೂಚನೆಗಳು, ವಾರಾಂತ್ಯದ ಏರಿಕೆ ಅನುಪಾತಗಳು ಮತ್ತು ಸ್ಥಳೀಯ ಅಪರಾಧ ಸಾಂದ್ರತೆಯ ಮುನ್ಸೂಚನೆಗಳು.',
    'Running Forecasting Models...': 'ಅಪರಾಧ ಮುನ್ಸೂಚನೆ ಮಾದರಿಗಳನ್ನು ರನ್ ಮಾಡಲಾಗುತ್ತಿದೆ...',
    'PROJECTED CRIME GROWTH INDEX (2026)': 'ಅಂದಾಜು ಅಪರಾಧ ಬೆಳವಣಿಗೆ ಸೂಚ್ಯಂಕ (೨೦೨೬)',
    'Model Confidence:': 'ಮಾದರಿ ವಿಶ್ವಾಸಾರ್ಹತೆ:',
    'FORECAST EXPLANABILITY': 'ಮುನ್ಸೂಚನೆ ವಿವರಣೆ',
    'LOCAL DENSITY FORECAST (JULY 2026)': 'ಸ್ಥಳೀಯ ಅಪರಾಧ ಸಾಂದ್ರತೆಯ ಮುನ್ಸೂಚನೆ (ಜುಲೈ ೨೦೨೬)',
    'District Name': 'ಜಿಲ್ಲೆಯ ಹೆಸರು',
    'Active Count': 'ಸಕ್ರಿಯ ಪ್ರಕರಣಗಳು',
    'Projected Next Month': 'ಮುಂದಿನ ತಿಂಗಳ ಅಂದಾಜು',
    'Repeat Offender Prob.': 'ಮರುಕಳಿಸುವ ಅಪರಾಧ ಸಾಧ್ಯತೆ',
    'Confidence': 'ವಿಶ್ವಾಸಾರ್ಹತೆ',
    'SEASONALITY INDICATORS': 'ಋತುಮಾನದ ಸೂಚಕಗಳು',
    'FORECAST FOCUS:': 'ಮುನ್ಸೂಚನೆ ಗಮನ ಹರಹು:',
    'RECOMMENDED ACTION:': 'ಶಿಫಾರಸು ಮಾಡಿದ ಕ್ರಮ:',
    'cases': 'ಪ್ರಕರಣಗಳು'
  };

  const t = (key: string) => {
    return isKannada ? (translations[key] || key) : key;
  };

  const translatedExplanation = (exp: string) => {
    if (!isKannada) return exp;
    if (exp.includes("Holt-Winters") || exp.includes("forecasts")) {
      return "ಮಾದರಿಯು ಜುಲೈ 2026 ರಲ್ಲಿ ಒಟ್ಟಾರೆ ಅಪರಾಧ ಪ್ರಕರಣಗಳಲ್ಲಿ 5.4% ಹೆಚ್ಚಳವನ್ನು ಮುನ್ಸೂಚಿಸುತ್ತದೆ, ಇದು ಐತಿಹಾಸಿಕ ಮಾದರಿಗಳ ಆಧಾರದ ಮೇಲೆ ಮಾನ್ಸೂನ್ ತಿಂಗಳುಗಳಲ್ಲಿ ಸುಲಿಗೆ ಪ್ರಕರಣಗಳ ಏರಿಕೆಗೆ ಹೊಂದಿಕೆಯಾಗುತ್ತದೆ.";
    }
    return exp;
  };

  const translatedWeekendTrend = (title: string) => {
    if (!isKannada) return title;
    if (title === "Weekend Activity Spike") return "ವಾರಾಂತ್ಯದ ಅಪರಾಧ ಚಟುವಟಿಕೆ ಏರಿಕೆ";
    return title;
  };

  const translatedWeekendExp = (exp: string) => {
    if (!isKannada) return exp;
    if (exp.includes("Saturdays and Sundays")) {
      return "ಶನಿವಾರ ಮತ್ತು ರವಿವಾರಗಳಲ್ಲಿ ಮೋಟಾರು ವಾಹನ ಕಳ್ಳತನ ಮತ್ತು ಕುಡಿತದ ಗಲಾಟೆಗಳು 14.5% ರಷ್ಟು ಹೆಚ್ಚಾಗುತ್ತವೆ.";
    }
    return exp;
  };

  const translatedFestival = (fest: string) => {
    if (!isKannada) return fest;
    if (fest === "Ganesh Chaturthi") return "ಗಣೇಶ ಚತುರ್ಥಿ";
    if (fest === "Deepavali") return "ದೀಪಾವಳಿ";
    return fest;
  };

  const translatedCrimeHead = (ch: string) => {
    if (!isKannada) return ch;
    if (ch === "Theft & Public Anomaly") return "ಕಳ್ಳತನ ಮತ್ತು ಸಾರ್ವಜನಿಕ ಗಲಾಟೆ";
    if (ch === "Gambling & Robbery") return "ಜೂಜಾಟ ಮತ್ತು ದರೋಡೆ";
    return ch;
  };

  const translatedRec = (rec: string) => {
    if (!isKannada) return rec;
    if (rec.includes("beat coverage")) {
      return "ಉತ್ಸವದ ಮೆರವಣಿಗೆ ಮಾರ್ಗಗಳಲ್ಲಿ ಗಸ್ತು ಪಹರೆಯನ್ನು ಹೆಚ್ಚಿಸಿ.";
    }
    if (rec.includes("illegal gambling")) {
      return "ತಿಂಗಳ ಕೊನೆಯ ವಾರದಲ್ಲಿ ಅಕ್ರಮ ಜೂಜಿನ ಅಡ್ಡಾಗಳ ಮೇಲೆ ದಾಳಿ ನಡೆಸಿ.";
    }
    return rec;
  };
  
  const [chartData, setChartData] = useState<any[]>([]);
  const [explanation, setExplanation] = useState('');
  const [confidence, setConfidence] = useState(80.0);
  
  const [spikes, setSpikes] = useState<any>({
    weekend_trend: { weekday_avg: 0, weekend_avg: 0, percentage_increase: 0, explanation: "" },
    festival_trends: []
  });
  
  const [districtForecasts, setDistrictForecasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForecastingData();
  }, [token]);

  const fetchForecastingData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [trendRes, spikeRes, distRes] = await Promise.all([
        axios.get('/api/forecast/crime-trends', { headers }),
        axios.get('/api/forecast/seasonal-spikes', { headers }),
        axios.get('/api/forecast/district-forecast', { headers })
      ]);
      
      // Merge historical and forecast data for the chart
      const merged = [
        ...trendRes.data.historical.map((h: any) => ({ ...h, predicted: h.crimes })),
        ...trendRes.data.forecast
      ];
      
      setChartData(merged);
      setExplanation(trendRes.data.explanation);
      setConfidence(trendRes.data.confidence_score);
      setSpikes(spikeRes.data);
      setDistrictForecasts(distRes.data);
      
    } catch (err) {
      console.error("Failed to load forecasting metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-police-darkest">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 border-4 border-police-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="text-sm font-mono text-police-accent uppercase tracking-widest">{t("Running Forecasting Models...")}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Title */}
      <div className="border-b border-white/5 pb-4">
        <h2 className="text-xl font-bold tracking-wide font-mono text-white">{t("CRIME FORECASTING")}</h2>
        <p className="text-xs text-police-muted">{t("Seasonal forecasting, weekend spike ratios, and localized crime density projections.")}</p>
      </div>

      {/* Main Graph & Description */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Forecast Area Chart */}
        <div className="glass-card p-4 rounded-xl border-white/5 lg:col-span-2 flex flex-col justify-between h-96">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold font-mono tracking-wider text-white flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-police-accent" />
              <span>{t("PROJECTED CRIME GROWTH INDEX (2026)")}</span>
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded">
              {t("Model Confidence:")} {confidence}%
            </span>
          </div>
          
          <div className="flex-1 min-h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={9} fontFamily="JetBrains Mono" />
                <YAxis stroke="#94a3b8" fontSize={9} fontFamily="JetBrains Mono" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0e1726', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
                  labelStyle={{ color: '#00f0ff' }}
                  cursor={{ stroke: 'rgba(0, 240, 255, 0.2)', strokeWidth: 1.5 }}
                />
                
                {/* Dotted Confidence boundaries */}
                <Area type="monotone" dataKey="upper_bound" stroke="#00f0ff" strokeWidth={1} strokeDasharray="3 3" fill="rgba(0,240,255,0.03)" />
                <Area type="monotone" dataKey="lower_bound" stroke="#00f0ff" strokeWidth={1} strokeDasharray="3 3" fill="transparent" />
                
                {/* Main curve */}
                <Area type="monotone" dataKey="predicted" stroke="#00f0ff" strokeWidth={2} fill="url(#cyanGlow)" />
                
                <defs>
                  <linearGradient id="cyanGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#00f0ff" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Explainable AI Forecast Panel */}
        <div className="glass-card p-4 rounded-xl border-white/5 flex flex-col justify-between h-96">
          <div className="space-y-4">
            <h3 className="text-sm font-bold font-mono tracking-wider text-police-accent uppercase flex items-center gap-1.5">
              <ShieldCheck className="h-4.5 w-4.5" />
              <span>{t("FORECAST EXPLANABILITY")}</span>
            </h3>
            <p className="text-xs text-police-text font-mono leading-relaxed p-3 bg-white/5 border border-white/5 rounded-lg">
              {translatedExplanation(explanation)}
            </p>
          </div>
          
          <div className="p-3 bg-police-accent/5 border border-police-accent/15 rounded-lg text-[10px] leading-relaxed text-police-muted font-mono">
            <b>{isKannada ? "ಗಣಿತದ ಮಾದರಿ:" : "Mathematical Base:"}</b> {isKannada 
              ? "ಸ್ಥಳೀಯ ಮಾಸಿಕ ರಜಾದಿನಗಳ ಋತುಮಾನ ಮತ್ತು ಪ್ರವೃತ್ತಿಗಳಿಗೆ ಹೊಂದಿಕೊಳ್ಳುವ ಎಕ್ಸ್‌ಪೋನೆನ್ಶಿಯಲ್ ಹೋಲ್ಟ್-ವಿಂಟರ್ಸ್ ಟ್ರಿಪಲ್ ಸ್ಮೂತ್‌ನಿಂಗ್ ಮಾದರಿಗಳು."
              : "Exponential Holt-Winters Triple Smoothing models adjusting for year-on-year trends and local monthly holiday seasonality parameters."}
          </div>
        </div>
      </div>

      {/* Sub-grid: Seasonality spikes & District projections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* District Forecasts spreadsheet */}
        <div className="glass-card p-4 rounded-xl border-white/5 lg:col-span-2 min-h-[250px] flex flex-col justify-between">
          <h3 className="text-sm font-bold font-mono tracking-wider text-white mb-3 flex items-center gap-2">
            <MapPin className="h-4.5 w-4.5 text-police-accent" />
            <span>{t("LOCAL DENSITY FORECAST (JULY 2026)")}</span>
          </h3>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/5 text-police-muted">
                  <th className="py-2">{t("District Name")}</th>
                  <th className="py-2 text-center">{t("Active Count")}</th>
                  <th className="py-2 text-center">{t("Projected Next Month")}</th>
                  <th className="py-2 text-center">{t("Repeat Offender Prob.")}</th>
                  <th className="py-2 text-right">{t("Confidence")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-police-text">
                {districtForecasts.map((df, i) => (
                  <tr key={i} className="hover:bg-white/5">
                    <td className="py-2.5 font-semibold text-white">{df.district_name}</td>
                    <td className="py-2.5 text-center text-police-muted">{df.current_month_count} {t("cases")}</td>
                    <td className="py-2.5 text-center text-police-accent font-bold">{df.projected_next_month} {t("cases")}</td>
                    <td className="py-2.5 text-center text-yellow-500">{df.repeat_offender_probability}%</td>
                    <td className="py-2.5 text-right text-green-400">{df.confidence}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Seasonality Alerts */}
        <div className="glass-card p-4 rounded-xl border-white/5 flex flex-col justify-between min-h-[250px]">
          <div>
            <h3 className="text-sm font-bold font-mono tracking-wider text-white mb-3 flex items-center gap-1.5">
              <CalendarDays className="h-4.5 w-4.5 text-yellow-500" />
              <span>{t("SEASONALITY INDICATORS")}</span>
            </h3>
            
            <div className="space-y-3">
              {/* Weekend Spike */}
              <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-lg text-xs leading-normal">
                <div className="font-semibold text-red-500 flex items-center justify-between">
                  <span>{translatedWeekendTrend(spikes.weekend_trend.title)}</span>
                  <span className="font-bold">+{Math.round(spikes.weekend_trend.percentage_increase)}%</span>
                </div>
                <p className="text-police-muted text-[10px] mt-1">{translatedWeekendExp(spikes.weekend_trend.explanation)}</p>
              </div>

              {/* Festival Alerts */}
              {spikes.festival_trends.map((ft: any, idx: number) => (
                <div key={idx} className="p-3 bg-white/5 border border-white/5 rounded-lg text-xs leading-normal">
                  <div className="font-semibold text-police-accent flex items-center justify-between">
                    <span>{translatedFestival(ft.festival)}</span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded font-mono">{isKannada ? (ft.risk_level === "HIGH" ? "ಹೆಚ್ಚಿನ" : "ಮಧ್ಯಮ") : ft.risk_level} RISK</span>
                  </div>
                  <div className="text-[10px] text-police-text mt-1"><b>{t("FORECAST FOCUS:")}</b> {translatedCrimeHead(ft.crime_head)} ({ft.historical_increase} historical spike)</div>
                  <div className="text-[9px] text-police-muted mt-0.5"><b>{t("RECOMMENDED ACTION:")}</b> {translatedRec(ft.recommendation)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForecastingPage;
