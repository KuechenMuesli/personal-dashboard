import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals: { safeGetSession } }) => {
  const { session } = await safeGetSession();
  if (!session) {
    throw redirect(303, '/login');
  }
  return {
    user: session.user
  };
};

export const actions: Actions = {
  updatePassword: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData();
    const newPassword = formData.get('password') as string;
    
    if (!newPassword || newPassword.length < 6) {
      return { passwordError: 'Password must be at least 6 characters long.' };
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    
    if (error) {
      return { passwordError: error.message };
    }
    
    return { passwordSuccess: 'Password updated successfully.' };
  },

  updateEmail: async ({ request, locals: { supabase }, url }) => {
    const formData = await request.formData();
    const newEmail = formData.get('email') as string;
    
    if (!newEmail) {
      return { emailError: 'Email is required.' };
    }

    const { error } = await supabase.auth.updateUser({ email: newEmail }, {
      emailRedirectTo: `${url.origin}/auth/callback?next=/settings`
    });
    
    if (error) {
      return { emailError: error.message };
    }
    
    return { emailSuccess: 'Please check both your old and new email to confirm the change.' };
  }
};
