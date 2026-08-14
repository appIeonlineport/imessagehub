# iMessage Hub

Vite + Supabase project.

## Setup

1. Run `supabase/schema.sql` in Supabase SQL Editor.
2. Deploy the GitHub repository to Vercel.
3. Add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
4. Create your first account.
5. Run the owner SQL at the bottom of `supabase/schema.sql`.

Do not put a Supabase secret/service-role key in frontend code.

Payment/USDT functionality is intentionally not faked; it should be added as a separate verified payment flow.
