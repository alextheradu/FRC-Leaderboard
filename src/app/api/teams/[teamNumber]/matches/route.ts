import { NextRequest, NextResponse } from 'next/server'
import { getTeamMatches } from '@/lib/queries'

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ teamNumber: string }> }
) {
    const { teamNumber } = await params
    return NextResponse.json(await getTeamMatches(parseInt(teamNumber, 10)))
}
