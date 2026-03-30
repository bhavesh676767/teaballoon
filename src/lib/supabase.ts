import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Secret = {
  id: string
  display_name: string
  created_at: string
  message: string
  votes: number
  buoyancy: number
  word_count: number
  total_read_time: number
  impressions: number
  scroll_max: number
  last_engagement: string
  is_active: boolean
  has_email: boolean
  mood?: string
}
