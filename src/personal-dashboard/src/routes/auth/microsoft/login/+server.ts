import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async ({ url }) => {
    const clientId = env.MS_CLIENT_ID;
    if (!clientId) {
        throw new Error('MS_CLIENT_ID is not configured in .env');
    }

    const redirectUri = `${url.origin}/auth/microsoft/callback`;
    const scopes = 'offline_access Tasks.Read Tasks.ReadWrite';

    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&response_mode=query&scope=${encodeURIComponent(scopes)}`;
    
    throw redirect(302, authUrl);
};
