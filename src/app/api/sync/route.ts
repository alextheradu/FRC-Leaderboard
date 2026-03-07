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
