import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'node:fs';
import path from 'node:path';

export const POST: RequestHandler = async ({ request, locals: { supabase, safeGetSession } }) => {
    const { session } = await safeGetSession();
    if (!session) throw error(401, 'Unauthorized');

    const { service, key } = await request.json();
    if (!service) throw error(400, 'Service name required');

    // Delete old secrets for this service
    const { error: dbError } = await supabase
        .from('user_secrets')
        .delete()
        .eq('user_id', session.user.id)
        .eq('service', service);
    
    if (dbError) throw error(500, dbError.message);

    // If there are new secrets, insert them row by row
    if (key !== undefined && key !== null) {
        if (typeof key === 'object' && !Array.isArray(key)) {
            const secretsToUpsert = Object.entries(key).map(([k, v]) => ({
                user_id: session.user.id,
                service: service,
                secret_key: k,
                secret_value: typeof v === 'object' ? JSON.stringify(v) : String(v)
            }));

            if (secretsToUpsert.length > 0) {
                const { error: insertError } = await supabase
                    .from('user_secrets')
                    .upsert(secretsToUpsert, { onConflict: 'user_id, service, secret_key' });
                
                if (insertError) throw error(500, insertError.message);
            }
        }
    }

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
