import { NextRequest, NextResponse } from 'next/server'
import { getEventLeaderboardPage } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ eventKey: string }> }
) {
    const { eventKey } = await params
    const rawLimit = parseInt(req.nextUrl.searchParams.get('limit') ?? '100', 10)
    const rawOffset = parseInt(req.nextUrl.searchParams.get('offset') ?? '0', 10)
    const limit = Number.isNaN(rawLimit) ? 100 : Math.min(rawLimit, 500)
    const offset = Number.isNaN(rawOffset) ? 0 : Math.max(rawOffset, 0)
    return NextResponse.json(await getEventLeaderboardPage(eventKey, limit, offset))
}
