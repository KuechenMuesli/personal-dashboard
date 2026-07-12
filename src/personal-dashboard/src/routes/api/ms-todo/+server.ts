import { json, error } from '@sveltejs/kit';
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

export const OPTIONS: RequestHandler = async () => {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
    });
};

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    
    // Refresh if within 5 minutes of expiring
    if (Date.now() > msTokenData.expires_at - 300000) {
        try {
            accessToken = await refreshMsToken(msTokenData.refresh_token, supabase, session.user.id, currentSecrets);
        } catch (e) {
            console.error('Failed to refresh MS token', e);
            return json({ not_authenticated: true }, { headers: corsHeaders });
        }
    }

    try {
        // Fetch lists
        const listsRes = await fetch('https://graph.microsoft.com/v1.0/me/todo/lists', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const listsData = await listsRes.json();
        
        const tasks = [];
        const todayStr = new Date().toISOString().split('T')[0];
        
        // Fetch tasks for each list
        for (const list of (listsData.value || [])) {
            const tasksRes = await fetch(`https://graph.microsoft.com/v1.0/me/todo/lists/${list.id}/tasks?$filter=status ne 'completed'`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const tasksData = await tasksRes.json();
            
            for (const t of (tasksData.value || [])) {
                // MS To Do dueDateTime is in UTC
                let d = null;
                if (t.dueDateTime && t.dueDateTime.dateTime) {
                    d = t.dueDateTime.dateTime.split('T')[0];
                }

                // Map importance: low, normal, high
                let p = null;
                if (t.importance === 'high') p = 'Hoch';
                else if (t.importance === 'normal') p = 'Mittel';
                else if (t.importance === 'low') p = 'Niedrig';
                
                // Map categories to tags if available
                let tagStr = '';
                if (t.categories && t.categories.length > 0) {
                    tagStr = t.categories.map((c: string) => `#${c}`).join('\n');
                }

                const item = {
                    n: t.title,
                    d: d,
                    p: p,
                    o: t.body?.content?.trim() || null,
                    t: tagStr || null,
                    l: list.displayName
                };
                
                tasks.push(item);
            }
        }

        // Group them mimicking the Apple Reminders structure so Todo.svelte parses it identically
        const overdue = [];
        const today = [];
        const future = [];
        
        const now = new Date();
        now.setHours(0,0,0,0);

        for (const item of tasks) {
            if (!item.d) {
                future.push(item);
                continue;
            }
            const due = new Date(item.d);
            due.setHours(0,0,0,0);
            
            if (due < now) overdue.push(item);
            else if (due.getTime() === now.getTime()) today.push(item);
            else future.push(item);
        }

        return json({
            merge_variables: {
                overdue,
                today,
                future
            }
        }, { headers: corsHeaders });
    } catch (e) {
        console.error('MS Graph API Error', e);
        return json({ not_authenticated: true, error: String(e) }, { status: 500, headers: corsHeaders });
    }
  } catch (outerErr) {
      console.error('MS Auth Error', outerErr);
      return json({ not_authenticated: true, error: String(outerErr) }, { status: 500, headers: corsHeaders });
  }
};
