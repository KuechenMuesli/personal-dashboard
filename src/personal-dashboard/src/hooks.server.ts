import { createServerClient } from '@supabase/ssr'
import { type Handle, redirect } from '@sveltejs/kit'
import { env } from '$env/dynamic/public'
import ws from 'ws'

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.supabase = createServerClient(
    env.PUBLIC_SUPABASE_URL || '',
    env.PUBLIC_SUPABASE_ANON_KEY || '',
    {
      realtime: {
        transport: ws
      },
      cookies: {
        getAll: () => event.cookies.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              event.cookies.set(name, value, { ...options, path: '/' })
            })
          } catch (error) {
            // Supabase occasionally refreshes tokens asynchronously. SvelteKit throws if we try 
            // to set cookies after the response headers have already been sent. This is harmless 
            // and Supabase will just handle the session refresh on the client-side instead.
          }
        },
      },
    }
  )

  event.locals.safeGetSession = async () => {
    // For pure optimistic UI speed, we only read the session from cookies.
    // We skip the network request to getUser() here to save ~200ms on initial load.
    // Secure API routes can still manually call supabase.auth.getUser() if needed.
    const { data: { session } } = await event.locals.supabase.auth.getSession()
    if (!session) return { session: null, user: null }

    return { session, user: session.user }
  }

  // Optimistic UI: Wir blockieren den initialen Render nicht mehr.
  // Die Session wird nur noch lazy in den Layouts geladen, wenn sie gebraucht wird.
  
  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version'
    },
  })
}
