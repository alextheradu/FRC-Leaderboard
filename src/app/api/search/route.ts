import { NextRequest, NextResponse } from 'next/server'
import { searchTeams } from '@/lib/queries'

export async function GET(req: NextRequest) {
    const q = req.nextUrl.searchParams.get('q') ?? ''
    if (!q) return NextResponse.json([])
    return NextResponse.json(await searchTeams(q))
}
