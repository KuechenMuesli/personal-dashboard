import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async ({ url, locals: { supabase, safeGetSession } }) => {
    const code = url.searchParams.get('code');
    const { session } = await safeGetSession();
    
    if (!session || !code) {
        throw redirect(302, '/');
    }

    const redirectUri = `${url.origin}/auth/microsoft/callback`;
    const clientId = env.MS_CLIENT_ID;
    const clientSecret = env.MS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('MS_CLIENT_ID or MS_CLIENT_SECRET is missing in .env');
    }
    
    const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
    });

    const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
    });

    const tokenData = await res.json();
    
    if (tokenData.refresh_token) {
        const secretsToUpsert = [
            { user_id: session.user.id, service: 'microsoft_todo', secret_key: 'refresh_token', secret_value: tokenData.refresh_token },
            { user_id: session.user.id, service: 'microsoft_todo', secret_key: 'access_token', secret_value: tokenData.access_token },
            { user_id: session.user.id, service: 'microsoft_todo', secret_key: 'expires_at', secret_value: (Date.now() + (tokenData.expires_in * 1000)).toString() }
        ];

        const { error: dbError } = await supabase
            .from('user_secrets')
            .upsert(secretsToUpsert, { onConflict: 'user_id, service, secret_key' });
            
        if (dbError) {
            throw redirect(302, '/?msAuthError=' + encodeURIComponent('DB Error: ' + dbError.message));
        }
    } else {
        console.error('Failed to get MS token:', tokenData);
        throw redirect(302, '/?msAuthError=' + encodeURIComponent('Token Error: ' + JSON.stringify(tokenData)));
    }

    throw redirect(302, '/');
};
