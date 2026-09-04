import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://leshuihnieeehmhyxkvz.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxlc2h1aWhuaWVlZWhtaHl4a3Z6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzgyNTkzOSwiZXhwIjoyMTAzNDAxOTM5fQ.oXARsks1k2FzON4b2Pl87v6zD66Cs7mPl_g7WDL_zN8';

export const supabaseClient = createClient(supabaseUrl, supabaseKey);
