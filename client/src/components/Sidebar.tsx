import React from 'react'
import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  MessageSquareCode, 
  Network, 
  BarChart3, 
  Map, 
  TrendingUp, 
  FolderSearch, 
  BookOpen, 
  Compass, 
  UserSquare2, 
  History 
} from 'lucide-react'
import { useAuth } from '../App'

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const Sidebar: React.FC = () => {
  const { role, isKannada } = useAuth();
  
  const translations: Record<string, string> = {
    'Dashboard': 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    'AI Assistant': 'AI ಅಸಿಸ್ಟೆಂಟ್',
    'Knowledge Graph': 'ನಾಲೇಜ್ ಗ್ರಾಫ್',
    'Crime Analytics': 'ಅಪರಾಧ ವಿಶ್ಲೇಷಣೆ',
    'Heatmaps': 'ಹೀಟ್‌ಮ್ಯಾಪ್ಸ್',
    'Crime Forecast': 'ಅಪರಾಧ ಮುನ್ಸೂಚನೆ',
    'Case Similarity': 'ಪ್ರಕರಣದ ಹೋಲಿಕೆ',
    'Legal RAG KB': 'ಕಾನೂನು RAG ಮಾಹಿತಿ',
    'Investigation Copilot': 'ತನಿಖಾ ಸಹಾಯಕ',
    'Offender Profiling': 'ಅಪರಾಧಿ ಪ್ರೊಫೈಲಿಂಗ್',
    'System Audit': 'ಸಿಸ್ಟಮ್ ಆಡಿಟ್',
    'Core Operations': 'ಕೋರ್ ಕಾರ್ಯಾಚರಣೆಗಳು',
    'Seeing Beyond the Evidence.': 'ಸಾಕ್ಷ್ಯಕ್ಕೂ ಮೀರಿದ ದೃಷ್ಟಿ.',
    'Karnataka Police Dept.': 'ಕರ್ನಾಟಕ ಪೊಲೀಸ್ ಇಲಾಖೆ.'
  };

  const getName = (name: string) => {
    return isKannada ? (translations[name] || name) : name;
  };

  const navItems: SidebarItem[] = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard className="h-4 w-4" /> },
    { name: 'AI Assistant', path: '/chat', icon: <MessageSquareCode className="h-4 w-4" /> },
    { name: 'Knowledge Graph', path: '/graph', icon: <Network className="h-4 w-4" /> },
    { name: 'Crime Analytics', path: '/analytics', icon: <BarChart3 className="h-4 w-4" /> },
    { name: 'Heatmaps', path: '/heatmap', icon: <Map className="h-4 w-4" /> },
    { name: 'Crime Forecast', path: '/forecast', icon: <TrendingUp className="h-4 w-4" /> },
    { name: 'Case Similarity', path: '/similarity', icon: <FolderSearch className="h-4 w-4" /> },
    { name: 'Legal RAG KB', path: '/knowledge', icon: <BookOpen className="h-4 w-4" /> },
    { name: 'Investigation Copilot', path: '/copilot', icon: <Compass className="h-4 w-4" /> },
    { name: 'Offender Profiling', path: '/offenders', icon: <UserSquare2 className="h-4 w-4" /> },
    { name: 'System Audit', path: '/audit', icon: <History className="h-4 w-4" />, adminOnly: true }
  ];

  return (
    <aside className="w-64 shrink-0 border-r border-white/5 bg-police-darkest/75 backdrop-blur flex flex-col justify-between h-full z-15">
      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1 select-none">
        <div className="text-[10px] uppercase font-mono tracking-widest text-police-muted px-3 mb-4">
          {getName('Core Operations')}
        </div>

        {navItems.map((item) => {
          // If the item is adminOnly and current user is not Admin, skip rendering
          if (item.adminOnly && role !== 'Administrator') {
            return null;
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group border ${
                  isActive 
                    ? 'bg-police-accent/10 border-police-accent/25 text-police-accent shadow-neon' 
                    : 'border-transparent text-police-muted hover:text-police-text hover:bg-white/5'
                }`
              }
            >
              <span className="transition-transform group-hover:scale-110 duration-150">
                {item.icon}
              </span>
              <span>{getName(item.name)}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Footer Branding */}
      <div className="p-4 border-t border-white/5 text-[9.5px] font-mono text-center text-police-muted">
        <div className="font-bold text-white uppercase tracking-wider">{isKannada ? 'ತ್ರಿನೇತ್ರ' : 'TRINETRA'} <span className="text-police-accent font-extrabold">AI</span></div>
        <div className="text-police-gold font-semibold mt-0.5">{getName('Seeing Beyond the Evidence.')}</div>
        <div className="text-police-muted mt-1 uppercase tracking-widest text-[8px]">{getName('Karnataka Police Dept.')}</div>
      </div>
    </aside>
  );
};

export default Sidebar;
