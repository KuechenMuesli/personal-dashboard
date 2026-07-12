import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'node:fs';
import path from 'node:path';

export const POST: RequestHandler = async ({ request, locals: { supabase, safeGetSession } }) => {
    const { session } = await safeGetSession();
    if (!session) throw error(401, 'Unauthorized');

    const { service, key } = await request.json();
    if (!service) throw error(400, 'Service name required');

    // Fetch existing secrets
    const { data: dbData } = await supabase
        .from('user_secrets')
        .select('secrets')
        .eq('user_id', session.user.id)
        .maybeSingle();

    const currentSecrets = dbData?.secrets || {};
    
    if (key) {
        currentSecrets[service] = key;
    } else {
        delete currentSecrets[service];
    }

    const { error: dbError } = await supabase
        .from('user_secrets')
        .upsert({
            user_id: session.user.id,
            secrets: currentSecrets
        });

    if (dbError) throw error(500, dbError.message);

    // Invalidate old Quickshare links for this specific widget/service
    const { error: deleteError } = await supabase
        .from('quickshares')
        .delete()
        .eq('user_id', session.user.id)
        .eq('service_id', service);

    if (deleteError) {
        console.error("Failed to invalidate old shares:", deleteError);
    }

    return json({ success: true });
};
