import { NextRequest, NextResponse } from 'next/server'
import { getTeam } from '@/lib/queries'

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ teamNumber: string }> }
) {
    const { teamNumber } = await params
    const team = await getTeam(parseInt(teamNumber, 10))
    if (!team) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(team)
}
