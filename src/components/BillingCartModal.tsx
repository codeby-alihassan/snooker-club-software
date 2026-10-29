import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Minus,
  CheckCircle,
  AlertTriangle,
  Printer,
  ShoppingCart,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { TableSession, ClubTable, InventoryProduct, CartItem, Sale } from '../types/database';
import { ClubService } from '../services/clubService';
import {
  calculateElapsedSeconds,
  calculateBillableMinutes,
  calculateTableCharge,
  calculateProductsSubtotal,
  calculateGrandTotal,
  formatPKR,
} from '../utils/billing';
import { formatTime12h, formatDuration } from '../utils/date';
import { ConfirmModal } from './ConfirmModal';
import confetti from 'canvas-confetti';

interface BillingCartModalProps {
  session: TableSession;
  table: ClubTable;
  inventory: InventoryProduct[];
  isCounterOpen: boolean;
  isConnected: boolean;
  onClose: () => void;
  onSuccess: (sale: Sale) => void;
  onCancelSession?: (sessionId: string) => void;
}

export const BillingCartModal: React.FC<BillingCartModalProps> = ({
  session,
  table,
  inventory,
  isCounterOpen,
  isConnected,
  onClose,
  onSuccess,
  onCancelSession,
}) => {
  const [appliedRate, setAppliedRate] = useState<number>(session.applied_rate_per_minute);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(() => calculateElapsedSeconds(session.start_time));
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [idempotencyKey] = useState<string>(() => `sale-${session.id}-${Date.now()}`);

  // Real-time ticking duration
  useEffect(() => {
    if (completedSale) return;
    const interval = setInterval(() => {
      setElapsedSeconds(calculateElapsedSeconds(session.start_time));
    }, 1000);
    return () => clearInterval(interval);
  }, [session.start_time, completedSale]);

  const billableMinutes = calculateBillableMinutes(elapsedSeconds);
  const tableCharge = calculateTableCharge(billableMinutes, appliedRate);
  const productsSubtotal = calculateProductsSubtotal(cartItems);
  const grandTotal = calculateGrandTotal(tableCharge, productsSubtotal);

  const handleAddProduct = (product: InventoryProduct) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          unit_price: product.price,
          quantity: 1,
        },
      ];
    });
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.product_id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleCollectCash = async () => {
    if (isSubmitting || completedSale) return;

    // Strict validation
    if (!isConnected) {
      setErrorMessage('Cannot collect payment: Cloud backend is currently unreachable. Please check your connection.');
      return;
    }
    if (!isCounterOpen) {
      setErrorMessage('Cannot collect payment: Register counter is currently closed. Please open the counter first.');
      return;
    }
    if (appliedRate <= 0) {
      setErrorMessage('Rate per minute must be greater than zero.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const sale = await ClubService.collectCash({
        sessionId: session.id,
        appliedRate,
        items: cartItems,
        idempotencyKey,
      });

      setCompletedSale(sale);
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 },
      });
      onSuccess(sale);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to collect payment';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmCancelSession = () => {
    if (onCancelSession) {
      onCancelSession(session.id);
      setShowCancelModal(false);
      onClose();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-[#FAF7F2] rounded-xl border border-stone-300 shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-white border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-700">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">{table.name}</h2>
              <div className="text-xs text-stone-500 flex items-center gap-2">
                <span>Session started at {formatTime12h(session.start_time)}</span>
                <span aria-hidden="true">·</span>
                <span>Active Table Cart</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!completedSale && onCancelSession && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="text-stone-400 hover:text-rose-600 px-2.5 py-1 text-xs rounded hover:bg-rose-50 flex items-center gap-1 transition-colors"
                title="Cancel accidental session start"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Cancel Game
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Receipt View */}
        {completedSale ? (
          <div className="p-8 flex flex-col items-center text-center space-y-6 overflow-y-auto">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-stone-900">Payment Collected Successfully</h3>
              <p className="text-xs text-stone-500 mt-1">
                Receipt recorded and table released at {formatTime12h(completedSale.end_time_snapshot)}
              </p>
            </div>

            {/* Printable Receipt Card */}
            <div className="w-full max-w-md bg-white border border-stone-200 rounded-xl p-6 text-left shadow-xs space-y-4 print:border-none print:shadow-none font-sans desktop-card-hover">
              <div className="border-b border-dashed border-stone-300 pb-3 text-center">
                <div className="font-bold text-stone-900 tracking-tight">CUEMASTER SNOOKER ARENA</div>
                <div className="text-xs text-stone-500 font-mono">Official Settlement Receipt</div>
                <div className="text-[11px] text-stone-400 mt-1 font-mono">Sale ID: {completedSale.id.slice(0, 13)}</div>
              </div>

              <div className="space-y-1.5 text-xs text-stone-600">
                <div className="flex justify-between">
                  <span>Table:</span>
                  <span className="font-semibold text-stone-900">{completedSale.table_name_snapshot}</span>
                </div>
                <div className="flex justify-between">
                  <span>Start Time:</span>
                  <span>{formatTime12h(completedSale.start_time_snapshot)}</span>
                </div>
                <div className="flex justify-between">
                  <span>End Time:</span>
                  <span>{formatTime12h(completedSale.end_time_snapshot)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Billed Duration:</span>
                  <span className="font-mono font-medium">{completedSale.duration_minutes} min (ceil rounded)</span>
                </div>
                <div className="flex justify-between">
                  <span>Applied Rate:</span>
                  <span className="font-mono">{formatPKR(completedSale.applied_rate_snapshot)}/min</span>
                </div>
                <div className="flex justify-between font-medium text-stone-900 pt-1 border-t border-stone-100">
                  <span>Table Play Charge:</span>
                  <span className="font-mono font-semibold">{formatPKR(completedSale.table_charge)}</span>
                </div>
              </div>

              {completedSale.items && completedSale.items.length > 0 && (
                <div className="border-t border-dashed border-stone-200 pt-3 space-y-1.5 text-xs">
                  <div className="font-semibold text-stone-700">Refreshments & Snacks:</div>
                  {completedSale.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-stone-600">
                      <span>{item.quantity}× {item.product_name_snapshot}</span>
                      <span className="font-mono">{formatPKR(item.total_price)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-medium text-stone-900 pt-1">
                    <span>Products Subtotal:</span>
                    <span className="font-mono font-semibold">{formatPKR(completedSale.products_subtotal)}</span>
                  </div>
                </div>
              )}

              <div className="border-t-2 border-stone-900 pt-3 flex justify-between items-baseline">
                <span className="text-sm font-bold text-stone-900">Total Paid (Cash):</span>
                <span className="text-xl font-bold font-mono text-orange-600">{formatPKR(completedSale.total_amount)}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                className="px-4 py-2 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 bg-white hover:bg-stone-50 flex items-center gap-2 transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print Receipt
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Normal Billing Cart View */
          <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
            {/* Left 7 Columns: Session Timer & Billing Summary */}
            <div className="md:col-span-7 p-6 border-r border-stone-200 flex flex-col justify-between overflow-y-auto space-y-6">
              <div className="space-y-4">
                {/* Live Timer Banner with Hover Lift */}
                <div className="bg-stone-900 text-stone-100 rounded-xl p-5 shadow-xs flex items-center justify-between desktop-card-hover">
                  <div>
                    <div className="text-[11px] text-stone-400 font-mono uppercase tracking-wider">Running Session Duration</div>
                    <div className="text-3xl font-extrabold font-mono tracking-tight text-white mt-1 tabular-nums">
                      {formatDuration(elapsedSeconds)}
                    </div>
                    <div className="text-xs text-stone-400 mt-1 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-orange-400" />
                      <span>{billableMinutes} billable minute(s) rounded up</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[11px] text-stone-400 font-mono uppercase tracking-wider">Table Charge</div>
                    <div className="text-2xl font-bold font-mono text-orange-400 mt-1">
                      {formatPKR(tableCharge)}
                    </div>
                  </div>
                </div>

                {/* Per-minute rate editor for this bill */}
                <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-2 desktop-card-hover">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-stone-900">Per-Minute Rate (Bill Adjustment)</div>
                      <div className="text-[11px] text-stone-500">
                        Adjust rate for this bill without changing default category rate.
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-600">PKR</span>
                      <input
                        type="number"
                        min="1"
                        max="200"
                        value={appliedRate}
                        onChange={(e) => setAppliedRate(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-20 px-2.5 py-1.5 border border-stone-300 rounded-lg text-sm font-mono font-bold text-stone-900 text-right focus:outline-hidden focus:border-orange-500"
                      />
                      <span className="text-xs text-stone-500">/min</span>
                    </div>
                  </div>
                </div>

                {/* Current Cart Items List */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-stone-800 uppercase tracking-wider font-mono">
                    Selected Items ({cartItems.reduce((acc, i) => acc + i.quantity, 0)})
                  </div>

                  {cartItems.length === 0 ? (
                    <div className="p-4 bg-stone-100 rounded-xl text-center text-xs text-stone-500 border border-dashed border-stone-300">
                      No snacks or refreshments added yet. Select from the right panel.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {cartItems.map((item) => (
                        <div
                          key={item.product_id}
                          className="bg-white border border-stone-200 rounded-lg p-2.5 flex items-center justify-between text-xs desktop-card-hover"
                        >
                          <div className="truncate mr-2">
                            <span className="font-semibold text-stone-900">{item.name}</span>
                            <span className="text-stone-400 font-mono ml-2">@{formatPKR(item.unit_price)}</span>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="flex items-center border border-stone-200 rounded-md">
                              <button
                                onClick={() => handleUpdateQuantity(item.product_id, -1)}
                                className="w-6 h-6 flex items-center justify-center text-stone-600 hover:bg-stone-100 transition-colors"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-2 font-mono font-bold text-stone-800">{item.quantity}</span>
                              <button
                                onClick={() => handleUpdateQuantity(item.product_id, 1)}
                                className="w-6 h-6 flex items-center justify-center text-stone-600 hover:bg-stone-100 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <span className="font-mono font-bold text-stone-900 w-16 text-right">
                              {formatPKR(item.quantity * item.unit_price)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Total Calculation & Collect Cash */}
              <div className="pt-4 border-t border-stone-200 space-y-3">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-stone-600">
                    <span>Table Play ({billableMinutes} min @ {appliedRate}/min):</span>
                    <span className="font-mono font-medium">{formatPKR(tableCharge)}</span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Refreshments Subtotal:</span>
                    <span className="font-mono font-medium">{formatPKR(productsSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-stone-900 pt-2 border-t border-stone-200">
                    <span>Grand Total:</span>
                    <span className="font-mono text-xl text-orange-600">{formatPKR(grandTotal)}</span>
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={onClose}
                    className="flex-1 py-2.5 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-colors"
                  >
                    Keep Session Running
                  </button>
                  <button
                    onClick={handleCollectCash}
                    disabled={isSubmitting || !isConnected || !isCounterOpen}
                    className={`flex-2 py-2.5 rounded-lg text-xs font-bold text-white shadow-sm flex items-center justify-center gap-2 transition-all ${
                      isSubmitting || !isConnected || !isCounterOpen
                        ? 'bg-stone-400 cursor-not-allowed opacity-80'
                        : 'bg-orange-600 hover:bg-orange-700 active:scale-[0.99]'
                    }`}
                  >
                    {isSubmitting ? 'Processing Transaction...' : `Collect Cash (${formatPKR(grandTotal)})`}
                  </button>
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Refreshments & Snack Catalogue */}
            <div className="md:col-span-5 p-5 bg-[#F6F1EA] flex flex-col justify-between overflow-y-auto">
              <div>
                <div className="text-xs font-bold text-stone-900 uppercase tracking-wider font-mono mb-3">
                  Add From Inventory
                </div>
                <div className="grid grid-cols-1 gap-2 max-h-[480px] overflow-y-auto pr-1">
                  {inventory.filter((p) => p.is_available).map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleAddProduct(product)}
                      className="bg-white border border-stone-200 hover:border-orange-400 rounded-lg p-3 text-left flex items-center justify-between group transition-all shadow-2xs hover:shadow-xs desktop-card-hover"
                    >
                      <div>
                        <div className="text-xs font-semibold text-stone-900 group-hover:text-orange-600 transition-colors">
                          {product.name}
                        </div>
                        <div className="text-xs font-mono font-bold text-stone-500 mt-0.5">
                          {formatPKR(product.price)}
                        </div>
                      </div>
                      <div className="w-7 h-7 rounded-md bg-stone-100 group-hover:bg-orange-500 group-hover:text-white flex items-center justify-center text-stone-500 transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-stone-300 text-[11px] text-stone-500">
                Click any item to add to the table bill. Prices are snapshotted upon collection.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Accidental Session Cancellation Confirmation Modal */}
      {showCancelModal && (
        <ConfirmModal
          isOpen={showCancelModal}
          title="Cancel Accidental Game Session"
          message={`Are you sure you want to cancel the session on "${table.name}"? The timer will stop, no bill will be recorded, and the table will be released immediately.`}
          confirmLabel="Yes, Cancel Game"
          cancelLabel="Keep Game Running"
          isDestructive={true}
          itemName={table.name}
          onConfirm={handleConfirmCancelSession}
          onClose={() => setShowCancelModal(false)}
        />
      )}
    </div>
  );
};
