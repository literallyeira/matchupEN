import 'next-auth';

interface GTAWCharacter {
    id: number;
    memberid: number;
    firstname: string;
    lastname: string;
}

declare module 'next-auth' {
    interface Session {
        user: {
            name?: string | null;
            email?: string | null;
            image?: string | null;
            gtawId?: number;
            username?: string;
            characters?: GTAWCharacter[];
            accessToken?: string;
        };
    }

    interface User {
        gtawId?: number;
        username?: string;
        characters?: GTAWCharacter[];
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        gtawId?: number;
        username?: string;
        characters?: GTAWCharacter[];
        accessToken?: string;
    }
}
