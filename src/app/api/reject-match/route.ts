import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// POST - Reject a match (user can reject their match)
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.gtawId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { matchId, myApplicationId, matchedApplicationId } = await request.json();

        if (!matchId || !myApplicationId || !matchedApplicationId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Verify that this application belongs to the user
        const { data: myApp } = await supabase
            .from('applications')
            .select('id, gtaw_user_id')
            .eq('id', myApplicationId)
            .eq('gtaw_user_id', session.user.gtawId)
            .single();

        if (!myApp) {
            return NextResponse.json({ error: 'Application not found or unauthorized' }, { status: 403 });
        }

        // Delete the match
        const { error: deleteError } = await supabase
            .from('matches')
            .delete()
            .eq('id', matchId);

        if (deleteError) {
            return NextResponse.json({ error: 'Failed to delete match' }, { status: 500 });
        }

        // Add to rejected_matches so they don't appear in suggestions again
        const ids = [myApplicationId, matchedApplicationId].sort();
        await supabase
            .from('rejected_matches')
            .upsert({
                application_1_id: ids[0],
                application_2_id: ids[1],
                rejected_by: myApplicationId
            }, { onConflict: 'application_1_id,application_2_id' });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error rejecting match:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
