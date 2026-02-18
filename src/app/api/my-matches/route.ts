import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// GET - Get matches for current user's character
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.gtawId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const characterId = searchParams.get('characterId');

    if (!characterId) {
        return NextResponse.json({ error: 'Character ID required' }, { status: 400 });
    }

    try {
        // First, find the user's application for this character
        const { data: myApplication, error: appError } = await supabase
            .from('applications')
            .select('*')
            .eq('gtaw_user_id', session.user.gtawId)
            .eq('character_id', parseInt(characterId))
            .single();

        if (appError || !myApplication) {
            return NextResponse.json({ matches: [], hasApplication: false });
        }

        // Find all matches where this application is involved
        const [{ data: matches, error: matchError }, { data: blockedRows }] = await Promise.all([
            supabase
                .from('matches')
                .select(`
        id,
        created_at,
        application_1_id,
        application_2_id,
        application_1:applications!matches_application_1_id_fkey(
          id, first_name, last_name, age, gender, sexual_preference,
          phone, facebrowser, description, photo_url, character_name,
          extra_photos, prompts, is_verified, created_at
        ),
        application_2:applications!matches_application_2_id_fkey(
          id, first_name, last_name, age, gender, sexual_preference,
          phone, facebrowser, description, photo_url, character_name,
          extra_photos, prompts, is_verified, created_at
        )
      `)
                .or(`application_1_id.eq.${myApplication.id},application_2_id.eq.${myApplication.id}`),
            supabase.from('blocked_users').select('blocked_application_id').eq('blocker_application_id', myApplication.id),
        ]);

        if (matchError) {
            console.error('Match fetch error:', matchError);
            return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
        }

        const blockedIds = new Set((blockedRows ?? []).map((r: { blocked_application_id: string }) => r.blocked_application_id));

        // Transform matches to show the OTHER person's info, exclude blocked
        const transformedMatches = (matches ?? [])
            .map((match: { application_1_id: string; application_2_id: string; application_1: object; application_2: object; id: string; created_at: string }) => {
                const isApp1 = match.application_1_id === myApplication.id;
                const matchedWith = isApp1 ? match.application_2 : match.application_1;
                const matchedId = (matchedWith as { id: string }).id;
                return { id: match.id, created_at: match.created_at, matchedWith, myApplicationId: myApplication.id, matchedId };
            })
            .filter((m: { matchedId: string }) => !blockedIds.has(m.matchedId))
            .map(({ matchedId, ...m }) => m);

        return NextResponse.json({
            matches: transformedMatches,
            hasApplication: true,
            application: myApplication
        });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
