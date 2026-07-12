import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'node:fs';
import path from 'node:path';

const SHARE_DIR = path.join(process.cwd(), '.shares');
if (!fs.existsSync(SHARE_DIR)) {
    fs.mkdirSync(SHARE_DIR, { recursive: true });
}

export const POST: RequestHandler = async ({ request, locals: { safeGetSession } }) => {
    const { session } = await safeGetSession();
    if (!session) throw error(401, 'Unauthorized');

    const body = await request.json();
    if (!body.data || !body.type) {
        throw error(400, 'Invalid payload');
    }

    const id = Math.random().toString(36).substring(2, 10);
    const expiresAt = body.timestamp + (24 * 60 * 60 * 1000); 
    
    const payload = {
        data: body.data,
        type: body.type,
        name: body.name || 'Shared Snippet',
        expiresAt,
        userId: session.user.id,
        serviceId: body.serviceId
    };

    fs.writeFileSync(path.join(SHARE_DIR, `${id}.json`), JSON.stringify(payload));

    // Cleanup expired shares automatically to free up space
    try {
        const files = fs.readdirSync(SHARE_DIR);
        const now = Date.now();
        for (const file of files) {
            if (file.endsWith('.json')) {
                const fp = path.join(SHARE_DIR, file);
                try {
                    const shareData = JSON.parse(fs.readFileSync(fp, 'utf-8'));
                    if (shareData.expiresAt < now) {
                        fs.unlinkSync(fp);
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            }
        }
    } catch (e) {
        console.error("Cleanup error:", e);
    }

    return json({ id });
};

export const GET: RequestHandler = async ({ url }) => {
    const id = url.searchParams.get('id');
    if (!id || !/^[a-z0-9]+$/.test(id)) throw error(400, 'Invalid ID');

    const filePath = path.join(SHARE_DIR, `${id}.json`);
    if (!fs.existsSync(filePath)) {
        throw error(404, 'Not found or expired');
    }
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    if (data.expiresAt < Date.now()) {
        fs.unlinkSync(filePath);
        throw error(404, 'Expired');
    }
    
    return json(data);
};
