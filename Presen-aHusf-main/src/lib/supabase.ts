import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabaseConfigurado =
  Boolean(supabaseUrl && supabaseKey)

export const supabase = createClient(
  supabaseUrl || 'http://127.0.0.1:54321',
  supabaseKey || 'local-development-anon-key'
)