import React, { useState } from 'react';
import {
  WalletCards,
  Lock,
  Unlock,
  AlertTriangle,
  History,
  CheckCircle2,
  DollarSign,
  Clock,
  X,
} from 'lucide-react';
import { CounterSession, TableSession, ClubTable } from '../types/database';
import { ClubService } from '../services/clubService';
import { formatPKR } from '../utils/billing';
import { formatTime12h, formatDateTime } from '../utils/date';

interface CounterViewProps {
  activeCounter: CounterSession | null;
  counterHistory: CounterSession[];
  activeSessions: TableSession[];
  tables: ClubTable[];
  isConnected: boolean;
  onRefreshData: () => void;
}

export const CounterView: React.FC<CounterViewProps> = ({
  activeCounter,
  counterHistory,
  activeSessions,
  tables,
  isConnected,
  onRefreshData,
}) => {
  const [openingCashInput, setOpeningCashInput] = useState<string>('5000');
  const [openNotes, setOpenNotes] = useState<string>('');
  const [closeNotes, setCloseNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showCloseModal, setShowCloseModal] = useState<boolean>(false);

  const isCounterOpen = Boolean(activeCounter);

  const handleOpenCounter = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const amount = parseInt(openingCashInput, 10);
    if (isNaN(amount) || amount < 0) {
      setErrorMsg('Please enter a valid non-negative opening cash amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      await ClubService.openCounter(amount, openNotes);
      setSuccessMsg(`Register counter opened successfully with opening cash of ${formatPKR(amount)}.`);
      setOpenNotes('');
      onRefreshData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to open counter');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInitiateClose = () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    // Rule: Check for active table sessions before closing counter
    if (activeSessions.length > 0) {
      const activeTableNames = activeSessions
        .map((s) => {
          const t = tables.find((tbl) => tbl.id === s.table_id);
          return t ? t.name : 'Unknown Table';
        })
        .join(', ');

      setErrorMsg(
        `Cannot close counter while ${activeSessions.length} table(s) have active running games: ${activeTableNames}. Settle or cancel these tables first.`
      );
      return;
    }

    setShowCloseModal(true);
  };

  const handleConfirmCloseCounter = async () => {
    if (!activeCounter || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await ClubService.closeCounter(activeCounter.id, closeNotes);
      setSuccessMsg('Register counter closed successfully. Shift reconciliation archived.');
      setShowCloseModal(false);
      setCloseNotes('');
      onRefreshData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to close counter');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* View Header */}
      <div className="border-b border-stone-200 pb-4">
        <h1 className="text-xl font-bold text-stone-900">Counter Register & Cash Drawer</h1>
        <p className="text-xs text-stone-500 mt-1">
          Open and close shifts, reconcile cash drawers, and maintain immutable financial shift ledgers.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Counter Status Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Active Counter Card / Reconciliation (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-stone-200 p-6 shadow-2xs space-y-6 desktop-card-hover">
          <div className="flex items-center justify-between pb-4 border-b border-stone-100">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isCounterOpen
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-stone-100 text-stone-600'
                }`}
              >
                <WalletCards className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-stone-900">Current Register State</h2>
                <div className="text-xs text-stone-500">
                  {isCounterOpen
                    ? `Shift active since ${formatDateTime(activeCounter?.opened_at)}`
                    : 'No shift currently running'}
                </div>
              </div>
            </div>

            <span
              className={`text-xs font-mono font-bold px-3 py-1 rounded-md ${
                isCounterOpen
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-stone-100 text-stone-700 border border-stone-200'
              }`}
            >
              {isCounterOpen ? 'COUNTER OPEN' : 'COUNTER CLOSED'}
            </span>
          </div>

          {isCounterOpen && activeCounter ? (
            <div className="space-y-6">
              {/* Cash Reconciliation Formula Box */}
              <div className="bg-[#FAF7F2] rounded-xl border border-stone-200 p-5 space-y-4">
                <div className="text-xs font-bold text-stone-900 font-mono uppercase tracking-wider">
                  Cash Drawer Expected Formula
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-white p-3 rounded-lg border border-stone-200">
                    <div className="text-[11px] text-stone-500 font-mono">Opening Cash Float</div>
                    <div className="text-lg font-bold font-mono text-stone-900 mt-1">
                      {formatPKR(activeCounter.opening_cash)}
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-stone-200">
                    <div className="text-[11px] text-stone-500 font-mono">+ Completed Cash Sales</div>
                    <div className="text-lg font-bold font-mono text-emerald-600 mt-1">
                      {formatPKR(activeCounter.total_sales_cash)}
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-orange-200 bg-orange-50/50">
                    <div className="text-[11px] text-orange-800 font-mono font-bold">= Expected Cash in Drawer</div>
                    <div className="text-lg font-extrabold font-mono text-orange-600 mt-1">
                      {formatPKR(activeCounter.opening_cash + activeCounter.total_sales_cash)}
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-stone-500 bg-white p-3 rounded-lg border border-stone-200">
                  <span className="font-semibold text-stone-800">Operational Invariant:</span>{' '}
                  Expenses are NOT subtracted from expected counter cash. Club expenses are tracked separately in the Expenses ledger.
                </div>
              </div>

              {/* Active Sessions Warning */}
              {activeSessions.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>{activeSessions.length} Table Session(s) Currently Active</span>
                  </div>
                  <div>
                    Before closing the counter, all active games must either be collected via Billing Cart or cancelled.
                  </div>
                </div>
              )}

              {/* Close Counter Controls */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Shift Handover / Closing Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Morning shift balanced, night cash handed over to cashier"
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-hidden focus:border-orange-500"
                  />
                </div>

                <button
                  onClick={handleInitiateClose}
                  disabled={isSubmitting || !isConnected || activeSessions.length > 0}
                  className={`w-full py-3 rounded-lg text-xs font-bold text-white shadow-xs flex items-center justify-center gap-2 transition-all ${
                    isSubmitting || !isConnected || activeSessions.length > 0
                      ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  Close Shift & Lock Counter
                </button>
              </div>
            </div>
          ) : (
            /* Open Counter Form */
            <form onSubmit={handleOpenCounter} className="space-y-4">
              <div className="p-4 bg-stone-50 rounded-lg border border-stone-200 text-xs text-stone-600">
                To start games and accept player bills, initialize the register by recording the initial opening cash drawer float.
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Opening Cash Float in Drawer (PKR)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400 font-mono text-xs font-bold">
                    PKR
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={openingCashInput}
                    onChange={(e) => setOpeningCashInput(e.target.value)}
                    className="w-full pl-12 pr-3 py-2.5 border border-stone-300 rounded-lg text-base font-mono font-bold text-stone-900 focus:outline-hidden focus:border-orange-500"
                    placeholder="5000"
                  />
                </div>
                <p className="text-[11px] text-stone-500 mt-1">
                  Count physical bills in the drawer before typing.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Opening Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Shift 1 started by Tariq"
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !isConnected}
                className={`w-full py-3 rounded-lg text-xs font-bold text-white shadow-xs flex items-center justify-center gap-2 transition-all ${
                  isSubmitting || !isConnected
                    ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                <Unlock className="w-4 h-4" />
                Open Shift Counter
              </button>
            </form>
          )}
        </div>

        {/* Right Column: Quick Counter Guidelines & Summary (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs space-y-3 desktop-card-hover">
            <h3 className="text-xs font-bold text-stone-900 font-mono uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-orange-600" />
              Counter Accounting Rules
            </h3>
            <ul className="text-xs text-stone-600 space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-orange-500 font-bold">1.</span>
                <span><strong>Opening Float:</strong> Recorded in whole Pakistani Rupees at shift start.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500 font-bold">2.</span>
                <span><strong>Cash Sales:</strong> Automatically added in real-time as each table settles.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500 font-bold">3.</span>
                <span><strong>Reconciliation:</strong> When closing, physical drawer cash must match <code>Opening + Total Sales</code>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500 font-bold">4.</span>
                <span><strong>No Expense Deductions:</strong> Expenses are independently logged to preserve clean audit trails.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Historical Counter Sessions Ledger */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-stone-800 uppercase tracking-wider font-mono flex items-center gap-2">
          <History className="w-4 h-4 text-stone-500" />
          Shift History & Past Closures ({counterHistory.length})
        </h2>

        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-2xs desktop-card-hover">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F2] text-stone-600 border-b border-stone-200 font-semibold uppercase tracking-wider text-[11px] font-mono">
                <tr>
                  <th className="py-3 px-4">Opened At</th>
                  <th className="py-3 px-4">Closed At</th>
                  <th className="py-3 px-4">Opening Float</th>
                  <th className="py-3 px-4">Total Sales</th>
                  <th className="py-3 px-4">Expected Cash</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {counterHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-stone-400">
                      No shift records found. Open your first counter above.
                    </td>
                  </tr>
                ) : (
                  counterHistory.map((shift) => (
                    <tr key={shift.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-stone-800 font-medium">
                        {formatDateTime(shift.opened_at)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-stone-600">
                        {shift.closed_at ? formatDateTime(shift.closed_at) : '— (Active)'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-stone-800">
                        {formatPKR(shift.opening_cash)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-emerald-600">
                        {formatPKR(shift.total_sales_cash)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-orange-600">
                        {formatPKR(shift.expected_cash || shift.opening_cash + shift.total_sales_cash)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${
                            shift.status === 'open'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {shift.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-stone-500 max-w-xs truncate">
                        {shift.notes || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* In-App Close Counter Confirmation Modal (No window.confirm!) */}
      {showCloseModal && activeCounter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl border border-stone-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">Confirm Shift Closure</h3>
                  <div className="text-xs text-stone-500">
                    Reconcile cash drawer and archive shift records.
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowCloseModal(false)}
                disabled={isSubmitting}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Reconciliation Breakdown */}
            <div className="bg-[#FAF7F2] rounded-xl p-4 border border-stone-200 space-y-2.5 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Shift Started:</span>
                <span className="font-mono font-medium">{formatTime12h(activeCounter.opened_at)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Shift Closing:</span>
                <span className="font-mono font-medium">{formatTime12h(new Date())}</span>
              </div>
              <div className="border-t border-stone-200 pt-2 flex justify-between text-stone-700">
                <span>Opening Cash Float:</span>
                <span className="font-mono font-semibold">{formatPKR(activeCounter.opening_cash)}</span>
              </div>
              <div className="flex justify-between text-stone-700">
                <span>Total Cash Sales:</span>
                <span className="font-mono font-semibold text-emerald-600">
                  +{formatPKR(activeCounter.total_sales_cash)}
                </span>
              </div>
              <div className="border-t-2 border-stone-800 pt-2 flex justify-between items-baseline text-sm font-bold text-stone-900">
                <span>Expected Drawer Cash:</span>
                <span className="font-mono text-lg text-orange-600">
                  {formatPKR(activeCounter.opening_cash + activeCounter.total_sales_cash)}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-stone-500">
              Note: Expenses are not deducted from the drawer expected cash. Once closed, new games cannot be started until a new shift is opened.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCloseCounter}
                disabled={isSubmitting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <span>Locking Shift...</span>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Confirm & Lock Counter</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
