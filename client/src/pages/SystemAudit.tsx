import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { History, ShieldCheck, Terminal, Search, AlertCircle } from 'lucide-react'
import { useAuth } from '../App'

interface AuditRecord {
  id: number;
  username: string;
  role: string;
  action: string;
  details: string;
  timestamp: string;
  ip_address: string;
}

const SystemAudit: React.FC = () => {
  const { token, role, isKannada } = useAuth();
  
  const translations: Record<string, string> = {
    'SECURITY CLEARANCE REQUIRED': 'ಭದ್ರತಾ ತರಬೇತಿ ಮತ್ತು ಅನುಮತಿ ಅಗತ್ಯವಿದೆ',
    'Only designated Command Administrators have authorization to inspect the central database activity audit logs.': 'ಕೇಂದ್ರ ಡೇಟಾಬೇಸ್ ಚಟುವಟಿಕೆ ಆಡಿಟ್ ಲಾಗ್‌ಗಳನ್ನು ಪರಿಶೀಲಿಸಲು ನಿಯೋಜಿತ ಕಮಾಂಡ್ ನಿರ್ವಾಹಕರಿಗೆ ಮಾತ್ರ ಅಧಿಕಾರವಿದೆ.',
    'Decrypting System Audit Trails...': 'ಸಿಸ್ಟಮ್ ಆಡಿಟ್ ಲಾಗ್‌ಗಳನ್ನು ಡೀಕ್ರಿಪ್ಟ್ ಮಾಡಲಾಗುತ್ತಿದೆ...',
    'SYSTEM AUDIT LEDGER': 'ಸಿಸ್ಟಮ್ ಆಡಿಟ್ ರಿಜಿಸ್ಟರ್',
    'Central security trail logging every SQL/Cypher database query, login event, and report compile.': 'ಪ್ರತಿ SQL/ಸೈಫರ್ ಡೇಟಾಬೇಸ್ ಕ್ವೆರಿ, ಲಾಗಿನ್ ಈವೆಂಟ್ ಮತ್ತು ವರದಿ ಕಂಪೈಲ್ ಅನ್ನು ದಾಖಲಿಸುವ ಕೇಂದ್ರ ಭದ್ರತಾ ವ್ಯವಸ್ಥೆ.',
    'Security Level: HIGH (Audit Daemon Active)': 'ಭದ್ರತಾ ಮಟ್ಟ: ಗರಿಷ್ಠ (ಆಡಿಟ್ ಇಂಜಿನ್ ಸಕ್ರಿಯವಾಗಿದೆ)',
    'Search audit trail by user, action, details, or IP...': 'ಬಳಕೆದಾರರು, ಕಾರ್ಯಾಚರಣೆ, ವಿವರಗಳು ಅಥವಾ ಐಪಿ ಮೂಲಕ ಹುಡುಕಿ...',
    'Records Count:': 'ದಾಖಲೆಗಳ ಸಂಖ್ಯೆ:',
    'LOG STREAM VIEWER': 'ಲಾಗ್ ಸ್ಟ್ರೀಮ್ ವೀಕ್ಷಕ',
    'Timestamp': 'ಸಮಯದ ಮುದ್ರೆ',
    'User': 'ಬಳಕೆದಾರ',
    'Role': 'ಪಾತ್ರ',
    'Action': 'ಕಾರ್ಯಾಚರಣೆ',
    'Details': 'ವಿವರಗಳು',
    'IP Address': 'ಐಪಿ ವಿಳಾಸ',
    'No security logs match the active filter criteria.': 'ಸಕ್ರಿಯ ಫಿಲ್ಟರ್ ಮಾನದಂಡಗಳಿಗೆ ಯಾವುದೇ ಭದ್ರತಾ ಲಾಗ್‌ಗಳು ಹೊಂದಿಕೆಯಾಗುತ್ತಿಲ್ಲ.'
  };

  const t = (key: string) => {
    return isKannada ? (translations[key] || key) : key;
  };
  
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAuditLogs();
  }, [token]);

  const fetchAuditLogs = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get('/api/audit/logs?limit=50', { headers });
      setLogs(response.data);
    } catch (err: any) {
      console.error("Failed to load audit logs:", err);
      setError(
        err.response?.data?.detail || 
        "Failed to load system security logs. Verify administrator credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const term = searchTerm.toLowerCase();
    return (
      log.username.toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      log.details.toLowerCase().includes(term) ||
      log.ip_address.includes(term)
    );
  });

  if (role !== 'Administrator') {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-police-darkest flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="glass-card p-8 rounded-xl max-w-md border-red-500/20 text-police-text">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-500 mb-2">{t("SECURITY CLEARANCE REQUIRED")}</h2>
          <p className="text-police-muted mb-6">
            {t("Only designated Command Administrators have authorization to inspect the central database activity audit logs.")}
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-police-darkest">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 border-4 border-police-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="text-sm font-mono text-police-accent uppercase tracking-widest">{t("Decrypting System Audit Trails...")}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-wide font-mono text-white">{t("SYSTEM AUDIT LEDGER")}</h2>
          <p className="text-xs text-police-muted">{t("Central security trail logging every SQL/Cypher database query, login event, and report compile.")}</p>
        </div>
        
        <div className="flex items-center gap-2 text-xs font-mono text-green-400 px-3 py-1.5 bg-green-500/5 border border-green-500/15 rounded-lg">
          <ShieldCheck className="h-4 w-4" />
          <span>{t("Security Level: HIGH (Audit Daemon Active)")}</span>
        </div>
      </div>

      {error ? (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono rounded-xl text-center">
          {error}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="glass-card p-4 rounded-xl border-white/5 flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-police-muted" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t("Search audit trail by user, action, details, or IP...")}
                className="w-full glass-input pl-10 pr-4 py-2 rounded-lg text-xs font-mono"
              />
            </div>
            
            <div className="text-xs font-mono text-police-muted">
              {t("Records Count:")} <b>{filteredLogs.length}</b> / {logs.length}
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="glass-card rounded-xl border-white/5 overflow-hidden">
            <div className="p-3 bg-white/5 border-b border-white/5 flex items-center gap-1.5 font-mono text-xs text-white">
              <Terminal className="h-4.5 w-4.5 text-police-accent" />
              <span>{t("LOG STREAM VIEWER")}</span>
            </div>
            <div className="overflow-x-auto max-h-[calc(100vh-18rem)]">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/5 text-police-muted bg-police-darkest/40">
                    <th className="p-3">{t("Timestamp")}</th>
                    <th className="p-3">{t("User")}</th>
                    <th className="p-3">{t("Role")}</th>
                    <th className="p-3">{t("Action")}</th>
                    <th className="p-3">{t("Details")}</th>
                    <th className="p-3 text-right">{t("IP Address")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-police-text">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 text-[11px] text-police-muted whitespace-nowrap">{log.timestamp}</td>
                      <td className="p-3 font-semibold text-white">{log.username}</td>
                      <td className="p-3 text-police-accent">{log.role}</td>
                      <td className="p-3">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          log.action === 'LOGIN' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                          log.action === 'DOWNLOAD_PDF' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                          'bg-police-neonBlue/10 text-police-accent border border-police-accent/20'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 max-w-sm truncate text-police-muted">{log.details}</td>
                      <td className="p-3 text-right text-police-muted">{log.ip_address}</td>
                    </tr>
                  ))}
                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-police-muted">
                        {t("No security logs match the active filter criteria.")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemAudit;
