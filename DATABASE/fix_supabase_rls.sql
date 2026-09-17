-- ============================================================================
-- iREPRO SUPABASE SECURITY & ROW LEVEL SECURITY (RLS) FIX
-- Project: iREPRO (leshuihnieeehmhyxkvz)
-- 
-- INSTRUCTIONS:
-- 1. Copy all contents of this SQL script.
-- 2. Open Supabase Dashboard SQL Editor: https://supabase.com/dashboard/project/leshuihnieeehmhyxkvz/sql/new
-- 3. Paste and click 'Run'.
-- ============================================================================

-- Step 1: Enable Row-Level Security (RLS) on all database tables
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.deleted_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Step 2: Remove any existing permissive anonymous policies if present
DROP POLICY IF EXISTS "Allow anon read users" ON public.users;
DROP POLICY IF EXISTS "Allow anon write users" ON public.users;
DROP POLICY IF EXISTS "Allow anon read applications" ON public.applications;
DROP POLICY IF EXISTS "Allow anon write applications" ON public.applications;
DROP POLICY IF EXISTS "Allow anon read feedback" ON public.feedback;
DROP POLICY IF EXISTS "Allow anon write feedback" ON public.feedback;
DROP POLICY IF EXISTS "Allow anon read audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow anon write audit_logs" ON public.audit_logs;

-- Step 3: (Optional/Informational)
-- Server-side operations in iREPRO (server.ts) use SUPABASE_SERVICE_ROLE_KEY,
-- which automatically bypasses RLS policies in Supabase SQL engine.
-- Enforcing RLS without anon policies blocks direct unauthenticated REST access
-- to your database via public project URL, resolving the Critical Security Advisory.
