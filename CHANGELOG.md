# Changelog — CueMaster Snooker Club Manager

All notable changes to this project are documented in this file.

## [1.1.0] - 2026-10-30

### Changed
- **Replaced Left Sidebar with Top Navbar**:
  - Removed deprecated left sidebar completely (`src/components/Navigation.tsx`).
  - Implemented `TopNavbar.tsx` featuring compact club branding on the left, all 7 navigation links centered horizontally, and a single cloud connectivity status icon with tooltip on the right.
  - Expanded the main content layout to use the full horizontal desktop width naturally.

### Fixed
- **Accidental Session Cancellation Bug**:
  - Identified root cause: `window.confirm(...)` was blocked/silenced inside the iframe sandbox, preventing the cancel action from ever firing.
  - Resolved by creating `ConfirmModal.tsx`, an in-app confirmation modal.
  - Added cancellation controls in `DashboardView.tsx`, `TablesView.tsx`, and `BillingCartModal.tsx`.
  - Confirmed session timer stops immediately, table status returns to Available, and zero charges or sales are recorded.
- **Counter Closing Bug**:
  - Identified root cause: `window.confirm(...)` was aborting the closing flow silently before `ClubService.closeCounter` could execute.
  - Resolved with an in-app closing reconciliation modal in `CounterView.tsx` showing opening cash, cash sales, and expected cash (`Opening + Sales`), while preserving the rule that expenses are never deducted.
  - Validated that closing is safely blocked if active table sessions are running, with active tables listed in the notification.

### Added
- **Safe Delete Options**:
  - Added discreet delete action for categories in `TablesView.tsx` with dependency checking (blocks deletion if any tables are assigned).
  - Added discreet delete action for tables in `TablesView.tsx` with dependency checking (blocks deletion if active session exists; safely deactivates if historical sessions exist to protect sales history).
  - Added discreet delete action for inventory products in `InventoryView.tsx` (removes from active catalogue without breaking historical sale items).
- **Subtle Card Hover Effects**:
  - Added `.desktop-card-hover` in `src/index.css` providing a smooth 2px elevation lift, soft shadow, and border tone shift.
  - Applied to all dashboard KPI cards, table cards, cart items, and inventory cards.
  - Fully respects `prefers-reduced-motion`.

## [1.0.0] - 2026-10-30

### Added
- Native Electron desktop architecture (`electron/main.ts`, `electron/preload.ts`, IPC handlers).
- Desktop layout with warm cream and orange palette, zero-pill discipline, tabular numbers.
- PostgreSQL schema migration with RLS and atomic `collect_table_sale` RPC.
- Minute rounding: `ceil(elapsed_seconds / 60)`.
- Cash Collection with idempotency keys and receipt printing.
- Counter opening and expected cash formula.
- Sales & Reports with Asia/Karachi 12-hour AM/PM formatting.
- Automated Vitest test suite.
