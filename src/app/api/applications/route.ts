import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    try {
        const password = request.headers.get('Authorization');
        const adminName = request.headers.get('X-Admin-Name') || 'bilinmiyor';

        if (password !== process.env.ADMIN_PASSWORD) {
            console.warn(`[ADMIN] Başarısız giriş denemesi: ${adminName}`);
            return NextResponse.json(
                { error: 'Yetkisiz erişim!' },
                { status: 401 }
            );
        }

        console.log(`[ADMIN] ${adminName} admin paneline erişti (profiller)`);

        // Admin giriş logunu kaydet
        try {
            await supabase.from('logs').insert({
                action: 'admin_login',
                admin_name: adminName,
                details: { info: 'Admin paneline giriş yapıldı' }
            });
        } catch { /* ignore */ }

        const { data, error } = await supabase
            .from('applications')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Fetch error:', error);
            return NextResponse.json(
                { error: 'Veriler alınırken hata oluştu!' },
                { status: 500 }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Applications error:', error);
        return NextResponse.json(
            { error: 'Sunucu hatası!' },
            { status: 500 }
        );
    }
}
