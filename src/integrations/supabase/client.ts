import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://weyhlexnjgxfmrywpyup.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndleWhsZXhuamd4Zm1yeXdweXVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1Mzc1NjgsImV4cCI6MjA5MTExMzU2OH0.Lx-6R42BtARgRY1yODLuNDYdgCdniU1LTUhgN-fHQz8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
