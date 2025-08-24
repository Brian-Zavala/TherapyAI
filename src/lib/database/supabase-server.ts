import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      detectSessionInUrl: false,
      autoRefreshToken: false,
      storage: {
        getItem: async (key) => {
          const cookie = cookieStore.get(key)
          return cookie?.value || null
        },
        setItem: async (key, value) => {
          // Server-side doesn't set cookies in this context
        },
        removeItem: async (key) => {
          // Server-side doesn't remove cookies in this context
        }
      }
    }
  })
}