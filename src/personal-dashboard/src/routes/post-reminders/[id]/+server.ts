import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals: { supabase } }) => {
    const { id } = params;

    if (!id) {
        throw error(400, 'ID is required');
    }

    const { data, error: dbError } = await supabase
        .from('apple_reminders')
        .select('data')
        .eq('id', id)
        .maybeSingle();

    if (dbError) {
        console.error('Error fetching reminders:', dbError);
        throw error(500, 'Database error');
    }

    if (!data || !data.data) {
        // Return empty structure if not found
        return json({
            merge_variables: {
                today: [],
                future: [],
                overdue: []
            }
        });
    }

    // Return exact same structure as the Trmnl API
    return json({ merge_variables: data.data });
};

export const POST: RequestHandler = async ({ params, request, locals: { supabase } }) => {
    const { id } = params;

    if (!id) {
        throw error(400, 'ID is required');
    }

    let payload;
    let rawText = '';
    try {
        rawText = await request.text();

        // Handle URL-encoded form data sent by Apple Shortcuts (if Request Body is set to Form)
        if (rawText.startsWith('merge_variables=')) {
            const params = new URLSearchParams(rawText);
            rawText = params.get('merge_variables') || rawText;
        }
        
        payload = JSON.parse(rawText);
    } catch (e) {
        throw error(400, `Invalid JSON. Raw Text: ${rawText}`);
    }

    // Assuming the payload contains the reminders we want to store.
    // It might be nested under `merge_variables` or directly the arrays.
    // We store the relevant object in the `data` column.
    let dataToStore = payload;
    if (payload.merge_variables) {
        dataToStore = payload.merge_variables;
    }

    const { error: dbError } = await supabase
        .from('apple_reminders')
        .upsert({
            id,
            data: dataToStore,
            updated_at: new Date().toISOString()
        });

    if (dbError) {
        throw error(500, `Failed to save reminders: ${dbError.message}`);
    }

    return json({ success: true });
};
