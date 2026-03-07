#!/usr/bin/env tsx
// Run: npm run sync [year]

import * as fs from 'fs'
import * as path from 'path'
import cliProgress from 'cli-progress'

// Load .env manually since we're outside Next.js
const envPath = path.join(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8')
    for (const line of envContent.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eqIdx = trimmed.indexOf('=')
        if (eqIdx === -1) continue
        const key = trimmed.slice(0, eqIdx)
        let value = trimmed.slice(eqIdx + 1).trim()
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1)
        }
        if (!process.env[key]) process.env[key] = value
    }
}

if (!process.env.TBA_API_KEY || process.env.TBA_API_KEY === 'your_key_here') {
    console.error('❌ TBA_API_KEY is not set or still has the placeholder value.')
    console.error('   Get a key from https://www.thebluealliance.com/account')
    console.error('   Then set it in .env: TBA_API_KEY=your_actual_key')
    process.exit(1)
}

import { syncYear, type SyncLogger } from '../src/lib/sync'

const bar = new cliProgress.SingleBar({
    format: '  {bar} {percentage}% | {value}/{total} events | ETA: {eta_formatted} | {task}',
    barCompleteChar: '█',
    barIncompleteChar: '░',
    hideCursor: true,
    clearOnComplete: true,
    etaBuffer: 20,
}, cliProgress.Presets.shades_grey)

let barStarted = false

const logger: SyncLogger = {
    log: (message: string) => {
        if (barStarted) bar.stop()
        console.log(`  ${message}`)
        if (barStarted) {
            // bar was stopped for the log line, don't restart — 
            // the next progress call will handle it
            barStarted = false
        }
    },
    progress: (current: number, total: number, label: string) => {
        if (!barStarted) {
            bar.start(total, current, { task: label })
            barStarted = true
        } else {
            bar.update(current, { task: label })
        }
        if (current >= total) {
            bar.stop()
            barStarted = false
        }
    },
}

async function main() {
    const year = parseInt(process.argv[2] ?? String(new Date().getFullYear()))
    const start = Date.now()

    console.log(`\n🔄 FRC Leaderboard Sync`)
    console.log(`   Year: ${year}`)
    console.log(`   API Key: ${process.env.TBA_API_KEY!.slice(0, 8)}...\n`)

    await syncYear(year, logger)

    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    console.log(`\n✅ Sync complete in ${elapsed}s\n`)
    process.exit(0)
}

main().catch(err => {
    if (barStarted) bar.stop()
    console.error(`\n❌ Sync failed: ${err.message || err}\n`)
    process.exit(1)
})
