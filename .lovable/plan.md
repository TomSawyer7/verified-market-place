
Goal: make registration reliably send a real email verification OTP and make the current UI match the actual backend behavior.

What I found
- The frontend is already built for a 6-digit signup OTP flow:
  - `Register.tsx` signs up then redirects to `/verify-otp`
  - `VerifyOtp.tsx` calls `supabase.auth.verifyOtp({ email, token, type: 'signup' })`
  - `AuthContext.tsx` calls `supabase.auth.signUp(...)` without `emailRedirectTo`
- Routing is correct and `AuthProvider` is wrapped correctly, so the current issue is not the page flow.
- The likely problem is backend auth email behavior: the auth system is still using the default confirmation email / magic-link style, so the app expects a 6-digit code while the backend email being sent does not match that flow. That mismatch is why users don’t get the OTP experience the UI promises.

Plan
1. Audit the auth signup behavior against the backend email settings
- Confirm whether email/password signup is currently configured to require confirmation.
- Confirm whether signup emails are default auth emails or custom auth email templates.
- Check if the project email setup is incomplete or still using the default link-based template.

2. Fix the mismatch between UI and auth email delivery
- If the backend supports OTP-style signup confirmation, keep the current `/verify-otp` page and align the email template so it sends/displays the code users must enter.
- If the backend is still link-based, change one of these two things so they match:
  - preferred: configure auth emails to support the OTP-style confirmation flow
  - fallback: temporarily switch the UI back to link-based confirmation until OTP email delivery is correctly configured

3. Configure auth email delivery properly
- If custom auth email templates are required, scaffold the managed auth email templates and deploy the required auth email hook.
- Apply the project’s existing branding/tone to the signup and recovery email templates.
- Verify that the signup email uses the OTP/token content instead of only a confirmation URL.

4. Handle platform prerequisites
- If custom auth emails need a sender domain, I’ll surface that as a required backend setup step.
- Since email domain setup requires workspace admin/owner permissions, if the workspace is missing that access I’ll identify it immediately as the blocker instead of wasting more attempts.

5. Harden the frontend flow
- Improve signup error handling so the app distinguishes:
  - email delivery/setup issue
  - account already exists
  - confirmation required
  - invalid/expired OTP
- Improve `VerifyOtp` so resend, expired-code handling, and recovery path are clearer.
- Make sure login messaging does not mislead users if signup confirmation is still pending.

6. End-to-end verification after implementation
- Test registration with a fresh email.
- Confirm an actual email arrives.
- Confirm the email contains the expected OTP flow content.
- Confirm the entered 6-digit code verifies successfully and the user can then sign in.
- Re-test forgot-password so that recovery emails still work after the auth email changes.

Files likely involved
- `src/contexts/AuthContext.tsx`
- `src/pages/Register.tsx`
- `src/pages/VerifyOtp.tsx`
- `src/pages/Login.tsx`
- `supabase/functions/auth-email-hook/*` if auth email templates are scaffolded
- `supabase/functions/_shared/email-templates/*` if custom auth emails are needed
- `supabase/config.toml` only if scaffolded auth email hook requires config

Technical details
- Current code is not the main failure point; the app logic already assumes an OTP verification flow.
- The real problem is an auth/email configuration mismatch: frontend expects `verifyOtp(type: 'signup')`, but the outgoing signup email behavior appears to still be link-based or not properly set up.
- In implementation mode I will verify the backend email setup first, then either:
  - finish the managed auth email template setup so signup sends the correct OTP-style email, or
  - realign the frontend to the actual auth delivery mode if OTP cannot be enabled without required admin/domain setup.
- I will not use insecure workarounds like disabling verification unless you explicitly want that as a fallback.

Expected outcome
- New users receive a real verification email that matches the on-screen flow.
- The signup flow stops misleading users about a “6-digit code” unless that code is actually what is sent.
- Registration, resend, verification, and login all behave consistently end-to-end.
