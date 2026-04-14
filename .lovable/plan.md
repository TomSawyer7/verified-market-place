

## Plan: Redesign Verification Flow to 4-Step Process

### Overview
Restructure the verification page from the current 3-phase flow to a new 4-step process matching the user's specification, with Filipino/English bilingual instructions throughout.

### New Flow (4 Steps)

**Step 1: PhilSys eVerify Portal Screenshot**
- Instructions in Filipino guiding users to https://everify.gov.ph/check
- Integrate the existing `PhilSysScreenshotVerifier` component (currently unused in main flow)
- Upload screenshot of "Verified" result as proof of ID legitimacy
- Save screenshot to `verification-docs` storage and update `screenshot_url` in verifications table

**Step 2: ID Upload (Front & Back)**
- Upload high-res images of National ID front and back (existing functionality)
- After upload, display extracted/entered data fields: Full Name, Birthdate, Address, ID Number
- "Retry / Try Again" button if details don't match
- Note: Since we don't have ID Analyzer API integrated, this step combines upload + manual data entry (name, DOB, sex, blood type, marital status, place of birth) as before, but presented as "verify the details match your ID"

**Step 3: Face Recognition (Liveness Check)**
- Filipino instructions explaining the facial scan purpose
- "Start Face Verification" button triggers existing BiometricProvider liveness check
- Success shows "✅ Biometric Identity Confirmed"

**Step 4: Review & Confirm (Final Summary)**
- Summary table showing all collected data: PhilSys screenshot preview, full name, DOB, ID number, liveness status
- "Paalala" warning text about confirming accuracy
- Two buttons: "Back/Edit" and "Confirm & Submit"
- Only on "Confirm & Submit" does the data get submitted for admin review

### Technical Details

**Files to edit:**
- `src/pages/Verification.tsx` — Complete rewrite of the flow:
  - Change `PHASES` from 3 to 4 steps
  - Step 1: Add `PhilSysScreenshotVerifier` component import and usage
  - Step 2: Keep existing ID upload + data entry form, reorder
  - Step 3: Keep existing liveness check logic
  - Step 4: New review summary card with all data displayed in a table, Back/Edit + Confirm & Submit buttons
  - Update `getPhase()` logic to account for 4 steps (screenshot → ID docs + details → liveness → review)
  - Add `screenshot_url` to the verification data type and fetch query

**Database:** Add `screenshot_url` column already exists in verifications table — no migration needed.

**No new files needed** — `PhilSysScreenshotVerifier` component already exists.

