import { createClient } from '@supabase/supabase-js'

// Create a Supabase client for use in the browser
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
    autoRefreshToken: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  }
})

// Helper to create a client with custom options
export function createSupabaseClient(options?: any) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    ...options,
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
      autoRefreshToken: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      ...options?.auth
    }
  })
}