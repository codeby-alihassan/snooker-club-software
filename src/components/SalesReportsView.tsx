import React, { useState } from 'react';
import {
  ReceiptText,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Clock,
  Calendar,
  Layers,
  ArrowUpDown,
} from 'lucide-react';
import { Sale, CounterSession } from '../types/database';
import { formatPKR } from '../utils/billing';
import { formatTime12h, formatDateTime, formatDateOnly } from '../utils/date';

interface SalesReportsViewProps {
  sales: Sale[];
  counterHistory: CounterSession[];
  activeCounter: CounterSession | null;
}

export const SalesReportsView: React.FC<SalesReportsViewProps> = ({
  sales,
  counterHistory,
  activeCounter,
}) => {
  const [selectedCounterFilter, setSelectedCounterFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  // Filter sales
  const filteredSales = sales.filter((sale) => {
    if (selectedCounterFilter === 'current_counter') {
      if (!activeCounter || sale.counter_session_id !== activeCounter.id) return false;
    } else if (selectedCounterFilter !== 'all') {
      if (sale.counter_session_id !== selectedCounterFilter) return false;
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchTable = sale.table_name_snapshot.toLowerCase().includes(term);
      const matchItems = sale.items?.some((i) => i.product_name_snapshot.toLowerCase().includes(term));
      const matchId = sale.id.toLowerCase().includes(term);
      if (!matchTable && !matchItems && !matchId) return false;
    }

    return true;
  });

  const totalFilteredSalesAmount = filteredSales.reduce((acc, s) => acc + s.total_amount, 0);
  const totalTableCharge = filteredSales.reduce((acc, s) => acc + s.table_charge, 0);
  const totalProductsSubtotal = filteredSales.reduce((acc, s) => acc + s.products_subtotal, 0);
  const totalMinutesBilled = filteredSales.reduce((acc, s) => acc + s.duration_minutes, 0);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="border-b border-stone-200 pb-4">
        <h1 className="text-xl font-bold text-stone-900">Sales & Financial Reports</h1>
        <p className="text-xs text-stone-500 mt-1">
          Complete settlement ledger with historical snapshots of table durations, applied rates, and refreshments.
        </p>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-2xs desktop-card-hover">
          <div className="text-stone-500 text-xs font-medium">Filtered Sales Revenue</div>
          <div className="text-2xl font-bold font-mono text-stone-900 mt-2">
            {formatPKR(totalFilteredSalesAmount)}
          </div>
          <div className="text-[11px] text-stone-400 mt-1 font-mono">
            {filteredSales.length} transaction(s)
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-2xs desktop-card-hover">
          <div className="text-stone-500 text-xs font-medium">Table Play Revenue</div>
          <div className="text-2xl font-bold font-mono text-emerald-600 mt-2">
            {formatPKR(totalTableCharge)}
          </div>
          <div className="text-[11px] text-stone-400 mt-1 font-mono">
            {totalMinutesBilled} billable minutes
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-2xs desktop-card-hover">
          <div className="text-stone-500 text-xs font-medium">Refreshments Revenue</div>
          <div className="text-2xl font-bold font-mono text-orange-600 mt-2">
            {formatPKR(totalProductsSubtotal)}
          </div>
          <div className="text-[11px] text-stone-400 mt-1 font-mono">
            Snacks & drinks subtotal
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-2xs desktop-card-hover">
          <div className="text-stone-500 text-xs font-medium">Average Ticket</div>
          <div className="text-2xl font-bold font-mono text-stone-900 mt-2">
            {filteredSales.length > 0
              ? formatPKR(Math.round(totalFilteredSalesAmount / filteredSales.length))
              : formatPKR(0)}
          </div>
          <div className="text-[11px] text-stone-400 mt-1 font-mono">
            Per settled game
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
          <input
            type="text"
            placeholder="Search by table name, product, or sale ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-hidden focus:border-orange-500"
          />
        </div>

        {/* Counter Shift Filter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-600">
            <Filter className="w-4 h-4 text-stone-500" />
            <span>Counter Shift:</span>
          </div>
          <select
            value={selectedCounterFilter}
            onChange={(e) => setSelectedCounterFilter(e.target.value)}
            className="px-3 py-2 border border-stone-300 rounded-lg text-xs font-medium text-stone-900 focus:outline-hidden focus:border-orange-500 bg-white"
          >
            <option value="all">All Counter Sessions ({sales.length})</option>
            {activeCounter && (
              <option value="current_counter">
                Active Shift (Started {formatTime12h(activeCounter.opened_at)})
              </option>
            )}
            {counterHistory
              .filter((c) => !activeCounter || c.id !== activeCounter.id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  Past Shift: {formatDateTime(c.opened_at)} (Sales: {formatPKR(c.total_sales_cash)})
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Transactions Ledger Table */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F2] text-stone-600 border-b border-stone-200 font-semibold uppercase tracking-wider text-[11px] font-mono">
              <tr>
                <th className="py-3 px-4">Date / Time (PKT)</th>
                <th className="py-3 px-4">Table</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Rate Snapshot</th>
                <th className="py-3 px-4">Table Play</th>
                <th className="py-3 px-4">Refreshments</th>
                <th className="py-3 px-4 font-bold text-stone-900">Total Paid</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-stone-400">
                    No matching completed sales found.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const isExpanded = expandedSaleId === sale.id;

                  return (
                    <React.Fragment key={sale.id}>
                      <tr className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-stone-800">
                          <div>{formatDateOnly(sale.created_at)}</div>
                          <div className="text-[11px] text-stone-400">{formatTime12h(sale.created_at)}</div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-stone-900">
                          {sale.table_name_snapshot}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-stone-700">
                          {sale.duration_minutes} min
                        </td>
                        <td className="py-3.5 px-4 font-mono text-stone-600">
                          {formatPKR(sale.applied_rate_snapshot)}/min
                        </td>
                        <td className="py-3.5 px-4 font-mono text-stone-800 font-medium">
                          {formatPKR(sale.table_charge)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-stone-600">
                          {formatPKR(sale.products_subtotal)}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-orange-600 text-sm">
                          {formatPKR(sale.total_amount)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                            className="p-1.5 hover:bg-stone-100 rounded text-stone-500 hover:text-stone-800 transition-colors"
                            title="Expand sale details"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Line Items & Audit Details */}
                      {isExpanded && (
                        <tr className="bg-stone-50/80">
                          <td colSpan={8} className="p-4 border-y border-stone-200">
                            <div className="max-w-2xl bg-white rounded-lg p-4 border border-stone-200 space-y-3">
                              <div className="flex justify-between items-center text-xs pb-2 border-b border-stone-100">
                                <span className="font-mono text-stone-500">Transaction ID: {sale.id}</span>
                                <span className="font-semibold text-stone-700">
                                  Play: {formatTime12h(sale.start_time_snapshot)} – {formatTime12h(sale.end_time_snapshot)}
                                </span>
                              </div>

                              <div>
                                <div className="text-xs font-semibold text-stone-800 mb-1.5">
                                  Purchased Refreshments Snapshot:
                                </div>
                                {sale.items && sale.items.length > 0 ? (
                                  <div className="space-y-1 text-xs">
                                    {sale.items.map((item, idx) => (
                                      <div key={idx} className="flex justify-between text-stone-600 font-mono">
                                        <span>{item.quantity}× {item.product_name_snapshot} (@{formatPKR(item.unit_price_snapshot)})</span>
                                        <span className="font-semibold text-stone-900">{formatPKR(item.total_price)}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-xs text-stone-400">No refreshments purchased for this game.</div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
