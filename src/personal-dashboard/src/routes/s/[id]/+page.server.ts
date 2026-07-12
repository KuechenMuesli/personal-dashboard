import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import fs from 'node:fs';
import path from 'node:path';

const SHARE_DIR = path.join(process.cwd(), '.shares');

export const load: PageServerLoad = async ({ params }) => {
    try {
        const id = params.id;
        if (!/^[a-z0-9]+$/.test(id)) return { id, expired: true };

        const filePath = path.join(SHARE_DIR, `${id}.json`);
        if (!fs.existsSync(filePath)) {
            return { id, expired: true };
        }
        
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        
        if (data.expiresAt < Date.now()) {
            fs.unlinkSync(filePath);
            return { id, expired: true };
        }
        
        return {
            id,
            content: data,
            expired: false
        };
    } catch (e: any) {
        console.error("LOAD ERROR:", e);
        return { id: params.id, expired: true };
    }
};
