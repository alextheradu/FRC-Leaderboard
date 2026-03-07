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
