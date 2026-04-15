
Goal: gumawa ng gumaganang bagong admin account, pero aayusin muna ang root cause kung bakit hindi lumalabas ang existing admin role.

What I found
- May `admin` role na sa current backend si `simanthomasalexandre07@gmail.com`.
- Pero ang app client ay naka-hardcode sa ibang backend/project kaysa sa current project config.
- Wala ring actual `setup-admin` backend function sa repo kahit ginagamit ito ng Admin Dashboard.
- Resulta: kahit gumawa o mag-promote tayo ng admin sa current backend, hindi iyon nababasa nang tama ng app. Kaya kung gagawa agad ng bagong admin account ngayon, malamang same issue pa rin.

Implementation plan
1. Align the app to the correct backend
- Ayusin ang backend connection para pare-pareho ang auth, database, at backend functions na ginagamit ng app.
- Ito ang pinaka-root fix; without this, any “new admin account” will still fail in the UI.

2. Fix admin access timing in the frontend
- Update auth/admin route logic so `/admin` does not redirect habang hindi pa tapos mag-load ang session at roles.
- Ensure admin state is re-checked after sign-in and when opening the admin page.

3. Add a real admin provisioning backend function
- Gumawa ng secure backend function for admin-only use.
- Function behavior:
  - create a new user if the email does not exist yet
  - ensure `profiles`, `user_roles`, and `verifications` rows exist
  - assign the `admin` role safely
  - return clear success/error states
- If signup provisioning is incomplete, I’ll also restore the missing new-user trigger so future accounts get the required records automatically.

4. Update the Admin Dashboard to use the real function
- Replace the current hardcoded function URL call with the supported backend function invocation pattern.
- Add/adjust the admin creation form so a fresh admin can be created reliably from the dashboard.

5. Create and verify a brand-new admin account end-to-end
- Create the new admin account with a fresh email.
- Confirm the account can sign in.
- Verify the Admin button appears and `/admin` opens successfully.
- Test the full flow end-to-end, since you specifically asked that this be tested.

Technical details
```text
Current state:
App auth/db client  -> Old backend
Admin role changes  -> Current backend
Admin function call -> Current backend project id
Result              -> split state / broken admin detection

Target state:
App auth/db/functions -> Same backend
Admin creation        -> Real backend function
Admin UI              -> waits for auth/role loading
Result                -> new admin account works consistently
```

Files likely involved
- `src/contexts/AuthContext.tsx`
- `src/pages/AdminDashboard.tsx`
- `src/integrations/supabase/client.ts` or the project’s backend connection regeneration path
- `supabase/functions/setup-admin/index.ts` (new)
- possibly a migration only if the new-user trigger truly needs to be restored

Expected outcome
- Hindi na masasayang ang oras sa paulit-ulit na pag-promote ng maling account/backend.
- Magkakaroon tayo ng bagong admin account na tunay na nakakapasok sa Admin Dashboard.
