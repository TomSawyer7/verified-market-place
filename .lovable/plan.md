

# Plan: Fix Password Reset Flow

## Problem
The `ResetPassword` component registers its own `onAuthStateChange` listener, but the `AuthProvider` (which wraps the entire app) processes the `PASSWORD_RECOVERY` event first — before ResetPassword even mounts. So the component never sees the event and shows "Invalid or expired reset link."

## Fix

**File: `src/pages/ResetPassword.tsx`**

Replace the `useEffect` logic with a more robust approach:

1. Check URL hash for `type=recovery` on mount (already there but may not match Supabase's format)
2. Check if there's already an active session (the auth event already processed by AuthProvider)
3. Keep the `onAuthStateChange` listener as a fallback
4. Also check URL search params, since Supabase PKCE flow may use query params instead of hash

```typescript
useEffect(() => {
  // 1. Check hash params
  const hash = window.location.hash;
  if (hash.includes('type=recovery')) {
    setIsRecovery(true);
    return;
  }

  // 2. Check if session already exists (event already fired)
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      setIsRecovery(true);
    }
  });

  // 3. Listen for future events
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      setIsRecovery(true);
    }
  });

  return () => subscription.unsubscribe();
}, []);
```

This ensures that even if the recovery event fires before the component mounts, we detect the active session and allow the password update.

## Testing
After the fix, I will navigate to the reset password flow in the browser to verify the form renders correctly.

