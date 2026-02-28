import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export type House = {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  geofence_radius_m: number
  invite_code: string
  created_by: string
  created_at: string
}

export type User = {
  id: string
  email: string
  name: string
  avatar_url: string | null
  venmo_handle: string | null
  created_at: string
}

export type Membership = {
  id: string
  house_id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
}

export type Task = {
  id: string
  house_id: string
  user_id: string
  type: 'chore' | 'supply' | 'party' | 'bill'
  subtype: string | null
  description: string
  photo_url: string | null
  points: number
  status: 'pending' | 'verified' | 'rejected'
  ai_confidence: number | null
  created_at: string
}

export type Bill = {
  id: string
  house_id: string
  vendor: string
  total_amount: number
  due_date: string
  status: 'open' | 'settled'
  bill_type?: string
  created_at: string
}

export type BillSplit = {
  id: string
  bill_id: string
  user_id: string
  amount: number
  venmo_link: string
  status: 'requested' | 'paid'
  paid_at: string | null
}

export type LeaderboardEntry = {
  id: string
  house_id: string
  user_id: string
  category: 'chore_king' | 'supply_hero' | 'bill_boss' | 'party_mvp' | 'total'
  points: number
  period: 'weekly' | 'monthly'
  period_start: string
  period_end: string
}

export type PresenceEvent = {
  id: string
  user_id: string
  house_id: string
  lat: number
  lng: number
  distance_m: number
  is_at_home: boolean
  accuracy: number | null
  created_at: string
}
