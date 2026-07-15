// Centralized runtime config, sourced from Vite env (.env). Falls back to the
// known public project so the app still boots if env is missing in a preview.
export const SB_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://tifnqeujvdhhwpvhvycn.supabase.co'

export const SB_ANON =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpZm5xZXVqdmRoaHdwdmh2eWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNzUyOTQsImV4cCI6MjA5OTY1MTI5NH0.ByYeltZeU05hQl_OpprugwZrX4RNuy_X51WFs8iCO-Q'

export const BUCKET = import.meta.env.VITE_SUPABASE_BUCKET || 'closet-photos'

export const DEFAULT_LAT = Number(import.meta.env.VITE_DEFAULT_LAT || 32.78)
export const DEFAULT_LON = Number(import.meta.env.VITE_DEFAULT_LON || -96.8)
