import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Get all rejected matches (admin only)
export async function GET(request: Request) {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || authHeader !== process.env.ADMIN_PASSWORD) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
        .from('rejected_matches')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}
