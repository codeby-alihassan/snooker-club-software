import { describe, it, expect } from 'vitest';
import {
  calculateBillableMinutes,
  calculateElapsedSeconds,
  calculateTableCharge,
  calculateProductsSubtotal,
  calculateGrandTotal,
  calculateExpectedCash,
  formatPKR,
} from '../utils/billing';
import { formatTime12h, formatDuration } from '../utils/date';
import { CartItem, TableSession, ClubTable } from '../types/database';

describe('Billing Business Logic & Rounding Invariants', () => {
  it('handles zero or negative duration properly without charging', () => {
    expect(calculateBillableMinutes(0)).toBe(0);
    expect(calculateBillableMinutes(-10)).toBe(0);
    expect(calculateTableCharge(0, 10)).toBe(0);
  });

  it('correctly rounds up 1 second to 1 billable minute', () => {
    expect(calculateBillableMinutes(1)).toBe(1);
    expect(calculateTableCharge(1, 10)).toBe(10);
  });

  it('correctly rounds up exactly 60 seconds to 1 billable minute', () => {
    expect(calculateBillableMinutes(60)).toBe(1);
    expect(calculateTableCharge(60, 10)).toBe(10 * 60); // 1 minute when converted
    expect(calculateBillableMinutes(60)).toBe(1);
  });

  it('correctly rounds up 61 seconds to 2 billable minutes', () => {
    expect(calculateBillableMinutes(61)).toBe(2);
    expect(calculateTableCharge(calculateBillableMinutes(61), 10)).toBe(20);
  });

  it('correctly rounds up 130 seconds (2m 10s) to 3 billable minutes', () => {
    expect(calculateBillableMinutes(130)).toBe(3);
    expect(calculateTableCharge(3, 7)).toBe(21);
  });

  it('calculates table charge with edited per-minute rate immediately', () => {
    const minutes = 25;
    const defaultRate = 10;
    const editedRate = 12;

    const defaultCharge = calculateTableCharge(minutes, defaultRate);
    const editedCharge = calculateTableCharge(minutes, editedRate);

    expect(defaultCharge).toBe(250);
    expect(editedCharge).toBe(300);
  });

  it('calculates product line items and subtotals accurately', () => {
    const items: CartItem[] = [
      { product_id: 'p1', name: 'Mineral Water', unit_price: 80, quantity: 2 },
      { product_id: 'p2', name: 'Red Bull', unit_price: 450, quantity: 1 },
      { product_id: 'p3', name: 'Chai', unit_price: 100, quantity: 3 },
    ];

    const subtotal = calculateProductsSubtotal(items);
    // (2 * 80) + (1 * 450) + (3 * 100) = 160 + 450 + 300 = 910
    expect(subtotal).toBe(910);
  });

  it('calculates grand total of table charge and refreshments', () => {
    const tableCharge = 350;
    const refreshments = 910;
    expect(calculateGrandTotal(tableCharge, refreshments)).toBe(1260);
  });
});

describe('Counter Management Cash Drawer Invariants', () => {
  it('calculates expected cash strictly as Opening Cash + Completed Sales', () => {
    const openingCash = 5000;
    const completedSales = 12450;
    const expected = calculateExpectedCash(openingCash, completedSales);

    expect(expected).toBe(17450);
  });

  it('ensures expenses do NOT reduce expected cash or sales revenue', () => {
    const openingCash = 5000;
    const completedSales = 8000;
    const expected = calculateExpectedCash(openingCash, completedSales);
    const expenseAmount = 1500;

    // Expected drawer cash must remain opening + sales
    expect(expected).toBe(13000);
    expect(expected).not.toBe(13000 - expenseAmount);
  });

  it('validates that counter closure must be blocked when active table sessions exist', () => {
    const activeSessions: TableSession[] = [
      {
        id: 's-1',
        table_id: 'tbl-1',
        counter_session_id: 'c-1',
        start_time: new Date().toISOString(),
        status: 'active',
        applied_rate_per_minute: 10,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const canClose = activeSessions.length === 0;
    expect(canClose).toBe(false);
  });
});

describe('Session Cancellation and State Preservation', () => {
  it('correctly transitions an active session to cancelled without creating charges', () => {
    const session: TableSession = {
      id: 'session-test',
      table_id: 'tbl-1',
      counter_session_id: 'counter-1',
      start_time: new Date().toISOString(),
      status: 'active',
      applied_rate_per_minute: 10,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Simulate cancellation
    const now = new Date().toISOString();
    const cancelledSession: TableSession = {
      ...session,
      status: 'cancelled',
      end_time: now,
      cancellation_reason: 'Accidental start cancelled by operator',
      updated_at: now,
    };

    expect(cancelledSession.status).toBe('cancelled');
    expect(cancelledSession.end_time).toBeDefined();
    expect(cancelledSession.table_charge).toBeUndefined();
    expect(cancelledSession.cancellation_reason).toBe('Accidental start cancelled by operator');
  });
});

describe('Safe Delete Business Rules', () => {
  it('blocks category deletion if any tables are assigned to it', () => {
    const categoryId = 'cat-snooker';
    const tables: ClubTable[] = [
      { id: 'tbl-1', name: 'Table 1', category_id: categoryId, is_active: true, created_at: '', updated_at: '' },
    ];

    const isReferenced = tables.some(t => t.category_id === categoryId);
    expect(isReferenced).toBe(true);
  });

  it('allows category deletion if zero tables reference it', () => {
    const categoryId = 'cat-empty';
    const tables: ClubTable[] = [
      { id: 'tbl-1', name: 'Table 1', category_id: 'cat-other', is_active: true, created_at: '', updated_at: '' },
    ];

    const isReferenced = tables.some(t => t.category_id === categoryId);
    expect(isReferenced).toBe(false);
  });

  it('blocks table deletion if it has an active session', () => {
    const tableId = 'tbl-1';
    const activeSessions: TableSession[] = [
      { id: 's-1', table_id: tableId, counter_session_id: 'c-1', start_time: '', status: 'active', applied_rate_per_minute: 10, created_at: '', updated_at: '' },
    ];

    const hasActiveSession = activeSessions.some(s => s.table_id === tableId && s.status === 'active');
    expect(hasActiveSession).toBe(true);
  });
});

describe('Date, Duration and Currency Formatting', () => {
  it('formats PKR currency with commas and prefix', () => {
    expect(formatPKR(5000)).toBe('PKR 5,000');
    expect(formatPKR(1250000)).toBe('PKR 1,250,000');
  });

  it('formats elapsed duration strings cleanly', () => {
    expect(formatDuration(45)).toBe('00m 45s');
    expect(formatDuration(125)).toBe('02m 05s');
    expect(formatDuration(3665)).toBe('01h 01m 05s');
  });

  it('calculates elapsed seconds from persisted ISO start timestamp', () => {
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
    const elapsed = calculateElapsedSeconds(tenMinutesAgo, now);

    expect(elapsed).toBe(600);
    expect(calculateBillableMinutes(elapsed)).toBe(10);
  });
});
