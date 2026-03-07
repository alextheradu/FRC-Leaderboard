# FRC Rebuilt Leaderboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a fast, interactive FRC match score leaderboard using TBA API data, displaying top alliance scores globally and per-event with team branding, search, favorites, comparison, and match history.

**Architecture:** Next.js 14 (App Router) full-stack app with API routes serving a SQLite database (via better-sqlite3) that caches TBA data. A backend scheduler polls TBA every 30 minutes on weekends to refresh scores. The frontend uses React Query for data fetching and Tailwind CSS for FRC-themed styling.

**Tech Stack:** Next.js 14, TypeScript, better-sqlite3, TBA API v3, Tailwind CSS, React Query (TanStack Query), shadcn/ui components, node-cron for scheduling, Zustand for client state (favorites).

**Reference Styling:** FRC 2026 scoreboard aesthetic — dark background, blue/red alliance colors, bold team numbers, clean tabular layout.

---

## Prerequisites

Before starting, obtain a TBA API read key from https://www.thebluealliance.com/account and set it as `TBA_API_KEY` in `.env.local`.

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json` (via CLI)
- Create: `.env.local`
- Create: `.env.example`
- Create: `tsconfig.json` (auto-generated)

**Step 1: Bootstrap Next.js project**

```bash
cd /srv/md0/robotics/rebuilt-leaderboard
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git
```
Expected: Project files created in current directory.

**Step 2: Install dependencies**

```bash
npm install better-sqlite3 node-cron @tanstack/react-query zustand lucide-react
npm install -D @types/better-sqlite3 @types/node-cron
npx shadcn@latest init -d
npx shadcn@latest add badge button card input select separator tabs tooltip
```

**Step 3: Create `.env.local`**

```
TBA_API_KEY=your_key_here
TBA_BASE_URL=https://www.thebluealliance.com/api/v3
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Step 4: Create `.env.example`**

```
TBA_API_KEY=
TBA_BASE_URL=https://www.thebluealliance.com/api/v3
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Step 5: Commit**

```bash
git add .
git commit -m "chore: scaffold Next.js project with dependencies"
```

---

### Task 2: Database Schema & Migration

**Files:**
- Create: `src/lib/db.ts`
- Create: `src/lib/schema.sql`

**Step 1: Write failing test for DB initialization**

```typescript
// src/lib/__tests__/db.test.ts
import { getDb } from '../db'

test('database initializes with correct tables', () => {
  const db = getDb()
  const tables = db.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
  ).all() as { name: string }[]
  const names = tables.map(t => t.name)
  expect(names).toContain('teams')
  expect(names).toContain('events')
  expect(names).toContain('matches')
  expect(names).toContain('leaderboard')
  expect(names).toContain('sync_log')
})
```

**Step 2: Run test to verify it fails**

```bash
npx jest src/lib/__tests__/db.test.ts
```
Expected: FAIL — `getDb` not found.

**Step 3: Create `src/lib/schema.sql`**

```sql
CREATE TABLE IF NOT EXISTS teams (
  team_number INTEGER PRIMARY KEY,
  nickname TEXT,
  city TEXT,
  state_prov TEXT,
  country TEXT,
  website TEXT,
  rookie_year INTEGER,
  avatar_base64 TEXT,
  last_updated INTEGER
);

CREATE TABLE IF NOT EXISTS events (
  event_key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT,
  city TEXT,
  state_prov TEXT,
  country TEXT,
  year INTEGER NOT NULL,
  start_date TEXT,
  end_date TEXT,
  event_type INTEGER,
  last_updated INTEGER
);

CREATE TABLE IF NOT EXISTS matches (
  match_key TEXT PRIMARY KEY,
  event_key TEXT NOT NULL,
  comp_level TEXT NOT NULL,
  match_number INTEGER NOT NULL,
  set_number INTEGER NOT NULL DEFAULT 1,
  red_score INTEGER,
  blue_score INTEGER,
  red_teams TEXT NOT NULL,
  blue_teams TEXT NOT NULL,
  winning_alliance TEXT,
  actual_time INTEGER,
  post_result_time INTEGER,
  FOREIGN KEY (event_key) REFERENCES events(event_key)
);

CREATE TABLE IF NOT EXISTS leaderboard (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_key TEXT NOT NULL UNIQUE,
  event_key TEXT NOT NULL,
  alliance TEXT NOT NULL,
  score INTEGER NOT NULL,
  team_numbers TEXT NOT NULL,
  achieved_at INTEGER NOT NULL,
  FOREIGN KEY (match_key) REFERENCES matches(match_key)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard(score DESC, achieved_at ASC);
CREATE INDEX IF NOT EXISTS idx_matches_event ON matches(event_key);

CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  events_synced INTEGER DEFAULT 0,
  matches_synced INTEGER DEFAULT 0,
  status TEXT DEFAULT 'running',
  error_message TEXT
);
```

**Step 4: Create `src/lib/db.ts`**

```typescript
import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'leaderboard.db')
let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (_db) return _db
  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  _db = new Database(DB_PATH)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')
  const schema = fs.readFileSync(
    path.join(process.cwd(), 'src', 'lib', 'schema.sql'), 'utf-8'
  )
  _db.exec(schema)
  return _db
}
```

**Step 5: Run test to verify it passes**

```bash
npx jest src/lib/__tests__/db.test.ts
```
Expected: PASS

**Step 6: Commit**

```bash
git add src/lib/db.ts src/lib/schema.sql src/lib/__tests__/db.test.ts
git commit -m "feat: add SQLite database schema and initialization"
```

---

### Task 3: TBA API Client

**Files:**
- Create: `src/lib/tba.ts`
- Create: `src/lib/__tests__/tba.test.ts`
- Create: `src/types/tba.ts`

**Step 1: Create `src/types/tba.ts`**

```typescript
export interface TBATeam {
  team_number: number
  nickname: string
  city: string
  state_prov: string
  country: string
  website: string
  rookie_year: number
}

export interface TBAEvent {
  key: string
  name: string
  short_name: string
  city: string
  state_prov: string
  country: string
  year: number
  start_date: string
  end_date: string
  event_type: number
}

export interface TBAMatchAlliance {
  score: number
  team_keys: string[]
}

export interface TBAMatch {
  key: string
  event_key: string
  comp_level: 'qm' | 'ef' | 'qf' | 'sf' | 'f'
  match_number: number
  set_number: number
  alliances: {
    red: TBAMatchAlliance
    blue: TBAMatchAlliance
  }
  winning_alliance: 'red' | 'blue' | ''
  actual_time: number | null
  post_result_time: number | null
}
```

**Step 2: Write failing test**

```typescript
// src/lib/__tests__/tba.test.ts
import { TBAClient } from '../tba'

global.fetch = jest.fn()

test('TBAClient sets correct auth header', async () => {
  const mockFetch = global.fetch as jest.Mock
  mockFetch.mockResolvedValueOnce({
    ok: true, status: 200,
    headers: { get: () => null },
    json: async () => ({ team_number: 254 }),
  })
  const client = new TBAClient('test-key')
  await client.get('/team/frc254')
  expect(mockFetch).toHaveBeenCalledWith(
    expect.stringContaining('/team/frc254'),
    expect.objectContaining({
      headers: expect.objectContaining({ 'X-TBA-Auth-Key': 'test-key' })
    })
  )
})

test('TBAClient throws on non-ok response', async () => {
  const mockFetch = global.fetch as jest.Mock
  mockFetch.mockResolvedValueOnce({
    ok: false, status: 404,
    headers: { get: () => null },
  })
  const client = new TBAClient('test-key')
  await expect(client.get('/team/frc99999')).rejects.toThrow('TBA API error: 404')
})
```

**Step 3: Run test to verify it fails**

```bash
npx jest src/lib/__tests__/tba.test.ts
```

**Step 4: Create `src/lib/tba.ts`**

```typescript
const TBA_BASE = process.env.TBA_BASE_URL || 'https://www.thebluealliance.com/api/v3'

export class TBAClient {
  private etags = new Map<string, string>()

  constructor(private apiKey: string) {}

  async get<T>(path: string): Promise<T | null> {
    const url = `${TBA_BASE}${path}`
    const headers: Record<string, string> = {
      'X-TBA-Auth-Key': this.apiKey,
      'Accept': 'application/json',
    }
    const etag = this.etags.get(path)
    if (etag) headers['If-None-Match'] = etag

    const res = await fetch(url, { headers })
    if (res.status === 304) return null
    if (!res.ok) throw new Error(`TBA API error: ${res.status} for ${path}`)

    const newEtag = res.headers.get('etag')
    if (newEtag) this.etags.set(path, newEtag)
    return res.json() as Promise<T>
  }
}

export function getTBAClient(): TBAClient {
  const key = process.env.TBA_API_KEY
  if (!key) throw new Error('TBA_API_KEY environment variable not set')
  return new TBAClient(key)
}

export function parseTeamNumber(teamKey: string): number {
  return parseInt(teamKey.replace('frc', ''), 10)
}
```

**Step 5: Run test to verify it passes**

```bash
npx jest src/lib/__tests__/tba.test.ts
```
Expected: PASS

**Step 6: Commit**

```bash
git add src/lib/tba.ts src/lib/__tests__/tba.test.ts src/types/tba.ts
git commit -m "feat: add TBA API client with ETag caching support"
```

---

### Task 4: Data Sync Service

**Files:**
- Create: `src/lib/sync.ts`
- Create: `src/lib/__tests__/sync.test.ts`

**Step 1: Write failing test for leaderboard computation**

```typescript
// src/lib/__tests__/sync.test.ts
import { computeLeaderboardEntries } from '../sync'
import type { TBAMatch } from '../../types/tba'

const makeMatch = (key: string, redScore: number, blueScore: number, time: number): TBAMatch => ({
  key, event_key: '2026test', comp_level: 'qm', match_number: 1, set_number: 1,
  alliances: {
    red: { score: redScore, team_keys: ['frc1', 'frc2', 'frc3'] },
    blue: { score: blueScore, team_keys: ['frc4', 'frc5', 'frc6'] },
  },
  winning_alliance: redScore > blueScore ? 'red' : 'blue',
  actual_time: time,
  post_result_time: time + 300,
})

test('returns winning alliance entry per match', () => {
  const entries = computeLeaderboardEntries([makeMatch('2026test_qm1', 150, 120, 1000)])
  expect(entries).toHaveLength(1)
  expect(entries[0].alliance).toBe('red')
  expect(entries[0].score).toBe(150)
  expect(entries[0].team_numbers).toEqual([1, 2, 3])
})

test('skips matches with negative scores', () => {
  expect(computeLeaderboardEntries([makeMatch('k', -1, 0, 1000)])).toHaveLength(0)
})
```

**Step 2: Run test to verify it fails**

```bash
npx jest src/lib/__tests__/sync.test.ts
```

**Step 3: Create `src/lib/sync.ts`**

```typescript
import { getDb } from './db'
import { getTBAClient, parseTeamNumber } from './tba'
import type { TBAEvent, TBAMatch } from '@/types/tba'

export interface LeaderboardEntry {
  match_key: string
  event_key: string
  alliance: 'red' | 'blue'
  score: number
  team_numbers: number[]
  achieved_at: number
}

export function computeLeaderboardEntries(matches: TBAMatch[]): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = []
  for (const match of matches) {
    const { red, blue } = match.alliances
    if (red.score < 0 || blue.score < 0) continue
    if (match.actual_time === null && match.post_result_time === null) continue

    const time = match.post_result_time ?? match.actual_time ?? 0
    const winner: 'red' | 'blue' = red.score >= blue.score ? 'red' : 'blue'
    const winnerAlliance = winner === 'red' ? red : blue

    entries.push({
      match_key: match.key,
      event_key: match.event_key,
      alliance: winner,
      score: winnerAlliance.score,
      team_numbers: winnerAlliance.team_keys.map(parseTeamNumber),
      achieved_at: time,
    })
  }
  return entries
}

export async function syncYear(year: number = new Date().getFullYear()): Promise<void> {
  const db = getDb()
  const tba = getTBAClient()

  const logId = db.prepare(
    `INSERT INTO sync_log (started_at, status) VALUES (?, 'running')`
  ).run(Date.now()).lastInsertRowid

  try {
    const events = await tba.get<TBAEvent[]>(`/events/${year}/simple`)
    if (!events) return

    const insertEvent = db.prepare(`
      INSERT OR REPLACE INTO events
        (event_key, name, short_name, city, state_prov, country, year, start_date, end_date, event_type, last_updated)
      VALUES
        (@event_key, @name, @short_name, @city, @state_prov, @country, @year, @start_date, @end_date, @event_type, @last_updated)
    `)
    const insertMatch = db.prepare(`
      INSERT OR REPLACE INTO matches
        (match_key, event_key, comp_level, match_number, set_number, red_score, blue_score, red_teams, blue_teams, winning_alliance, actual_time, post_result_time)
      VALUES
        (@match_key, @event_key, @comp_level, @match_number, @set_number, @red_score, @blue_score, @red_teams, @blue_teams, @winning_alliance, @actual_time, @post_result_time)
    `)
    const insertLeaderboard = db.prepare(`
      INSERT OR REPLACE INTO leaderboard (match_key, event_key, alliance, score, team_numbers, achieved_at)
      VALUES (@match_key, @event_key, @alliance, @score, @team_numbers, @achieved_at)
    `)

    db.transaction((evts: TBAEvent[]) => {
      for (const e of evts) insertEvent.run({ ...e, event_key: e.key, last_updated: Date.now() })
    })(events)

    let matchesSynced = 0
    const BATCH = 5
    for (let i = 0; i < events.length; i += BATCH) {
      const results = await Promise.all(
        events.slice(i, i + BATCH).map(e => tba.get<TBAMatch[]>(`/event/${e.key}/matches`))
      )
      db.transaction(() => {
        for (const matches of results) {
          if (!matches) continue
          for (const m of matches) {
            insertMatch.run({
              match_key: m.key, event_key: m.event_key,
              comp_level: m.comp_level, match_number: m.match_number, set_number: m.set_number,
              red_score: m.alliances.red.score, blue_score: m.alliances.blue.score,
              red_teams: JSON.stringify(m.alliances.red.team_keys.map(parseTeamNumber)),
              blue_teams: JSON.stringify(m.alliances.blue.team_keys.map(parseTeamNumber)),
              winning_alliance: m.winning_alliance,
              actual_time: m.actual_time, post_result_time: m.post_result_time,
            })
            matchesSynced++
          }
          for (const entry of computeLeaderboardEntries(matches)) {
            insertLeaderboard.run({ ...entry, team_numbers: JSON.stringify(entry.team_numbers) })
          }
        }
      })()
    }

    db.prepare(
      `UPDATE sync_log SET finished_at=?, events_synced=?, matches_synced=?, status='success' WHERE id=?`
    ).run(Date.now(), events.length, matchesSynced, logId)
  } catch (err) {
    db.prepare(
      `UPDATE sync_log SET finished_at=?, status='error', error_message=? WHERE id=?`
    ).run(Date.now(), String(err), logId)
    throw err
  }
}

export async function syncTeams(teamNumbers: number[]): Promise<void> {
  const db = getDb()
  const tba = getTBAClient()
  const insert = db.prepare(`
    INSERT OR REPLACE INTO teams
      (team_number, nickname, city, state_prov, country, website, rookie_year, avatar_base64, last_updated)
    VALUES
      (@team_number, @nickname, @city, @state_prov, @country, @website, @rookie_year, @avatar_base64, @last_updated)
  `)

  const BATCH = 10
  for (let i = 0; i < teamNumbers.length; i += BATCH) {
    await Promise.all(teamNumbers.slice(i, i + BATCH).map(async num => {
      try {
        const [info, media] = await Promise.all([
          tba.get<any>(`/team/frc${num}/simple`),
          tba.get<any[]>(`/team/frc${num}/media/${new Date().getFullYear()}`)
        ])
        if (!info) return
        const avatar = media?.find((m: any) => m.type === 'avatar')
        insert.run({
          team_number: num,
          nickname: info.nickname ?? '',
          city: info.city ?? '',
          state_prov: info.state_prov ?? '',
          country: info.country ?? '',
          website: info.website ?? '',
          rookie_year: info.rookie_year ?? 0,
          avatar_base64: avatar?.details?.base64Image ?? null,
          last_updated: Date.now(),
        })
      } catch (e) {
        console.warn(`[sync] Failed to sync team ${num}:`, e)
      }
    }))
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npx jest src/lib/__tests__/sync.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/sync.ts src/lib/__tests__/sync.test.ts
git commit -m "feat: add data sync service with leaderboard computation and team avatar sync"
```

---

### Task 5: Weekend Scheduler & Sync API Route

**Files:**
- Create: `src/lib/scheduler.ts`
- Create: `src/app/api/sync/route.ts`

**Step 1: Create `src/lib/scheduler.ts`**

```typescript
import cron from 'node-cron'
import { syncYear } from './sync'

let scheduled = false

export function startScheduler(): void {
  if (scheduled) return
  scheduled = true
  // Every 30 minutes on Saturday (6) and Sunday (0)
  cron.schedule('*/30 * * * 0,6', async () => {
    console.log('[scheduler] Weekend sync at', new Date().toISOString())
    try { await syncYear() }
    catch (err) { console.error('[scheduler] Sync failed:', err) }
  })
  console.log('[scheduler] Scheduled (every 30min Sat/Sun)')
}
```

**Step 2: Create `src/app/api/sync/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { syncYear } from '@/lib/sync'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-sync-secret')
  if (process.env.NODE_ENV === 'production' && secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    await syncYear()
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
```

**Step 3: Add scheduler init to `src/app/layout.tsx` (server side only)**

Add before the RootLayout component:
```typescript
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  import('@/lib/scheduler').then(m => m.startScheduler())
}
```

**Step 4: Commit**

```bash
git add src/lib/scheduler.ts src/app/api/sync/route.ts src/app/layout.tsx
git commit -m "feat: add weekend cron scheduler and manual sync endpoint"
```

---

### Task 6: API Routes — Leaderboard, Events, Teams, Search

**Files:**
- Create: `src/lib/queries.ts`
- Create: `src/app/api/leaderboard/route.ts`
- Create: `src/app/api/events/route.ts`
- Create: `src/app/api/events/[eventKey]/leaderboard/route.ts`
- Create: `src/app/api/teams/[teamNumber]/route.ts`
- Create: `src/app/api/teams/[teamNumber]/matches/route.ts`
- Create: `src/app/api/search/route.ts`

**Step 1: Create `src/lib/queries.ts`**

```typescript
import { getDb } from './db'

export interface LeaderboardRow {
  rank: number
  score: number
  team_numbers: number[]
  match_key: string
  event_key: string
  event_name: string
  alliance: 'red' | 'blue'
  achieved_at: number
}

export function getGlobalLeaderboard(limit = 100): LeaderboardRow[] {
  const db = getDb()
  const rows = db.prepare(`
    SELECT
      ROW_NUMBER() OVER (ORDER BY l.score DESC, l.achieved_at ASC) as rank,
      l.score, l.team_numbers, l.match_key, l.event_key,
      e.name as event_name, l.alliance, l.achieved_at
    FROM leaderboard l
    LEFT JOIN events e ON l.event_key = e.event_key
    ORDER BY l.score DESC, l.achieved_at ASC
    LIMIT ?
  `).all(limit) as any[]
  return rows.map(r => ({ ...r, team_numbers: JSON.parse(r.team_numbers) }))
}

export function getEventLeaderboard(eventKey: string, limit = 50): LeaderboardRow[] {
  const db = getDb()
  const rows = db.prepare(`
    SELECT
      ROW_NUMBER() OVER (ORDER BY l.score DESC, l.achieved_at ASC) as rank,
      l.score, l.team_numbers, l.match_key, l.event_key,
      e.name as event_name, l.alliance, l.achieved_at
    FROM leaderboard l
    LEFT JOIN events e ON l.event_key = e.event_key
    WHERE l.event_key = ?
    ORDER BY l.score DESC, l.achieved_at ASC
    LIMIT ?
  `).all(eventKey, limit) as any[]
  return rows.map(r => ({ ...r, team_numbers: JSON.parse(r.team_numbers) }))
}

export function getTeamMatches(teamNumber: number) {
  const db = getDb()
  // Find matches where team appears in red or blue alliance
  const rows = db.prepare(`
    SELECT m.*, e.name as event_name,
      'red' as team_alliance,
      CASE
        WHEN m.winning_alliance = 'red' THEN 'win'
        WHEN m.winning_alliance = '' THEN 'tie'
        ELSE 'loss'
      END as result
    FROM matches m
    LEFT JOIN events e ON m.event_key = e.event_key
    WHERE EXISTS (
      SELECT 1 FROM json_each(m.red_teams) WHERE value = ?
    )
    UNION ALL
    SELECT m.*, e.name as event_name,
      'blue' as team_alliance,
      CASE
        WHEN m.winning_alliance = 'blue' THEN 'win'
        WHEN m.winning_alliance = '' THEN 'tie'
        ELSE 'loss'
      END as result
    FROM matches m
    LEFT JOIN events e ON m.event_key = e.event_key
    WHERE EXISTS (
      SELECT 1 FROM json_each(m.blue_teams) WHERE value = ?
    )
    ORDER BY actual_time ASC
  `).all(teamNumber, teamNumber) as any[]
  return rows.map(r => ({
    ...r,
    red_teams: JSON.parse(r.red_teams),
    blue_teams: JSON.parse(r.blue_teams),
  }))
}

export function searchTeams(query: string, limit = 20) {
  const db = getDb()
  const q = `%${query}%`
  return db.prepare(`
    SELECT team_number, nickname, city, state_prov, country
    FROM teams
    WHERE CAST(team_number AS TEXT) LIKE ? OR nickname LIKE ? OR city LIKE ?
    ORDER BY team_number ASC
    LIMIT ?
  `).all(q, q, q, limit) as any[]
}

export function getAllEvents(year?: number) {
  const db = getDb()
  return db.prepare(`
    SELECT event_key, name, short_name, city, state_prov, country, year, start_date, end_date
    FROM events WHERE year = ?
    ORDER BY start_date ASC
  `).all(year ?? new Date().getFullYear()) as any[]
}
```

**Step 2: Create `src/app/api/leaderboard/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getGlobalLeaderboard } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '100'), 500)
  try {
    return NextResponse.json(getGlobalLeaderboard(limit), {
      headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' }
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
```

**Step 3: Create remaining API routes**

`src/app/api/events/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getAllEvents } from '@/lib/queries'
export const dynamic = 'force-dynamic'
export async function GET(req: NextRequest) {
  const year = req.nextUrl.searchParams.get('year')
  return NextResponse.json(getAllEvents(year ? parseInt(year) : undefined))
}
```

`src/app/api/events/[eventKey]/leaderboard/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getEventLeaderboard } from '@/lib/queries'
export async function GET(_req: NextRequest, { params }: { params: { eventKey: string } }) {
  return NextResponse.json(getEventLeaderboard(params.eventKey))
}
```

`src/app/api/teams/[teamNumber]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
export async function GET(_req: NextRequest, { params }: { params: { teamNumber: string } }) {
  const team = getDb().prepare(`SELECT * FROM teams WHERE team_number = ?`).get(parseInt(params.teamNumber))
  if (!team) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(team)
}
```

`src/app/api/teams/[teamNumber]/matches/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getTeamMatches } from '@/lib/queries'
export async function GET(_req: NextRequest, { params }: { params: { teamNumber: string } }) {
  return NextResponse.json(getTeamMatches(parseInt(params.teamNumber)))
}
```

`src/app/api/search/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { searchTeams } from '@/lib/queries'
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  if (!q) return NextResponse.json([])
  return NextResponse.json(searchTeams(q))
}
```

**Step 4: Commit**

```bash
git add src/lib/queries.ts src/app/api/
git commit -m "feat: add all API routes for leaderboard, events, teams, and search"
```

---

### Task 7: React Query Provider & Client Hooks

**Files:**
- Create: `src/providers.tsx`
- Create: `src/hooks/useLeaderboard.ts`
- Create: `src/hooks/useFavorites.ts`
- Create: `src/hooks/useSearch.ts`
- Modify: `src/app/layout.tsx`

**Step 1: Create `src/providers.tsx`**

```typescript
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        refetchInterval: 30 * 60 * 1000,
      }
    }
  }))
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

**Step 2: Create `src/hooks/useLeaderboard.ts`**

```typescript
import { useQuery } from '@tanstack/react-query'

export function useLeaderboard(eventKey?: string) {
  return useQuery({
    queryKey: ['leaderboard', eventKey ?? 'global'],
    queryFn: async () => {
      const url = eventKey ? `/api/events/${eventKey}/leaderboard` : `/api/leaderboard`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch leaderboard')
      return res.json()
    },
  })
}

export function useEvents(year?: number) {
  return useQuery({
    queryKey: ['events', year],
    queryFn: async () => {
      const res = await fetch(`/api/events${year ? `?year=${year}` : ''}`)
      return res.json()
    },
    staleTime: 60 * 60 * 1000,
  })
}

export function useTeamMatches(teamNumber: number | null) {
  return useQuery({
    queryKey: ['team-matches', teamNumber],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${teamNumber}/matches`)
      return res.json()
    },
    enabled: teamNumber !== null,
  })
}
```

**Step 3: Create `src/hooks/useFavorites.ts`**

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface FavoritesStore {
  favorites: number[]
  toggleFavorite: (n: number) => void
  isFavorite: (n: number) => boolean
}

export const useFavorites = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      favorites: [],
      toggleFavorite: (n) => set(state => ({
        favorites: state.favorites.includes(n)
          ? state.favorites.filter(x => x !== n)
          : [...state.favorites, n]
      })),
      isFavorite: (n) => get().favorites.includes(n),
    }),
    { name: 'frc-favorites' }
  )
)
```

**Step 4: Create `src/hooks/useSearch.ts`**

```typescript
import { useQuery } from '@tanstack/react-query'
import { useState, useCallback } from 'react'

export function useSearch() {
  const [query, setQuery] = useState('')
  const results = useQuery({
    queryKey: ['search', query],
    queryFn: async () => {
      if (!query) return []
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      return res.json()
    },
    enabled: query.length >= 1,
    staleTime: 30 * 1000,
  })
  return {
    query,
    search: useCallback((q: string) => setQuery(q), []),
    results: results.data ?? [],
    isLoading: results.isLoading,
  }
}
```

**Step 5: Wrap layout in providers**

In `src/app/layout.tsx`, import `Providers` and wrap `{children}` with `<Providers>{children}</Providers>`.

**Step 6: Commit**

```bash
git add src/providers.tsx src/hooks/ src/app/layout.tsx
git commit -m "feat: add React Query provider and client hooks"
```

---

### Task 8: UI Components — Table, Alliance, Rank, Search, Header

**Files:**
- Create: `src/components/TeamAvatar.tsx`
- Create: `src/components/RankBadge.tsx`
- Create: `src/components/AllianceCell.tsx`
- Create: `src/components/LeaderboardTable.tsx`
- Create: `src/components/SearchBar.tsx`
- Create: `src/components/Header.tsx`

**Step 1: Create `src/components/TeamAvatar.tsx`**

```typescript
interface Props { teamNumber: number; size?: number; className?: string; base64?: string }
export function TeamAvatar({ teamNumber, size = 32, className = '', base64 }: Props) {
  if (base64) {
    return <img src={`data:image/png;base64,${base64}`} alt={`Team ${teamNumber}`}
      width={size} height={size} className={`rounded object-contain ${className}`} />
  }
  return (
    <div className={`rounded flex items-center justify-center font-bold bg-zinc-800 border border-zinc-700 text-zinc-300 shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.28 }}>
      {teamNumber}
    </div>
  )
}
```

**Step 2: Create `src/components/RankBadge.tsx`**

```typescript
export function RankBadge({ rank }: { rank: number }) {
  const cls = rank === 1 ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'
    : rank === 2 ? 'text-zinc-300 bg-zinc-300/10 border-zinc-400/30'
    : rank === 3 ? 'text-orange-400 bg-orange-400/10 border-orange-400/30'
    : 'text-zinc-500 bg-zinc-800/50 border-zinc-700'
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full border font-bold text-sm ${cls}`}>
      {rank}
    </span>
  )
}
```

**Step 3: Create `src/components/AllianceCell.tsx`**

```typescript
'use client'
import { useFavorites } from '@/hooks/useFavorites'
import { Star } from 'lucide-react'

interface Props { teamNumbers: number[]; alliance: 'red' | 'blue'; onTeamClick?: (n: number) => void }

export function AllianceCell({ teamNumbers, alliance, onTeamClick }: Props) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const color = alliance === 'red' ? 'text-red-400' : 'text-blue-400'
  const border = alliance === 'red' ? 'border-red-900/50' : 'border-blue-900/50'
  const bg = alliance === 'red' ? 'bg-red-950/20' : 'bg-blue-950/20'
  return (
    <div className={`flex items-center gap-3 px-2 py-1 rounded border ${border} ${bg}`}>
      {teamNumbers.map(num => (
        <div key={num} className="flex items-center gap-1">
          <button onClick={() => onTeamClick?.(num)}
            className={`font-bold text-sm hover:underline ${color}`}>{num}</button>
          <button onClick={() => toggleFavorite(num)}>
            <Star size={11} className={isFavorite(num) ? 'fill-yellow-400 text-yellow-400' : 'text-zinc-700 hover:text-zinc-500'} />
          </button>
        </div>
      ))}
    </div>
  )
}
```

**Step 4: Create `src/components/LeaderboardTable.tsx`**

```typescript
'use client'
import { RankBadge } from './RankBadge'
import { AllianceCell } from './AllianceCell'

interface Row { rank: number; score: number; team_numbers: number[]; match_key: string; event_key: string; event_name: string; alliance: 'red' | 'blue'; achieved_at: number }
interface Props { rows: Row[]; highlightTeams?: number[]; onTeamClick?: (n: number) => void }

export function LeaderboardTable({ rows, highlightTeams = [], onTeamClick }: Props) {
  if (!rows.length) return <div className="text-center text-zinc-500 py-16">No data yet. Trigger a sync to populate.</div>
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500 uppercase tracking-wide">
            <th className="py-2 px-3 w-12">Rank</th>
            <th className="py-2 px-3">Alliance</th>
            <th className="py-2 px-3 text-right">Score</th>
            <th className="py-2 px-3 hidden md:table-cell">Event</th>
            <th className="py-2 px-3 hidden lg:table-cell">Match</th>
            <th className="py-2 px-3 hidden lg:table-cell">Date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const highlighted = highlightTeams.length > 0 && row.team_numbers.some(n => highlightTeams.includes(n))
            return (
              <tr key={row.match_key + row.alliance}
                className={`border-b border-zinc-800/50 group transition-colors
                  ${highlighted ? 'bg-yellow-400/5 border-yellow-400/20' : 'hover:bg-zinc-800/30'}
                  ${i % 2 === 1 ? 'bg-zinc-900/20' : ''}`}>
                <td className="py-2.5 px-3"><RankBadge rank={row.rank} /></td>
                <td className="py-2.5 px-3">
                  <AllianceCell teamNumbers={row.team_numbers} alliance={row.alliance} onTeamClick={onTeamClick} />
                </td>
                <td className="py-2.5 px-3 text-right">
                  <span className={`text-2xl font-black tabular-nums ${row.alliance === 'red' ? 'text-red-400' : 'text-blue-400'}`}>
                    {row.score}
                  </span>
                </td>
                <td className="py-2.5 px-3 hidden md:table-cell text-sm text-zinc-400">{row.event_name}</td>
                <td className="py-2.5 px-3 hidden lg:table-cell text-xs text-zinc-500 font-mono">
                  {row.match_key.split('_')[1]?.toUpperCase()}
                </td>
                <td className="py-2.5 px-3 hidden lg:table-cell text-xs text-zinc-500">
                  {row.achieved_at ? new Date(row.achieved_at * 1000).toLocaleDateString() : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

**Step 5: Create `src/components/SearchBar.tsx`**

```typescript
'use client'
import { useSearch } from '@/hooks/useSearch'
import { Search, X } from 'lucide-react'
import { useState } from 'react'

export function SearchBar({ onTeamSelect }: { onTeamSelect: (n: number) => void }) {
  const { query, search, results, isLoading } = useSearch()
  const [open, setOpen] = useState(false)
  return (
    <div className="relative w-full max-w-sm">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
        <input value={query}
          onChange={e => { search(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search team # or name..."
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-9 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
        />
        {query && <button onClick={() => search('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"><X size={14} /></button>}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden">
          {results.map((t: any) => (
            <button key={t.team_number}
              onMouseDown={() => { onTeamSelect(t.team_number); search(''); setOpen(false) }}
              className="w-full px-3 py-2 text-left hover:bg-zinc-800 flex items-center gap-3">
              <span className="font-bold text-blue-400 w-12 shrink-0">{t.team_number}</span>
              <span className="text-zinc-300 text-sm truncate">{t.nickname}</span>
              <span className="text-zinc-500 text-xs ml-auto shrink-0">{t.city}, {t.state_prov}</span>
            </button>
          ))}
        </div>
      )}
      {open && query && !results.length && !isLoading && (
        <div className="absolute top-full mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 p-3 text-sm text-zinc-500">No teams found</div>
      )}
    </div>
  )
}
```

**Step 6: Create `src/components/Header.tsx`**

```typescript
'use client'
import { SearchBar } from './SearchBar'
import { Star, RefreshCw } from 'lucide-react'

interface Props {
  onTeamSelect: (n: number) => void
  onShowFavorites: () => void
  showingFavorites: boolean
  onSync?: () => void
  isSyncing?: boolean
}

export function Header({ onTeamSelect, onShowFavorites, showingFavorites, onSync, isSyncing }: Props) {
  return (
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white text-[10px] font-black leading-none">FRC</span>
          </div>
          <span className="font-bold text-zinc-100 hidden sm:block text-sm">Leaderboard</span>
        </div>
        <div className="flex-1"><SearchBar onTeamSelect={onTeamSelect} /></div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onShowFavorites}
            className={`p-2 rounded-lg transition-colors ${showingFavorites ? 'bg-yellow-400/10 text-yellow-400' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}>
            <Star size={16} className={showingFavorites ? 'fill-yellow-400' : ''} />
          </button>
          {onSync && (
            <button onClick={onSync} disabled={isSyncing}
              className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors disabled:opacity-40">
              <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
```

**Step 7: Commit**

```bash
git add src/components/
git commit -m "feat: add all UI components - table, search, header, rank, alliance cell"
```

---

### Task 9: Event Filter, Compare Panel, Team Drawer

**Files:**
- Create: `src/components/EventFilter.tsx`
- Create: `src/components/ComparePanel.tsx`
- Create: `src/components/TeamDrawer.tsx`

**Step 1: Create `src/components/EventFilter.tsx`**

```typescript
'use client'
import { useEvents } from '@/hooks/useLeaderboard'
import { Filter } from 'lucide-react'

export function EventFilter({ selectedEvent, onSelect }: { selectedEvent?: string; onSelect: (k?: string) => void }) {
  const { data: events = [] } = useEvents()
  return (
    <div className="flex items-center gap-2">
      <Filter size={13} className="text-zinc-500" />
      <select value={selectedEvent ?? ''} onChange={e => onSelect(e.target.value || undefined)}
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-blue-500/50 cursor-pointer">
        <option value="">All Events</option>
        {events.map((e: any) => (
          <option key={e.event_key} value={e.event_key}>{e.short_name ?? e.name}</option>
        ))}
      </select>
    </div>
  )
}
```

**Step 2: Create `src/components/ComparePanel.tsx`**

```typescript
'use client'
import { useTeamMatches } from '@/hooks/useLeaderboard'
import { X, TrendingUp } from 'lucide-react'

function TeamStats({ teamNumber }: { teamNumber: number }) {
  const { data: matches = [], isLoading } = useTeamMatches(teamNumber)
  const wins = matches.filter((m: any) => m.result === 'win').length
  const losses = matches.filter((m: any) => m.result === 'loss').length
  const ties = matches.filter((m: any) => m.result === 'tie').length
  const scores = matches.map((m: any) => m.team_alliance === 'red' ? m.red_score : m.blue_score).filter((s: number) => s >= 0)
  const avg = scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0
  const best = scores.length ? Math.max(...scores) : 0
  if (isLoading) return <div className="text-zinc-500 text-sm animate-pulse">Loading...</div>
  return (
    <div className="space-y-3">
      <div className="text-center">
        <div className="text-3xl font-black text-blue-400">{teamNumber}</div>
        <div className="text-xs text-zinc-500">{matches.length} matches</div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="bg-green-950/40 rounded p-2"><div className="font-bold text-green-400">{wins}</div><div className="text-xs text-zinc-500">W</div></div>
        <div className="bg-red-950/40 rounded p-2"><div className="font-bold text-red-400">{losses}</div><div className="text-xs text-zinc-500">L</div></div>
        <div className="bg-zinc-800/50 rounded p-2"><div className="font-bold text-zinc-400">{ties}</div><div className="text-xs text-zinc-500">T</div></div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-center text-sm">
        <div className="bg-zinc-800/50 rounded p-2"><div className="font-bold text-zinc-200">{avg}</div><div className="text-xs text-zinc-500">Avg</div></div>
        <div className="bg-zinc-800/50 rounded p-2"><div className="font-bold text-yellow-400">{best}</div><div className="text-xs text-zinc-500">Best</div></div>
      </div>
    </div>
  )
}

export function ComparePanel({ teamA, teamB, onClose }: { teamA: number; teamB: number; onClose: () => void }) {
  return (
    <div className="fixed inset-y-0 right-0 w-72 bg-zinc-950 border-l border-zinc-800 shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <TrendingUp size={15} className="text-blue-400" />
          <span className="font-semibold text-zinc-200 text-sm">Compare Teams</span>
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X size={16} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <div className="text-xs text-red-400 uppercase tracking-wide font-semibold mb-2">Team A</div>
          <TeamStats teamNumber={teamA} />
        </div>
        <div className="border-t border-zinc-800" />
        <div>
          <div className="text-xs text-blue-400 uppercase tracking-wide font-semibold mb-2">Team B</div>
          <TeamStats teamNumber={teamB} />
        </div>
      </div>
    </div>
  )
}
```

**Step 3: Create `src/components/TeamDrawer.tsx`**

```typescript
'use client'
import { useTeamMatches } from '@/hooks/useLeaderboard'
import { useFavorites } from '@/hooks/useFavorites'
import { X, Star, TrendingUp } from 'lucide-react'

interface Props { teamNumber: number; onClose: () => void; onCompare?: (n: number) => void; highlightMatchKey?: string }

export function TeamDrawer({ teamNumber, onClose, onCompare, highlightMatchKey }: Props) {
  const { data: matches = [], isLoading } = useTeamMatches(teamNumber)
  const { isFavorite, toggleFavorite } = useFavorites()
  const fav = isFavorite(teamNumber)
  const wins = matches.filter((m: any) => m.result === 'win').length
  const losses = matches.filter((m: any) => m.result === 'loss').length
  const ties = matches.filter((m: any) => m.result === 'tie').length

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-zinc-950 border-l border-zinc-800 shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-800 border border-zinc-700 rounded flex items-center justify-center font-bold text-blue-400 text-sm">{teamNumber}</div>
          <div>
            <div className="font-bold text-zinc-200">Team {teamNumber}</div>
            <div className="text-xs text-zinc-500">{matches.length} matches played</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => toggleFavorite(teamNumber)} className={`p-1.5 rounded ${fav ? 'text-yellow-400' : 'text-zinc-600 hover:text-zinc-400'}`}>
            <Star size={15} className={fav ? 'fill-yellow-400' : ''} />
          </button>
          {onCompare && (
            <button onClick={() => onCompare(teamNumber)} className="p-1.5 rounded text-zinc-500 hover:text-blue-400" title="Compare">
              <TrendingUp size={15} />
            </button>
          )}
          <button onClick={onClose} className="p-1.5 rounded text-zinc-500 hover:text-zinc-300"><X size={17} /></button>
        </div>
      </div>

      <div className="px-4 py-2.5 border-b border-zinc-800 flex gap-4 text-sm font-bold">
        <span className="text-green-400">{wins}W</span>
        <span className="text-red-400">{losses}L</span>
        <span className="text-zinc-500">{ties}T</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-6 text-center text-zinc-500 text-sm animate-pulse">Loading...</div>
        ) : !matches.length ? (
          <div className="p-6 text-center text-zinc-500 text-sm">No matches found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-zinc-950 border-b border-zinc-800">
              <tr className="text-xs text-zinc-500 uppercase tracking-wide">
                <th className="text-left py-2 px-4">Match</th>
                <th className="text-left py-2 px-2">Event</th>
                <th className="text-right py-2 px-4">Score</th>
                <th className="text-right py-2 px-3">Result</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m: any) => {
                const highlight = m.match_key === highlightMatchKey
                const score = m.team_alliance === 'red' ? m.red_score : m.blue_score
                const rc = m.result === 'win' ? 'text-green-400' : m.result === 'loss' ? 'text-red-400' : 'text-zinc-500'
                const ac = m.team_alliance === 'red' ? 'border-l-red-500' : 'border-l-blue-500'
                return (
                  <tr key={m.match_key} className={`border-b border-zinc-800/50 border-l-2 ${ac} ${highlight ? 'bg-yellow-400/10' : 'hover:bg-zinc-800/30'}`}>
                    <td className="py-2 px-4 font-mono text-xs text-zinc-400">{m.match_key.split('_')[1]?.toUpperCase()}</td>
                    <td className="py-2 px-2 text-xs text-zinc-500 truncate max-w-[90px]">{m.event_name}</td>
                    <td className="py-2 px-4 text-right font-bold tabular-nums text-zinc-200">{score >= 0 ? score : '—'}</td>
                    <td className={`py-2 px-3 text-right font-bold uppercase text-xs ${rc}`}>{m.result}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add src/components/EventFilter.tsx src/components/ComparePanel.tsx src/components/TeamDrawer.tsx
git commit -m "feat: add event filter, compare panel, and team drawer components"
```

---

### Task 10: Main Page Assembly

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

**Step 1: Rewrite `src/app/page.tsx`**

```typescript
'use client'
import { useState } from 'react'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { useFavorites } from '@/hooks/useFavorites'
import { Header } from '@/components/Header'
import { LeaderboardTable } from '@/components/LeaderboardTable'
import { EventFilter } from '@/components/EventFilter'
import { TeamDrawer } from '@/components/TeamDrawer'
import { ComparePanel } from '@/components/ComparePanel'
import { RefreshCw, Wifi } from 'lucide-react'

export default function HomePage() {
  const [selectedEvent, setSelectedEvent] = useState<string>()
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null)
  const [compareTeams, setCompareTeams] = useState<[number, number] | null>(null)
  const [showFavorites, setShowFavorites] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const { data: rows = [], isLoading, dataUpdatedAt } = useLeaderboard(selectedEvent)
  const { favorites } = useFavorites()

  const displayRows = showFavorites
    ? rows.filter((r: any) => r.team_numbers.some((n: number) => favorites.includes(n)))
    : rows

  const handleSync = async () => {
    setIsSyncing(true)
    try { await fetch('/api/sync', { method: 'POST' }) }
    finally { setIsSyncing(false) }
  }

  const handleCompareRequest = (teamNumber: number) => {
    if (selectedTeam && selectedTeam !== teamNumber) {
      setCompareTeams([selectedTeam, teamNumber])
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header
        onTeamSelect={setSelectedTeam}
        onShowFavorites={() => setShowFavorites(v => !v)}
        showingFavorites={showFavorites}
        onSync={handleSync}
        isSyncing={isSyncing}
      />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Hero stats */}
        <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          {rows[0] && (
            <div className="col-span-2 bg-gradient-to-r from-blue-950/60 to-zinc-900/50 border border-blue-900/30 rounded-xl p-5">
              <div className="text-xs text-blue-400 uppercase tracking-widest font-semibold mb-1">Top Score 2026</div>
              <div className="text-6xl font-black text-white tabular-nums">{rows[0].score}</div>
              <div className="text-sm text-zinc-400 mt-1.5">
                <span className={rows[0].alliance === 'red' ? 'text-red-400' : 'text-blue-400'}>
                  {rows[0].team_numbers.join(' · ')}
                </span>
                {rows[0].event_name && <span className="text-zinc-600"> @ {rows[0].event_name}</span>}
              </div>
            </div>
          )}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="text-xs text-zinc-500 uppercase tracking-wide">Ranked Entries</div>
            <div className="text-3xl font-bold text-zinc-200">{rows.length}</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 uppercase tracking-wide">
              <Wifi size={10} />Last Sync
            </div>
            <div className="text-xs text-zinc-400">
              {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : '—'}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-zinc-100">
              {showFavorites ? 'Favorites' : selectedEvent ? 'Event Leaderboard' : 'Global Leaderboard'}
            </h1>
            <EventFilter selectedEvent={selectedEvent} onSelect={setSelectedEvent} />
          </div>
          {isLoading && <RefreshCw size={14} className="text-zinc-500 animate-spin" />}
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <LeaderboardTable
            rows={displayRows}
            highlightTeams={selectedTeam ? [selectedTeam] : favorites}
            onTeamClick={setSelectedTeam}
          />
        </div>

        <p className="text-xs text-zinc-600 text-center mt-4">
          Auto-syncs every 30 min on weekends · Powered by The Blue Alliance
        </p>
      </main>

      {selectedTeam !== null && (
        <TeamDrawer
          teamNumber={selectedTeam}
          onClose={() => setSelectedTeam(null)}
          onCompare={handleCompareRequest}
        />
      )}

      {compareTeams && (
        <ComparePanel teamA={compareTeams[0]} teamB={compareTeams[1]} onClose={() => setCompareTeams(null)} />
      )}
    </div>
  )
}
```

**Step 2: Update `src/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root { --background: #09090b; --foreground: #e4e4e7; }
body { background: var(--background); color: var(--foreground); font-family: system-ui, -apple-system, sans-serif; }
* { scrollbar-width: thin; scrollbar-color: #3f3f46 transparent; }
```

**Step 3: Commit**

```bash
git add src/app/page.tsx src/app/globals.css
git commit -m "feat: assemble main page with hero stats, leaderboard, drawers, and FRC styling"
```

---

### Task 11: Config, Initial Sync Script, and README

**Files:**
- Modify: `next.config.ts`
- Create: `scripts/initial-sync.ts`
- Create: `README.md`

**Step 1: Update `next.config.ts`**

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
}

export default nextConfig
```

**Step 2: Create `scripts/initial-sync.ts`**

```typescript
// Run once to seed the database: npx tsx scripts/initial-sync.ts
import { syncYear } from '../src/lib/sync'

async function main() {
  const year = parseInt(process.argv[2] ?? String(new Date().getFullYear()))
  console.log(`[initial-sync] Syncing year ${year}...`)
  await syncYear(year)
  console.log('[initial-sync] Done.')
  process.exit(0)
}

main().catch(err => { console.error(err); process.exit(1) })
```

**Step 3: Create `README.md`**

```markdown
# FRC Rebuilt Leaderboard

Interactive FRC match score leaderboard powered by The Blue Alliance API.

## Quick Start

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in your TBA API key
3. `npx tsx scripts/initial-sync.ts` — seeds the database (run once)
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

Next.js 14 · TypeScript · SQLite (better-sqlite3) · TBA API v3 · Tailwind CSS · TanStack Query · Zustand · node-cron
```

**Step 4: Commit**

```bash
git add next.config.ts scripts/ README.md
git commit -m "chore: add config, initial sync script, and README"
```

---

## Task Summary

| # | Task | Key Deliverable |
|---|------|-----------------|
| 1 | Project Scaffolding | Next.js 14 + deps |
| 2 | Database Schema | SQLite with teams/events/matches/leaderboard |
| 3 | TBA API Client | ETag-cached HTTP client |
| 4 | Data Sync Service | `computeLeaderboardEntries` + full sync |
| 5 | Scheduler + Sync API | node-cron weekend job, POST /api/sync |
| 6 | API Routes | leaderboard, events, teams, search |
| 7 | React Query + Hooks | Data fetching, favorites (Zustand) |
| 8 | UI Components | Table, search, header, rank, alliance |
| 9 | Panels | Event filter, compare panel, team drawer |
| 10 | Main Page | Full assembly with hero stats |
| 11 | Config + Scripts | next.config, seed script, README |