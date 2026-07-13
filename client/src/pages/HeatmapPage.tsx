import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Map, Play, Pause, RotateCcw, Filter, AlertCircle } from 'lucide-react'
import { useAuth } from '../App'

// Fix default leaflet icon issues by creating custom SVG divIcon
const createCustomMarker = (severity: string) => {
  const color = severity === 'Heinous' ? '#ef4444' : '#00d2ff';
  const shadowColor = severity === 'Heinous' ? 'rgba(239,68,68,0.4)' : 'rgba(0,210,255,0.4)';
  
  const svgHtml = `
    <div style="position: relative; width: 14px; height: 14px;">
      <div style="
        position: absolute;
        width: 100%;
        height: 100%;
        background-color: ${color};
        border-radius: 50%;
        border: 2px solid #fff;
        box-shadow: 0 0 10px ${shadowColor};
      "></div>
      <div style="
        position: absolute;
        width: 180%;
        height: 180%;
        left: -40%;
        top: -40%;
        background-color: ${color};
        border-radius: 50%;
        opacity: 0.25;
        animation: pulse 1.5s infinite;
      "></div>
    </div>
  `;
  
  return L.divIcon({
    html: svgHtml,
    className: 'custom-leaflet-icon',
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
};

const HeatmapPage: React.FC = () => {
  const { token, isKannada } = useAuth();
  
  const translations: Record<string, string> = {
    'Map Filters': 'ನಕ್ಷೆಯ ಫಿಲ್ಟರ್‌ಗಳು',
    'District:': 'ಜಿಲ್ಲೆ:',
    'Severity:': 'ತೀವ್ರತೆ:',
    'All Offences': 'ಎಲ್ಲಾ ಅಪರಾಧಗಳು',
    'Heinous (Severe)': 'ಘೋರ (ಗಂಭೀರ)',
    'Non-Heinous (Minor)': 'ಸಾಮಾನ್ಯ (ಸಣ್ಣ)',
    'Type:': 'ಅಪರಾಧ ವಿಧ:',
    'Station:': 'ಪೊಲೀಸ್ ಠಾಣೆ:',
    'Date:': 'ದಿನಾಂಕ:',
    'Severity': 'ತೀವ್ರತೆ:',
    'Historical Timeline (2026)': 'ಐತಿಹಾಸಿಕ ಟೈಮ್‌ಲೈನ್ (೨೦೨೬)',
    'Active Ledger Interval: Jan 2026 -': 'ಸಕ್ರಿಯ ದಾಖಲೆ ಹರಹು: ಜನವರಿ ೨೦೨೬ -'
  };

  const t = (key: string) => {
    return isKannada ? (translations[key] || key) : key;
  };
  
  const [points, setPoints] = useState<any[]>([]);
  const [filteredPoints, setFilteredPoints] = useState<any[]>([]);
  
  // Filters
  const [severityFilter, setSeverityFilter] = useState('All');
  const [districtFilter, setDistrictFilter] = useState('All');
  
  // Timeline playback state
  const [activeMonthIdx, setActiveMonthIdx] = useState(11); // Dec 2026 by default
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState<1 | 2 | 4>(1);
  const timerRef = useRef<any>(null);

  const months = isKannada ? [
    { label: "ಜನ ೨೬", val: 1 },
    { label: "ಫೆಬ್ರ ೨೬", val: 2 },
    { label: "ಮಾರ್ಚ್ ೨೬", val: 3 },
    { label: "ಏಪ್ರಿಲ್ ೨೬", val: 4 },
    { label: "ಮೇ ೨೬", val: 5 },
    { label: "ಜೂನ್ ೨೬", val: 6 },
    { label: "ಜುಲೈ ೨೬", val: 7 },
    { label: "ಆಗಸ್ಟ್ ೨೬", val: 8 },
    { label: "ಸೆಪ್ ೨೬", val: 9 },
    { label: "ಅಕ್ಟೋ ೨೬", val: 10 },
    { label: "ನವೆ ೨೬", val: 11 },
    { label: "ಡಿಸೆ ೨೬", val: 12 }
  ] : [
    { label: "Jan 26", val: 1 },
    { label: "Feb 26", val: 2 },
    { label: "Mar 26", val: 3 },
    { label: "Apr 26", val: 4 },
    { label: "May 26", val: 5 },
    { label: "Jun 26", val: 6 },
    { label: "Jul 26", val: 7 },
    { label: "Aug 26", val: 8 },
    { label: "Sep 26", val: 9 },
    { label: "Oct 26", val: 10 },
    { label: "Nov 26", val: 11 },
    { label: "Dec 26", val: 12 }
  ];

  useEffect(() => {
    fetchHeatmapPoints();
  }, [token]);

  useEffect(() => {
    applyFilters();
  }, [points, severityFilter, districtFilter, activeMonthIdx]);

  // Handle play/pause animation
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setActiveMonthIdx((prev) => {
          if (prev >= 11) {
            return 0; // loop back
          }
          return prev + 1;
        });
      }, 1500 / playSpeed);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playSpeed]);

  const fetchHeatmapPoints = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get('/api/analytics/heatmap', { headers });
      setPoints(response.data);
    } catch (err) {
      console.error("Failed to load map data points:", err);
    }
  };

  const applyFilters = () => {
    let temp = [...points];
    
    // Severity Filter
    if (severityFilter !== 'All') {
      temp = temp.filter(p => p.severity === severityFilter);
    }
    
    // District Filter (station-based mapping approximation)
    if (districtFilter !== 'All') {
      const prefix = districtFilter.split(' ')[0]; // 'Bangalore' or 'Mysore'
      const matchPrefix = isKannada 
        ? (districtFilter === 'ಬೆಂಗಳೂರು ನಗರ' ? 'Bangalore' : districtFilter === 'ಮೈಸೂರು ನಗರ' ? 'Mysore' : 'Mangalore')
        : prefix;
      temp = temp.filter(p => p.station.includes(matchPrefix) || (matchPrefix === 'Bangalore' && p.lat > 12.9 && p.lat < 13.0));
    }
    
    // Time filter based on active Month index (Filter up to selected month)
    const activeMonthVal = months[activeMonthIdx].val;
    temp = temp.filter(p => {
      const dateObj = new Date(p.date);
      const m = dateObj.getMonth() + 1; // 1-indexed
      return m <= activeMonthVal;
    });
    
    setFilteredPoints(temp);
  };

  const districts = isKannada 
    ? ['All', 'ಬೆಂಗಳೂರು ನಗರ', 'ಮೈಸೂರು ನಗರ', 'ಮಂಗಳೂರು ನಗರ']
    : ['All', 'Bangalore City', 'Mysore City', 'Mangalore City'];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-police-darkest relative select-none">
      {/* 1. Top Filters Panel */}
      <div className="h-14 border-b border-white/5 bg-police-darkest/95 px-6 flex items-center gap-6 z-[1000] text-xs font-mono">
        <div className="flex items-center gap-2 text-police-accent font-semibold">
          <Filter className="h-4 w-4" />
          <span>{t("Map Filters")}</span>
        </div>
        
        {/* District */}
        <div className="flex items-center gap-2">
          <span className="text-police-muted">{t("District:")}</span>
          <select 
            value={districtFilter} 
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="bg-police-darkest border border-white/10 rounded px-2 py-0.5 text-police-text focus:outline-none"
          >
            {districts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* Severity */}
        <div className="flex items-center gap-2">
          <span className="text-police-muted">{t("Severity:")}</span>
          <select 
            value={severityFilter} 
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-police-darkest border border-white/10 rounded px-2 py-0.5 text-police-text focus:outline-none"
          >
            <option value="All">{t("All Offences")}</option>
            <option value="Heinous">{t("Heinous (Severe)")}</option>
            <option value="Non-Heinous">{t("Non-Heinous (Minor)")}</option>
          </select>
        </div>

        <div className="ml-auto text-police-accent bg-police-accent/5 border border-police-accent/15 px-3 py-1 rounded flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          <span>{isKannada ? `ಒಟ್ಟು ${filteredPoints.length} ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳು (${months[activeMonthIdx].label} ರವರೆಗೆ)` : `Displaying ${filteredPoints.length} Hotspots (Cumulative to ${months[activeMonthIdx].label})`}</span>
        </div>
      </div>

      {/* 2. Map Container */}
      <div className="flex-1 w-full z-0 relative">
        <MapContainer 
          center={[12.9716, 77.5946]} // Bangalore Center
          zoom={8} 
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%', background: '#080c14' }}
        >
          {/* Dark themed map tiles (CartoDB Dark Matter) */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          
          {/* Render markers */}
          {filteredPoints.map((point) => (
            <React.Fragment key={point.id}>
              {/* Marker with custom SVG icon */}
              <Marker 
                position={[point.lat, point.lng]} 
                icon={createCustomMarker(point.severity)}
              >
                <Popup className="custom-popup">
                  <div className="text-xs font-mono p-1 leading-normal text-police-darkest">
                    <div className="font-bold text-police-neonBlue">{point.crime_no}</div>
                    <div><b>{t("Type:")}</b> {point.category}</div>
                    <div><b>{t("Station:")}</b> {point.station}</div>
                    <div><b>{t("Date:")}</b> {point.date}</div>
                    <div><b>{t("Severity:")}</b> {point.severity}</div>
                  </div>
                </Popup>
              </Marker>
              
              {/* Red translucent ring indicating hot zone for Heinous crimes */}
              {point.severity === 'Heinous' && (
                <Circle 
                  center={[point.lat, point.lng]}
                  radius={4000} // 4km radius
                  pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.15, weight: 1 }}
                />
              )}
            </React.Fragment>
          ))}
        </MapContainer>
      </div>

      {/* 3. Bottom Timeline playback slider */}
      <div className="h-20 border-t border-white/5 bg-police-darkest/95 px-6 flex items-center gap-6 z-[1000]">
        {/* Playback Controls & Speed Selectors */}
        <div className="flex items-center gap-2 font-mono">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2.5 bg-police-accent/15 border border-police-accent/25 hover:bg-police-accent/25 text-police-accent rounded-lg transition"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            onClick={() => {
              setIsPlaying(false);
              setActiveMonthIdx(0);
            }}
            className="p-2.5 bg-police-darkest border border-white/5 text-police-muted hover:text-police-text rounded-lg transition mr-2"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          {/* Speed multipliers */}
          <div className="flex bg-police-darkest border border-white/5 rounded-lg p-0.5 text-[10px]">
            {([1, 2, 4] as const).map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaySpeed(spd)}
                className={`px-2 py-1 rounded transition-colors ${
                  playSpeed === spd 
                    ? 'bg-police-accent/20 text-police-accent font-bold' 
                    : 'text-police-muted hover:text-police-text'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Slider */}
        <div className="flex-1 flex flex-col gap-2">
          {/* Label Display */}
          <div className="flex justify-between text-[10px] font-mono text-police-muted px-1">
            <span>{t("Historical Timeline (2026)")}</span>
            <span className="text-police-accent font-semibold">{t("Active Ledger Interval: Jan 2026 -")} {months[activeMonthIdx].label.toUpperCase()}</span>
          </div>
          
          <div className="relative">
            <input
              type="range"
              min="0"
              max="11"
              value={activeMonthIdx}
              onChange={(e) => {
                setIsPlaying(false);
                setActiveMonthIdx(parseInt(e.target.value));
              }}
              className="w-full accent-police-accent cursor-pointer bg-white/10 rounded-lg h-2"
            />
            {/* Tick labels */}
            <div className="flex justify-between text-[8px] font-mono text-police-muted mt-1 select-none px-1">
              {months.map((m, idx) => (
                <span 
                  key={idx} 
                  className={`cursor-pointer ${idx === activeMonthIdx ? 'text-police-accent font-bold scale-110' : ''}`}
                  onClick={() => {
                    setIsPlaying(false);
                    setActiveMonthIdx(idx);
                  }}
                >
                  {m.label.split(' ')[0]}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeatmapPage;
