# FRC Rebuilt Leaderboard

Interactive FRC match score leaderboard powered by The Blue Alliance API.

## Quick Start

1. `npm install`
2. Copy `.env.example` to `.env` and fill in:
   - `TBA_API_KEY`
   - `SUPABASE_URL` (Postgres connection string)
3. `npx tsx scripts/initial-sync.ts` — seeds Supabase with events/matches
4. `npm run dev` — open http://localhost:3000

## Features

- Global top alliance scores (highest match score wins, tie-break by timestamp)
- Alliance grouping (teams who achieved the score together are shown together)
- Event-specific leaderboard filter
- Team search by number or name
- Favorite teams (persisted in localStorage)
- Team vs. team comparison panel
- Team match history drawer (win/loss/tie highlighting)
- Auto-refresh every 30 minutes on weekends

## Manual Sync

```
curl -X POST http://localhost:3000/api/sync
```

## Stack

Next.js 16 · TypeScript · Supabase Postgres · TBA API v3 · Tailwind CSS · TanStack Query · Zustand · node-cron
