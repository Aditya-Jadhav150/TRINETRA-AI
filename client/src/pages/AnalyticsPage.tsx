import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend,
  Cell
} from 'recharts'
import { BarChart3, Filter, Award, Activity } from 'lucide-react'
import { useAuth } from '../App'

const AnalyticsPage: React.FC = () => {
  const { token, isKannada } = useAuth();
  
  const translations: Record<string, string> = {
    'CRIME ANALYTICS': 'ಅಪರಾಧ ವಿಶ್ಲೇಷಣೆ',
    'Advanced analytical modeling and operational performance metrics.': 'ಸುಧಾರಿತ ವಿಶ್ಲೇಷಣಾತ್ಮಕ ಮಾಡೆಲಿಂಗ್ ಮತ್ತು ಕಾರ್ಯಾಚರಣೆಯ ಕಾರ್ಯಕ್ಷಮತೆಯ ಸೂಚಕಗಳು.',
    'Aggregating Case Statistics...': 'ಪ್ರಕರಣದ ಅಂಕಿಅಂಶಗಳನ್ನು ಕ್ರೋಢೀಕರಿಸಲಾಗುತ್ತಿದೆ...',
    'Active Filters': 'ಸಕ್ರಿಯ ಫಿಲ್ಟರ್‌ಗಳು',
    'District:': 'ಜಿಲ್ಲೆ:',
    'Crime Head:': 'ಅಪರಾಧ ವಿಧ:',
    'MONTHLY CRIME GROWTH CURVE': 'ಮಾಸಿಕ ಅಪರಾಧ ಬೆಳವಣಿಗೆ ವಕ್ರರೇಖೆ',
    'CLASSIFICATION VOLUME': 'ಅಪರಾಧ ವರ್ಗೀಕರಣ ಪ್ರಮಾಣ',
    'OFFICER INVESTIGATION RESOLUTION RANKS': 'ಅಧಿಕಾರಿಗಳ ತನಿಖಾ ಪರಿಹಾರ ಶ್ರೇಯಾಂಕಗಳು',
    'Officer Name': 'ಅಧಿಕಾರಿಯ ಹೆಸರು',
    'Rank': 'ಹುದ್ದೆ',
    'Police Station': 'ಪೊಲೀಸ್ ಠಾಣೆ',
    'Cases Handled': 'ನಿರ್ವಹಿಸಿದ ಪ್ರಕರಣಗಳು',
    'Chargesheets Filed': 'ಸಲ್ಲಿಸಿದ ಚಾರ್ಜ್‌ಶೀಟ್‌ಗಳು',
    'Resolution Rate': 'ಪರಿಹಾರ ದರ'
  };

  const t = (key: string) => {
    return isKannada ? (translations[key] || key) : key;
  };
  
  const [trends, setTrends] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  
  // Filter states
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
  }, [token]);

  const fetchAnalyticsData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [trendRes, catRes, officerRes] = await Promise.all([
        axios.get('/api/analytics/trends/monthly', { headers }),
        axios.get('/api/analytics/categories', { headers }),
        axios.get('/api/analytics/officer-performance', { headers })
      ]);
      setTrends(trendRes.data);
      setCategories(catRes.data);
      setOfficers(officerRes.data);
    } catch (err) {
      console.error("Failed to load analytics datasets:", err);
    } finally {
      setLoading(false);
    }
  };

  const districts = isKannada 
    ? ['All', 'बೆಂಗಳೂರು ನಗರ', 'ಮೈಸೂರು ನಗರ', 'ಮಂಗಳೂರು ನಗರ', 'ಹುಬ್ಬಳ್ಳಿ-ಧಾರವಾಡ', 'ಬೆಳಗಾವಿ']
    : ['All', 'Bangalore City', 'Mysore City', 'Mangalore City', 'Hubballi-Dharwad', 'Belagavi'];
    
  const heads = isKannada 
    ? ['All', 'ಶಾರೀರಿಕ ಅಪರಾಧಗಳು', 'ಆಸ್ತಿ ಅಪರಾಧಗಳು', 'ಮಾದಕ ದ್ರವ್ಯ', 'ಬಿಳಿಪಟ್ಟಿ ಮತ್ತು ಸೈಬರ್ ಅಪರಾಧ']
    : ['All', 'Crimes Against Body', 'Crimes Against Property', 'Narcotics', 'White Collar & Cyber Crime'];

  // Filter officers locally for simple out-of-the-box responsiveness
  const filteredOfficers = officers.filter(o => {
    const matchDist = selectedDistrict === 'All' || o.station.includes(selectedDistrict.split(' ')[0]) || (isKannada && selectedDistrict === 'बೆಂಗಳೂರು ನಗರ' && o.station.includes('Cubbon'));
    return matchDist;
  });

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-police-darkest">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 border-4 border-police-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="text-sm font-mono text-police-accent uppercase tracking-widest">{t("Aggregating Case Statistics...")}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-wide font-mono text-white">{t("CRIME ANALYTICS")}</h2>
          <p className="text-xs text-police-muted">{t("Advanced analytical modeling and operational performance metrics.")}</p>
        </div>
      </div>

      {/* Filter Control Header */}
      <div className="glass-card p-4 rounded-xl border-white/5 flex flex-wrap items-center gap-6 text-xs font-mono">
        <div className="flex items-center gap-2 text-police-accent font-semibold">
          <Filter className="h-4 w-4" />
          <span>{t("Active Filters")}</span>
        </div>
        
        {/* District Filter */}
        <div className="flex items-center gap-2">
          <span className="text-police-muted">{t("District:")}</span>
          <select 
            value={selectedDistrict} 
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="bg-police-darkest border border-white/10 rounded px-2.5 py-1 text-police-text focus:outline-none focus:border-police-accent"
          >
            {districts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <span className="text-police-muted">{t("Crime Head:")}</span>
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-police-darkest border border-white/10 rounded px-2.5 py-1 text-police-text focus:outline-none focus:border-police-accent"
          >
            {heads.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
      </div>

      {/* Graphs Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Crime Growth Trends (Area) */}
        <div className="glass-card p-4 rounded-xl flex flex-col justify-between h-96">
          <div>
            <h3 className="text-sm font-bold font-mono tracking-wider text-white mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-police-accent" />
              <span>{t("MONTHLY CRIME GROWTH CURVE")}</span>
            </h3>
          </div>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={9} fontFamily="JetBrains Mono" />
                <YAxis stroke="#94a3b8" fontSize={9} fontFamily="JetBrains Mono" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0e1726', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
                  labelStyle={{ color: '#00d2ff' }}
                />
                <Area type="monotone" dataKey="crimes" stroke="#00d2ff" fillOpacity={1} fill="url(#cyanGrad)" />
                <defs>
                  <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d2ff" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#00d2ff" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Crime category counts (Bar) */}
        <div className="glass-card p-4 rounded-xl flex flex-col justify-between h-96">
          <div>
            <h3 className="text-sm font-bold font-mono tracking-wider text-white mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-police-neonBlue" />
              <span>{t("CLASSIFICATION VOLUME")}</span>
            </h3>
          </div>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categories} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="category" stroke="#94a3b8" fontSize={7.5} fontFamily="JetBrains Mono" />
                <YAxis stroke="#94a3b8" fontSize={9} fontFamily="JetBrains Mono" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0e1726', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
                  labelStyle={{ color: '#00d2ff' }}
                />
                <Bar dataKey="count" fill="#0052ff" barSize={30}>
                  {categories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#00d2ff' : '#0052ff'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Officer Performance Table */}
      <div className="glass-card p-4 rounded-xl min-h-[300px]">
        <div className="flex items-center gap-2 mb-4">
          <Award className="h-5 w-5 text-yellow-500" />
          <h3 className="text-sm font-bold font-mono tracking-wider text-white">{t("OFFICER INVESTIGATION RESOLUTION RANKS")}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/5 text-police-muted">
                <th className="py-2.5">{t("Officer Name")}</th>
                <th className="py-2.5">{t("Rank")}</th>
                <th className="py-2.5">{t("Police Station")}</th>
                <th className="py-2.5 text-center">{t("Cases Handled")}</th>
                <th className="py-2.5 text-center">{t("Chargesheets Filed")}</th>
                <th className="py-2.5 text-right">{t("Resolution Rate")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-police-text">
              {filteredOfficers.map((o, idx) => (
                <tr key={idx} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 font-semibold text-white">{o.name}</td>
                  <td className="py-3 text-police-muted">{o.rank}</td>
                  <td className="py-3 text-police-muted">{o.station}</td>
                  <td className="py-3 text-center">{o.cases_handled}</td>
                  <td className="py-3 text-center">{o.resolved}</td>
                  <td className="py-3 text-right">
                    <span className={`px-2 py-0.5 rounded font-bold ${
                      o.resolution_rate >= 60 ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                    }`}>
                      {o.resolution_rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
