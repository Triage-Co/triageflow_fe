# TriageFlow Frontend — Folder Structure

> **Architecture**: Module-based structure for Next.js 16 App Router
> **Last updated**: 2026-06-03

---

## Overview

The project follows a **module-based architecture** that cleanly separates routing (`/app`) from business logic (`/modules`), with shared cross-cutting concerns in `/shared`.

### Design Principles

1. **`/app` is for routing only** — Pages are thin wrappers that import and compose components from `/modules`.
2. **`/modules` owns domain logic** — Each module encapsulates its components, hooks, services, types, and state.
3. **`/shared` is for cross-module code** — Reusable UI components, hooks, utilities, and global stores live here.
4. **No barrel file imports** — Import directly from source files to avoid bundle bloat (per Vercel best practices).
5. **Colocation over convention** — Module-specific code stays inside the module, not scattered across global folders.

---

## Full Directory Tree

```
triageflow_fe/
│
├── app/                              # ─── NEXT.JS APP ROUTER (ROUTING ONLY) ───
│   ├── layout.tsx                    # Root layout: fonts, providers, metadata
│   ├── page.tsx                      # Landing / redirect logic
│   ├── globals.css                   # Global styles & CSS custom properties
│   ├── not-found.tsx                 # Custom 404 page
│   ├── loading.tsx                   # Root loading UI
│   │
│   ├── (auth)/                       # ── Auth route group ──
│   │   ├── layout.tsx                # Auth layout (centered card, no sidebar)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   │
│   ├── (patient)/                    # ── Patient-facing routes ──
│   │   ├── layout.tsx                # Patient layout (bottom nav, mobile-first)
│   │   ├── checkin/
│   │   │   └── page.tsx              # UC-01: Auto check-in via CCCD/VNeID
│   │   ├── triage/
│   │   │   └── page.tsx              # UC-02: Body map & symptom input
│   │   ├── queue/
│   │   │   └── page.tsx              # Queue status & real-time tracking
│   │   ├── payment/
│   │   │   └── page.tsx              # UC-04: Dynamic QR payment
│   │   ├── navigation/
│   │   │   └── page.tsx              # UC-05: Multi-floor wayfinding
│   │   └── results/
│   │       └── page.tsx              # View lab results & prescriptions
│   │
│   ├── (staff)/                      # ── Staff route group ──
│   │   ├── layout.tsx                # Staff layout (sidebar + topbar)
│   │   ├── reception/
│   │   │   ├── page.tsx              # UC-06: Manual check-in dashboard
│   │   │   └── [patientId]/
│   │   │       └── page.tsx          # Patient detail / BHYT verification
│   │   ├── cashier/
│   │   │   ├── page.tsx              # UC-08: Cash payment & Master QR print
│   │   │   └── [transactionId]/
│   │   │       └── page.tsx          # UC-09: Refund processing
│   │   ├── doctor/
│   │   │   ├── page.tsx              # UC-11: Priority queue management
│   │   │   └── [visitId]/
│   │   │       └── page.tsx          # UC-12/13: Clinical summary & orders
│   │   ├── lab/
│   │   │   └── page.tsx              # UC-14: Lab service completion
│   │   └── pharmacy/
│   │       └── page.tsx              # UC-16: QR medication dispensing
│   │
│   └── (admin)/                      # ── Admin route group ──
│       ├── layout.tsx                # Admin layout (full sidebar + monitoring)
│       ├── dashboard/
│       │   └── page.tsx              # UC-17: Real-time heatmap
│       ├── override/
│       │   └── page.tsx              # UC-18: Manual routing override
│       └── settings/
│           └── page.tsx              # System configuration & AI weights
│
├── modules/                          # ─── FEATURE MODULES (BUSINESS LOGIC) ───
│   │
│   ├── auth/                         # ── Authentication & Authorization ──
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── RoleSelector.tsx
│   │   ├── hooks/
│   │   │   └── useLogin.ts
│   │   ├── services/
│   │   │   └── authService.ts        # Login, register, token refresh
│   │   ├── types/
│   │   │   └── auth.types.ts         # LoginDTO, RegisterDTO, Session
│   │   └── store/
│   │       └── authStore.ts          # Auth Zustand store (persisted)
│   │
│   ├── patient/                      # ── Patient Registration & Profile ──
│   │   ├── components/
│   │   │   ├── CheckinScanner.tsx    # CCCD/VNeID QR scanner
│   │   │   ├── PatientProfile.tsx
│   │   │   └── InsuranceForm.tsx     # BHYT input & validation
│   │   ├── hooks/
│   │   │   └── useCheckin.ts
│   │   ├── services/
│   │   │   └── patientService.ts     # Mock-HIS sync, patient CRUD
│   │   ├── types/
│   │   │   └── patient.types.ts
│   │   └── store/
│   │       └── patientStore.ts
│   │
│   ├── triage/                       # ── AI Triage & Symptom Collection ──
│   │   ├── components/
│   │   │   ├── BodyMap.tsx           # Interactive body diagram
│   │   │   ├── SymptomForm.tsx       # Symptom text input
│   │   │   └── TriageResult.tsx      # Specialty assignment display
│   │   ├── hooks/
│   │   │   └── useTriage.ts
│   │   ├── services/
│   │   │   └── triageService.ts      # LLM Engine API integration
│   │   ├── types/
│   │   │   └── triage.types.ts
│   │   └── store/
│   │       └── triageStore.ts
│   │
│   ├── queue/                        # ── Queue Management ──
│   │   ├── components/
│   │   │   ├── QueueBoard.tsx        # Real-time queue display
│   │   │   ├── QueueTicket.tsx       # Patient ticket card
│   │   │   └── PriorityBadge.tsx     # Emergency/Urgent/Routine badge
│   │   ├── hooks/
│   │   │   ├── useQueue.ts
│   │   │   └── useQueueWebSocket.ts  # Real-time queue updates
│   │   ├── services/
│   │   │   └── queueService.ts
│   │   ├── types/
│   │   │   └── queue.types.ts        # QueueItem, Priority enum
│   │   └── store/
│   │       └── queueStore.ts
│   │
│   ├── payment/                      # ── Payment & Billing ──
│   │   ├── components/
│   │   │   ├── QRPayment.tsx         # Dynamic QR code display
│   │   │   ├── InvoiceDetail.tsx     # All-or-nothing invoice
│   │   │   └── PaymentHistory.tsx
│   │   ├── hooks/
│   │   │   └── usePayment.ts
│   │   ├── services/
│   │   │   └── paymentService.ts     # Payment Gateway integration
│   │   ├── types/
│   │   │   └── payment.types.ts      # Invoice, PaymentStatus, BHYT copay
│   │   └── store/
│   │       └── paymentStore.ts
│   │
│   ├── navigation/                   # ── Indoor Wayfinding ──
│   │   ├── components/
│   │   │   ├── FloorMap.tsx          # Multi-floor map renderer
│   │   │   ├── RouteOverlay.tsx      # Path visualization
│   │   │   └── QRCheckpoint.tsx      # QR-based location check-in
│   │   ├── hooks/
│   │   │   └── useWayfinding.ts
│   │   ├── services/
│   │   │   └── navigationService.ts  # Pathfinding, Map_Node data
│   │   ├── types/
│   │   │   └── navigation.types.ts
│   │   └── store/
│   │       └── navigationStore.ts
│   │
│   ├── clinical/                     # ── Doctor Workflow ──
│   │   ├── components/
│   │   │   ├── DoctorDashboard.tsx   # Patient queue + clinical summary
│   │   │   ├── ClinicalOrders.tsx    # Order CLS services
│   │   │   ├── BodyMapViewer.tsx     # Read-only body map display
│   │   │   └── FollowUpForm.tsx
│   │   ├── hooks/
│   │   │   └── useClinical.ts
│   │   ├── services/
│   │   │   └── clinicalService.ts    # Orders CRUD, visit management
│   │   ├── types/
│   │   │   └── clinical.types.ts
│   │   └── store/
│   │       └── clinicalStore.ts
│   │
│   ├── ancillary/                    # ── Pharmacy Workflow ──
│   │   ├── components/
│   │   │   ├── PharmacyQueue.tsx     # Pharmacy dispensing queue
│   │   │   └── MedicationDispense.tsx # QR-verified dispensing
│   │   ├── hooks/
│   │   │   └── usePharmacy.ts
│   │   ├── services/
│   │   │   └── pharmacyService.ts
│   │   ├── types/
│   │   │   └── ancillary.types.ts
│   │   └── store/
│   │       └── ancillaryStore.ts
│   │
│   ├── lab/                          # ── Lab Workflow ──
│   │   ├── components/
│   │   │   ├── LabWorklist.tsx       # Lab technician worklist
│   │   │   └── ResultUpload.tsx      # Upload lab results
│   │   ├── hooks/
│   │   │   └── useLab.ts
│   │   ├── services/
│   │   │   └── labService.ts
│   │   └── store/
│   │       └── labStore.ts
│   │
│   │
│   ├── reception/                    # ── Receptionist Workflow ──
│   │   ├── components/
│   │   │   ├── ManualCheckin.tsx     # Manual patient registration
│   │   │   ├── BHYTVerification.tsx  # Insurance verification
│   │   │   └── TicketRecovery.tsx    # Reprint Master QR (UC-10)
│   │   ├── hooks/
│   │   │   └── useReception.ts
│   │   ├── services/
│   │   │   └── receptionService.ts
│   │   ├── types/
│   │   │   └── reception.types.ts
│   │   └── store/
│   │       └── receptionStore.ts
│   │
│   ├── cashier/                      # ── Cashier Workflow ──
│   │   ├── components/
│   │   │   ├── CashPayment.tsx      # Cash collection & receipt
│   │   │   ├── MasterQRPrint.tsx    # Print Master QR ticket
│   │   │   └── RefundProcessor.tsx  # Refund with CCCD verification
│   │   ├── hooks/
│   │   │   └── useCashier.ts
│   │   ├── services/
│   │   │   └── cashierService.ts
│   │   ├── types/
│   │   │   └── cashier.types.ts
│   │   └── store/
│   │       └── cashierStore.ts
│   │
│   └── admin/                        # ── Admin Monitoring & Config ──
│       ├── components/
│       │   ├── Heatmap.tsx           # Real-time operational heatmap
│       │   ├── QueueOverride.tsx     # Manual queue routing
│       │   └── AIConfig.tsx          # Triage weight configuration
│       ├── hooks/
│       │   └── useAdmin.ts
│       ├── services/
│       │   └── adminService.ts       # Monitoring, HIS sync
│       ├── types/
│       │   └── admin.types.ts
│       └── store/
│           └── adminStore.ts
│
├── shared/                           # ─── CROSS-MODULE SHARED CODE ───
│   │
│   ├── components/                   # ── Reusable UI Components ──
│   │   ├── ui/                       # shadcn/ui primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Dialog.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── ...                   # Other shadcn components
│   │   ├── layout/                   # Layout building blocks
│   │   │   ├── AppShell.tsx          # Main app shell wrapper
│   │   │   ├── Sidebar.tsx           # Staff/Admin sidebar navigation
│   │   │   ├── TopBar.tsx            # Header with user info & notifications
│   │   │   ├── BottomNav.tsx         # Patient mobile bottom navigation
│   │   │   └── PageHeader.tsx        # Page title + breadcrumbs
│   │   └── feedback/                 # Feedback & status components
│   │       ├── Toast.tsx             # Notification toasts
│   │       ├── Modal.tsx             # Confirmation dialogs
│   │       ├── Skeleton.tsx          # Loading skeletons
│   │       ├── LoadingSpinner.tsx
│   │       └── EmptyState.tsx        # Empty data placeholders
│   │
│   ├── hooks/                        # ── Shared Custom Hooks ──
│   │   ├── useWebSocket.ts           # WebSocket connection manager
│   │   ├── useAuth.ts                # Auth state accessor hook
│   │   ├── useNotification.ts        # Push notification handler
│   │   ├── useMediaQuery.ts          # Responsive breakpoint hook
│   │   └── useDebounce.ts            # Input debounce hook
│   │
│   ├── services/                     # ── Shared Services & API Client ──
│   │   ├── apiClient.ts              # Fetch/Axios wrapper with interceptors
│   │   ├── websocket.ts              # WebSocket client singleton
│   │   └── storage.ts                # localStorage/sessionStorage wrapper
│   │
│   ├── types/                        # ── Shared TypeScript Types ──
│   │   ├── api.types.ts              # ApiResponse<T>, PaginatedResponse, etc.
│   │   ├── auth.types.ts             # User, Role, Session interfaces
│   │   └── common.types.ts           # Shared enums, constants, utility types
│   │
│   ├── utils/                        # ── Pure Utility Functions ──
│   │   ├── formatters.ts             # Date, currency, Vietnamese formatting
│   │   ├── validators.ts             # CCCD, BHYT, phone validation
│   │   └── cn.ts                     # Tailwind class name merger (clsx + twMerge)
│   │
│   ├── constants/                    # ── App-Wide Constants ──
│   │   ├── roles.ts                  # Role enum & permissions map
│   │   ├── routes.ts                 # Type-safe route paths
│   │   └── config.ts                 # API base URL, feature flags
│   │
│   ├── guards/                       # ── Route Protection ──
│   │   ├── AuthGuard.tsx             # Redirect unauthenticated users
│   │   └── RoleGuard.tsx             # Role-based access control wrapper
│   │
│   ├── providers/                    # ── React Context Providers ──
│   │   ├── AuthProvider.tsx          # Auth context + token management
│   │   ├── WebSocketProvider.tsx     # WebSocket connection provider
│   │   └── ThemeProvider.tsx         # Light/Dark theme provider
│   │
│   └── store/                        # ── Global Zustand Stores ──
│       ├── index.ts                  # Re-export all global stores
│       ├── types.ts                  # Global store type definitions
│       ├── authStore.ts              # Authentication state (persisted)
│       └── uiStore.ts                # UI state: sidebar, theme, notifications
│
├── public/                           # ── Static Assets ──
│   ├── icons/
│   ├── images/
│   └── maps/                         # Floor plan SVGs/images
│
├── docs/                             # ── Documentation ──
│   ├── Structure.md                  # This file
│   ├── API.md                        # Backend API integration guide
│   └── SRS/
│       └── SRS.md                    # Software Requirements Specification
│
├── scripts/                          # ── CI/CD & Build Scripts ──
│   ├── ci.bat
│   └── ci.sh
│
└── ... (config files: tsconfig.json, next.config.ts, package.json, etc.)
```

---

## Architecture Rules

### 1. Page Components (in `/app`) Must Be Thin

Pages should only:
- Import components from the corresponding module
- Handle route params / searchParams
- Apply layout-level Suspense boundaries

```tsx
// ✅ CORRECT — app/(staff)/doctor/page.tsx
import { Suspense } from 'react';
import { DoctorDashboard } from '@/modules/clinical/components/DoctorDashboard';
import { QueueBoardSkeleton } from '@/shared/components/feedback/Skeleton';

export default function DoctorPage() {
  return (
    <Suspense fallback={<QueueBoardSkeleton />}>
      <DoctorDashboard />
    </Suspense>
  );
}

// ❌ WRONG — business logic directly in page
export default function DoctorPage() {
  const queue = await fetchQueue(); // NO! This belongs in module
  return <div>{queue.map(...)}</div>;
}
```

### 2. Module Boundaries

- Modules **MAY** import from `shared/`
- Modules **MAY NOT** import from other modules directly
- If two modules need to share logic, extract it to `shared/`
- Cross-module communication happens via:
  - Global Zustand stores (`shared/store/`)
  - WebSocket events
  - URL routing

### 3. Store Organization

| Store Location | Scope | Example |
|----------------|-------|---------|
| `shared/store/` | Global, cross-module state | Auth, UI, notifications |
| `modules/*/store/` | Module-internal state | Queue items, clinical orders |

### 4. Import Path Conventions

Use the `@/` alias consistently:

```tsx
// From shared
import { Button } from '@/shared/components/ui/Button';
import { useAuth } from '@/shared/hooks/useAuth';
import { apiClient } from '@/shared/services/apiClient';

// From modules
import { BodyMap } from '@/modules/triage/components/BodyMap';
import { useTriageStore } from '@/modules/triage/store/triageStore';

// ❌ AVOID barrel imports
import { Button, Input, Card } from '@/shared/components/ui';
```

### 5. Role-Based Route Access

| Route Group | Allowed Roles |
|-------------|---------------|
| `(auth)/` | Public (unauthenticated) |
| `(patient)/` | PATIENT |
| `(staff)/reception/` | RECEPTIONIST |
| `(staff)/cashier/` | CASHIER |
| `(staff)/doctor/` | DOCTOR, NURSE |
| `(staff)/lab/` | LAB_STAFF |
| `(staff)/pharmacy/` | PHARMACY_STAFF |
| `(admin)/` | ADMIN |

---

## Module → Route Mapping

| Module | Route(s) | Use Cases |
|--------|----------|-----------|
| `auth` | `(auth)/login`, `(auth)/register` | Login, Registration |
| `patient` | `(patient)/checkin` | UC-01: Auto check-in |
| `triage` | `(patient)/triage` | UC-02: Interactive triage |
| `queue` | `(patient)/queue`, `(staff)/doctor` | Queue tracking, Priority queue |
| `payment` | `(patient)/payment`, `(staff)/cashier` | UC-04, UC-08: Payments |
| `navigation` | `(patient)/navigation` | UC-05: Wayfinding |
| `clinical` | `(staff)/doctor/[visitId]` | UC-11/12/13: Clinical workflow |
| `ancillary` | `(staff)/pharmacy` | UC-16: Pharmacy |
| `lab` | `(staff)/lab` | UC-14: Lab service completion |
| `reception` | `(staff)/reception` | UC-06/07/10: Reception workflow |
| `cashier` | `(staff)/cashier` | UC-08/09: Cash & Refund |
| `admin` | `(admin)/*` | UC-17/18: Monitoring & Config |

---

## Related Documentation

| Document | Description |
|----------|-------------|
| [API.md](./API.md) | Backend endpoints, request/response schemas, auth flows, clinical mapping |
| [SRS/SRS.md](./SRS/SRS.md) | Software Requirements Specification |

---

## Vercel / Next.js Best Practices Applied

- **No barrel file imports** — Direct imports to avoid bundle bloat
- **Suspense boundaries** — Streaming SSR for data-heavy pages
- **Dynamic imports** — `next/dynamic` for heavy components (BodyMap, Heatmap, FloorMap)
- **Server Components by default** — Client components only when interactive
- **Route groups** — `(auth)`, `(patient)`, `(staff)`, `(admin)` for layout isolation
- **Promise.all()** — Parallel data fetching in server components
- **Role-based guards** — AuthGuard + RoleGuard pattern at layout level
