import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const password = request.headers.get('Authorization');
        const adminName = request.headers.get('X-Admin-Name') || 'admin';

        if (password !== process.env.ADMIN_PASSWORD) {
            return NextResponse.json(
                { error: 'Yetkisiz erişim!' },
                { status: 401 }
            );
        }

        console.log(`[ADMIN] ${adminName} profil silme işlemi başlattı`);

        const { id } = await request.json();

        if (!id) {
            return NextResponse.json(
                { error: 'ID gerekli!' },
                { status: 400 }
            );
        }

        // First get the application details
        const { data: application } = await supabase
            .from('applications')
            .select('first_name, last_name, photo_url')
            .eq('id', id)
            .single();

        // Delete photo from storage if exists
        if (application?.photo_url) {
            const fileName = application.photo_url.split('/').pop();
            if (fileName) {
                await supabase.storage
                    .from('photos')
                    .remove([fileName]);
            }
        }

        // Delete application from database
        const { error: deleteError } = await supabase
            .from('applications')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Delete error:', deleteError);
            return NextResponse.json(
                { error: 'Silme işlemi başarısız!' },
                { status: 500 }
            );
        }

        // Record log
        if (application) {
            await supabase.from('logs').insert({
                action: 'delete_application',
                admin_name: adminName,
                details: {
                    application_id: id,
                    name: `${application.first_name} ${application.last_name}`
                }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete error:', error);
        return NextResponse.json(
            { error: 'Sunucu hatası!' },
            { status: 500 }
        );
    }
}
