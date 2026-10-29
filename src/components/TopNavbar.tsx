import React from 'react';
import {
  LayoutDashboard,
  CircleDot,
  ReceiptText,
  PackageOpen,
  CreditCard,
  WalletCards,
  Settings as SettingsIcon,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { BackendConnectionStatus } from '../lib/supabase';

export type NavigationSection =
  | 'dashboard'
  | 'tables'
  | 'sales'
  | 'inventory'
  | 'expenses'
  | 'counter'
  | 'settings';

interface TopNavbarProps {
  currentSection: NavigationSection;
  onSelectSection: (section: NavigationSection) => void;
  clubName: string;
  connectionStatus: BackendConnectionStatus;
  activeTablesCount: number;
  isCounterOpen: boolean;
  onRefreshConnection: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  currentSection,
  onSelectSection,
  clubName,
  connectionStatus,
  activeTablesCount,
  isCounterOpen,
  onRefreshConnection,
}) => {
  const isConnected = connectionStatus === 'connected';

  const navItems = [
    { id: 'dashboard' as NavigationSection, label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'tables' as NavigationSection,
      label: 'Tables & Sessions',
      icon: CircleDot,
      badge: activeTablesCount > 0 ? String(activeTablesCount) : undefined,
    },
    { id: 'sales' as NavigationSection, label: 'Sales & Reports', icon: ReceiptText },
    { id: 'inventory' as NavigationSection, label: 'Inventory', icon: PackageOpen },
    { id: 'expenses' as NavigationSection, label: 'Expenses', icon: CreditCard },
    {
      id: 'counter' as NavigationSection,
      label: 'Counter Management',
      icon: WalletCards,
      alert: !isCounterOpen,
    },
    { id: 'settings' as NavigationSection, label: 'Settings', icon: SettingsIcon },
  ];

  const tooltipText = isConnected
    ? 'Cloud Backend: Online & Connected'
    : 'Cloud Backend: Disconnected / Standalone Local Mode';

  return (
    <header className="bg-[#FAF7F2] border-b border-[#E7E0D3] shadow-2xs select-none shrink-0 z-40">
      <div className="w-full px-6 h-14 flex items-center justify-between gap-6">
        {/* Left Side: Compact Branding */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-orange-600 flex items-center justify-center text-white font-extrabold text-sm shadow-xs">
            8
          </div>
          <div className="leading-tight">
            <span className="font-display font-bold text-stone-900 text-sm tracking-tight block truncate max-w-[220px]">
              {clubName || 'Snooker Club'}
            </span>
          </div>
        </div>

        {/* Center: Horizontal Navigation Links */}
        <nav className="flex items-center gap-1.5 overflow-x-auto py-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentSection === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectSection(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 relative ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-2xs'
                    : 'text-stone-700 hover:bg-[#EFE7DA] hover:text-stone-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-stone-500'}`} />
                <span>{item.label}</span>

                {item.badge && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                      isActive ? 'bg-orange-700 text-white' : 'bg-[#E3DACB] text-stone-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {item.alert && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"
                    title="Counter is closed"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Side: Only the small cloud-sync status icon */}
        <div className="flex items-center shrink-0">
          <button
            onClick={onRefreshConnection}
            title={tooltipText}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#EFE8DC] transition-colors relative group"
            aria-label={tooltipText}
          >
            {isConnected ? (
              <Wifi className="w-4 h-4 text-emerald-600" />
            ) : (
              <WifiOff className="w-4 h-4 text-rose-600" />
            )}

            {/* Hover Tooltip */}
            <span className="pointer-events-none absolute right-0 top-10 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-stone-900 text-stone-100 text-[11px] font-medium py-1 px-2.5 rounded shadow-lg z-50">
              {tooltipText}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
