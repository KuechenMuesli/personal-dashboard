import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr'
import { env } from '$env/dynamic/public'
import type { LayoutLoad } from './$types'

export const load: LayoutLoad = async ({ fetch, data, depends }) => {
  depends('supabase:auth')

  const supabase = isBrowser()
    ? createBrowserClient(
        env.PUBLIC_SUPABASE_URL || '',
        env.PUBLIC_SUPABASE_ANON_KEY || '',
        {
          global: { fetch },
        }
      )
    : createServerClient(
        env.PUBLIC_SUPABASE_URL || '',
        env.PUBLIC_SUPABASE_ANON_KEY || '',
        {
          global: { fetch },
          cookies: {
            getAll() {
              return data.cookies
            },
            setAll() {
              // Server-side +layout.ts cannot set cookies directly
            }
          },
        }
      )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  return { supabase, session }
}
