

## Plan: Add OCR Auto-Fill After ID Front Upload

### What This Does
After the user uploads the front of their National ID in Step 2, the system will automatically extract text (name, date of birth, sex, etc.) from the image using AI-powered OCR via Lovable AI. The extracted data pre-fills the form fields, so users only need to verify/correct instead of typing everything manually.

### How It Works

```text
User uploads ID front image
        │
        ▼
  Image sent to Edge Function (OCR)
        │
        ▼
  Lovable AI (Gemini Flash) analyzes image
        │
        ▼
  Extracted fields returned as JSON
        │
        ▼
  Form auto-populated, user reviews & confirms
```

### Changes

**1. New Edge Function: `supabase/functions/ocr-id/index.ts`**
- Accepts a base64-encoded image of the ID front
- Sends it to Lovable AI Gateway (Gemini 2.5 Flash — good multimodal + fast) with a prompt asking it to extract Philippine National ID fields: last name, first name, middle name, date of birth, sex, blood type, marital status, place of birth
- Uses tool calling to return structured JSON output
- Returns the extracted fields to the client

**2. Update `src/pages/Verification.tsx`**
- After the front ID file is selected (before or after upload), convert it to base64 and call the `ocr-id` edge function
- Show a "Scanning ID..." loading indicator on the form section
- Pre-fill `formData` state with the OCR results
- Fields remain editable so the user can correct any mistakes
- Add a small "Auto-filled by OCR" badge near the form to indicate the data was extracted automatically

### Technical Details
- Model: `google/gemini-2.5-flash` (fast, good multimodal, cost-effective for OCR)
- The OCR runs client-side-triggered after `handleDocumentUpload` succeeds for the front image
- No new database tables or migrations needed — data flows into the existing `formData` state and eventually into the `verifications` table via `handleSaveDetails`
- Audit trail entry added: `ocr_extraction_completed`

### Files Modified
- `supabase/functions/ocr-id/index.ts` (new)
- `src/pages/Verification.tsx` (add OCR call after front ID upload, loading state, auto-fill logic)

