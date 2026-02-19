import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// GET - Get messages for a match
export async function GET(
    request: Request,
    { params }: { params: Promise<{ matchId: string }> }
) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.gtawId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { matchId } = await params;
    const { searchParams } = new URL(request.url);
    const characterId = searchParams.get('characterId');

    if (!characterId) {
        return NextResponse.json({ error: 'Character ID required' }, { status: 400 });
    }

    try {
        // Find the user's application
        const { data: myApplication, error: appError } = await supabase
            .from('applications')
            .select('id')
            .eq('gtaw_user_id', session.user.gtawId)
            .eq('character_id', parseInt(characterId))
            .single();

        if (appError || !myApplication) {
            return NextResponse.json({ error: 'Application not found' }, { status: 404 });
        }

        // Verify the match belongs to this user
        const { data: match, error: matchError } = await supabase
            .from('matches')
            .select('application_1_id, application_2_id')
            .eq('id', matchId)
            .single();

        if (matchError || !match) {
            return NextResponse.json({ error: 'Match not found' }, { status: 404 });
        }

        if (match.application_1_id !== myApplication.id && match.application_2_id !== myApplication.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Get messages
        const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select(`
                id,
                content,
                sender_application_id,
                receiver_application_id,
                is_read,
                created_at,
                sender:applications!messages_sender_application_id_fkey(
                    id, first_name, last_name, photo_url
                )
            `)
            .eq('match_id', matchId)
            .order('created_at', { ascending: true });

        if (messagesError) {
            console.error('Messages error:', messagesError);
            return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
        }

        // Mark messages as read
        await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('match_id', matchId)
            .eq('receiver_application_id', myApplication.id)
            .eq('is_read', false);

        return NextResponse.json({ messages: messages || [] });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

// POST - Send a message
export async function POST(
    request: Request,
    { params }: { params: Promise<{ matchId: string }> }
) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.gtawId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { matchId } = await params;
    const body = await request.json();
    const { content, characterId } = body;

    if (!content || !content.trim()) {
        return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    if (!characterId) {
        return NextResponse.json({ error: 'Character ID required' }, { status: 400 });
    }

    try {
        // Find the user's application
        const { data: myApplication, error: appError } = await supabase
            .from('applications')
            .select('id')
            .eq('gtaw_user_id', session.user.gtawId)
            .eq('character_id', parseInt(characterId))
            .single();

        if (appError || !myApplication) {
            return NextResponse.json({ error: 'Application not found' }, { status: 404 });
        }

        // Verify the match belongs to this user
        const { data: match, error: matchError } = await supabase
            .from('matches')
            .select('application_1_id, application_2_id')
            .eq('id', matchId)
            .single();

        if (matchError || !match) {
            return NextResponse.json({ error: 'Match not found' }, { status: 404 });
        }

        if (match.application_1_id !== myApplication.id && match.application_2_id !== myApplication.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const receiverApplicationId = match.application_1_id === myApplication.id 
            ? match.application_2_id 
            : match.application_1_id;

        // Create message
        const { data: message, error: messageError } = await supabase
            .from('messages')
            .insert({
                match_id: matchId,
                sender_application_id: myApplication.id,
                receiver_application_id: receiverApplicationId,
                content: content.trim(),
                is_read: false,
            })
            .select(`
                id,
                content,
                sender_application_id,
                receiver_application_id,
                is_read,
                created_at,
                sender:applications!messages_sender_application_id_fkey(
                    id, first_name, last_name, photo_url
                )
            `)
            .single();

        if (messageError) {
            console.error('Message error:', messageError);
            return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
        }

        return NextResponse.json({ message });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

