
The user wants Google OAuth, email OTP via Gmail SMTP, and forgot-password tokens — all "connected to Supabase". This stack is React + Vite + Lovable Cloud (Supabase), no Node/Express backend. So I must translate Node-style requirements (Nodemailer, /auth/* routes, utils/mailer.js) into the actual stack: Supabase Auth + Edge Functions.

Key reframing for the user:
- **Google OAuth**: Lovable Cloud has managed Google OAuth — no Client ID/Secret needed in code. But user supplied their own credentials, so we'll wire BYOK Google in the Cloud auth settings (not in `.env` — Vite `.env` is public-bundled and unsafe for secrets).
- **Email OTP**: Supabase Auth already supports email OTP natively. No Nodemailer needed. If they truly want Gmail SMTP branding, configure Supabase SMTP with Gmail app password (stored as Supabase secret, not Vite `.env`).
- **Forgot password**: Already implemented (`ForgotPassword.tsx`, `ResetPassword.tsx`) using Supabase's secure token system (10-min expiry built-in). Just verify it works.
- **Express-style routes** (`/auth/register`, `utils/mailer.js`): Not applicable — replaced by Supabase Auth client + edge functions where needed.
- **Runtime error**: `useAuth must be used within AuthProvider` — likely a stale HMR issue, will verify AuthProvider wraps App.

Plan (concise):

## Plan: Google OAuth + Email OTP + Password Reset

### 1. Google OAuth (BYOK)
- Switch `Register.tsx` and `Login.tsx` to support "Continue with Google" button using `supabase.auth.signInWithOAuth({ provider: 'google' })`.
- User configures their Client ID/Secret in **Cloud → Auth Settings → Google provider** (secure server-side storage, not `.env`). I'll show the button to open that panel.
- **Why not `.env`**: Vite bundles `VITE_*` vars into the public JS — secrets would leak. Supabase stores them server-side.

### 2. Email OTP on Signup
- Replace current "magic link confirmation" signup with **6-digit email OTP** flow:
  - `Register.tsx`: call `supabase.auth.signUp()` then redirect to new `/verify-otp` page.
  - New `VerifyOtp.tsx` page: 6-digit input, calls `supabase.auth.verifyOtp({ email, token, type: 'signup' })`.
  - 5-min expiry is Supabase default.
- Optionally configure **custom SMTP (Gmail)** in Cloud → Auth Settings → SMTP, using `EMAIL_USER` + Gmail App Password as Supabase secrets. I'll prompt the user via the Cloud panel button — no code changes needed for SMTP itself.

### 3. Forgot Password
- Already built: `ForgotPassword.tsx` → `supabase.auth.resetPasswordForEmail()` → email link → `ResetPassword.tsx` → `supabase.auth.updateUser({ password })`.
- Verify the route is wired in `App.tsx`. If missing, add it.

### 4. Fix runtime error
- `useAuth must be used within AuthProvider` — verify `<AuthProvider>` wraps `<App>` in `main.tsx` / `App.tsx`. Fix if broken.

### 5. Files touched
- `src/pages/Register.tsx` — add Google button, redirect to OTP after signup
- `src/pages/Login.tsx` — add Google button
- `src/pages/VerifyOtp.tsx` — **new**, 6-digit OTP entry
- `src/App.tsx` — add `/verify-otp` route, ensure `/reset-password` route exists
- Verify `AuthProvider` wrapping

### What I will NOT do (and why)
- ❌ Add `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`EMAIL_PASS` to `.env` — Vite exposes these to the browser. They go in **Cloud Auth Settings** (server-side).
- ❌ Build Node Express routes (`/auth/register`, `utils/mailer.js`) — this is a Vite SPA with Supabase, not a Node backend. The equivalent is Supabase Auth client calls + edge functions.
- ❌ Use Nodemailer — Supabase handles SMTP delivery once Gmail SMTP is configured in the dashboard.

### Outcome
- Working "Continue with Google" on Login + Register
- 6-digit email OTP required before account activation
- Existing password reset flow verified
- AuthProvider error gone
- All secrets stored securely server-side in Cloud (never in client `.env`)

### After approval
I'll need you to click two buttons to configure server-side secrets (Google credentials + Gmail App Password). I'll provide them after the code is in place.
