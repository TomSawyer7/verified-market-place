

## Plan: Fix Authentication & Registration Flow

### Problem Summary
Five issues: stuck loading states, database trigger warnings, RLS blocking profile creation, email confirmation UX, and WebSocket errors.

### Analysis of Current State
- `handle_new_user()` already has `SET search_path TO 'public'` — no change needed there.
- The `profiles` table has **no INSERT RLS policy**, but the trigger is `SECURITY DEFINER` which bypasses RLS. However, the trigger may be failing silently if the function owner lacks proper privileges. We should add an INSERT policy as a safety net.
- `Register.tsx` has try/catch but `setLoading(false)` is called in multiple branches instead of a `finally` block.
- The "Check your email" screen already exists in Register.tsx — just needs minor cleanup.
- `client.ts` is auto-managed and should NOT be edited manually. The current file points to a different Supabase URL than the Lovable Cloud project — this is the root cause of many issues.

### Changes

**1. Database Migration — Add INSERT policy on `profiles` table**
```sql
CREATE POLICY "Allow trigger and auth to insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);
```
This ensures that even if the trigger context changes, profile creation works.

**2. `src/pages/Register.tsx` — Add `finally` block**
- Wrap the `handleSubmit` logic so `setLoading(false)` is in a `finally` block, guaranteeing it runs even on unexpected errors.
- Clean up the Filipino comments to English.

**3. `src/pages/Login.tsx` — Add `finally` block**
- Same pattern: move `setLoading(false)` into a `finally` block so the button never gets stuck.

**4. `src/contexts/AuthContext.tsx` — Clean up**
- Remove Filipino comments.
- No structural changes needed — the singleton pattern is already correct.

**5. `src/App.tsx` — Remove debug connection check**
- Remove the `useEffect` that queries a `test` table on mount (causes unnecessary errors and console noise).
- Remove the Filipino console log messages.

### Files Modified
- `src/pages/Register.tsx` (finally block, English cleanup)
- `src/pages/Login.tsx` (finally block)
- `src/contexts/AuthContext.tsx` (comment cleanup)
- `src/App.tsx` (remove debug useEffect)
- Database migration (INSERT policy on profiles)

### Note on `client.ts`
The `client.ts` file is auto-managed and cannot be edited. It currently points to `pqopxjpgltkqgvachddz.supabase.co` instead of the Lovable Cloud project (`suwtdhtaypfaqjuzofdx.supabase.co`). This mismatch is likely causing WebSocket and connection errors. The file should auto-update to the correct Lovable Cloud credentials — if it doesn't, this is the root cause of most issues.

