

## Plan: Fix Admin Dashboard Verification Flow

### Problem
Two issues are preventing the admin dashboard from working:

1. **Runtime error**: `useAuth` is called twice in `AdminDashboard.tsx` (line 81 and line 94), which is redundant but more critically, on hot reload it can cause the "useAuth must be used within AuthProvider" crash.

2. **Filtering logic is too strict** — no submitted verifications appear in the dashboard:
   - **Step 1 filter** requires both `screenshot_url` AND `qr_code_url`, but actual users only submitted screenshots (no QR code). Result: 0 shown.
   - **Final Reviews filter** requires `philsys_status === 'verified'` AND `selfie_url`, but no users reached that state yet. Result: 0 shown.

   Current database reality:
   - 2 users submitted screenshots only (no QR code) — invisible to admin
   - 1 user submitted screenshot + ID photo — invisible to admin
   - All stuck in limbo because admin can't see or approve them

### Changes

**File: `src/pages/AdminDashboard.tsx`**
- Remove duplicate `useAuth()` call (line 94). Extract `loading` from the single call on line 81.
- Fix Step 1 filter: show verifications where `screenshot_url` exists AND `philsys_status === 'pending'` (don't require `qr_code_url`).
- Fix Final Reviews filter: show verifications where `id_front_url` AND `id_last_name` exist AND `biometric_status === 'pending'` (don't require `selfie_url` — admin should see partial submissions too).
- Add an "All Submissions" view so admins can see every verification record regardless of stage, preventing users from falling through the cracks.

**File: `src/pages/Verification.tsx`** — No changes needed. The user-facing flow is fine; only the admin-side filtering is broken.

### Outcome
- Admin dashboard loads without errors
- All user verification submissions become visible to the admin
- Admin can approve Step 1 (screenshot) submissions, unblocking users to proceed to Step 2

