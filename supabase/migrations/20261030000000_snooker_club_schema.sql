-- MASTER SNOOKER & POOL CLUB MANAGEMENT SYSTEM SCHEMA
-- Database: PostgreSQL (Supabase Compatible)

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    club_name TEXT NOT NULL DEFAULT 'CueMaster Snooker Arena',
    currency_symbol TEXT NOT NULL DEFAULT 'PKR',
    timezone TEXT NOT NULL DEFAULT 'Asia/Karachi',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. COUNTER SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.counter_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    opening_cash NUMERIC(12, 2) NOT NULL CHECK (opening_cash >= 0),
    total_sales_cash NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total_sales_cash >= 0),
    expected_cash NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (expected_cash >= 0),
    status TEXT NOT NULL CHECK (status IN ('open', 'closed')),
    opened_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    closed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_counter_status ON public.counter_sessions(status);

-- 4. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    default_rate_per_minute NUMERIC(10, 2) NOT NULL CHECK (default_rate_per_minute >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. TABLES TABLE
CREATE TABLE IF NOT EXISTS public.tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_tables_category ON public.tables(category_id);

-- 6. SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
    counter_session_id UUID NOT NULL REFERENCES public.counter_sessions(id) ON DELETE RESTRICT,
    start_time TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    end_time TIMESTAMPTZ,
    status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'cancelled')),
    applied_rate_per_minute NUMERIC(10, 2) NOT NULL CHECK (applied_rate_per_minute >= 0),
    billable_minutes INTEGER CHECK (billable_minutes IS NULL OR billable_minutes >= 0),
    table_charge NUMERIC(12, 2) CHECK (table_charge IS NULL OR table_charge >= 0),
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ensure only one active session per table at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_session_per_table 
ON public.sessions (table_id) 
WHERE (status = 'active');

CREATE INDEX IF NOT EXISTS idx_sessions_counter ON public.sessions(counter_session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);

-- 7. INVENTORY PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.inventory_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. SALES TABLE
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID UNIQUE REFERENCES public.sessions(id) ON DELETE RESTRICT,
    counter_session_id UUID NOT NULL REFERENCES public.counter_sessions(id) ON DELETE RESTRICT,
    table_name_snapshot TEXT NOT NULL,
    start_time_snapshot TIMESTAMPTZ NOT NULL,
    end_time_snapshot TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 0),
    applied_rate_snapshot NUMERIC(10, 2) NOT NULL CHECK (applied_rate_snapshot >= 0),
    table_charge NUMERIC(12, 2) NOT NULL CHECK (table_charge >= 0),
    products_subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (products_subtotal >= 0),
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_sales_counter ON public.sales(counter_session_id);
CREATE INDEX IF NOT EXISTS idx_sales_created ON public.sales(created_at);

-- 9. SALE ITEMS TABLE (Product snapshots on completed sales)
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.inventory_products(id) ON DELETE SET NULL,
    product_name_snapshot TEXT NOT NULL,
    unit_price_snapshot NUMERIC(10, 2) NOT NULL CHECK (unit_price_snapshot >= 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    total_price NUMERIC(12, 2) NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON public.sale_items(sale_id);

-- 10. EXPENSES TABLE (Expenses never reduce expected cash or sales revenue)
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    counter_session_id UUID REFERENCES public.counter_sessions(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    category TEXT NOT NULL DEFAULT 'General',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_expenses_counter ON public.expenses(counter_session_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created ON public.expenses(created_at);

-- 11. ATOMIC FINANCIAL OPERATION: collect_table_sale
-- Atomically writes sale, sale_items, updates session, releases table, updates counter sales
CREATE OR REPLACE FUNCTION public.collect_table_sale(
    p_session_id UUID,
    p_applied_rate NUMERIC,
    p_items JSONB,
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
    v_counter RECORD;
    v_table RECORD;
    v_item JSONB;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_elapsed_seconds NUMERIC;
    v_billable_minutes INTEGER;
    v_table_charge NUMERIC(12, 2);
    v_products_subtotal NUMERIC(12, 2) := 0;
    v_total_amount NUMERIC(12, 2);
    v_sale_id UUID;
    v_existing_sale_id UUID;
BEGIN
    -- Idempotency check: if key already exists, return existing sale
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_existing_sale_id FROM public.sales WHERE idempotency_key = p_idempotency_key;
        IF v_existing_sale_id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'status', 'already_processed',
                'sale_id', v_existing_sale_id
            );
        END IF;
    END IF;

    -- Fetch and lock session
    SELECT * INTO v_session FROM public.sessions WHERE id = p_session_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found';
    END IF;

    IF v_session.status != 'active' THEN
        RAISE EXCEPTION 'Session is not active (current status: %)', v_session.status;
    END IF;

    -- Verify active counter
    SELECT * INTO v_counter FROM public.counter_sessions WHERE id = v_session.counter_session_id FOR UPDATE;
    IF NOT FOUND OR v_counter.status != 'open' THEN
        RAISE EXCEPTION 'Associated counter is not open';
    END IF;

    -- Verify table
    SELECT * INTO v_table FROM public.tables WHERE id = v_session.table_id;

    -- Calculate duration with confirmed CEIL rule: ceil(elapsed_seconds / 60)
    v_elapsed_seconds := EXTRACT(EPOCH FROM (v_now - v_session.start_time));
    IF v_elapsed_seconds < 0 THEN
        v_elapsed_seconds := 0;
    END IF;

    v_billable_minutes := CEIL(v_elapsed_seconds / 60.0)::INTEGER;
    IF v_billable_minutes < 1 AND v_elapsed_seconds > 0 THEN
        v_billable_minutes := 1;
    END IF;

    v_table_charge := v_billable_minutes * p_applied_rate;

    -- Calculate products subtotal from p_items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_products_subtotal := v_products_subtotal + ((v_item->>'quantity')::INTEGER * (v_item->>'unit_price')::NUMERIC);
    END LOOP;

    v_total_amount := v_table_charge + v_products_subtotal;

    -- Insert sale record with immutable historical snapshots
    INSERT INTO public.sales (
        session_id,
        counter_session_id,
        table_name_snapshot,
        start_time_snapshot,
        end_time_snapshot,
        duration_minutes,
        applied_rate_snapshot,
        table_charge,
        products_subtotal,
        total_amount,
        idempotency_key,
        created_at
    ) VALUES (
        v_session.id,
        v_counter.id,
        v_table.name,
        v_session.start_time,
        v_now,
        v_billable_minutes,
        p_applied_rate,
        v_table_charge,
        v_products_subtotal,
        v_total_amount,
        p_idempotency_key,
        v_now
    ) RETURNING id INTO v_sale_id;

    -- Insert sale item records
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO public.sale_items (
            sale_id,
            product_id,
            product_name_snapshot,
            unit_price_snapshot,
            quantity,
            total_price,
            created_at
        ) VALUES (
            v_sale_id,
            (v_item->>'product_id')::UUID,
            (v_item->>'name')::TEXT,
            (v_item->>'unit_price')::NUMERIC,
            (v_item->>'quantity')::INTEGER,
            ((v_item->>'quantity')::INTEGER * (v_item->>'unit_price')::NUMERIC),
            v_now
        );
    END LOOP;

    -- Mark session completed and record final billing values
    UPDATE public.sessions
    SET status = 'completed',
        end_time = v_now,
        applied_rate_per_minute = p_applied_rate,
        billable_minutes = v_billable_minutes,
        table_charge = v_table_charge,
        updated_at = v_now
    WHERE id = v_session.id;

    -- Update counter total sales and expected cash: expected = opening + completed sales
    UPDATE public.counter_sessions
    SET total_sales_cash = total_sales_cash + v_total_amount,
        expected_cash = opening_cash + total_sales_cash + v_total_amount
    WHERE id = v_counter.id;

    RETURN jsonb_build_object(
        'status', 'success',
        'sale_id', v_sale_id,
        'table_name', v_table.name,
        'billable_minutes', v_billable_minutes,
        'table_charge', v_table_charge,
        'products_subtotal', v_products_subtotal,
        'total_amount', v_total_amount,
        'completed_at', v_now
    );
END;
$$;

-- 12. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counter_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Anonymous/authenticated operational access policies
CREATE POLICY "Allow public read access to settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Allow public update to settings" ON public.settings FOR UPDATE USING (true);

CREATE POLICY "Allow read access to counter_sessions" ON public.counter_sessions FOR SELECT USING (true);
CREATE POLICY "Allow insert to counter_sessions" ON public.counter_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update to counter_sessions" ON public.counter_sessions FOR UPDATE USING (true);

CREATE POLICY "Allow read access to categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Allow insert/update/delete categories" ON public.categories FOR ALL USING (true);

CREATE POLICY "Allow read access to tables" ON public.tables FOR SELECT USING (true);
CREATE POLICY "Allow insert/update/delete tables" ON public.tables FOR ALL USING (true);

CREATE POLICY "Allow read access to sessions" ON public.sessions FOR SELECT USING (true);
CREATE POLICY "Allow insert/update to sessions" ON public.sessions FOR ALL USING (true);

CREATE POLICY "Allow read access to inventory" ON public.inventory_products FOR SELECT USING (true);
CREATE POLICY "Allow all to inventory" ON public.inventory_products FOR ALL USING (true);

CREATE POLICY "Allow read access to sales" ON public.sales FOR SELECT USING (true);
CREATE POLICY "Allow read access to sale_items" ON public.sale_items FOR SELECT USING (true);

CREATE POLICY "Allow read access to expenses" ON public.expenses FOR SELECT USING (true);
CREATE POLICY "Allow insert to expenses" ON public.expenses FOR INSERT WITH CHECK (true);
