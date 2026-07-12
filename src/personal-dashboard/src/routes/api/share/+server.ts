import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals: { safeGetSession, supabase } }) => {
    const { session } = await safeGetSession();
    if (!session) throw error(401, 'Unauthorized');

    const body = await request.json();
    if (!body.data || !body.type) {
        throw error(400, 'Invalid payload');
    }

    const id = Math.random().toString(36).substring(2, 10);
    const expiresAt = body.timestamp + (24 * 60 * 60 * 1000); 
    
    // Cleanup expired shares automatically to free up space
    await supabase.from('quickshares').delete().lt('expires_at', Date.now());

    const { error: insertError } = await supabase.from('quickshares').insert({
        id,
        user_id: session.user.id,
        service_id: body.serviceId,
        data: body.data,
        type: body.type,
        name: body.name || 'Shared Snippet',
        expires_at: expiresAt
    });

    if (insertError) {
        console.error("Failed to insert quickshare:", insertError);
        throw error(500, 'Database error');
    }

    return json({ id });
};

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
    const id = url.searchParams.get('id');
    if (!id || !/^[a-z0-9]+$/.test(id)) throw error(400, 'Invalid ID');

    const { data, error: dbError } = await supabase.from('quickshares').select('*').eq('id', id).maybeSingle();
    
    if (dbError || !data) {
        throw error(404, 'Not found or expired');
    }
    
    if (data.expires_at < Date.now()) {
        await supabase.from('quickshares').delete().eq('id', id);
        throw error(404, 'Expired');
    }
    
    return json({
        data: data.data,
        type: data.type,
        name: data.name,
        expiresAt: data.expires_at
    });
};
