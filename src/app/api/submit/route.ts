import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import {
    getOrCreateRefCode,
    getReferrerByCode,
    hasPriorApplicationForCharacter,
    recordReferralAndMaybeGrantPro,
} from '@/lib/referral';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.gtawId) {
            return NextResponse.json(
                { error: 'Giriş yapmanız gerekiyor!' },
                { status: 401 }
            );
        }

        const body = await request.json();

        const {
            firstName, lastName, age, weight, gender, sexualPreference,
            phone, facebrowser, description, photoUrl, extraPhotos, prompts,
            characterId, characterName,
            lookingFor,
            ref: refCode
        } = body;

        if (!firstName || !lastName || !age || !gender || !sexualPreference || !facebrowser || !description || !photoUrl) {
            return NextResponse.json(
                { error: 'Tüm alanlar doldurulmalıdır!' },
                { status: 400 }
            );
        }

        if (!characterId) {
            return NextResponse.json(
                { error: 'Karakter seçimi gerekli!' },
                { status: 400 }
            );
        }

        if (parseInt(age) < 18) {
            return NextResponse.json(
                { error: '18 yaşından küçükler başvuru yapamaz!' },
                { status: 400 }
            );
        }

        const gtawUserId = session.user.gtawId;

        // Application'ı olmayan karakter mi? (bu karakterin hiç profil kaydı yok)
        const wasNewCharacter = !(await hasPriorApplicationForCharacter(gtawUserId, parseInt(String(characterId))));

        const { data: upserted, error: upsertError } = await supabase
            .from('applications')
            .upsert({
                first_name: firstName,
                last_name: lastName,
                age: parseInt(age),
                weight: weight ? parseInt(weight) : 0,
                gender,
                sexual_preference: sexualPreference,
                phone: phone?.trim() || null,
                facebrowser,
                description,
                photo_url: photoUrl,
                gtaw_user_id: gtawUserId,
                character_id: characterId,
                character_name: characterName,
                extra_photos: Array.isArray(extraPhotos) ? extraPhotos.filter((u: string) => u?.trim()).slice(0, 4) : [],
                prompts: typeof prompts === 'object' && prompts ? Object.fromEntries(Object.entries(prompts).filter(([, v]) => (v as string)?.trim())) : {},
                looking_for: lookingFor === 'friends' || lookingFor === 'dating' ? lookingFor : null,
                updated_at: new Date().toISOString(),
                last_active_at: new Date().toISOString()
            }, {
                onConflict: 'gtaw_user_id,character_id'
            })
            .select('id')
            .single();

        if (upsertError) {
            console.error('Upsert error:', upsertError);
            return NextResponse.json(
                { error: `Başvuru kaydedilirken hata oluştu: ${upsertError.message}` },
                { status: 500 }
            );
        }

        // Referans: application'ı olmayan karakter + geçerli ref → referral kaydı, 20'de Pro
        if (wasNewCharacter && refCode && typeof refCode === 'string' && refCode.trim()) {
            const referrerGtawId = await getReferrerByCode(refCode.trim());
            if (referrerGtawId && upserted?.id) {
                try {
                    await recordReferralAndMaybeGrantPro(referrerGtawId, gtawUserId, upserted.id);
                } catch (e) {
                    console.error('Referral record error:', e);
                }
            }
        }

        // Bu kullanıcının referans kodu olsun (davet linki paylaşabilsin)
        await getOrCreateRefCode(gtawUserId).catch(() => {});

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Submit error:', error);
        return NextResponse.json(
            { error: 'Sunucu hatası!' },
            { status: 500 }
        );
    }
}
