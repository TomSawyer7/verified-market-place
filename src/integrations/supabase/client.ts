import { createClient } from '@supabase/supabase-js';

<<<<<<< HEAD
// Sinaksak ko na dito direkta para tapos na ang usapan.
const supabaseUrl = 'https://pqopxjpgltkqgvachddz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxb3B4anBnbHRrcWd2YWNoZGR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1Mjg3MDgsImV4cCI6MjA5MTEwNDcwOH0.g1SJoSKGyIBeJSjFASvyvpoFZxqxqXvWLyqlHHr61i8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
=======
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
>>>>>>> e2adefbebe2b8cce350d7dbeccbd44d973e181ff
