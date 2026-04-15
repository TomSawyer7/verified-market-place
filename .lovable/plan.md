

# Plan: Generate Complete TrustMart SQL Setup Script

## Summary
Generate a single SQL file containing the entire database schema — all 14 tables, enums, functions, triggers, RLS policies, and storage buckets — for you to run in your Supabase SQL Editor.

## What I Will Create

A downloadable file `/mnt/documents/trustmart_full_schema.sql` containing:

1. **Enums**: `app_role` (admin, user), `user_status` (pending, verified, rejected)
2. **14 Tables**: profiles, user_roles, verifications, products, conversations, messages, reviews, notifications, reported_listings, admin_logs, audit_trail, security_events, login_attempts, session_logs
3. **Functions**: `has_role()`, `handle_new_user()`, `update_updated_at_column()`
4. **Trigger**: `on_auth_user_created` on `auth.users`
5. **30+ RLS Policies**: Exact copies of all current policies
6. **Storage Buckets**: `verification-docs` (private), `product-images` (public)

## What You Do After
1. Open your Supabase Dashboard at `https://supabase.com/dashboard/project/pqopxjpgltkqgvachddz`
2. Go to **SQL Editor**
3. Paste the entire SQL file contents and click **Run**
4. Go to **Storage** and create two buckets manually:
   - `verification-docs` (private)
   - `product-images` (public)

No app code changes needed — `client.ts` already points to your project.

