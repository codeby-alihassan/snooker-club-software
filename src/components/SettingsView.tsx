import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Save,
  CheckCircle2,
  AlertCircle,
  Database,
  Monitor,
  Wifi,
  ExternalLink,
} from 'lucide-react';
import { ClubSettings, Category } from '../types/database';
import { ClubService } from '../services/clubService';
import {
  getSupabaseConfig,
  saveCustomSupabaseConfig,
  checkBackendReachable,
  BackendConnectionStatus,
} from '../lib/supabase';
import { formatPKR } from '../utils/billing';

interface SettingsViewProps {
  settings: ClubSettings;
  categories: Category[];
  connectionStatus: BackendConnectionStatus;
  onRefreshData: () => void;
  onRefreshConnection: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  categories,
  connectionStatus,
  onRefreshData,
  onRefreshConnection,
}) => {
  const [clubName, setClubName] = useState(settings.club_name);
  const currentConfig = getSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(currentConfig.url);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(currentConfig.anonKey);

  const [savingSettings, setSavingSettings] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSaveClubName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubName.trim()) {
      setMessage({ text: 'Club name cannot be blank.', type: 'error' });
      return;
    }

    setSavingSettings(true);
    setMessage(null);
    try {
      await ClubService.updateClubName(clubName);
      setMessage({ text: 'Club settings updated and persisted successfully.', type: 'success' });
      onRefreshData();
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : 'Failed to update club name',
        type: 'error',
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveSupabaseConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestingConnection(true);
    setMessage(null);

    saveCustomSupabaseConfig(supabaseUrl, supabaseAnonKey);
    const reachable = await checkBackendReachable();

    setTestingConnection(false);
    if (reachable) {
      setMessage({
        text: 'Supabase Cloud Database successfully verified and connected!',
        type: 'success',
      });
    } else {
      setMessage({
        text: 'Connection could not reach Supabase. Check URL and Anon Key. Local standalone mode remains active.',
        type: 'error',
      });
    }
    onRefreshConnection();
    onRefreshData();
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="border-b border-stone-200 pb-4">
        <h1 className="text-xl font-bold text-stone-900">Application Settings & Configuration</h1>
        <p className="text-xs text-stone-500 mt-1">
          Manage club profile, standard billing parameters, and cloud backend database connections.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Club Profile Card */}
        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-2xs space-y-5 desktop-card-hover">
          <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900">Club Business Identity</h2>
              <p className="text-[11px] text-stone-500">
                Shown across customer receipts and desktop window headers.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveClubName} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-stone-700 block mb-1">Snooker Club Name</label>
              <input
                type="text"
                required
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-hidden focus:border-orange-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">Standard Currency</label>
                <input
                  type="text"
                  disabled
                  value="Pakistani Rupees (PKR / ₨)"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">Business Timezone</label>
                <input
                  type="text"
                  disabled
                  value="Asia/Karachi (PKT, UTC+5)"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-stone-700 block mb-1">
                Duration Rounding Policy
              </label>
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-[11px] text-stone-600 font-mono">
                Formula: ceil(elapsed_seconds / 60)
                <br />
                Examples: 1s–60s = 1 min · 61s = 2 min · 130s = 3 min.
              </div>
            </div>

            <button
              type="submit"
              disabled={savingSettings}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold text-xs shadow-xs flex items-center gap-2 transition-colors"
            >
              <Save className="w-4 h-4" />
              {savingSettings ? 'Saving...' : 'Save Club Profile'}
            </button>
          </form>
        </div>

        {/* Supabase Cloud Connection Panel */}
        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-2xs space-y-5 desktop-card-hover">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-stone-900">Supabase Cloud PostgreSQL</h2>
                <p className="text-[11px] text-stone-500">
                  Cloud database integration & real-time sync.
                </p>
              </div>
            </div>

            <span
              className={`text-[11px] font-mono font-semibold px-2.5 py-1 rounded-md ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}
            >
              {connectionStatus === 'connected' ? 'CONNECTED' : 'STANDALONE LOCAL'}
            </span>
          </div>

          <form onSubmit={handleSaveSupabaseConfig} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-stone-700 block mb-1">Supabase Project URL</label>
              <input
                type="url"
                placeholder="https://xyzcompany.supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs font-mono text-stone-900 focus:outline-hidden focus:border-orange-500"
              />
            </div>

            <div>
              <label className="font-semibold text-stone-700 block mb-1">
                Supabase Public Anon / Publishable Key
              </label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs font-mono text-stone-900 focus:outline-hidden focus:border-orange-500"
              />
              <p className="text-[11px] text-stone-500 mt-1">
                Never enter your service-role secret key in the client application.
              </p>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={testingConnection}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-bold text-xs shadow-xs flex items-center gap-2 transition-colors"
              >
                <Wifi className="w-4 h-4" />
                {testingConnection ? 'Probing Supabase...' : 'Save & Verify Connection'}
              </button>
            </div>
          </form>

          <div className="p-4 bg-[#FAF7F2] rounded-lg border border-stone-200 text-[11px] text-stone-600 space-y-1">
            <div className="font-semibold text-stone-800">Database Migrations</div>
            <div>
              SQL schema, RLS policies, and the atomic <code>collect_table_sale</code> function are stored in <code>supabase/migrations/20261030000000_snooker_club_schema.sql</code>.
            </div>
          </div>
        </div>
      </div>

      {/* Windows Executable & Electron Architecture Card */}
      <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-3">
          <Monitor className="w-5 h-5 text-orange-600" />
          <h2 className="text-sm font-bold text-stone-900">Windows Desktop Packaging Architecture</h2>
        </div>

        <div className="text-xs text-stone-600 space-y-2">
          <p>
            CueMaster is architected as an Electron desktop application running React, TypeScript, and Vite.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
              <div className="font-bold text-stone-900">1. Electron Main Process</div>
              <div className="text-[11px] text-stone-500 mt-0.5 font-mono">electron/main.ts</div>
              <div className="text-[11px] text-stone-500 mt-1">1440×900 initial window, frameless, contextIsolation: true.</div>
            </div>
            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
              <div className="font-bold text-stone-900">2. Secure Preload Bridge</div>
              <div className="text-[11px] text-stone-500 mt-0.5 font-mono">electron/preload.ts</div>
              <div className="text-[11px] text-stone-500 mt-1">Restricted IPC bridge for window controls and OS info.</div>
            </div>
            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
              <div className="font-bold text-stone-900">3. Windows Packaging</div>
              <div className="text-[11px] text-stone-500 mt-0.5 font-mono">npm run pack:win</div>
              <div className="text-[11px] text-stone-500 mt-1">Generates Windows NSIS installer and portable .exe.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
