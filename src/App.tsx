import React, { useState, useEffect, useCallback } from 'react';
import { DesktopWindowFrame } from './components/DesktopWindowFrame';
import { TopNavbar, NavigationSection } from './components/TopNavbar';
import { DashboardView } from './components/DashboardView';
import { TablesView } from './components/TablesView';
import { CounterView } from './components/CounterView';
import { SalesReportsView } from './components/SalesReportsView';
import { InventoryView } from './components/InventoryView';
import { ExpensesView } from './components/ExpensesView';
import { SettingsView } from './components/SettingsView';
import { BillingCartModal } from './components/BillingCartModal';

import {
  Category,
  ClubSettings,
  ClubTable,
  CounterSession,
  Expense,
  InventoryProduct,
  Sale,
  TableSession,
} from './types/database';
import { ClubService } from './services/clubService';
import { checkBackendReachable, BackendConnectionStatus } from './lib/supabase';

export default function App() {
  const [currentSection, setCurrentSection] = useState<NavigationSection>('dashboard');
  const [connectionStatus, setConnectionStatus] = useState<BackendConnectionStatus>('connecting');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Core operational data states
  const [settings, setSettings] = useState<ClubSettings>({
    id: 'default',
    club_name: 'CueMaster Snooker Arena',
    currency_symbol: 'PKR',
    timezone: 'Asia/Karachi',
    updated_at: new Date().toISOString(),
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<ClubTable[]>([]);
  const [activeSessions, setActiveSessions] = useState<TableSession[]>([]);
  const [inventory, setInventory] = useState<InventoryProduct[]>([]);
  const [activeCounter, setActiveCounter] = useState<CounterSession | null>(null);
  const [counterHistory, setCounterHistory] = useState<CounterSession[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Active Billing Cart Modal target
  const [cartTarget, setCartTarget] = useState<{
    session: TableSession;
    table: ClubTable;
  } | null>(null);

  // Proactive connectivity probe
  const probeConnection = useCallback(async () => {
    try {
      const reachable = await checkBackendReachable();
      setConnectionStatus(reachable ? 'connected' : 'disconnected');
    } catch {
      setConnectionStatus('disconnected');
    }
  }, []);

  // Fetch all core application data
  const loadData = useCallback(async () => {
    try {
      const [
        fetchedSettings,
        fetchedCategories,
        fetchedTables,
        fetchedSessions,
        fetchedInventory,
        fetchedCounter,
        fetchedCounterHistory,
        fetchedSales,
        fetchedExpenses,
      ] = await Promise.all([
        ClubService.getSettings(),
        ClubService.getCategories(),
        ClubService.getTables(),
        ClubService.getActiveSessions(),
        ClubService.getInventory(),
        ClubService.getActiveCounter(),
        ClubService.getCounterHistory(),
        ClubService.getSales(),
        ClubService.getExpenses(),
      ]);

      setSettings(fetchedSettings);
      setCategories(fetchedCategories);
      setTables(fetchedTables);
      setActiveSessions(fetchedSessions);
      setInventory(fetchedInventory);
      setActiveCounter(fetchedCounter);
      setCounterHistory(fetchedCounterHistory);
      setSales(fetchedSales);
      setExpenses(fetchedExpenses);
    } catch (err) {
      console.error('Error loading club data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    probeConnection();
    loadData();

    // Check backend connection every 15 seconds
    const connectionInterval = setInterval(probeConnection, 15000);
    return () => clearInterval(connectionInterval);
  }, [probeConnection, loadData]);

  // Handle game start
  const handleStartSession = async (tableId: string) => {
    try {
      await ClubService.startSession(tableId);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to start game session');
    }
  };

  // Handle session cancellation
  const handleCancelSession = async (sessionId: string) => {
    try {
      await ClubService.cancelSession(sessionId);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to cancel game session');
    }
  };

  // Open billing cart
  const handleOpenCart = (session: TableSession, table: ClubTable) => {
    setCartTarget({ session, table });
  };

  // Handle sale completion in modal
  const handleSaleSuccess = async () => {
    await loadData();
  };

  const isConnected = connectionStatus === 'connected';
  const isCounterOpen = Boolean(activeCounter);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#FBF8F3] text-stone-700 font-sans">
        <div className="w-12 h-12 rounded-2xl bg-orange-600 flex items-center justify-center text-white font-bold text-xl shadow-md animate-bounce mb-4">
          8
        </div>
        <div className="text-base font-bold text-stone-900 font-display">CueMaster Club Manager</div>
        <div className="text-xs text-stone-500 mt-1 font-mono">Initializing Windows desktop runtime...</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#FBF8F3] text-stone-900 overflow-hidden font-sans">
      {/* Real Electron Native Window Controls (renders only in Electron) */}
      <DesktopWindowFrame />

      {/* Main Single Horizontal Top Navbar (Sidebar removed completely) */}
      <TopNavbar
        currentSection={currentSection}
        onSelectSection={(sec) => setCurrentSection(sec)}
        clubName={settings.club_name}
        connectionStatus={connectionStatus}
        activeTablesCount={activeSessions.length}
        isCounterOpen={isCounterOpen}
        onRefreshConnection={probeConnection}
      />

      {/* Main Full-Width Content Area */}
      <main className="flex-1 overflow-y-auto bg-[#FBF8F3]">
        {currentSection === 'dashboard' && (
          <DashboardView
            categories={categories}
            tables={tables}
            activeSessions={activeSessions}
            activeCounter={activeCounter}
            sales={sales}
            expenses={expenses}
            isConnected={isConnected}
            onStartSession={handleStartSession}
            onOpenCart={handleOpenCart}
            onCancelSession={handleCancelSession}
            onOpenCounterNav={() => setCurrentSection('counter')}
          />
        )}

        {currentSection === 'tables' && (
          <TablesView
            categories={categories}
            tables={tables}
            activeSessions={activeSessions}
            isConnected={isConnected}
            isCounterOpen={isCounterOpen}
            onRefreshData={loadData}
            onStartSession={handleStartSession}
            onOpenCart={handleOpenCart}
            onCancelSession={handleCancelSession}
          />
        )}

        {currentSection === 'counter' && (
          <CounterView
            activeCounter={activeCounter}
            counterHistory={counterHistory}
            activeSessions={activeSessions}
            tables={tables}
            isConnected={isConnected}
            onRefreshData={loadData}
          />
        )}

        {currentSection === 'sales' && (
          <SalesReportsView
            sales={sales}
            counterHistory={counterHistory}
            activeCounter={activeCounter}
          />
        )}

        {currentSection === 'inventory' && (
          <InventoryView
            inventory={inventory}
            isConnected={isConnected}
            onRefreshData={loadData}
          />
        )}

        {currentSection === 'expenses' && (
          <ExpensesView
            expenses={expenses}
            activeCounter={activeCounter}
            isConnected={isConnected}
            onRefreshData={loadData}
          />
        )}

        {currentSection === 'settings' && (
          <SettingsView
            settings={settings}
            categories={categories}
            connectionStatus={connectionStatus}
            onRefreshData={loadData}
            onRefreshConnection={probeConnection}
          />
        )}
      </main>

      {/* Billing Cart Modal */}
      {cartTarget && (
        <BillingCartModal
          session={cartTarget.session}
          table={cartTarget.table}
          inventory={inventory}
          isCounterOpen={isCounterOpen}
          isConnected={isConnected}
          onClose={() => setCartTarget(null)}
          onSuccess={handleSaleSuccess}
          onCancelSession={handleCancelSession}
        />
      )}
    </div>
  );
}
