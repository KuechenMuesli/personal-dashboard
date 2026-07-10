import { redirect } from '@sveltejs/kit';

export const actions = {
  logout: async ({ locals: { supabase } }) => {
    await supabase.auth.signOut();
    throw redirect(303, '/');
  }
};
