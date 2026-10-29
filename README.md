# CueMaster Snooker Club Manager — Windows Desktop Application

A complete desktop management system built for Snooker and Pool clubs. Engineered with Electron, React, TypeScript, Vite, and Supabase PostgreSQL.

---

## Key Features

1. **Native Desktop Window & Layout**:
   - Designed for desktop viewports (1440×900 baseline).
   - Custom frameless Windows titlebar with minimize, maximize/restore, and close buttons.
   - Warm cream, off-white, and orange visual theme following anti-slop zero-pill discipline.
   - Real-time clock in `Asia/Karachi` timezone with 12-hour AM/PM formatting.

2. **Floor Tables & Live Arena Timers**:
   - Category management (e.g. Snooker Championship, American Pool) with default PKR/minute rates.
   - Active running timers recalculating from persisted start timestamps (never reset upon reload).
   - Instant cancellation control for accidental starts.

3. **Confirmed Billing Engine**:
   - Minute rounding: `ceil(elapsed_seconds / 60)` (1 second = 1 min, 60s = 1 min, 61s = 2 min, 130s = 3 min).
   - Per-bill editable rate with immediate charge recalculation.
   - Snack and beverage selection from inventory with quantities.
   - Atomic Cash Collection with idempotency keys preventing double-billing.

4. **Counter Register Management**:
   - Open shift with opening cash float.
   - Close shift with cash reconciliation: `Expected cash = Opening cash + Completed cash sales`.
   - Expenses are **never** subtracted from expected cash or sales revenue.
   - Blocks shift closing if active table sessions are still running.

5. **Inventory & Expenses**:
   - Product catalogue with whole PKR pricing and availability controls.
   - Operational expense logging with categories and counter association.

6. **Sales & Financial Reports**:
   - Comprehensive ledger with item snapshots, duration, applied rate, and shift filters.

---

## Technology Stack

- **Desktop Shell**: Electron (v45)
- **Renderer UI**: React 19, TypeScript, Vite, Tailwind CSS v4
- **Database & RLS**: PostgreSQL (Supabase Compatible)
- **Packaging**: Electron Builder (Windows NSIS Installer & Portable .exe)
- **Automated Testing**: Vitest

---

## Getting Started

### Development
```bash
# Start renderer development server
npm run dev
```

### Run Automated Tests
```bash
npm run test
```

### Type Checking & Linting
```bash
npm run lint
```

---

## Windows Executable Packaging (.exe)

To build the standalone Windows `.exe` installer:

```bash
# Compile both the React renderer and the Electron main process, then run electron-builder
npm run pack:win
```

### Packaging Outputs:
The packaged installer files will be located in the `release/` directory:
- `CueMaster Snooker Club Manager Setup 1.0.0.exe` (NSIS Installer with desktop shortcut)
- `CueMaster Snooker Club Manager 1.0.0.exe` (Portable executable)

---

## Database Configuration

1. Place your Supabase Project URL and Public Anon Key in the in-app **Settings** panel or `.env`:
   ```env
   VITE_SUPABASE_URL="https://your-project-id.supabase.co"
   VITE_SUPABASE_ANON_KEY="your-anon-key-here"
   ```
2. Run the migration script in Supabase SQL Editor:
   - File: `supabase/migrations/20261030000000_snooker_club_schema.sql`
   - Installs all 9 tables, indexes, RLS policies, and the atomic `collect_table_sale` RPC.
