import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Get all matches (admin only)
export async function GET(request: Request) {
    const authHeader = request.headers.get('Authorization');
    const adminName = request.headers.get('X-Admin-Name') || 'bilinmiyor';

    if (authHeader !== process.env.ADMIN_PASSWORD) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[ADMIN] ${adminName} eşleşmeleri görüntüledi`);

    try {
        const { data, error } = await supabase
            .from('matches')
            .select(`
        id,
        application_1_id,
        application_2_id,
        created_at,
        created_by,
        application_1:applications!matches_application_1_id_fkey(
          id, first_name, last_name, photo_url, character_name
        ),
        application_2:applications!matches_application_2_id_fkey(
          id, first_name, last_name, photo_url, character_name
        )
      `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

// POST - Create a new match (admin only)
export async function POST(request: Request) {
    const authHeader = request.headers.get('Authorization');
    const adminName = request.headers.get('X-Admin-Name') || 'admin';

    if (authHeader !== process.env.ADMIN_PASSWORD) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { application1Id, application2Id } = await request.json();

        if (!application1Id || !application2Id) {
            return NextResponse.json({ error: 'Both application IDs required' }, { status: 400 });
        }

        if (application1Id === application2Id) {
            return NextResponse.json({ error: 'Cannot match application with itself' }, { status: 400 });
        }

        // Insert match
        const { data: match, error } = await supabase
            .from('matches')
            .insert({
                application_1_id: application1Id,
                application_2_id: application2Id,
                created_by: 'admin',
                created_by_admin: adminName
            })
            .select(`
                *,
                application_1:applications!matches_application_1_id_fkey(first_name, last_name),
                application_2:applications!matches_application_2_id_fkey(first_name, last_name)
            `)
            .single();

        if (error) throw error;

        // Record log
        if (match.application_1 && match.application_2) {
            const app1 = Array.isArray(match.application_1) ? match.application_1[0] : match.application_1;
            const app2 = Array.isArray(match.application_2) ? match.application_2[0] : match.application_2;

            await supabase.from('logs').insert({
                action: 'create_match',
                admin_name: adminName,
                details: {
                    match_id: match.id,
                    app1: `${app1.first_name} ${app1.last_name}`,
                    app2: `${app2.first_name} ${app2.last_name}`
                }
            });
        }

        return NextResponse.json(match);
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

// DELETE - Delete a match (admin only)
export async function DELETE(request: Request) {
    const authHeader = request.headers.get('Authorization');
    const adminName = request.headers.get('X-Admin-Name') || 'admin';

    if (authHeader !== process.env.ADMIN_PASSWORD) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const matchId = searchParams.get('id');

        if (!matchId) {
            return NextResponse.json({ error: 'Match ID required' }, { status: 400 });
        }

        // Get details before deleting for log
        const { data: match } = await supabase
            .from('matches')
            .select(`
                id,
                application_1:applications!matches_application_1_id_fkey(first_name, last_name),
                application_2:applications!matches_application_2_id_fkey(first_name, last_name)
            `)
            .eq('id', matchId)
            .single();

        const { error } = await supabase
            .from('matches')
            .delete()
            .eq('id', matchId);

        if (error) throw error;

        // Record log if match existed
        if (match && match.application_1 && match.application_2) {
            const app1 = Array.isArray(match.application_1) ? match.application_1[0] : match.application_1;
            const app2 = Array.isArray(match.application_2) ? match.application_2[0] : match.application_2;

            await supabase.from('logs').insert({
                action: 'delete_match',
                admin_name: adminName,
                details: {
                    match_id: matchId,
                    app1: `${app1.first_name} ${app1.last_name}`,
                    app2: `${app2.first_name} ${app2.last_name}`
                }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
