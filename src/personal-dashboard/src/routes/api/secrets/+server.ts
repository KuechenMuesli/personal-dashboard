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
    try {
        const SHARE_DIR = path.join(process.cwd(), '.shares');
        if (fs.existsSync(SHARE_DIR)) {
            const files = fs.readdirSync(SHARE_DIR);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const fp = path.join(SHARE_DIR, file);
                    try {
                        const shareData = JSON.parse(fs.readFileSync(fp, 'utf-8'));
                        if (shareData.userId === session.user.id && shareData.serviceId === service) {
                            fs.unlinkSync(fp);
                        }
                    } catch (e) {
                        // ignore parse errors for individual files
                    }
                }
            }
        }
    } catch (e) {
        console.error("Failed to invalidate old shares:", e);
    }

    return json({ success: true });
};
