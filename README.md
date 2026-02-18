# MatchUp - Tinder-Style Matching

Tinder-style dating for GTA World characters: discover compatible profiles, like/dislike, **mutual like = match**.

![MatchUp Logo](./public/logo.png)

## 🚀 Quick Setup

### 1. Supabase Setup

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project (give it any name and password)
3. After the project opens, go to **SQL Editor**
4. Run the following SQL:

```sql
-- Applications tablosu
CREATE TABLE applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  age INTEGER NOT NULL,
  weight INTEGER NOT NULL,
  sexual_preference TEXT NOT NULL,
  description TEXT,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Allow anyone to INSERT (to submit applications)
CREATE POLICY "Anyone can insert applications" ON applications
FOR INSERT TO anon
WITH CHECK (true);

-- Allow anyone to SELECT (for admin panel, password check is in backend)
CREATE POLICY "Anyone can view applications" ON applications
FOR SELECT TO anon
USING (true);

-- Allow anyone to DELETE (for admin deletion, password check is in backend)
CREATE POLICY "Anyone can delete applications" ON applications
FOR DELETE TO anon
USING (true);
```

5. Go to **Storage** section
6. **New bucket** → Name: `photos` → Mark as **Public bucket** → Create
7. Click on the bucket → **Policies** → **New Policy** → "Give users access to their own folder"
   - Or add this policy:

```sql
-- Policy for Storage
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'photos');
CREATE POLICY "Anyone can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'photos');
CREATE POLICY "Anyone can delete" ON storage.objects FOR DELETE USING (bucket_id = 'photos');
```

8. From **Settings** → **API** section:
   - Copy `Project URL`
   - Copy `anon public` key

### 2. Project Setup

```bash
# Install dependencies
npm install

# Edit .env.local file
# Enter Supabase information
```

`.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ADMIN_PASSWORD=matchup2024
NEXTAUTH_URL=http://localhost:3000

# GTA World banking gateway (Shop: Plus/Pro/Boost payments)
GTAW_GATEWAY_AUTH_KEY=your_auth_key_from_banking
```
Register the payment callback URL with the bank: `https://matchup.icu/api/auth/callback/banking`

### 3. Development

```bash
npm run dev
```

Site: http://localhost:3000
Admin: http://localhost:3000/admin

---

## 🌐 Deploy to Vercel

### Method 1: With GitHub (Recommended)

1. Push the project to GitHub
2. [vercel.com](https://vercel.com) → "Add New Project"
3. Select the GitHub repository
4. In **Environment Variables** section:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ADMIN_PASSWORD`
5. Deploy!

### Method 2: Vercel CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

You will be prompted to add environment variables during deployment.

---

## 📁 Project Structure

```
matchup/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Home page (application form)
│   │   ├── admin/
│   │   │   └── page.tsx      # Admin panel
│   │   └── api/
│   │       ├── submit/       # Submit application
│   │       ├── applications/ # Get applications
│   │       └── delete/       # Delete application
│   └── lib/
│       └── supabase.ts       # Supabase client
├── public/
│   └── logo.png              # Logo
└── .env.local                # Environment variables
```

---

## 🔐 Admin Panel

- URL: `/admin`
- Default password: `matchup2024`
- You can change it via `ADMIN_PASSWORD` in `.env.local` file

---

## 💡 Features

- ✅ **Discover**: Compatible profiles shown one by one as cards based on gender/orientation
- ✅ **Like / Dislike**: Profiles you dislike won't be shown again; if you like, a like is sent
- ✅ **Matching**: When both parties like each other, a match is automatically created
- ✅ **My Matches**: View people you've mutually matched with, access contact information, remove matches if desired
- ✅ Profile creation/editing (photo link, age, gender, orientation, phone, Facebrowser, description)
- ✅ Admin panel: List/delete profiles and matches (matches now only occur through mutual likes)
- ✅ Vercel compatible, Supabase free tier

### Tinder migration (likes / dislikes)

To switch to Tinder logic in the existing project, run the **`supabase_tinder_migration.sql`** file in Supabase SQL Editor. This file adds `likes` and `dislikes` tables; matches are now only created through mutual likes.

### Daily limit + Plus/Pro/Boost (Shop)

Run the **`supabase_limits_subscriptions.sql`** file in Supabase SQL Editor. This file adds `daily_likes`, `subscriptions`, `boosts`, `payments`, `pending_orders` tables. Then add **`GTAW_GATEWAY_AUTH_KEY`** to `.env.local` (auth key provided by the bank). Register the payment callback URL with the bank: `https://matchup.icu/api/auth/callback/banking`.

- **Normal:** 10 daily likes/dislikes, resets every 24 hours.
- **MatchUp+ ($5,000, 1 week):** 20 daily likes/dislikes.
- **MatchUp Pro ($12,000, 1 week):** Unlimited likes/dislikes + see who liked you.
- **Boost Me ($5,000, 24 hours):** Appear in the top 10 for all compatible users.

### Reset data for testing

To clear likes, dislikes, and matches to start fresh, run the **`supabase_reset_likes_matches.sql`** file in Supabase SQL Editor. The `likes`, `dislikes`, `matches`, and `rejected_matches` tables will be emptied.

---

## 📞 Support

If you encounter any issues, open an issue!
