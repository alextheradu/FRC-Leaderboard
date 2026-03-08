import { NextRequest, NextResponse } from 'next/server'
import { getTeamPlacement } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ teamNumber: string }> }
) {
    const { teamNumber } = await params
    const parsedTeam = parseInt(teamNumber, 10)
    if (Number.isNaN(parsedTeam)) {
        return NextResponse.json({ error: 'Invalid team number' }, { status: 400 })
    }

    const eventKey = req.nextUrl.searchParams.get('eventKey') ?? undefined
    const includePenalties = req.nextUrl.searchParams.get('includePenalties') !== 'false'
    const placement = await getTeamPlacement(parsedTeam, eventKey, includePenalties)
    if (!placement) {
        return NextResponse.json({ error: 'Team not found in leaderboard' }, { status: 404 })
    }
    return NextResponse.json(placement)
}
