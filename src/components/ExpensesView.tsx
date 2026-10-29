import React, { useState } from 'react';
import { CreditCard, Plus, Calendar, AlertCircle } from 'lucide-react';
import { Expense, CounterSession } from '../types/database';
import { ClubService } from '../services/clubService';
import { formatPKR } from '../utils/billing';
import { formatDateTime, formatDateOnly, formatTime12h, isTodayInKarachi } from '../utils/date';

interface ExpensesViewProps {
  expenses: Expense[];
  activeCounter: CounterSession | null;
  isConnected: boolean;
  onRefreshData: () => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  activeCounter,
  isConnected,
  onRefreshData,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number>(300);
  const [category, setCategory] = useState('Chai & Tea');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Today's expenses (Asia/Karachi)
  const todayExpenses = expenses.filter((e) => isTodayInKarachi(e.created_at));
  const todayExpensesTotal = todayExpenses.reduce((acc, e) => acc + e.amount, 0);
  const totalExpensesAllTime = expenses.reduce((acc, e) => acc + e.amount, 0);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Expense title cannot be empty.');
      return;
    }
    if (amount <= 0 || isNaN(amount)) {
      setErrorMsg('Expense amount must be greater than 0 PKR.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await ClubService.addExpense({
        title: title.trim(),
        amount: Math.round(amount),
        category,
        notes: notes.trim() || undefined,
      });
      setShowModal(false);
      setTitle('');
      setAmount(300);
      setNotes('');
      onRefreshData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to record expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Club Operational Expenses</h1>
          <p className="text-xs text-stone-500 mt-1">
            Log ordinary club expenses such as player chai, electricity, table cloth maintenance, and repairs.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Record Expense
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-2xs desktop-card-hover">
          <div className="text-stone-500 text-xs font-medium">Today's Expenses</div>
          <div className="text-2xl font-bold font-mono text-stone-900 mt-2">
            {formatPKR(todayExpensesTotal)}
          </div>
          <div className="text-[11px] text-stone-500 mt-1">
            {todayExpenses.length} expense(s) logged today
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-2xs desktop-card-hover">
          <div className="text-stone-500 text-xs font-medium">All-Time Club Expenses</div>
          <div className="text-2xl font-bold font-mono text-stone-900 mt-2">
            {formatPKR(totalExpensesAllTime)}
          </div>
          <div className="text-[11px] text-stone-500 mt-1">
            {expenses.length} historical record(s)
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-2xs desktop-card-hover">
          <div className="text-stone-500 text-xs font-medium">Accounting Principle</div>
          <div className="text-sm font-semibold text-stone-800 mt-2">
            Independent Expense Ledger
          </div>
          <div className="text-[11px] text-stone-500 mt-1">
            Expenses do NOT reduce cash sales or counter expected drawer cash.
          </div>
        </div>
      </div>

      {/* Expenses Ledger */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-2xs desktop-card-hover">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F2] text-stone-600 border-b border-stone-200 font-semibold uppercase tracking-wider text-[11px] font-mono">
              <tr>
                <th className="py-3 px-4">Date / Time (PKT)</th>
                <th className="py-3 px-4">Expense Title</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Shift Attached</th>
                <th className="py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-400">
                    No expense records found.
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-stone-800">
                      <div>{formatDateOnly(expense.created_at)}</div>
                      <div className="text-[11px] text-stone-400">{formatTime12h(expense.created_at)}</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-stone-900">
                      {expense.title}
                    </td>
                    <td className="py-3.5 px-4 text-stone-600">
                      <span className="font-mono text-stone-700 bg-stone-100 px-2 py-0.5 rounded text-[11px]">
                        {expense.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-orange-600 text-sm">
                      {formatPKR(expense.amount)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-stone-500 text-[11px]">
                      {expense.counter_session_id ? `Shift #${expense.counter_session_id.slice(0, 8)}` : 'Independent'}
                    </td>
                    <td className="py-3.5 px-4 text-stone-500 max-w-xs truncate">
                      {expense.notes || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-stone-200 space-y-4">
            <h3 className="text-base font-bold text-stone-900">Record Operational Expense</h3>

            {errorMsg && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg">{errorMsg}</div>
            )}

            <form onSubmit={handleAddExpense} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">Expense Title / Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Daily Chai from Dhaba, Table 2 Light Tube Replacement"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">Amount in PKR</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono font-bold text-stone-900 focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-hidden focus:border-orange-500"
                >
                  <option value="Chai & Tea">Chai & Tea</option>
                  <option value="Electricity & Power">Electricity & Power</option>
                  <option value="Table & Cloth Maintenance">Table & Cloth Maintenance</option>
                  <option value="Cue & Ball Supplies">Cue & Ball Supplies</option>
                  <option value="Cleaning & Sanitation">Cleaning & Sanitation</option>
                  <option value="Staff Wages / Daily Allowance">Staff Wages / Daily Allowance</option>
                  <option value="General & Miscellaneous">General & Miscellaneous</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">Audit Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Paid to electrician directly"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !isConnected}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold disabled:opacity-50"
                >
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
