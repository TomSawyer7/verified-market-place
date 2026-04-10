

## Plan: Finalize, Polish, and Prepare for FaceTec Integration

### Context
The TrustMart.ph marketplace is a cybersecurity-focused capstone project with a 3-phase identity verification system, admin dashboard, messaging, and marketplace. The user wants to:
1. Prepare the architecture for **FaceTec 3D/2D face and ID matching** integration (replacing the current face-api.js approach)
2. Polish all existing features end-to-end
3. Generate a **final technology report**

### Important Note on FaceTec
FaceTec requires a **commercial SDK license** and a **Device SDK Key** from facetec.com. The current face-api.js implementation will be refactored into an abstraction layer so FaceTec can be plugged in when the SDK license is obtained. We will create the integration scaffold and placeholder, but the actual FaceTec SDK cannot run without their proprietary license key.

---

### Step 1: Create FaceTec Integration Scaffold

Create `src/lib/facetec.ts` as an abstraction layer:
- Define a `BiometricProvider` interface with methods: `initializeSDK()`, `performLivenessCheck()`, `performFaceMatch(idPhoto, selfie)`, `performIDScan()`
- Implement a `FaceApiProvider` (current face-api.js logic) as default
- Add a `FaceTecProvider` stub that logs instructions for when the SDK license is obtained
- Export a factory function that selects the active provider

Update `src/pages/Verification.tsx` Phase 3:
- Refactor liveness check to use the `BiometricProvider` interface instead of inline face-api.js code
- Keep face-api.js as the active provider (works without license)

### Step 2: Polish Authentication Flow

**Login page**: Fix edge cases - ensure "Remember Me" properly persists email, improve error messages for locked accounts vs wrong password vs unverified email

**Register page**: Ensure password validation checklist is fully real-time, confirm password field validates on every keystroke, success state shows clear "Check your email" message

**Forgot/Reset Password**: Verify reset flow works end-to-end, ensure token expiry messaging is clear

### Step 3: Polish Verification Flow

- Add loading skeletons during verification data fetch
- Show admin rejection reason prominently with a "Re-submit" option
- Improve Phase 2 form with proper validation (required fields, date picker format)
- Add progress persistence - if user refreshes mid-flow, resume at correct phase

### Step 4: Polish Admin Dashboard

- Fix the verification review to properly display uploaded ID images from storage (signed URLs)
- Ensure approve/reject actions send notifications to users
- Add confirmation dialogs before approve/reject actions
- Polish security events and login attempts tables with pagination

### Step 5: Polish Marketplace and Product Pages

- Ensure VerificationGate blocks all protected routes (messages, create-listing, product actions)
- Fix product image display from storage
- Polish seller reviews display and rating submission

### Step 6: Polish Navbar and Responsive Design

- Add mobile hamburger menu for the navbar (currently no mobile support)
- Ensure all pages are responsive on mobile viewports

### Step 7: Generate Final Technology Report

Create a comprehensive PDF report at `/mnt/documents/TrustMart_Final_Report.pdf` covering:

**Frontend Stack:**
- React 18.3 + TypeScript 5.8
- Vite 5.4 (build tool)
- Tailwind CSS 3.4 + shadcn/ui (component library)
- React Router DOM 6.30 (routing)
- TanStack React Query 5.83 (server state)
- React Hook Form 7.61 + Zod 3.25 (form validation)
- Framer Motion 12.36 (animations)
- face-api.js 0.22.2 (biometric liveness detection, face matching)
- html5-qrcode 2.3 (QR scanning)
- Recharts 2.15 (data visualization)
- Lucide React (iconography)

**Backend Stack:**
- Supabase (PostgreSQL + Auth + Storage + Edge Functions + Realtime)
- Row-Level Security (RLS) on all tables
- Deno-based Edge Functions (setup-admin, verify-captcha)
- JWT authentication with secure session management

**Security Features:**
- PhilSys National ID verification (3-phase)
- Biometric liveness detection (face-api.js, FaceTec-ready)
- Password strength enforcement (8+ chars, complexity rules)
- HIBP breach detection
- Brute force protection (rate limiting, 5-attempt lockout)
- Input sanitization (XSS prevention)
- RLS data isolation
- Security event audit trail
- Session monitoring and logging
- Email verification required

**Testing:**
- Vitest (unit testing)
- Playwright (E2E testing)

---

### Technical Details

**Files to create:**
- `src/lib/facetec.ts` - BiometricProvider abstraction
- Final report script (temporary, generates PDF)

**Files to edit:**
- `src/pages/Verification.tsx` - Refactor to use BiometricProvider, add polish
- `src/pages/Login.tsx` - Edge case fixes
- `src/pages/Register.tsx` - Real-time validation polish
- `src/pages/AdminDashboard.tsx` - Signed URLs for images, notification on approve/reject
- `src/components/Navbar.tsx` - Mobile responsive menu
- `src/pages/Marketplace.tsx` - Polish product cards
- `src/pages/ProductDetail.tsx` - Polish reviews section
- `src/pages/Profile.tsx` - Add more profile details

**No database changes needed** - the schema is complete.

