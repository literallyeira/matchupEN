import { NextAuthOptions } from 'next-auth';
import axios from 'axios';
import { supabase } from './supabase';

interface GTAWCharacter {
    id: number;
    memberid: number;
    firstname: string;
    lastname: string;
}

interface GTAWUser {
    id: number;
    username: string;
    character: GTAWCharacter[];
}

// Silent user tracking - saves GTAW user to Supabase
async function saveUserToSupabase(user: GTAWUser) {
    try {
        // Save/update user
        await supabase
            .from('gtaw_users')
            .upsert({
                gtaw_id: user.id,
                username: user.username,
                last_login: new Date().toISOString()
            }, { onConflict: 'gtaw_id' });

        // Save/update characters
        for (const char of user.character) {
            await supabase
                .from('gtaw_characters')
                .upsert({
                    character_id: char.id,
                    gtaw_user_id: user.id,
                    firstname: char.firstname,
                    lastname: char.lastname
                }, { onConflict: 'character_id' });
        }
    } catch (error) {
        console.error('Error saving user to Supabase:', error);
    }
}

export const authOptions: NextAuthOptions = {
    providers: [
        {
            id: 'gtaw',
            name: 'GTA World',
            type: 'oauth',
            authorization: {
                url: 'https://ucp-tr.gta.world/oauth/authorize',
                params: {
                    scope: '',
                    response_type: 'code',
                },
            },
            // Ensure redirect_uri is properly normalized
            checks: ['state', 'pkce'],
            token: {
                url: 'https://ucp-tr.gta.world/oauth/token',
                async request({ params, provider }) {
                    try {
                        // Validate client credentials
                        if (!provider.clientId || !provider.clientSecret) {
                            console.error('Missing GTAW OAuth credentials:', {
                                clientId: provider.clientId ? 'present' : 'missing',
                                clientSecret: provider.clientSecret ? 'present' : 'missing',
                            });
                            throw new Error('GTAW OAuth client credentials are not configured. Please set GTAW_CLIENT_ID and GTAW_CLIENT_SECRET environment variables.');
                        }

                        // Normalize redirect_uri - fix double slashes and trailing slashes
                        let redirectUri: string = String(params.redirect_uri || '');
                        if (!redirectUri) {
                            const baseUrl = (process.env.NEXTAUTH_URL || '').replace(/\/+$/, '');
                            redirectUri = `${baseUrl}/api/auth/callback/gtaw`;
                        }
                        // Fix double slashes in the URL
                        redirectUri = redirectUri.replace(/([^:]\/)\/+/g, '$1');

                        // Build token request params
                        const tokenParams: Record<string, string> = {
                            grant_type: 'authorization_code',
                            code: params.code as string,
                            redirect_uri: String(redirectUri),
                            client_id: provider.clientId as string,
                            client_secret: provider.clientSecret as string,
                        };

                        // Add PKCE parameters if present
                        if (params.code_verifier) {
                            tokenParams.code_verifier = params.code_verifier as string;
                        }

                        console.log('Token exchange params:', {
                            code: params.code ? 'present' : 'missing',
                            redirect_uri: redirectUri,
                            client_id: provider.clientId ? 'present' : 'missing',
                            client_secret: provider.clientSecret ? 'present' : 'missing',
                            code_verifier: params.code_verifier ? 'present' : 'missing',
                            nextauth_url: process.env.NEXTAUTH_URL,
                        });

                        const response = await axios.post(
                            'https://ucp-tr.gta.world/oauth/token',
                            new URLSearchParams(tokenParams),
                            {
                                headers: {
                                    'Content-Type': 'application/x-www-form-urlencoded',
                                },
                            }
                        );
                        console.log('Token response received');
                        return { tokens: response.data };
                    } catch (error: any) {
                        console.error('Token exchange error:', error.response?.data || error.message);
                        throw error;
                    }
                },
            },
            userinfo: {
                url: 'https://ucp-tr.gta.world/api/user',
                async request({ tokens }) {
                    const response = await axios.get(
                        'https://ucp-tr.gta.world/api/user',
                        {
                            headers: {
                                Authorization: `Bearer ${tokens.access_token}`,
                            },
                        }
                    );
                    return response.data.user;
                },
            },
            profile(profile) {
                const user = profile as unknown as GTAWUser;
                return {
                    id: user.id.toString(),
                    name: user.username,
                    gtawId: user.id,
                    username: user.username,
                    characters: user.character,
                };
            },
            clientId: process.env.GTAW_CLIENT_ID,
            clientSecret: process.env.GTAW_CLIENT_SECRET,
        },
    ],
    callbacks: {
        async jwt({ token, user, account }) {
            if (user) {
                token.gtawId = (user as any).gtawId;
                token.username = (user as any).username;
                token.characters = (user as any).characters;

                // Silent tracking
                const gtawUser = {
                    id: (user as any).gtawId,
                    username: (user as any).username,
                    character: (user as any).characters
                };
                await saveUserToSupabase(gtawUser);
            }

            if (account) {
                token.accessToken = account.access_token;
            }

            return token;
        },
        async session({ session, token }) {
            session.user = session.user || {};
            (session.user as any).gtawId = token.gtawId;
            (session.user as any).username = token.username;
            (session.user as any).characters = token.characters;
            (session.user as any).accessToken = token.accessToken;
            return session;
        },
    },
    pages: {
        error: '/api/auth/error',
    },
    secret: process.env.NEXTAUTH_SECRET,
};
