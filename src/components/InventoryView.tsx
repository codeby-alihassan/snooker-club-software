import React, { useState } from 'react';
import { PackageOpen, Plus, Edit2, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { InventoryProduct } from '../types/database';
import { ClubService } from '../services/clubService';
import { formatPKR } from '../utils/billing';
import { ConfirmModal } from './ConfirmModal';

interface InventoryViewProps {
  inventory: InventoryProduct[];
  isConnected: boolean;
  onRefreshData: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  inventory,
  isConnected,
  onRefreshData,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<InventoryProduct | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number>(100);
  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenModal = (prod?: InventoryProduct) => {
    if (prod) {
      setEditingProduct(prod);
      setName(prod.name);
      setPrice(prod.price);
      setIsAvailable(prod.is_available);
    } else {
      setEditingProduct(null);
      setName('');
      setPrice(100);
      setIsAvailable(true);
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setShowModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Product name cannot be empty.');
      return;
    }
    if (price < 0 || isNaN(price)) {
      setErrorMsg('Product price cannot be negative.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await ClubService.saveProduct({
        id: editingProduct?.id,
        name: name.trim(),
        price: Math.round(price),
        is_available: isAvailable,
      });
      setShowModal(false);
      setSuccessMsg(editingProduct ? 'Product updated successfully.' : 'New product added to inventory.');
      onRefreshData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteProduct = async () => {
    if (!deletingProduct) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await ClubService.deleteProduct(deletingProduct.id);
      setSuccessMsg(`Product "${deletingProduct.name}" removed from inventory catalogue.`);
      setDeletingProduct(null);
      onRefreshData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to delete product');
      setDeletingProduct(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Inventory & Refreshment Catalogue</h1>
          <p className="text-xs text-stone-500 mt-1">
            Cold drinks, tea, snacks, and cue accessories offered to players during game sessions.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
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

      {/* Product Grid with Subtle Hover Effects */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {inventory.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs flex flex-col justify-between hover:border-stone-300 transition-all desktop-card-hover"
          >
            <div>
              <div className="flex items-start justify-between">
                <h3 className="text-sm font-bold text-stone-900">{product.name}</h3>
                <span
                  className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${
                    product.is_available
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-stone-100 text-stone-600 border border-stone-200'
                  }`}
                >
                  {product.is_available ? 'AVAILABLE' : 'OFF MENU'}
                </span>
              </div>

              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-xl font-extrabold font-mono text-orange-600">
                  {formatPKR(product.price)}
                </span>
                <span className="text-xs text-stone-400">per item</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
              <button
                onClick={() => setDeletingProduct(product)}
                className="px-2.5 py-1.5 border border-rose-200 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-1.5"
                title="Remove Product"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove
              </button>

              <button
                onClick={() => handleOpenModal(product)}
                className="px-3 py-1.5 border border-stone-200 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors flex items-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5 text-stone-500" />
                Edit Price
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Product Confirmation Modal */}
      {deletingProduct && (
        <ConfirmModal
          isOpen={Boolean(deletingProduct)}
          title="Remove Product from Inventory"
          message={`Are you sure you want to remove "${deletingProduct.name}" (${formatPKR(deletingProduct.price)}) from the active catalogue? Historical sales and past receipts will remain completely preserved.`}
          confirmLabel="Remove Product"
          cancelLabel="Cancel"
          isDestructive={true}
          isLoading={isSubmitting}
          itemName={deletingProduct.name}
          onConfirm={handleConfirmDeleteProduct}
          onClose={() => setDeletingProduct(null)}
        />
      )}

      {/* Add / Edit Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-stone-200 space-y-4">
            <h3 className="text-base font-bold text-stone-900">
              {editingProduct ? 'Edit Product' : 'Add New Inventory Product'}
            </h3>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Red Bull 250ml, Mineral Water 1L, Club Sandwich"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">Selling Price in PKR</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={price}
                  onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono font-bold text-stone-900 focus:outline-hidden focus:border-orange-500"
                />
                <p className="text-[11px] text-stone-500 mt-1">
                  Whole rupees. Modifying will not retroactively alter completed bills.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="avail_chk"
                  checked={isAvailable}
                  onChange={(e) => setIsAvailable(e.target.checked)}
                  className="rounded text-orange-600 focus:ring-orange-500"
                />
                <label htmlFor="avail_chk" className="text-xs font-medium text-stone-800">
                  Product is currently in stock & available in billing cart
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3">
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
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
