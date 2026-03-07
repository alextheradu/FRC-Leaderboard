import fs from 'fs'
import path from 'path'
import postgres, { type Sql } from 'postgres'

let _db: Sql | null = null
let _schemaPromise: Promise<void> | null = null

function stripSurroundingQuotes(value: string): string {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function resolveConnectionString(): string {
  const raw = process.env.SUPABASE_URL ?? process.env.DATABASE_URL
  if (!raw) {
    throw new Error('Missing SUPABASE_URL (or DATABASE_URL) environment variable')
  }

  const normalized = stripSurroundingQuotes(raw)
  if (normalized.startsWith('postgres://') || normalized.startsWith('postgresql://')) {
    return normalized
  }

  throw new Error(
    'SUPABASE_URL must be a Postgres connection string (postgresql://...) for server-side sync/query operations'
  )
}

export function getDb(): Sql {
  if (_db) return _db
  _db = postgres(resolveConnectionString(), {
    ssl: 'require',
    max: 10,
    idle_timeout: 20,
    connect_timeout: 20,
    prepare: false,
  })
  return _db
}

export async function ensureDbSchema(): Promise<void> {
  if (_schemaPromise) {
    await _schemaPromise
    return
  }

  _schemaPromise = (async () => {
    const sql = getDb()
    await sql`SET client_min_messages TO warning`
    const schema = fs.readFileSync(
      path.join(process.cwd(), 'src', 'lib', 'schema.postgres.sql'),
      'utf-8'
    )
    await sql.unsafe(schema)
  })()

  await _schemaPromise
}
