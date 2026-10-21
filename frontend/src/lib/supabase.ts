import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sscjavqdyydxmrjltvgs.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzY2phdnFkeXlkeG1yamx0dmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1MjE5MTAsImV4cCI6MjEwODA5NzkxMH0.q14RkuQHiH-nxbsfVGUyzarWQI2kQE7MNwIrcrWEqgA';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return supabaseInstance;
}

export const supabase = getSupabase();

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey && !supabaseAnonKey.includes('your-anon-key'));
}

/**
 * Direct Supabase helpers for real-time data & fallback queries
 */
export async function getJobsFromSupabase(limit = 20, offset = 0) {
  try {
    const client = getSupabase();
    const { data, error, count } = await client
      .from('jobs')
      .select('*', { count: 'exact' })
      .order('discovered_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.warn('Supabase jobs query error:', error.message);
      return null;
    }
    return { items: data || [], total: count || 0 };
  } catch (err) {
    console.warn('Supabase query error:', err);
    return null;
  }
}
