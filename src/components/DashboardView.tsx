import React, { useState, useEffect } from 'react';
import {
  Play,
  ShoppingCart,
  TrendingUp,
  CreditCard,
  CheckCircle2,
  CircleDot,
  RotateCcw,
  AlertCircle,
  PlusCircle,
} from 'lucide-react';
import {
  Category,
  ClubTable,
  TableSession,
  CounterSession,
  Sale,
  Expense,
} from '../types/database';
import { calculateElapsedSeconds, formatPKR } from '../utils/billing';
import { formatDuration, isTodayInKarachi } from '../utils/date';
import { ConfirmModal } from './ConfirmModal';

interface DashboardViewProps {
  categories: Category[];
  tables: ClubTable[];
  activeSessions: TableSession[];
  activeCounter: CounterSession | null;
  sales: Sale[];
  expenses: Expense[];
  isConnected: boolean;
  onStartSession: (tableId: string) => void;
  onOpenCart: (session: TableSession, table: ClubTable) => void;
  onCancelSession: (sessionId: string) => void;
  onOpenCounterNav: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  categories,
  tables,
  activeSessions,
  activeCounter,
  sales,
  expenses,
  isConnected,
  onStartSession,
  onOpenCart,
  onCancelSession,
  onOpenCounterNav,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [nowTimestamp, setNowTimestamp] = useState<number>(Date.now());
  const [cancellingSession, setCancellingSession] = useState<{
    sessionId: string;
    tableName: string;
  } | null>(null);

  // Update clock every second for live table durations
  useEffect(() => {
    const timer = setInterval(() => setNowTimestamp(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute Today's Metrics (Asia/Karachi timezone)
  const todaySales = sales.filter((s) => isTodayInKarachi(s.created_at));
  const todaySalesTotal = todaySales.reduce((acc, s) => acc + s.total_amount, 0);

  const todayExpenses = expenses.filter((e) => isTodayInKarachi(e.created_at));
  const todayExpensesTotal = todayExpenses.reduce((acc, e) => acc + e.amount, 0);

  const activeTablesCount = activeSessions.length;

  // Filter tables by category
  const filteredTables = selectedCategory === 'all'
    ? tables
    : tables.filter((t) => t.category_id === selectedCategory);

  const isCounterOpen = Boolean(activeCounter);

  const handleConfirmCancel = () => {
    if (cancellingSession) {
      onCancelSession(cancellingSession.sessionId);
      setCancellingSession(null);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Banner / Counter Warning if Closed */}
      {!isCounterOpen && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-amber-900 shadow-2xs desktop-card-hover">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold text-sm">Register Counter is Currently Closed.</span>
              <span className="text-xs text-amber-800 ml-2">
                You must open the counter with an opening cash float before starting games or collecting bills.
              </span>
            </div>
          </div>
          <button
            onClick={onOpenCounterNav}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            Open Counter Now
          </button>
        </div>
      )}

      {/* 5 Operational Summary Cards with Subtle Hover Effect */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Today's Sales */}
        <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-2xs desktop-card-hover">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>Today's Sales</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-stone-900 mt-2">
            {formatPKR(todaySalesTotal)}
          </div>
          <div className="text-[11px] text-stone-500 mt-1">
            {todaySales.length} transaction(s) today
          </div>
        </div>

        {/* Today's Expenses */}
        <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-2xs desktop-card-hover">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>Today's Expenses</span>
            <CreditCard className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-stone-900 mt-2">
            {formatPKR(todayExpensesTotal)}
          </div>
          <div className="text-[11px] text-stone-500 mt-1">
            {todayExpenses.length} record(s) logged
          </div>
        </div>

        {/* Completed Transactions */}
        <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-2xs desktop-card-hover">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>Completed Bills</span>
            <CheckCircle2 className="w-4 h-4 text-stone-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-stone-900 mt-2">
            {sales.length}
          </div>
          <div className="text-[11px] text-stone-500 mt-1">
            All-time club sales
          </div>
        </div>

        {/* Active Tables */}
        <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-2xs desktop-card-hover">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>Active Tables</span>
            <CircleDot className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-orange-600 mt-2">
            {activeTablesCount} <span className="text-sm font-normal text-stone-500">/ {tables.length}</span>
          </div>
          <div className="text-[11px] text-stone-500 mt-1">
            {tables.length - activeTablesCount} available
          </div>
        </div>

        {/* Current Counter Status */}
        <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-2xs desktop-card-hover">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>Register Counter</span>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isCounterOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
          </div>
          <div className="text-xl font-bold font-mono text-stone-900 mt-2">
            {isCounterOpen ? 'REGISTER OPEN' : 'REGISTER CLOSED'}
          </div>
          <div className="text-[11px] text-stone-500 mt-1">
            {activeCounter ? `Expected ${formatPKR(activeCounter.expected_cash)}` : 'No active shift'}
          </div>
        </div>
      </div>

      {/* Category Filter Tabs (Zero-Pill Segmented Controls) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <h2 className="text-lg font-bold text-stone-900">Floor Tables & Live Arena</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Click Start to initiate a session or click the active timer to open the billing cart.
          </p>
        </div>

        {/* Segmented Category Filter */}
        <div className="flex items-center bg-[#EFE8DC] p-1 rounded-lg border border-[#E0D7C6]">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              selectedCategory === 'all'
                ? 'bg-white text-stone-900 shadow-xs font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            All Tables ({tables.length})
          </button>
          {categories.map((cat) => {
            const count = tables.filter((t) => t.category_id === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-white text-stone-900 shadow-xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Table Cards Grid with Subtle Hover Effects */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTables.map((table) => {
          const category = categories.find((c) => c.id === table.category_id);
          const activeSession = activeSessions.find((s) => s.table_id === table.id);
          const isOccupied = Boolean(activeSession);

          // Calculate running elapsed seconds based on confirmed persisted timestamp
          const elapsedSeconds = activeSession
            ? calculateElapsedSeconds(activeSession.start_time, new Date(nowTimestamp))
            : 0;

          return (
            <div
              key={table.id}
              className={`bg-white rounded-xl border flex flex-col justify-between overflow-hidden desktop-card-hover ${
                isOccupied
                  ? 'border-orange-300 ring-1 ring-orange-200'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              {/* Card Header */}
              <div className="p-5 border-b border-stone-100">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-mono font-medium text-stone-500 uppercase tracking-wider">
                      {category?.name || 'General Category'}
                    </span>
                    <h3 className="text-base font-bold text-stone-900 mt-0.5">{table.name}</h3>
                  </div>

                  <span
                    className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-md ${
                      isOccupied
                        ? 'bg-orange-100 text-orange-800 border border-orange-200'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {isOccupied ? 'OCCUPIED' : 'AVAILABLE'}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-stone-500">
                  <span>Standard Rate:</span>
                  <span className="font-mono font-bold text-stone-800">
                    {formatPKR(category?.default_rate_per_minute || 10)}/min
                  </span>
                </div>
              </div>

              {/* Card Body & Active Timer */}
              <div className="p-5 flex-1 flex flex-col justify-center">
                {isOccupied && activeSession ? (
                  <div className="space-y-4">
                    {/* Running Timer Display with Hover Highlight */}
                    <button
                      onClick={() => onOpenCart(activeSession, table)}
                      className="w-full bg-stone-900 text-stone-100 hover:bg-stone-800 rounded-xl p-4 text-center cursor-pointer transition-all shadow-2xs group hover:shadow-xs"
                    >
                      <div className="text-[11px] text-orange-400 font-mono uppercase tracking-wider font-semibold">
                        Running Duration (Click to Bill)
                      </div>
                      <div className="text-3xl font-extrabold font-mono text-white mt-1 tabular-nums group-hover:scale-102 transition-transform">
                        {formatDuration(elapsedSeconds)}
                      </div>
                      <div className="text-xs text-stone-400 mt-1 flex items-center justify-center gap-1.5">
                        <ShoppingCart className="w-3.5 h-3.5 text-orange-400" />
                        <span>Open Billing Cart</span>
                      </div>
                    </button>

                    {/* Accidental Start Cancellation Control (Reliable In-App Modal) */}
                    <div className="flex justify-end">
                      <button
                        onClick={() =>
                          setCancellingSession({
                            sessionId: activeSession.id,
                            tableName: table.name,
                          })
                        }
                        className="text-stone-400 hover:text-rose-600 text-[11px] font-medium flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-rose-50"
                        title="Cancel accidental game start"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Cancel Accidental Start
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-stone-400 text-xs">
                    Table is vacant. Ready for players.
                  </div>
                )}
              </div>

              {/* Card Footer / Action Button */}
              <div className="p-4 bg-[#FAF7F2] border-t border-stone-100 flex items-center justify-between">
                {isOccupied && activeSession ? (
                  <button
                    onClick={() => onOpenCart(activeSession, table)}
                    className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Open Cart / Collect Cash
                  </button>
                ) : (
                  <button
                    onClick={() => onStartSession(table.id)}
                    disabled={!isConnected || !isCounterOpen}
                    className={`w-full py-2.5 rounded-lg text-xs font-bold text-white shadow-xs flex items-center justify-center gap-2 transition-all ${
                      !isConnected || !isCounterOpen
                        ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-xs'
                    }`}
                  >
                    <Play className="w-4 h-4" />
                    Start Game Session
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Accidental Session Cancellation Confirmation Modal */}
      {cancellingSession && (
        <ConfirmModal
          isOpen={Boolean(cancellingSession)}
          title="Cancel Accidental Start"
          message={`Are you sure you want to cancel the session on "${cancellingSession.tableName}"? The timer will stop immediately, no bill will be created, and the table will return to Available.`}
          confirmLabel="Yes, Cancel Game"
          cancelLabel="Keep Game Running"
          isDestructive={true}
          itemName={cancellingSession.tableName}
          onConfirm={handleConfirmCancel}
          onClose={() => setCancellingSession(null)}
        />
      )}
    </div>
  );
};
