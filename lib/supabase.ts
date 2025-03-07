import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create a single instance of Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Export a function to get the same instance
export const getSupabase = () => supabase; 