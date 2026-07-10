import { fail, redirect } from '@sveltejs/kit';

export const actions = {
  login: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
      return fail(400, { error: 'Please enter both email and password.' });
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return fail(400, { error: error.message });
    }

    throw redirect(303, '/');
  },
  
  signup: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
      return fail(400, { error: 'Please enter both email and password.' });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return fail(400, { error: error.message });
    }

    if (!data.session) {
      return fail(400, { message: 'Account created! Please check your email to verify your account.' });
    }

    throw redirect(303, '/');
  }
};
