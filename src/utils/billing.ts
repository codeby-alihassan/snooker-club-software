import { CartItem } from '../types/database';

/**
 * Calculates billable minutes based on exact elapsed seconds.
 * Business Rule: Round up to the next whole minute.
 * Examples:
 * - 0s = 0 billable minutes (zero duration cannot be charged)
 * - 1s - 60s = 1 billable minute
 * - 61s - 120s = 2 billable minutes
 * - 130s = 3 billable minutes
 */
export function calculateBillableMinutes(elapsedSeconds: number): number {
  if (elapsedSeconds <= 0 || isNaN(elapsedSeconds)) {
    return 0;
  }
  return Math.ceil(elapsedSeconds / 60);
}

/**
 * Calculates elapsed seconds between a start timestamp and end timestamp.
 */
export function calculateElapsedSeconds(startTime: string | Date, endTime: string | Date = new Date()): number {
  const start = typeof startTime === 'string' ? new Date(startTime).getTime() : startTime.getTime();
  const end = typeof endTime === 'string' ? new Date(endTime).getTime() : endTime.getTime();
  const diffMs = end - start;
  if (diffMs <= 0 || isNaN(diffMs)) {
    return 0;
  }
  return Math.floor(diffMs / 1000);
}

/**
 * Calculates table charge from billable minutes and rate per minute.
 */
export function calculateTableCharge(billableMinutes: number, ratePerMinute: number): number {
  if (billableMinutes <= 0 || ratePerMinute <= 0 || isNaN(billableMinutes) || isNaN(ratePerMinute)) {
    return 0;
  }
  // Guarantee whole PKR without floating point artifacts
  return Math.round(billableMinutes * ratePerMinute);
}

/**
 * Calculates total for selected cart items.
 */
export function calculateProductsSubtotal(items: CartItem[]): number {
  return items.reduce((total, item) => {
    const qty = Math.max(0, Math.floor(item.quantity));
    const price = Math.max(0, item.unit_price);
    return total + Math.round(qty * price);
  }, 0);
}

/**
 * Calculates grand total for a bill (table charge + products subtotal).
 */
export function calculateGrandTotal(tableCharge: number, productsSubtotal: number): number {
  return Math.round(Math.max(0, tableCharge) + Math.max(0, productsSubtotal));
}

/**
 * Calculates expected counter cash according to the strict business rule:
 * Expected cash = Opening cash + Completed cash sales
 * CRITICAL: Expenses must NEVER be subtracted from expected cash or sales revenue.
 */
export function calculateExpectedCash(openingCash: number, completedCashSales: number): number {
  const opening = Math.max(0, isNaN(openingCash) ? 0 : openingCash);
  const sales = Math.max(0, isNaN(completedCashSales) ? 0 : completedCashSales);
  return Math.round(opening + sales);
}

/**
 * Currency formatter for Pakistani Rupees (PKR)
 */
export function formatPKR(amount: number): string {
  const safe = isNaN(amount) ? 0 : Math.round(amount);
  return `PKR ${safe.toLocaleString('en-PK')}`;
}
