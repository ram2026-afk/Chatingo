# Chat-in-go

People join a page from a link or QR code and can message it right away.

## Setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste `supabase/schema.sql`, and run it.
3. In **Project Settings → API**, copy the project URL, **publishable** key (this used to be called the anon key), and **secret** key (this used to be called the service role key).
4. Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_EMAIL=
ADMIN_PASSWORD=
NEXT_PUBLIC_APP_URL=
```

Paste the publishable key into `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Paste the secret key into `SUPABASE_SERVICE_ROLE_KEY`.

`ADMIN_EMAIL` and `ADMIN_PASSWORD` are only for you. They are not stored in the database.

Email confirmation can stay off in Supabase Auth. Sign-up confirms users in code.

Password reset emails need two Auth settings in Supabase:

- **URL Configuration → Site URL** should be your app origin, such as `http://localhost:3000`.
- **Redirect URLs** should include `http://localhost:3000/reset-password` and your production `/reset-password` URL.

`NEXT_PUBLIC_APP_URL` is optional. Set it if reset emails should always point at a specific origin.

```bash
npm install
npm run dev
```

- The home page is [http://localhost:3000](http://localhost:3000).
- Users sign in or sign up at [http://localhost:3000/login](http://localhost:3000/login).
- Admin sign-in is at `/admin`. That page is not linked from the public screen.

After someone has a user account, grant them access to a page by entering their email on that page. They can reply there. They cannot create pages.

If the app was set up before profile photos, run `supabase/avatar.sql` in the SQL editor so users can add a photo.

If the app was set up before referrals, run `supabase/referral.sql` so users can share a referral link.

People join a page from its link or QR code by signing in or creating an account, so they can open the chat again later.
