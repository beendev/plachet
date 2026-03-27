<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your app

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Configure your environment in `.env.local`
3. Run the app:
   `npm run dev`

## Supabase migration path

Supabase is the primary database as soon as `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured.
SQLite remains only as a local fallback when Supabase is not configured, and as a temporary source for migration.

1. Create the schema in Supabase with [`supabase/schema.sql`](supabase/schema.sql)
2. Add these variables to `.env.local`:
   `SUPABASE_URL=...`
   `SUPABASE_SERVICE_ROLE_KEY=...`
   `SUPABASE_SYNC_ENABLED=false`
3. Run the initial copy:
   Supabase est la base principale du projet.
4. If you still need to mirror legacy local writes during transition:
   `SUPABASE_SYNC_ENABLED=true`
