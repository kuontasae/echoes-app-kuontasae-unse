import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// これがアプリ全体でSupabaseを使うための「心臓」になる
export const supabase = createClient(supabaseUrl, supabaseAnonKey);