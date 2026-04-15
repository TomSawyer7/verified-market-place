

# Plan: Update Supabase Client to Your Project

## What I Will Do

Update **one file** — `src/integrations/supabase/client.ts` — to point to your Supabase project:

- **URL**: `https://weyhlexnjgxfmrywpyup.supabase.co`
- **Anon Key**: the key you provided (starting with `eyJ...g1SJ`)

## File Change

```typescript
// src/integrations/supabase/client.ts
const supabaseUrl = 'https://weyhlexnjgxfmrywpyup.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxb3B4anBnbHRrcWd2YWNoZGR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1Mjg3MDgsImV4cCI6MjA5MTEwNDcwOH0.g1SJoSKGyIBeJSjFASvyvpoFZxqxqXvWLyqlHHr61i8';
```

## Pre-requisite
Make sure you have already run the `trustmart_full_schema.sql` on this new project (`weyhlexnjgxfmrywpyup`). If not, do that first via the SQL Editor in your Supabase Dashboard.

## After This Change
The app will immediately connect to your new project. Registration, login, and all database operations will go through `weyhlexnjgxfmrywpyup`.

