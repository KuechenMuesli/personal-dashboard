import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
  const { session } = await safeGetSession();
  
  let msConnected = false;
  if (session) {
    const { data } = await supabase
      .from('user_secrets')
      .select('secrets')
      .eq('user_id', session.user.id)
      .maybeSingle();
      
    const msData = data?.secrets?.microsoft_todo;
    if (msData && msData.refresh_token) msConnected = true;
  }

  // Return the user if logged in, otherwise null. Local users can access settings too.
  return {
    user: session?.user || null,
    msConnected
  };
};

export const actions: Actions = {
  updatePassword: async ({ request, locals: { supabase, safeGetSession } }) => {
    const { session } = await safeGetSession();
    if (!session) return { passwordError: 'Not logged in' };

    const formData = await request.formData();
    const oldPassword = formData.get('oldPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    
    if (!oldPassword || !newPassword || newPassword.length < 6) {
      return { passwordError: 'Invalid password. New password must be at least 6 characters long.' };
    }

    // Verify old password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: session.user.email!,
      password: oldPassword
    });

    if (signInError) {
      return { passwordError: 'Das alte Passwort ist falsch.' };
    }

    // Update password
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    
    if (error) {
      return { passwordError: error.message };
    }
    
    return { passwordSuccess: 'Passwort erfolgreich geändert.' };
  },

  updateEmail: async ({ request, locals: { supabase, safeGetSession }, url }) => {
    const { session } = await safeGetSession();
    if (!session) return { emailError: 'Not logged in' };

    const formData = await request.formData();
    const password = formData.get('password') as string;
    const newEmail = formData.get('email') as string;
    
    if (!password || !newEmail) {
      return { emailError: 'Bitte E-Mail und Passwort eingeben.' };
    }

    // Verify password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: session.user.email!,
      password: password
    });

    if (signInError) {
      return { emailError: 'Das Passwort ist falsch.' };
    }

    const { error } = await supabase.auth.updateUser({ email: newEmail }, {
      emailRedirectTo: `${url.origin}/auth/callback?next=/settings`
    });
    
    if (error) {
      return { emailError: error.message };
    }
    
    return { emailSuccess: 'Bestätigungslinks wurden an die alte und neue E-Mail versendet.' };
  },

  deleteAccount: async ({ request, locals: { supabase, safeGetSession } }) => {
    const { session } = await safeGetSession();
    if (!session) return { deleteError: 'Not logged in' };

    const formData = await request.formData();
    const password = formData.get('password') as string;

    if (!password) {
      return { deleteError: 'Bitte Passwort eingeben.' };
    }

    // Verify password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: session.user.email!,
      password: password
    });

    if (signInError) {
      return { deleteError: 'Das Passwort ist falsch.' };
    }

    // User is verified. We delete their layout data to ensure data removal.
    // NOTE: Without a SERVICE_ROLE_KEY or an RPC, we cannot delete the user identity via supabase-js from the client context.
    // For now, we delete all associated layouts & widgets, then call an RPC if it existed, and sign out.
    await supabase.from('layouts').delete().eq('user_id', session.user.id);
    await supabase.from('user_secrets').delete().eq('user_id', session.user.id);

    // Call rpc to delete user if it exists on the backend
    const { error: rpcError } = await supabase.rpc('delete_user');

    if (rpcError) {
      console.error('Failed to delete user account via RPC:', rpcError);
      return { deleteError: 'Der Account konnte nicht gelöscht werden. Bitte stelle sicher, dass die delete_user RPC Funktion in Supabase existiert.' };
    }

    await supabase.auth.signOut();
    throw redirect(303, '/');
  }
};
