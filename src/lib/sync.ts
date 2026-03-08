import { ensureDbSchema, getDb } from './db'
import { getTBAClient, parseTeamNumber } from './tba'
import type { TBAEvent, TBAMatch } from '../types/tba'

export interface SyncLogger {
  log: (message: string) => void
  progress: (current: number, total: number, label: string) => void
}

export interface LeaderboardEntry {
  match_key: string
  event_key: string
  alliance: 'red' | 'blue'
  score: number
  foul_points: number
  team_numbers: number[]
  achieved_at: number
}

interface EventRow {
  event_key: string
  name: string
  short_name: string | null
  city: string | null
  state_prov: string | null
  country: string | null
  year: number
  start_date: string | null
  end_date: string | null
  event_type: number | null
  last_updated: number
}

interface MatchRow {
  match_key: string
  event_key: string
  comp_level: string
  match_number: number
  set_number: number
  red_score: number
  blue_score: number
  red_teams: string
  blue_teams: string
  winning_alliance: string | null
  actual_time: number | null
  post_result_time: number | null
  video_url: string | null
}

interface LeaderboardRow {
  match_key: string
  event_key: string
  alliance: 'red' | 'blue'
  score: number
  foul_points: number
  team_numbers: string
  achieved_at: number
}

interface TeamStubRow {
  team_number: number
  last_updated: number
}

interface TeamDetailRow {
  team_number: number
  nickname: string
  city: string
  state_prov: string
  country: string
  website: string
  rookie_year: number
  avatar_base64: string | null
  last_updated: number
}

const noopLogger: SyncLogger = { log: () => { }, progress: () => { } }

function upsertEvents(rows: EventRow[]): void {
  if (!rows.length) return
  const db = getDb()
  const stmt = db.prepare(`
    INSERT INTO events (
      event_key,
      name,
      short_name,
      city,
      state_prov,
      country,
      year,
      start_date,
      end_date,
      event_type,
      last_updated
    ) VALUES (
      @event_key,
      @name,
      @short_name,
      @city,
      @state_prov,
      @country,
      @year,
      @start_date,
      @end_date,
      @event_type,
      @last_updated
    )
    ON CONFLICT(event_key) DO UPDATE SET
      name = excluded.name,
      short_name = excluded.short_name,
      city = excluded.city,
      state_prov = excluded.state_prov,
      country = excluded.country,
      year = excluded.year,
      start_date = excluded.start_date,
      end_date = excluded.end_date,
      event_type = excluded.event_type,
      last_updated = excluded.last_updated
  `)

  const tx = db.transaction((items: EventRow[]) => {
    for (const row of items) stmt.run(row)
  })

  tx(rows)
}

function upsertMatches(rows: MatchRow[]): void {
  if (!rows.length) return
  const db = getDb()
  const stmt = db.prepare(`
    INSERT INTO matches (
      match_key,
      event_key,
      comp_level,
      match_number,
      set_number,
      red_score,
      blue_score,
      red_teams,
      blue_teams,
      winning_alliance,
      actual_time,
      post_result_time,
      video_url
    ) VALUES (
      @match_key,
      @event_key,
      @comp_level,
      @match_number,
      @set_number,
      @red_score,
      @blue_score,
      @red_teams,
      @blue_teams,
      @winning_alliance,
      @actual_time,
      @post_result_time,
      @video_url
    )
    ON CONFLICT(match_key) DO UPDATE SET
      event_key = excluded.event_key,
      comp_level = excluded.comp_level,
      match_number = excluded.match_number,
      set_number = excluded.set_number,
      red_score = excluded.red_score,
      blue_score = excluded.blue_score,
      red_teams = excluded.red_teams,
      blue_teams = excluded.blue_teams,
      winning_alliance = excluded.winning_alliance,
      actual_time = excluded.actual_time,
      post_result_time = excluded.post_result_time,
      video_url = excluded.video_url
  `)

  const tx = db.transaction((items: MatchRow[]) => {
    for (const row of items) stmt.run(row)
  })

  tx(rows)
}

function upsertLeaderboard(rows: LeaderboardRow[]): void {
  if (!rows.length) return
  const db = getDb()
  const stmt = db.prepare(`
    INSERT INTO leaderboard (
      match_key,
      event_key,
      alliance,
      score,
      foul_points,
      team_numbers,
      achieved_at
    ) VALUES (
      @match_key,
      @event_key,
      @alliance,
      @score,
      @foul_points,
      @team_numbers,
      @achieved_at
    )
    ON CONFLICT(match_key) DO UPDATE SET
      event_key = excluded.event_key,
      alliance = excluded.alliance,
      score = excluded.score,
      foul_points = excluded.foul_points,
      team_numbers = excluded.team_numbers,
      achieved_at = excluded.achieved_at
  `)

  const tx = db.transaction((items: LeaderboardRow[]) => {
    for (const row of items) stmt.run(row)
  })

  tx(rows)
}

function upsertTeamStubs(rows: TeamStubRow[]): void {
  if (!rows.length) return
  const db = getDb()
  const stmt = db.prepare(`
    INSERT INTO teams (team_number, last_updated)
    VALUES (@team_number, @last_updated)
    ON CONFLICT(team_number) DO UPDATE SET
      last_updated = excluded.last_updated
  `)

  const tx = db.transaction((items: TeamStubRow[]) => {
    for (const row of items) stmt.run(row)
  })

  tx(rows)
}

function upsertTeamDetails(rows: TeamDetailRow[]): void {
  if (!rows.length) return
  const db = getDb()
  const stmt = db.prepare(`
    INSERT INTO teams (
      team_number,
      nickname,
      city,
      state_prov,
      country,
      website,
      rookie_year,
      avatar_base64,
      last_updated
    ) VALUES (
      @team_number,
      @nickname,
      @city,
      @state_prov,
      @country,
      @website,
      @rookie_year,
      @avatar_base64,
      @last_updated
    )
    ON CONFLICT(team_number) DO UPDATE SET
      nickname = excluded.nickname,
      city = excluded.city,
      state_prov = excluded.state_prov,
      country = excluded.country,
      website = excluded.website,
      rookie_year = excluded.rookie_year,
      avatar_base64 = excluded.avatar_base64,
      last_updated = excluded.last_updated
  `)

  const tx = db.transaction((items: TeamDetailRow[]) => {
    for (const row of items) stmt.run(row)
  })

  tx(rows)
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
    const foulPoints = match.score_breakdown?.[winner]?.foulPoints ?? 0

    entries.push({
      match_key: match.key,
      event_key: match.event_key,
      alliance: winner,
      score: winnerAlliance.score,
      foul_points: foulPoints,
      team_numbers: winnerAlliance.team_keys.map(parseTeamNumber),
      achieved_at: time,
    })
  }
  return entries
}

export async function syncYear(
  year: number = new Date().getFullYear(),
  logger: SyncLogger = noopLogger
): Promise<void> {
  await ensureDbSchema()
  const db = getDb()
  const tba = getTBAClient()

  const logInsert = db.prepare(`
    INSERT INTO sync_log (started_at, status)
    VALUES (?, 'running')
  `).run(Date.now())
  const logId = Number(logInsert.lastInsertRowid)

  try {
    logger.log(`Fetching events for ${year}...`)
    const events = await tba.get<TBAEvent[]>(`/events/${year}/simple`)

    if (!events) {
      logger.log('No events found.')
      db.prepare(`
        UPDATE sync_log
        SET finished_at = ?, status = 'success', events_synced = 0, matches_synced = 0
        WHERE id = ?
      `).run(Date.now(), logId)
      return
    }

    const now = Date.now()
    upsertEvents(events.map((e) => ({
      event_key: e.key,
      name: e.name,
      short_name: e.short_name ?? null,
      city: e.city ?? null,
      state_prov: e.state_prov ?? null,
      country: e.country ?? null,
      year: e.year,
      start_date: e.start_date ?? null,
      end_date: e.end_date ?? null,
      event_type: e.event_type ?? null,
      last_updated: now,
    })))
    logger.log(`Saved ${events.length} events to database`)

    let matchesSynced = 0
    const BATCH = 5
    for (let i = 0; i < events.length; i += BATCH) {
      const batch = events.slice(i, i + BATCH)
      const batchNames = batch.map((e) => e.short_name || e.name).join(', ')
      logger.progress(i, events.length, `Fetching matches: ${batchNames}`)

      const results = await Promise.all(
        batch.map((e) => tba.get<TBAMatch[]>(`/event/${e.key}/matches`))
      )

      const matchRows: MatchRow[] = []
      const leaderboardRows: LeaderboardRow[] = []
      const teamSet = new Set<number>()

      for (const matches of results) {
        if (!matches) continue

        for (const m of matches) {
          const redTeams = m.alliances.red.team_keys.map(parseTeamNumber)
          const blueTeams = m.alliances.blue.team_keys.map(parseTeamNumber)
          const youtubeKey = m.videos?.find((v) => v.type === 'youtube')?.key

          matchRows.push({
            match_key: m.key,
            event_key: m.event_key,
            comp_level: m.comp_level,
            match_number: m.match_number,
            set_number: m.set_number,
            red_score: m.alliances.red.score,
            blue_score: m.alliances.blue.score,
            red_teams: JSON.stringify(redTeams),
            blue_teams: JSON.stringify(blueTeams),
            winning_alliance: m.winning_alliance || null,
            actual_time: m.actual_time,
            post_result_time: m.post_result_time,
            video_url: youtubeKey ? `https://www.youtube.com/watch?v=${youtubeKey}` : null,
          })

          for (const team of redTeams) teamSet.add(team)
          for (const team of blueTeams) teamSet.add(team)
          matchesSynced++
        }

        for (const entry of computeLeaderboardEntries(matches)) {
          leaderboardRows.push({
            ...entry,
            team_numbers: JSON.stringify(entry.team_numbers),
          })
        }
      }

      upsertMatches(matchRows)
      upsertLeaderboard(leaderboardRows)
      upsertTeamStubs(Array.from(teamSet).map((team) => ({
        team_number: team,
        last_updated: Date.now(),
      })))
    }

    logger.progress(events.length, events.length, 'Done')
    logger.log(`Synced ${matchesSynced} matches across ${events.length} events`)

    db.prepare(`
      UPDATE sync_log
      SET
        finished_at = ?,
        events_synced = ?,
        matches_synced = ?,
        status = 'success'
      WHERE id = ?
    `).run(Date.now(), events.length, matchesSynced, logId)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    db.prepare(`
      UPDATE sync_log
      SET
        finished_at = ?,
        status = 'error',
        error_message = ?
      WHERE id = ?
    `).run(Date.now(), message, logId)
    throw err
  }
}

export async function syncTeams(teamNumbers: number[]): Promise<void> {
  await ensureDbSchema()
  const tba = getTBAClient()

  const BATCH = 10
  for (let i = 0; i < teamNumbers.length; i += BATCH) {
    const details: TeamDetailRow[] = []

    await Promise.all(teamNumbers.slice(i, i + BATCH).map(async (num) => {
      try {
        const [info, media] = await Promise.all([
          tba.get<Record<string, unknown>>(`/team/frc${num}/simple`),
          tba.get<Array<Record<string, unknown>>>(`/team/frc${num}/media/${new Date().getFullYear()}`),
        ])

        if (!info) return

        const avatar = media?.find((m) => (m as Record<string, unknown>).type === 'avatar')

        details.push({
          team_number: num,
          nickname: (info.nickname as string) ?? '',
          city: (info.city as string) ?? '',
          state_prov: (info.state_prov as string) ?? '',
          country: (info.country as string) ?? '',
          website: (info.website as string) ?? '',
          rookie_year: (info.rookie_year as number) ?? 0,
          avatar_base64:
            (avatar as Record<string, Record<string, string>> | undefined)?.details?.base64Image ?? null,
          last_updated: Date.now(),
        })
      } catch (e) {
        console.warn(`[sync] Failed to sync team ${num}:`, e)
      }
    }))

    upsertTeamDetails(details)
  }
}
