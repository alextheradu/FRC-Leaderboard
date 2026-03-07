import { NextRequest, NextResponse } from 'next/server'
import { getAllEvents } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const year = req.nextUrl.searchParams.get('year')
    return NextResponse.json(await getAllEvents(year ? parseInt(year, 10) : undefined))
}
