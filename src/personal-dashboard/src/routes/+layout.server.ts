export const load = async ({ locals: { safeGetSession, supabase }, cookies }) => {
  const { session } = await safeGetSession();
  
  return {
    session,
    secrets: {},
    cookies: cookies.getAll(),
  }
}
