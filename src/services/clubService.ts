import {
  Category,
  ClubSettings,
  ClubTable,
  CounterSession,
  Expense,
  InventoryProduct,
  Sale,
  TableSession,
  CartItem,
} from '../types/database';
import { getSupabaseClient, checkBackendReachable } from '../lib/supabase';
import { calculateBillableMinutes, calculateTableCharge, calculateProductsSubtotal, calculateGrandTotal } from '../utils/billing';

const STORAGE_KEY_LOCAL_DB = 'cuemaster_local_db_v1';

interface LocalDatabase {
  settings: ClubSettings;
  categories: Category[];
  tables: ClubTable[];
  sessions: TableSession[];
  inventory: InventoryProduct[];
  counterSessions: CounterSession[];
  sales: Sale[];
  expenses: Expense[];
}

const DEFAULT_SETTINGS: ClubSettings = {
  id: 'default',
  club_name: 'CueMaster Snooker Arena',
  currency_symbol: 'PKR',
  timezone: 'Asia/Karachi',
  updated_at: new Date().toISOString(),
};

const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'cat-1',
    name: 'Snooker Championship',
    default_rate_per_minute: 10, // 10 PKR/min = 600 PKR/hr
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'cat-2',
    name: 'American Pool',
    default_rate_per_minute: 7, // 7 PKR/min = 420 PKR/hr
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const INITIAL_TABLES: ClubTable[] = [
  {
    id: 'tbl-1',
    name: 'Table 1 — Riley Aristocrat (Steel Block)',
    category_id: 'cat-1',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tbl-2',
    name: 'Table 2 — Xingpai Championship 12ft',
    category_id: 'cat-1',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tbl-3',
    name: 'Table 3 — BCE Grand Master 12ft',
    category_id: 'cat-1',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tbl-4',
    name: 'Table 4 — Rasson Oxford Pool 9ft',
    category_id: 'cat-2',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tbl-5',
    name: 'Table 5 — Dynamic III Tournament Pool 9ft',
    category_id: 'cat-2',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const INITIAL_INVENTORY: InventoryProduct[] = [
  { id: 'inv-1', name: 'Mineral Water (500ml)', price: 80, is_available: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'inv-2', name: 'Red Bull Energy Drink (250ml)', price: 450, is_available: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'inv-3', name: 'Fresh Doodh Patti Chai', price: 100, is_available: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'inv-4', name: 'Fresh Mint Lemonade', price: 180, is_available: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'inv-5', name: 'Lays Classic Crisps (Large)', price: 120, is_available: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'inv-6', name: 'Cue Tip Chalk (Blue Diamond)', price: 150, is_available: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

function getLocalDB(): LocalDatabase {
  if (typeof window === 'undefined') {
    return {
      settings: DEFAULT_SETTINGS,
      categories: INITIAL_CATEGORIES,
      tables: INITIAL_TABLES,
      sessions: [],
      inventory: INITIAL_INVENTORY,
      counterSessions: [],
      sales: [],
      expenses: [],
    };
  }

  const raw = localStorage.getItem(STORAGE_KEY_LOCAL_DB);
  if (!raw) {
    const initial: LocalDatabase = {
      settings: DEFAULT_SETTINGS,
      categories: INITIAL_CATEGORIES,
      tables: INITIAL_TABLES,
      sessions: [],
      inventory: INITIAL_INVENTORY,
      counterSessions: [],
      sales: [],
      expenses: [],
    };
    localStorage.setItem(STORAGE_KEY_LOCAL_DB, JSON.stringify(initial));
    return initial;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return {
      settings: DEFAULT_SETTINGS,
      categories: INITIAL_CATEGORIES,
      tables: INITIAL_TABLES,
      sessions: [],
      inventory: INITIAL_INVENTORY,
      counterSessions: [],
      sales: [],
      expenses: [],
    };
  }
}

function saveLocalDB(db: LocalDatabase): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_LOCAL_DB, JSON.stringify(db));
  }
}

export class ClubService {
  /**
   * Verify backend connection before initiating critical financial actions.
   */
  private static async assertBackendReachable(): Promise<void> {
    const isReachable = await checkBackendReachable();
    if (!isReachable) {
      throw new Error('Cloud backend connection is unavailable. Cannot execute financial operations while disconnected.');
    }
  }

  // --- SETTINGS ---
  static async getSettings(): Promise<ClubSettings> {
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client.from('settings').select('*').limit(1).single();
      if (!error && data) return data as ClubSettings;
    }
    return getLocalDB().settings;
  }

  static async updateClubName(newName: string): Promise<ClubSettings> {
    await this.assertBackendReachable();
    const cleanName = newName.trim();
    if (!cleanName) throw new Error('Club name cannot be blank.');

    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client
        .from('settings')
        .upsert({ id: 'default', club_name: cleanName, updated_at: new Date().toISOString() })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as ClubSettings;
    }

    const db = getLocalDB();
    db.settings.club_name = cleanName;
    db.settings.updated_at = new Date().toISOString();
    saveLocalDB(db);
    return db.settings;
  }

  // --- COUNTER MANAGEMENT ---
  static async getActiveCounter(): Promise<CounterSession | null> {
    const client = getSupabaseClient();
    if (client) {
      const { data } = await client
        .from('counter_sessions')
        .select('*')
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as CounterSession | null;
    }

    const db = getLocalDB();
    const active = db.counterSessions.find(c => c.status === 'open');
    return active || null;
  }

  static async getCounterHistory(): Promise<CounterSession[]> {
    const client = getSupabaseClient();
    if (client) {
      const { data } = await client
        .from('counter_sessions')
        .select('*')
        .order('opened_at', { ascending: false });
      return (data || []) as CounterSession[];
    }
    return [...getLocalDB().counterSessions].sort((a, b) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime());
  }

  static async openCounter(openingCash: number, notes?: string): Promise<CounterSession> {
    await this.assertBackendReachable();
    const active = await this.getActiveCounter();
    if (active) {
      throw new Error('A counter session is already currently open. Please close it before opening a new counter.');
    }
    if (openingCash < 0 || isNaN(openingCash)) {
      throw new Error('Opening cash amount cannot be negative.');
    }

    const now = new Date().toISOString();
    const newSession: CounterSession = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `counter-${Date.now()}`,
      opening_cash: Math.round(openingCash),
      total_sales_cash: 0,
      expected_cash: Math.round(openingCash),
      status: 'open',
      opened_at: now,
      notes: notes?.trim() || null,
      created_at: now,
    };

    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client.from('counter_sessions').insert(newSession).select().single();
      if (error) throw new Error(error.message);
      return data as CounterSession;
    }

    const db = getLocalDB();
    db.counterSessions.push(newSession);
    saveLocalDB(db);
    return newSession;
  }

  static async closeCounter(counterId: string, notes?: string): Promise<CounterSession> {
    await this.assertBackendReachable();

    // Policy: Verify there are no running active table sessions before closing counter
    const activeSessions = await this.getActiveSessions();
    if (activeSessions.length > 0) {
      throw new Error(
        `Cannot close counter while ${activeSessions.length} table session(s) are actively running. Please collect cash or cancel active games first.`
      );
    }

    const client = getSupabaseClient();
    const now = new Date().toISOString();

    if (client) {
      const { data: counter, error: fetchErr } = await client
        .from('counter_sessions')
        .select('*')
        .eq('id', counterId)
        .single();
      if (fetchErr || !counter) throw new Error('Counter session not found');

      // Expected cash = Opening cash + Completed cash sales (Never deduct expenses!)
      const expectedCash = Math.round(Number(counter.opening_cash) + Number(counter.total_sales_cash));

      const { data, error } = await client
        .from('counter_sessions')
        .update({
          status: 'closed',
          closed_at: now,
          expected_cash: expectedCash,
          notes: notes ? (counter.notes ? `${counter.notes} | ${notes}` : notes) : counter.notes,
        })
        .eq('id', counterId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as CounterSession;
    }

    const db = getLocalDB();
    const idx = db.counterSessions.findIndex(c => c.id === counterId);
    if (idx === -1) throw new Error('Counter session not found');

    const counter = db.counterSessions[idx];
    const expected = Math.round(counter.opening_cash + counter.total_sales_cash);

    counter.status = 'closed';
    counter.closed_at = now;
    counter.expected_cash = expected;
    if (notes) {
      counter.notes = counter.notes ? `${counter.notes} | ${notes}` : notes;
    }
    saveLocalDB(db);
    return counter;
  }

  // --- CATEGORIES & TABLES ---
  static async getCategories(): Promise<Category[]> {
    const client = getSupabaseClient();
    if (client) {
      const { data } = await client.from('categories').select('*').order('name');
      return (data || []) as Category[];
    }
    return getLocalDB().categories;
  }

  static async saveCategory(category: Partial<Category> & { name: string; default_rate_per_minute: number }): Promise<Category> {
    await this.assertBackendReachable();
    if (category.default_rate_per_minute <= 0) {
      throw new Error('Default per-minute rate must be greater than 0 PKR.');
    }

    const now = new Date().toISOString();
    const client = getSupabaseClient();

    if (category.id) {
      if (client) {
        const { data, error } = await client
          .from('categories')
          .update({
            name: category.name.trim(),
            default_rate_per_minute: Math.round(category.default_rate_per_minute),
            updated_at: now,
          })
          .eq('id', category.id)
          .select()
          .single();
        if (error) throw new Error(error.message);
        return data as Category;
      }
      const db = getLocalDB();
      const idx = db.categories.findIndex(c => c.id === category.id);
      if (idx !== -1) {
        db.categories[idx].name = category.name.trim();
        db.categories[idx].default_rate_per_minute = Math.round(category.default_rate_per_minute);
        db.categories[idx].updated_at = now;
        saveLocalDB(db);
        return db.categories[idx];
      }
    }

    const newCat: Category = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cat-${Date.now()}`,
      name: category.name.trim(),
      default_rate_per_minute: Math.round(category.default_rate_per_minute),
      created_at: now,
      updated_at: now,
    };

    if (client) {
      const { data, error } = await client.from('categories').insert(newCat).select().single();
      if (error) throw new Error(error.message);
      return data as Category;
    }

    const db = getLocalDB();
    db.categories.push(newCat);
    saveLocalDB(db);
    return newCat;
  }

  static async deleteCategory(categoryId: string): Promise<void> {
    await this.assertBackendReachable();
    const categories = await this.getCategories();
    const target = categories.find(c => c.id === categoryId);
    if (!target) throw new Error('Category not found');

    const client = getSupabaseClient();
    if (client) {
      const { data: linkedTables } = await client
        .from('tables')
        .select('id, name')
        .eq('category_id', categoryId);

      if (linkedTables && linkedTables.length > 0) {
        throw new Error(
          `Cannot delete category "${target.name}". It is currently assigned to ${linkedTables.length} table(s). Reassign or delete those tables first.`
        );
      }

      const { error } = await client.from('categories').delete().eq('id', categoryId);
      if (error) throw new Error(error.message);
      return;
    }

    const db = getLocalDB();
    const linkedTables = db.tables.filter(t => t.category_id === categoryId);
    if (linkedTables.length > 0) {
      throw new Error(
        `Cannot delete category "${target.name}". It is currently assigned to ${linkedTables.length} table(s). Reassign or delete those tables first.`
      );
    }

    db.categories = db.categories.filter(c => c.id !== categoryId);
    saveLocalDB(db);
  }

  static async getTables(): Promise<ClubTable[]> {
    const client = getSupabaseClient();
    if (client) {
      const { data } = await client
        .from('tables')
        .select('*')
        .eq('is_active', true)
        .order('name');
      return (data || []) as ClubTable[];
    }
    return getLocalDB().tables.filter(t => t.is_active !== false);
  }

  static async saveTable(table: Partial<ClubTable> & { name: string; category_id: string }): Promise<ClubTable> {
    await this.assertBackendReachable();
    const now = new Date().toISOString();
    const client = getSupabaseClient();

    if (table.id) {
      if (client) {
        const { data, error } = await client
          .from('tables')
          .update({
            name: table.name.trim(),
            category_id: table.category_id,
            updated_at: now,
          })
          .eq('id', table.id)
          .select()
          .single();
        if (error) throw new Error(error.message);
        return data as ClubTable;
      }
      const db = getLocalDB();
      const idx = db.tables.findIndex(t => t.id === table.id);
      if (idx !== -1) {
        db.tables[idx].name = table.name.trim();
        db.tables[idx].category_id = table.category_id;
        db.tables[idx].updated_at = now;
        saveLocalDB(db);
        return db.tables[idx];
      }
    }

    const newTbl: ClubTable = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tbl-${Date.now()}`,
      name: table.name.trim(),
      category_id: table.category_id,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    if (client) {
      const { data, error } = await client.from('tables').insert(newTbl).select().single();
      if (error) throw new Error(error.message);
      return data as ClubTable;
    }

    const db = getLocalDB();
    db.tables.push(newTbl);
    saveLocalDB(db);
    return newTbl;
  }

  static async deleteTable(tableId: string): Promise<void> {
    await this.assertBackendReachable();
    const activeSessions = await this.getActiveSessions();
    const hasActiveSession = activeSessions.some(s => s.table_id === tableId);
    if (hasActiveSession) {
      throw new Error(
        'Cannot delete table: An active game session is currently running on this table. Please settle or cancel the session first.'
      );
    }

    const client = getSupabaseClient();
    const now = new Date().toISOString();

    if (client) {
      const { count } = await client
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('table_id', tableId);

      if (count && count > 0) {
        // Soft delete to protect financial history & foreign keys
        const { error } = await client
          .from('tables')
          .update({ is_active: false, updated_at: now })
          .eq('id', tableId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await client.from('tables').delete().eq('id', tableId);
        if (error) throw new Error(error.message);
      }
      return;
    }

    const db = getLocalDB();
    const table = db.tables.find(t => t.id === tableId);
    if (!table) return;

    const hasHistoricalSessions = db.sessions.some(s => s.table_id === tableId);
    if (hasHistoricalSessions) {
      table.is_active = false;
      table.updated_at = now;
    } else {
      db.tables = db.tables.filter(t => t.id !== tableId);
    }
    saveLocalDB(db);
  }

  // --- SESSIONS ---
  static async getActiveSessions(): Promise<TableSession[]> {
    const client = getSupabaseClient();
    if (client) {
      const { data } = await client.from('sessions').select('*').eq('status', 'active');
      return (data || []) as TableSession[];
    }
    return getLocalDB().sessions.filter(s => s.status === 'active');
  }

  static async startSession(tableId: string): Promise<TableSession> {
    await this.assertBackendReachable();

    const activeCounter = await this.getActiveCounter();
    if (!activeCounter) {
      throw new Error('Cannot start a table session: No counter is currently open. Please open the counter first.');
    }

    // Verify table is not already occupied
    const activeSessions = await this.getActiveSessions();
    const existing = activeSessions.find(s => s.table_id === tableId);
    if (existing) {
      throw new Error('This table is already occupied with an active running session.');
    }

    const tables = await this.getTables();
    const targetTable = tables.find(t => t.id === tableId);
    if (!targetTable) throw new Error('Table not found.');

    const categories = await this.getCategories();
    const category = categories.find(c => c.id === targetTable.category_id);
    const defaultRate = category ? category.default_rate_per_minute : 10;

    const now = new Date().toISOString();
    const newSession: TableSession = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `session-${Date.now()}`,
      table_id: tableId,
      counter_session_id: activeCounter.id,
      start_time: now,
      status: 'active',
      applied_rate_per_minute: defaultRate,
      created_at: now,
      updated_at: now,
    };

    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client.from('sessions').insert(newSession).select().single();
      if (error) throw new Error(error.message);
      return data as TableSession;
    }

    const db = getLocalDB();
    db.sessions.push(newSession);
    saveLocalDB(db);
    return newSession;
  }

  static async cancelSession(sessionId: string, reason?: string): Promise<void> {
    await this.assertBackendReachable();
    const now = new Date().toISOString();
    const client = getSupabaseClient();

    if (client) {
      const { error } = await client
        .from('sessions')
        .update({
          status: 'cancelled',
          end_time: now,
          cancellation_reason: reason?.trim() || 'Accidental start cancelled by operator',
          updated_at: now,
        })
        .eq('id', sessionId);
      if (error) throw new Error(error.message);
      return;
    }

    const db = getLocalDB();
    const session = db.sessions.find(s => s.id === sessionId);
    if (session) {
      session.status = 'cancelled';
      session.end_time = now;
      session.cancellation_reason = reason?.trim() || 'Accidental start cancelled by operator';
      session.updated_at = now;
      saveLocalDB(db);
    }
  }

  // --- ATOMIC CASH COLLECTION & SALES ---
  static async collectCash(params: {
    sessionId: string;
    appliedRate: number;
    items: CartItem[];
    idempotencyKey?: string;
  }): Promise<Sale> {
    await this.assertBackendReachable();

    const activeCounter = await this.getActiveCounter();
    if (!activeCounter) {
      throw new Error('Cannot collect cash: Counter is closed. Please open the counter first.');
    }

    const activeSessions = await this.getActiveSessions();
    const session = activeSessions.find(s => s.id === params.sessionId);
    if (!session) {
      throw new Error('Active session not found. It may have already been settled or cancelled.');
    }

    const tables = await this.getTables();
    const table = tables.find(t => t.id === session.table_id);
    const tableName = table ? table.name : 'Snooker Table';

    // Calculate exact duration and billing according to the master specification
    const startTime = new Date(session.start_time).getTime();
    const endTime = Date.now();
    const elapsedSeconds = Math.max(0, Math.floor((endTime - startTime) / 1000));
    const billableMinutes = calculateBillableMinutes(elapsedSeconds);
    const tableCharge = calculateTableCharge(billableMinutes, params.appliedRate);
    const productsSubtotal = calculateProductsSubtotal(params.items);
    const grandTotal = calculateGrandTotal(tableCharge, productsSubtotal);

    const now = new Date().toISOString();
    const client = getSupabaseClient();

    // Call atomic PostgreSQL function if Supabase is connected
    if (client) {
      const { data, error } = await client.rpc('collect_table_sale', {
        p_session_id: session.id,
        p_applied_rate: params.appliedRate,
        p_items: params.items.map(i => ({
          product_id: i.product_id,
          name: i.name,
          unit_price: i.unit_price,
          quantity: i.quantity,
        })),
        p_idempotency_key: params.idempotencyKey || null,
      });

      if (error) throw new Error(error.message);

      // Fetch newly created sale with items
      const { data: saleData } = await client
        .from('sales')
        .select('*, items:sale_items(*)')
        .eq('id', data.sale_id)
        .single();

      return saleData as Sale;
    }

    // Atomic execution in Local Store
    const db = getLocalDB();

    // Idempotency check
    if (params.idempotencyKey) {
      const existing = db.sales.find(s => s.idempotency_key === params.idempotencyKey);
      if (existing) return existing;
    }

    const saleId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sale-${Date.now()}`;
    const newSale: Sale = {
      id: saleId,
      session_id: session.id,
      counter_session_id: activeCounter.id,
      table_name_snapshot: tableName,
      start_time_snapshot: session.start_time,
      end_time_snapshot: now,
      duration_minutes: billableMinutes,
      applied_rate_snapshot: params.appliedRate,
      table_charge: tableCharge,
      products_subtotal: productsSubtotal,
      total_amount: grandTotal,
      idempotency_key: params.idempotencyKey || null,
      created_at: now,
      items: params.items.map(item => ({
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `item-${Date.now()}-${Math.random()}`,
        sale_id: saleId,
        product_id: item.product_id,
        product_name_snapshot: item.name,
        unit_price_snapshot: item.unit_price,
        quantity: item.quantity,
        total_price: item.quantity * item.unit_price,
        created_at: now,
      })),
    };

    // 1. Save sale
    db.sales.push(newSale);

    // 2. Mark session completed
    const targetSession = db.sessions.find(s => s.id === session.id);
    if (targetSession) {
      targetSession.status = 'completed';
      targetSession.end_time = now;
      targetSession.applied_rate_per_minute = params.appliedRate;
      targetSession.billable_minutes = billableMinutes;
      targetSession.table_charge = tableCharge;
      targetSession.updated_at = now;
    }

    // 3. Update active counter totals: Expected cash = Opening cash + Completed cash sales
    const targetCounter = db.counterSessions.find(c => c.id === activeCounter.id);
    if (targetCounter) {
      targetCounter.total_sales_cash = Math.round(targetCounter.total_sales_cash + grandTotal);
      targetCounter.expected_cash = Math.round(targetCounter.opening_cash + targetCounter.total_sales_cash);
    }

    saveLocalDB(db);
    return newSale;
  }

  static async getSales(): Promise<Sale[]> {
    const client = getSupabaseClient();
    if (client) {
      const { data } = await client
        .from('sales')
        .select('*, items:sale_items(*)')
        .order('created_at', { ascending: false });
      return (data || []) as Sale[];
    }
    return [...getLocalDB().sales].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // --- INVENTORY ---
  static async getInventory(): Promise<InventoryProduct[]> {
    const client = getSupabaseClient();
    if (client) {
      const { data } = await client.from('inventory_products').select('*').order('name');
      return (data || []) as InventoryProduct[];
    }
    return getLocalDB().inventory;
  }

  static async saveProduct(product: Partial<InventoryProduct> & { name: string; price: number }): Promise<InventoryProduct> {
    await this.assertBackendReachable();
    if (product.price < 0 || isNaN(product.price)) {
      throw new Error('Product price cannot be negative.');
    }
    if (!product.name.trim()) {
      throw new Error('Product name cannot be empty.');
    }

    const now = new Date().toISOString();
    const client = getSupabaseClient();

    if (product.id) {
      if (client) {
        const { data, error } = await client
          .from('inventory_products')
          .update({
            name: product.name.trim(),
            price: Math.round(product.price),
            is_available: product.is_available ?? true,
            updated_at: now,
          })
          .eq('id', product.id)
          .select()
          .single();
        if (error) throw new Error(error.message);
        return data as InventoryProduct;
      }
      const db = getLocalDB();
      const idx = db.inventory.findIndex(i => i.id === product.id);
      if (idx !== -1) {
        db.inventory[idx].name = product.name.trim();
        db.inventory[idx].price = Math.round(product.price);
        db.inventory[idx].is_available = product.is_available ?? db.inventory[idx].is_available;
        db.inventory[idx].updated_at = now;
        saveLocalDB(db);
        return db.inventory[idx];
      }
    }

    const newProd: InventoryProduct = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `inv-${Date.now()}`,
      name: product.name.trim(),
      price: Math.round(product.price),
      is_available: true,
      created_at: now,
      updated_at: now,
    };

    if (client) {
      const { data, error } = await client.from('inventory_products').insert(newProd).select().single();
      if (error) throw new Error(error.message);
      return data as InventoryProduct;
    }

    const db = getLocalDB();
    db.inventory.push(newProd);
    saveLocalDB(db);
    return newProd;
  }

  static async deleteProduct(productId: string): Promise<void> {
    await this.assertBackendReachable();
    const client = getSupabaseClient();
    const now = new Date().toISOString();

    if (client) {
      const { count } = await client
        .from('sale_items')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', productId);

      if (count && count > 0) {
        // Deactivate so historical sale receipts remain intact
        const { error } = await client
          .from('inventory_products')
          .update({ is_available: false, updated_at: now })
          .eq('id', productId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await client.from('inventory_products').delete().eq('id', productId);
        if (error) throw new Error(error.message);
      }
      return;
    }

    const db = getLocalDB();
    db.inventory = db.inventory.filter(p => p.id !== productId);
    saveLocalDB(db);
  }

  // --- EXPENSES ---
  // Rule: Expenses must NEVER reduce sales revenue or expected counter cash
  static async getExpenses(): Promise<Expense[]> {
    const client = getSupabaseClient();
    if (client) {
      const { data } = await client.from('expenses').select('*').order('created_at', { ascending: false });
      return (data || []) as Expense[];
    }
    return [...getLocalDB().expenses].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  static async addExpense(expense: { title: string; amount: number; category?: string; notes?: string }): Promise<Expense> {
    await this.assertBackendReachable();
    if (expense.amount <= 0 || isNaN(expense.amount)) {
      throw new Error('Expense amount must be greater than 0 PKR.');
    }
    if (!expense.title.trim()) {
      throw new Error('Expense title cannot be empty.');
    }

    const activeCounter = await this.getActiveCounter();
    const now = new Date().toISOString();
    const newExp: Expense = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `exp-${Date.now()}`,
      counter_session_id: activeCounter ? activeCounter.id : null,
      title: expense.title.trim(),
      amount: Math.round(expense.amount),
      category: expense.category?.trim() || 'General',
      notes: expense.notes?.trim() || null,
      created_at: now,
    };

    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client.from('expenses').insert(newExp).select().single();
      if (error) throw new Error(error.message);
      return data as Expense;
    }

    const db = getLocalDB();
    db.expenses.push(newExp);
    saveLocalDB(db);
    return newExp;
  }
}
