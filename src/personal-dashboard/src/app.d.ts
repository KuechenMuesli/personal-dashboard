import { SupabaseClient, Session } from '@supabase/supabase-js'

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient
      safeGetSession: () => Promise<{ session: Session | null; user: any | null }>
      session: Session | null
      user: any | null
    }
    interface PageData {
      session: Session | null
    }
    // interface Error {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
