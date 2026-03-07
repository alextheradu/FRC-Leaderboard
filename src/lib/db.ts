import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'

let _db: Database.Database | null = null
let _schemaPromise: Promise<void> | null = null

function resolveDbPath(): string {
  const configuredPath = process.env.SQLITE_DB_PATH?.trim()
  if (!configuredPath) {
    return path.join(process.cwd(), 'data', 'leaderboard.db')
  }

  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.join(process.cwd(), configuredPath)
}

export function getDb(): Database.Database {
  if (_db) return _db

  const dbPath = resolveDbPath()
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })

  _db = new Database(dbPath)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')
  _db.pragma('busy_timeout = 5000')

  return _db
}

export async function ensureDbSchema(): Promise<void> {
  if (_schemaPromise) {
    await _schemaPromise
    return
  }

  _schemaPromise = (async () => {
    const db = getDb()
    const schema = fs.readFileSync(path.join(process.cwd(), 'src', 'lib', 'schema.sql'), 'utf-8')
    db.exec(schema)
  })()

  await _schemaPromise
}
