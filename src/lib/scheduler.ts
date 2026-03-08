import cron from 'node-cron'
import { syncYear, incrementalSync } from './sync'

let scheduled = false

export function startScheduler(): void {
    if (scheduled) return
    scheduled = true
    // Every 15 minutes, 8am–8pm (hours 8–19), Saturday (6) and Sunday (0)
    cron.schedule('*/15 8-19 * * 0,6', async () => {
        console.log('[scheduler] Weekend incremental sync at', new Date().toISOString())
        try { await incrementalSync() }
        catch (err) { console.error('[scheduler] Sync failed:', err) }
    })
    console.log('[scheduler] Scheduled (every 15min Sat/Sun 8am–8pm)')
}

export { syncYear }
