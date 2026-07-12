import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
    try {
        const id = params.id;
        if (!/^[a-z0-9]+$/.test(id)) return { id, expired: true };

        const { data, error: dbError } = await supabase
            .from('quickshares')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (dbError || !data) {
            return { id, expired: true };
        }
        
        if (data.expires_at < Date.now()) {
            await supabase.from('quickshares').delete().eq('id', id);
            return { id, expired: true };
        }
        
        return {
            id,
            content: {
                data: data.data,
                type: data.type,
                name: data.name,
                expiresAt: data.expires_at
            },
            expired: false
        };
    } catch (e: any) {
        console.error("LOAD ERROR:", e);
        return { id: params.id, expired: true };
    }
};
