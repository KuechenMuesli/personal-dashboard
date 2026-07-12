import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

async function refreshMsToken(refreshToken: string, supabase: any, userId: string, currentSecrets: any) {
    const clientId = env.MS_CLIENT_ID;
    const clientSecret = env.MS_CLIENT_SECRET;

    if (!clientId || !clientSecret) throw new Error('Missing MS OAuth env vars');

    const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
    });

    const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
    });

    const data = await res.json();
    if (!data.access_token) throw new Error('Failed to refresh token');

    const msData = {
        refresh_token: data.refresh_token || refreshToken,
        access_token: data.access_token,
        expires_at: Date.now() + (data.expires_in * 1000)
    };

    currentSecrets['microsoft_todo'] = msData;
    await supabase.from('user_secrets').upsert({ user_id: userId, secrets: currentSecrets });

    return msData.access_token;
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const OPTIONS: RequestHandler = async () => {
    return new Response(null, { headers: corsHeaders });
};

export const GET: RequestHandler = async ({ locals: { supabase, safeGetSession } }) => {
    try {
        const { session } = await safeGetSession();
        if (!session) return json({ not_authenticated: true }, { headers: corsHeaders });

        const { data: dbData } = await supabase
            .from('user_secrets')
            .select('secrets')
            .eq('user_id', session.user.id)
            .maybeSingle();

        const currentSecrets = dbData?.secrets || {};
        const msTokenData = currentSecrets['microsoft_todo'];

        if (!msTokenData || !msTokenData.refresh_token) {
            return json({ not_authenticated: true }, { headers: corsHeaders });
        }

        let accessToken = msTokenData.access_token;
        
        if (Date.now() > msTokenData.expires_at - 300000) {
            try {
                accessToken = await refreshMsToken(msTokenData.refresh_token, supabase, session.user.id, currentSecrets);
            } catch (e) {
                console.error('Failed to refresh MS token', e);
                return json({ not_authenticated: true }, { headers: corsHeaders });
            }
        }

        try {
            // First get all calendars
            const calsRes = await fetch('https://graph.microsoft.com/v1.0/me/calendars', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            
            if (!calsRes.ok) {
                // If 403 Forbidden, token lacks Calendars.Read scope. Prompt re-auth.
                return json({ not_authenticated: true, error: 'Insufficient permissions or invalid token' }, { headers: corsHeaders });
            }
            
            const calsData = await calsRes.json();
            
            const now = new Date();
            const pastDate = new Date();
            pastDate.setMonth(now.getMonth() - 1);
            const futureDate = new Date();
            futureDate.setFullYear(now.getFullYear() + 1);
            
            const startStr = pastDate.toISOString();
            const endStr = futureDate.toISOString();

            const calendars = [];

            for (const cal of (calsData.value || [])) {
                // Fetch events using calendarView for recurring events expansion
                const eventsRes = await fetch(`https://graph.microsoft.com/v1.0/me/calendars/${cal.id}/calendarView?startDateTime=${startStr}&endDateTime=${endStr}&$top=100`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                
                if (!eventsRes.ok) continue;
                
                const eventsData = await eventsRes.json();
                
                const parsedEvents = [];
                for (const ev of (eventsData.value || [])) {
                    parsedEvents.push({
                        id: ev.id,
                        title: ev.subject || "Untitled Event",
                        description: ev.bodyPreview || undefined,
                        location: ev.location?.displayName || undefined,
                        // MS Graph returns start/end as objects with dateTime and timeZone
                        start: ev.start?.dateTime ? new Date(ev.start.dateTime + 'Z') : new Date(), 
                        end: ev.end?.dateTime ? new Date(ev.end.dateTime + 'Z') : new Date()
                    });
                }

                if (parsedEvents.length > 0) {
                    calendars.push({
                        id: cal.id,
                        name: `MS: ${cal.name}`,
                        color: cal.hexColor ? cal.hexColor : '#0078D4', // Default to Microsoft Blue
                        events: parsedEvents
                    });
                }
            }

            return json({ calendars }, { headers: corsHeaders });
        } catch (e) {
            console.error('MS Graph API Error', e);
            return json({ not_authenticated: true, error: String(e) }, { status: 500, headers: corsHeaders });
        }
    } catch (outerErr) {
        console.error('MS Auth Error', outerErr);
        return json({ not_authenticated: true, error: String(outerErr) }, { status: 500, headers: corsHeaders });
    }
};
