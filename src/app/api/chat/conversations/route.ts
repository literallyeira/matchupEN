import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

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
        // Find the user's application for this character
        const { data: myApplication, error: appError } = await supabase
            .from('applications')
            .select('id')
            .eq('gtaw_user_id', session.user.gtawId)
            .eq('character_id', parseInt(characterId))
            .single();

        if (appError || !myApplication) {
            return NextResponse.json({ error: 'Application not found' }, { status: 404 });
        }

        // Get all matches for this application
        const { data: matches, error: matchesError } = await supabase
            .from('matches')
            .select(`
                id,
                application_1_id,
                application_2_id,
                application_1:applications!matches_application_1_id_fkey(
                    id, first_name, last_name, photo_url, character_name
                ),
                application_2:applications!matches_application_2_id_fkey(
                    id, first_name, last_name, photo_url, character_name
                )
            `)
            .or(`application_1_id.eq.${myApplication.id},application_2_id.eq.${myApplication.id}`);

        if (matchesError) {
            console.error('Matches error:', matchesError);
            return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
        }

        // Get unread message counts and last message for each match
        const conversations = await Promise.all(
            (matches || []).map(async (match) => {
                const otherAppId = match.application_1_id === myApplication.id 
                    ? match.application_2_id 
                    : match.application_1_id;
                const otherApp = match.application_1_id === myApplication.id 
                    ? match.application_2 
                    : match.application_1;

                // Get unread count
                const { count: unreadCount } = await supabase
                    .from('messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('match_id', match.id)
                    .eq('receiver_application_id', myApplication.id)
                    .eq('is_read', false);

                // Get last message
                const { data: lastMessage } = await supabase
                    .from('messages')
                    .select('content, created_at, sender_application_id')
                    .eq('match_id', match.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                return {
                    matchId: match.id,
                    otherApplication: otherApp,
                    unreadCount: unreadCount || 0,
                    lastMessage: lastMessage || null,
                };
            })
        );

        // Sort by last message time (most recent first)
        conversations.sort((a, b) => {
            if (!a.lastMessage && !b.lastMessage) return 0;
            if (!a.lastMessage) return 1;
            if (!b.lastMessage) return -1;
            return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
        });

        return NextResponse.json({ conversations });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

