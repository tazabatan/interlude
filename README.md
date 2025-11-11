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

## Guests, members, and invites

- `/app` is now guest-friendly. Visitors can browse Explore and see the wallet landing without signing in; members still access their bookings once authenticated.
- Guests create free member accounts from `/auth?mode=signup` (magic links + password) which stamps `app_role = member` metadata automatically.
- Admins can invite venue managers or staff from `/admin` (requires `SUPABASE_SERVICE_ROLE_KEY` in the environment). The form uses the Supabase Admin API to send the email link and binds the selected venue.
- Venue managers get a `/desk/team` surface to invite additional managers or staff for their own venue. Desk staff see a read-only notice instead of the form.
