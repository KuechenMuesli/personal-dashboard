import { createServerClient } from '@supabase/ssr'
import { type Handle, redirect } from '@sveltejs/kit'
import { env } from '$env/dynamic/public'

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.supabase = createServerClient(
    env.PUBLIC_SUPABASE_URL || '',
    env.PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        getAll: () => event.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            event.cookies.set(name, value, { ...options, path: '/' })
          })
        },
      },
    }
  )

  event.locals.safeGetSession = async () => {
    const { data: { session } } = await event.locals.supabase.auth.getSession()
    if (!session) return { session: null, user: null }

    const { data: { user }, error } = await event.locals.supabase.auth.getUser()
    if (error) return { session: null, user: null }

    return { session, user }
  }

  // Check auth for protected routes (everything except /login)
  const { session } = await event.locals.safeGetSession()
  if (!session && !event.url.pathname.startsWith('/login')) {
    throw redirect(303, '/login')
  }

  if (session && event.url.pathname.startsWith('/login')) {
    throw redirect(303, '/')
  }

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version'
    },
  })
}
