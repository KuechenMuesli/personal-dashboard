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
        
        // Apple Shortcuts bug: it sometimes prepends the raw text of the reminders 
        // to the JSON array of dictionaries, resulting in malformed JSON like:
        // "today": [Task 1, Task 2, {"t":"Task 1", ...}, {"t":"Task 2", ...}]
        // We fix this by removing anything between '[' and the first '{', 
        // and clearing arrays that contain only unquoted strings.
        
        // 1. Fix arrays that have dictionaries (removes unquoted strings before the first '{')
        rawText = rawText.replace(/\[\s*[^\]{]*?(?=\{)/g, '[');
        
        // 2. Fix arrays that only have unquoted strings and no dictionaries
        rawText = rawText.replace(/\[\s*[^\]{"\[\]]*?\]/g, '[]');

        payload = JSON.parse(rawText);
    } catch (e) {
        console.error("JSON Parse Error. Raw Text:", rawText);
        throw error(400, 'Invalid JSON');
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
        console.error('Error saving reminders:', dbError);
        throw error(500, 'Failed to save reminders');
    }

    return json({ success: true });
};
