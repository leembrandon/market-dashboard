# Market Structure Dashboard

Real-time key levels dashboard for ES, NQ, CL, GC futures. Reads pre-calculated levels from Supabase, populated by a local Python backend connected to TopstepX.

## Live Demo

Deployed on Vercel: `your-app.vercel.app`

## What It Shows

- **Prior Day**: High, Low, Close
- **Overnight (Globex)**: High, Low
- **Opening Range**: 15m and 30m high/low
- **Initial Balance**: First 60 min high/low
- **VWAP**: Session VWAP with ±1σ and ±2σ bands
- **Economic Calendar**: Today's events with impact ratings
- **Session Clock**: RTH/Globex status and timing

## Architecture

```
Your Computer                    Cloud
─────────────                    ─────
python server.py                 Supabase (free)
  ├─ Pulls bars from TopstepX      ├─ bars table
  ├─ Calculates key levels          ├─ levels_cache ← frontend reads this
  └─ Writes to Supabase             └─ econ_events
                                 
                                 Vercel (free)
                                   └─ React dashboard
                                      reads from Supabase
```

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Add environment variables in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon/public key
4. Deploy

## Local Development

```bash
# Clone the repo
git clone https://github.com/youruser/market-structure-dashboard.git
cd market-structure-dashboard

# Create .env.local with your keys
cp .env.example .env.local
# Edit .env.local with your Supabase values

# Install and run
npm install
npm run dev
# Opens at http://localhost:3000
```

## Supabase Setup

Before deploying, make sure you've:

1. Created tables by running `supabase_setup.sql` in the SQL Editor
2. Enabled public read access by running `supabase_public_read.sql`
3. Your local `python server.py` is running to populate data

## Environment Variables

| Variable | Where to find it | Purpose |
|----------|-----------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL | Supabase REST endpoint |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon/public | Read-only access (safe for frontend) |

The `NEXT_PUBLIC_` prefix tells Next.js to expose these in the browser. This is safe because the anon key can only read — write access requires the service_role key which stays on your local machine.
