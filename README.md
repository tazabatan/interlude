# Interlude MVP

## Database migrations
- Install the Supabase CLI and start the local stack with `supabase start`.
- Apply the SQL migrations to the local database with `supabase db reset`.
- When developing new migrations, use `supabase migration new <name>` and place the generated SQL alongside the existing files in `supabase/migrations/`.

## Smoke tests
- Ensure the Supabase stack is running locally (`supabase start`).
- Run the end-to-end database smoke checks with `bash scripts/smoke/run.sh`.
