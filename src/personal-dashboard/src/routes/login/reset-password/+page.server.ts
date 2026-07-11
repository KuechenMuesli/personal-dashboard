import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request, locals: { supabase }, url }) => {
    const formData = await request.formData();
    const email = formData.get('email') as string;
    if (!email) {
      return { error: 'Email is required' };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${url.origin}/auth/callback?next=/settings`,
    });

    if (error) {
      return { error: error.message };
    }

    return { success: true, message: 'Check your email for the reset link!' };
  }
};
