# Interlude MVP

## Database migrations
- Install the Supabase CLI and start the local stack with `supabase start`.
- Apply the SQL migrations to the local database with `supabase db reset`.
- When developing new migrations, use `supabase migration new <name>` and place the generated SQL alongside the existing files in `supabase/migrations/`.

## Smoke tests
- Ensure the Supabase stack is running locally (`supabase start`).
- Run the end-to-end database smoke checks with `bash scripts/smoke/run.sh`.

## Local logins (admin & venue)
To skip emails while working locally:

1. Make sure Supabase is up (`supabase start`) and the web app is running on `http://localhost:3000`.
2. Visit `http://localhost:3000/api/dev-login?role=venue` for a venue-manager session or `http://localhost:3000/api/dev-login?role=admin` for the admin surface (there is also `role=desk` for staff).
3. The route creates the user (if needed), issues a Supabase magic link, and redirects you straight through `/auth/callback`.

Permanent password credentials seeded locally:

- Venue manager: `d.abatan@rivalcontent.co.uk` / `1Westbourne!`
- Member (guest): `d.o.abatan@gmail.com` / `1Westbourne!`
- Desk staff: `dev-desk@interlude.local` / `DeskPass123!`
- Admin: `dev-admin@interlude.local` / `AdminPass123!`
