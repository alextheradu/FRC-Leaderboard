import { NextRequest, NextResponse } from 'next/server'
import { getGlobalLeaderboardPage } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const rawLimit = parseInt(req.nextUrl.searchParams.get('limit') ?? '100', 10)
    const rawOffset = parseInt(req.nextUrl.searchParams.get('offset') ?? '0', 10)
    const includePenalties = req.nextUrl.searchParams.get('includePenalties') !== 'false'
    const limit = Number.isNaN(rawLimit) ? 100 : Math.min(rawLimit, 500)
    const offset = Number.isNaN(rawOffset) ? 0 : Math.max(rawOffset, 0)
    try {
        return NextResponse.json(await getGlobalLeaderboardPage(limit, offset, includePenalties))
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 })
    }
}
