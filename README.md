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
```

Paste the publishable key into `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Paste the secret key into `SUPABASE_SERVICE_ROLE_KEY`.

`ADMIN_EMAIL` and `ADMIN_PASSWORD` are only for you. They are not stored in the database.

Email confirmation can stay off in Supabase Auth. Sign-up confirms users in code.

To enable **Continue with Google**:

1. In Google Cloud, create an OAuth client of type **Web application**.
2. Add authorized JavaScript origin `http://localhost:3000` (and your live origin later).
3. Add authorized redirect URI `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`.
4. In Supabase **Authentication → Providers → Google**, paste the client ID and secret and turn the provider on.
5. In **Authentication → URL Configuration**, set the site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to the redirect allow list.

```bash
npm install
npm run dev
```

- Users sign in or sign up at [http://localhost:3000](http://localhost:3000).
- Admin sign-in is at `/admin`. That page is not linked from the public screen.

After someone has a user account, grant them access to a page by entering their email on that page. They can reply there. They cannot create pages.

If the app was set up before profile photos, run `supabase/avatar.sql` in the SQL editor so users can add a photo.

Visitors can still join a page from its link or QR code without an account.
