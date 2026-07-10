import { createClient } from '@supabase/supabase-js'
import { env } from '$env/dynamic/public'

// Wir nutzen dynamische Public-Variablen, falls wir das Projekt später auf Cloudflare Pages hosten
// Für lokales Development greift SvelteKit automatisch auf die .env Datei zu.
const supabaseUrl = env.PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = env.PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
