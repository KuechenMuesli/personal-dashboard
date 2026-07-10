export const load = async ({ locals: { safeGetSession, supabase }, cookies }) => {
  const { session } = await safeGetSession();
  
  let secrets = {};
  if (session) {
      const { data } = await supabase
          .from('user_secrets')
          .select('secrets')
          .eq('user_id', session.user.id)
          .maybeSingle();
      if (data?.secrets) secrets = data.secrets;
  }

  return {
    session,
    secrets,
    cookies: cookies.getAll(),
  }
}
