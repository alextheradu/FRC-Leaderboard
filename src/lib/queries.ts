import { ensureDbSchema, getDb } from './db'

export interface LeaderboardRow {
  rank: number
  score: number
  team_numbers: number[]
  match_key: string
  event_key: string
  event_name: string
  alliance: 'red' | 'blue'
  achieved_at: number
  video_url: string | null
}

export interface LeaderboardPage {
  rows: LeaderboardRow[]
  total: number
  limit: number
  offset: number
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  return 0
}

function parseNumberArray(value: unknown): number[] {
  if (Array.isArray(value)) return value.map((v) => toNumber(v))
  if (typeof value === 'string' && value.length > 0) {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed.map((v) => toNumber(v)) : []
    } catch {
      return []
    }
  }
  return []
}

type RawLeaderboardRow = {
  score: number | string
  team_numbers: unknown
  match_key: string
  event_key: string
  event_name: string | null
  alliance: 'red' | 'blue'
  achieved_at: number | string
  video_url: string | null
}

async function fetchLeaderboardRows(eventKey?: string): Promise<LeaderboardRow[]> {
  await ensureDbSchema()
  const db = getDb()
  const rows = (eventKey
    ? await db<RawLeaderboardRow[]>`
      SELECT
        l.score, l.team_numbers, l.match_key, l.event_key,
        e.name as event_name, l.alliance, l.achieved_at, m.video_url
      FROM leaderboard l
      LEFT JOIN events e ON l.event_key = e.event_key
      LEFT JOIN matches m ON l.match_key = m.match_key
      WHERE l.event_key = ${eventKey}
      ORDER BY l.score DESC, l.achieved_at ASC
    `
    : await db<RawLeaderboardRow[]>`
      SELECT
        l.score, l.team_numbers, l.match_key, l.event_key,
        e.name as event_name, l.alliance, l.achieved_at, m.video_url
      FROM leaderboard l
      LEFT JOIN events e ON l.event_key = e.event_key
      LEFT JOIN matches m ON l.match_key = m.match_key
      ORDER BY l.score DESC, l.achieved_at ASC
    `
  ) as RawLeaderboardRow[]

  return rows.map((r) => ({
    rank: 0,
    score: toNumber(r.score),
    team_numbers: parseNumberArray(r.team_numbers),
    match_key: r.match_key,
    event_key: r.event_key,
    event_name: r.event_name ?? 'Unknown Event',
    alliance: r.alliance,
    achieved_at: toNumber(r.achieved_at),
    video_url: r.video_url ?? null,
  }))
}

function dedupeLeaderboardRows(rows: LeaderboardRow[]): LeaderboardRow[] {
  const seenTeams = new Set<number>()
  const deduped: LeaderboardRow[] = []
  for (const row of rows) {
    const hasUnseenTeam = row.team_numbers.some((team) => !seenTeams.has(team))
    if (!hasUnseenTeam) continue
    for (const team of row.team_numbers) seenTeams.add(team)
    deduped.push({ ...row, rank: deduped.length + 1 })
  }
  return deduped
}

async function getLeaderboardPage(
  eventKey: string | undefined,
  limit: number,
  offset: number
): Promise<LeaderboardPage> {
  const safeLimit = Math.max(1, Math.min(limit, 500))
  const safeOffset = Math.max(0, offset)
  const rows = dedupeLeaderboardRows(await fetchLeaderboardRows(eventKey))
  return {
    rows: rows.slice(safeOffset, safeOffset + safeLimit),
    total: rows.length,
    limit: safeLimit,
    offset: safeOffset,
  }
}

export async function getGlobalLeaderboardPage(limit = 100, offset = 0): Promise<LeaderboardPage> {
  return getLeaderboardPage(undefined, limit, offset)
}

export async function getEventLeaderboardPage(
  eventKey: string,
  limit = 100,
  offset = 0
): Promise<LeaderboardPage> {
  return getLeaderboardPage(eventKey, limit, offset)
}

export async function getGlobalLeaderboard(limit = 100): Promise<LeaderboardRow[]> {
  return (await getGlobalLeaderboardPage(limit, 0)).rows
}

export async function getEventLeaderboard(eventKey: string, limit = 100): Promise<LeaderboardRow[]> {
  return (await getEventLeaderboardPage(eventKey, limit, 0)).rows
}

export async function getTeamPlacement(teamNumber: number, eventKey?: string) {
  const rows = dedupeLeaderboardRows(await fetchLeaderboardRows(eventKey))
  const teamRow = rows.find((row) => row.team_numbers.includes(teamNumber))
  if (!teamRow) return null
  return {
    rank: teamRow.rank,
    total: rows.length,
  }
}

type RawTeamMatch = {
  match_key: string
  event_key: string
  comp_level: string
  match_number: number
  set_number: number
  red_score: number | null
  blue_score: number | null
  red_teams: unknown
  blue_teams: unknown
  winning_alliance: string | null
  actual_time: number | string | null
  post_result_time: number | string | null
  video_url: string | null
  event_name: string | null
  team_alliance: string
  result: string
}

export async function getTeamMatches(teamNumber: number) {
  await ensureDbSchema()
  const db = getDb()
  const rows = (await db<RawTeamMatch[]>`
    SELECT m.*, e.name as event_name,
      'red'::text as team_alliance,
      CASE
        WHEN (m.actual_time IS NULL AND m.post_result_time IS NULL) OR m.red_score < 0 OR m.blue_score < 0 THEN 'unplayed'
        WHEN m.winning_alliance = 'red' THEN 'win'
        WHEN m.winning_alliance = '' OR m.winning_alliance IS NULL THEN 'tie'
        ELSE 'loss'
      END as result
    FROM matches m
    LEFT JOIN events e ON m.event_key = e.event_key
    WHERE EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(m.red_teams::jsonb) AS team(value)
      WHERE (team.value)::int = ${teamNumber}
    )
    UNION ALL
    SELECT m.*, e.name as event_name,
      'blue'::text as team_alliance,
      CASE
        WHEN (m.actual_time IS NULL AND m.post_result_time IS NULL) OR m.red_score < 0 OR m.blue_score < 0 THEN 'unplayed'
        WHEN m.winning_alliance = 'blue' THEN 'win'
        WHEN m.winning_alliance = '' OR m.winning_alliance IS NULL THEN 'tie'
        ELSE 'loss'
      END as result
    FROM matches m
    LEFT JOIN events e ON m.event_key = e.event_key
    WHERE EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(m.blue_teams::jsonb) AS team(value)
      WHERE (team.value)::int = ${teamNumber}
    )
    ORDER BY COALESCE(actual_time, post_result_time, 0) DESC
  `) as RawTeamMatch[]

  return rows.map((r) => ({
    ...r,
    red_score: r.red_score ?? -1,
    blue_score: r.blue_score ?? -1,
    actual_time: r.actual_time === null ? null : toNumber(r.actual_time),
    post_result_time: r.post_result_time === null ? null : toNumber(r.post_result_time),
    event_name: r.event_name ?? 'Unknown Event',
    red_teams: parseNumberArray(r.red_teams),
    blue_teams: parseNumberArray(r.blue_teams),
  }))
}

export async function searchTeams(query: string, limit = 20) {
  await ensureDbSchema()
  const db = getDb()
  const normalized = query.trim()
  if (!normalized) return []

  const countRows = (await db<{ count: string | number }[]>`
    SELECT COUNT(*)::bigint as count FROM teams
  `) as Array<{ count: string | number }>
  const teamCount = toNumber(countRows[0]?.count ?? 0)

  if (teamCount === 0) {
    await db`
      INSERT INTO teams (team_number, nickname, city, state_prov, country, last_updated)
      SELECT DISTINCT (j.value)::int, '', '', '', '', ${Date.now()}
      FROM (
        SELECT red_teams::jsonb AS team_json FROM matches
        UNION ALL
        SELECT blue_teams::jsonb AS team_json FROM matches
      ) m
      CROSS JOIN LATERAL jsonb_array_elements_text(m.team_json) AS j(value)
      ON CONFLICT (team_number) DO NOTHING
    `
  }

  const q = `%${normalized}%`
  return (await db`
    SELECT team_number, COALESCE(nickname, '') as nickname, COALESCE(city, '') as city, state_prov, country
    FROM teams
    WHERE CAST(team_number AS TEXT) ILIKE ${q}
       OR COALESCE(nickname, '') ILIKE ${q}
       OR COALESCE(city, '') ILIKE ${q}
    ORDER BY team_number ASC
    LIMIT ${Math.max(1, Math.min(limit, 100))}
  `) as Array<Record<string, unknown>>
}

export async function getAllEvents(year?: number) {
  await ensureDbSchema()
  const db = getDb()
  return (await db`
    SELECT event_key, name, short_name, city, state_prov, country, year, start_date, end_date
    FROM events
    WHERE year = ${year ?? new Date().getFullYear()}
    ORDER BY start_date ASC
  `) as Array<Record<string, unknown>>
}

export async function getTeam(teamNumber: number) {
  await ensureDbSchema()
  const db = getDb()
  const rows = (await db`
    SELECT *
    FROM teams
    WHERE team_number = ${teamNumber}
    LIMIT 1
  `) as Array<Record<string, unknown>>
  return rows[0] ?? null
}

