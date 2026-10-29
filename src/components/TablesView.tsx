import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Play,
  ShoppingCart,
  Layers,
  CircleDot,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { Category, ClubTable, TableSession } from '../types/database';
import { ClubService } from '../services/clubService';
import { formatPKR } from '../utils/billing';
import { ConfirmModal } from './ConfirmModal';

interface TablesViewProps {
  categories: Category[];
  tables: ClubTable[];
  activeSessions: TableSession[];
  isConnected: boolean;
  isCounterOpen: boolean;
  onRefreshData: () => void;
  onStartSession: (tableId: string) => void;
  onOpenCart: (session: TableSession, table: ClubTable) => void;
  onCancelSession: (sessionId: string) => void;
}

export const TablesView: React.FC<TablesViewProps> = ({
  categories,
  tables,
  activeSessions,
  isConnected,
  isCounterOpen,
  onRefreshData,
  onStartSession,
  onOpenCart,
  onCancelSession,
}) => {
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catRate, setCatRate] = useState<number>(10);

  const [showTableModal, setShowTableModal] = useState(false);
  const [editingTable, setEditingTable] = useState<ClubTable | null>(null);
  const [tableName, setTableName] = useState('');
  const [tableCategoryId, setTableCategoryId] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Deletion modal targets
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [deletingTable, setDeletingTable] = useState<ClubTable | null>(null);
  const [cancellingSession, setCancellingSession] = useState<{
    sessionId: string;
    tableName: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Category modal handlers
  const handleOpenCategoryModal = (cat?: Category) => {
    if (cat) {
      setEditingCategory(cat);
      setCatName(cat.name);
      setCatRate(cat.default_rate_per_minute);
    } else {
      setEditingCategory(null);
      setCatName('');
      setCatRate(10);
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await ClubService.saveCategory({
        id: editingCategory?.id,
        name: catName,
        default_rate_per_minute: catRate,
      });
      setShowCategoryModal(false);
      setSuccessMsg('Category saved successfully.');
      onRefreshData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save category');
    }
  };

  const handleConfirmDeleteCategory = async () => {
    if (!deletingCategory) return;
    setIsDeleting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await ClubService.deleteCategory(deletingCategory.id);
      setSuccessMsg(`Category "${deletingCategory.name}" removed successfully.`);
      setDeletingCategory(null);
      onRefreshData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to delete category');
      setDeletingCategory(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Table modal handlers
  const handleOpenTableModal = (tbl?: ClubTable) => {
    if (tbl) {
      setEditingTable(tbl);
      setTableName(tbl.name);
      setTableCategoryId(tbl.category_id);
    } else {
      setEditingTable(null);
      setTableName('');
      setTableCategoryId(categories[0]?.id || '');
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setShowTableModal(true);
  };

  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await ClubService.saveTable({
        id: editingTable?.id,
        name: tableName,
        category_id: tableCategoryId,
      });
      setShowTableModal(false);
      setSuccessMsg('Table saved successfully.');
      onRefreshData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save table');
    }
  };

  const handleConfirmDeleteTable = async () => {
    if (!deletingTable) return;
    setIsDeleting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await ClubService.deleteTable(deletingTable.id);
      setSuccessMsg(`Table "${deletingTable.name}" removed safely.`);
      setDeletingTable(null);
      onRefreshData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to delete table');
      setDeletingTable(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmCancelSession = () => {
    if (cancellingSession) {
      onCancelSession(cancellingSession.sessionId);
      setCancellingSession(null);
      setSuccessMsg(`Session on "${cancellingSession.tableName}" cancelled.`);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Table & Category Management</h1>
          <p className="text-xs text-stone-500 mt-1">
            Configure club table configurations, game categories, baseline rates, and manage active floors.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleOpenCategoryModal()}
            className="px-3.5 py-2 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 bg-white hover:bg-stone-50 transition-colors flex items-center gap-2"
          >
            <Layers className="w-4 h-4 text-orange-600" />
            Add Category
          </button>
          <button
            onClick={() => handleOpenTableModal()}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Table
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs">
          {successMsg}
        </div>
      )}

      {/* Category Summary List with Discreet Delete Options */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-stone-800 uppercase tracking-wider font-mono">
          Game Categories & Default Rates
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const tableCount = tables.filter((t) => t.category_id === cat.id).length;
            return (
              <div
                key={cat.id}
                className="bg-white border border-stone-200 rounded-xl p-4 flex items-center justify-between shadow-2xs desktop-card-hover"
              >
                <div>
                  <h3 className="text-sm font-bold text-stone-900">{cat.name}</h3>
                  <div className="text-xs text-stone-500 mt-1 flex items-center gap-2 font-mono">
                    <span className="text-orange-600 font-bold">{formatPKR(cat.default_rate_per_minute)}/min</span>
                    <span>·</span>
                    <span>{tableCount} table(s)</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenCategoryModal(cat)}
                    className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
                    title="Edit Category Rate"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingCategory(cat)}
                    className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete Category"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* All Tables Table with Discreet Delete and Cancellation Controls */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-stone-800 uppercase tracking-wider font-mono">
          Active Floor Tables ({tables.length})
        </h2>
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-2xs desktop-card-hover">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F2] text-stone-600 border-b border-stone-200 font-semibold uppercase tracking-wider text-[11px] font-mono">
                <tr>
                  <th className="py-3 px-4">Table Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Default Rate</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {tables.map((table) => {
                  const category = categories.find((c) => c.id === table.category_id);
                  const activeSession = activeSessions.find((s) => s.table_id === table.id);
                  const isOccupied = Boolean(activeSession);

                  return (
                    <tr key={table.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-stone-900 flex items-center gap-2">
                        <CircleDot className={`w-3.5 h-3.5 ${isOccupied ? 'text-orange-500' : 'text-emerald-500'}`} />
                        {table.name}
                      </td>
                      <td className="py-3.5 px-4 text-stone-600">
                        {category?.name || 'Unassigned'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-stone-800">
                        {formatPKR(category?.default_rate_per_minute || 0)}/min
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${
                            isOccupied
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isOccupied ? 'OCCUPIED' : 'AVAILABLE'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenTableModal(table)}
                          className="px-2.5 py-1 text-xs border border-stone-200 rounded hover:bg-stone-100 text-stone-700 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeletingTable(table)}
                          className="px-2 py-1 text-xs border border-rose-200 text-rose-600 rounded hover:bg-rose-50 transition-colors"
                          title="Delete Table"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>

                        {isOccupied && activeSession ? (
                          <>
                            <button
                              onClick={() => onOpenCart(activeSession, table)}
                              className="px-3 py-1 text-xs bg-orange-600 text-white rounded font-semibold hover:bg-orange-700 inline-flex items-center gap-1 transition-colors"
                            >
                              <ShoppingCart className="w-3 h-3" />
                              Bill Cart
                            </button>
                            <button
                              onClick={() =>
                                setCancellingSession({
                                  sessionId: activeSession.id,
                                  tableName: table.name,
                                })
                              }
                              className="px-2.5 py-1 text-xs bg-stone-100 hover:bg-rose-100 text-stone-600 hover:text-rose-700 rounded font-semibold inline-flex items-center gap-1 transition-colors"
                              title="Cancel accidental session start"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => onStartSession(table.id)}
                            disabled={!isConnected || !isCounterOpen}
                            className="px-3 py-1 text-xs bg-emerald-600 text-white rounded font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1 transition-colors"
                          >
                            <Play className="w-3 h-3" />
                            Start
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delete Category Confirmation Modal */}
      {deletingCategory && (
        <ConfirmModal
          isOpen={Boolean(deletingCategory)}
          title="Delete Game Category"
          message={`Are you sure you want to delete category "${deletingCategory.name}"? If any tables belong to this category, deletion will be safely blocked.`}
          confirmLabel="Delete Category"
          cancelLabel="Keep Category"
          isDestructive={true}
          isLoading={isDeleting}
          itemName={deletingCategory.name}
          onConfirm={handleConfirmDeleteCategory}
          onClose={() => setDeletingCategory(null)}
        />
      )}

      {/* Delete Table Confirmation Modal */}
      {deletingTable && (
        <ConfirmModal
          isOpen={Boolean(deletingTable)}
          title="Delete Club Table"
          message={`Are you sure you want to remove table "${deletingTable.name}"? Active games block deletion. Past completed bills will remain safely preserved in reports.`}
          confirmLabel="Delete Table"
          cancelLabel="Cancel"
          isDestructive={true}
          isLoading={isDeleting}
          itemName={deletingTable.name}
          onConfirm={handleConfirmDeleteTable}
          onClose={() => setDeletingTable(null)}
        />
      )}

      {/* Accidental Session Cancel Modal */}
      {cancellingSession && (
        <ConfirmModal
          isOpen={Boolean(cancellingSession)}
          title="Cancel Accidental Start"
          message={`Are you sure you want to cancel the session on "${cancellingSession.tableName}"? The timer will stop, no bill will be recorded, and the table will return to Available.`}
          confirmLabel="Yes, Cancel Game"
          cancelLabel="Keep Game Running"
          isDestructive={true}
          itemName={cancellingSession.tableName}
          onConfirm={handleConfirmCancelSession}
          onClose={() => setCancellingSession(null)}
        />
      )}

      {/* Edit Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-stone-200 space-y-4">
            <h3 className="text-base font-bold text-stone-900">
              {editingCategory ? 'Edit Category' : 'Create New Category'}
            </h3>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Snooker Championship, English 8-Ball"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">Default Rate per Minute (PKR)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={catRate}
                  onChange={(e) => setCatRate(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono text-stone-900 focus:outline-hidden focus:border-orange-500"
                />
                <p className="text-[11px] text-stone-500 mt-1">
                  Example: 10 PKR/min = 600 PKR/hour. Does not alter past bills.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Table Modal */}
      {showTableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-stone-200 space-y-4">
            <h3 className="text-base font-bold text-stone-900">
              {editingTable ? 'Edit Table' : 'Add New Table'}
            </h3>

            <form onSubmit={handleSaveTable} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">Table Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Table 6 — Riley Aristocrat"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">Assign Category</label>
                <select
                  value={tableCategoryId}
                  onChange={(e) => setTableCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-hidden focus:border-orange-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({formatPKR(c.default_rate_per_minute)}/min)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTableModal(false)}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold"
                >
                  Save Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
