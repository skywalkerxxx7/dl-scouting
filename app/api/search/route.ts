import { NextResponse, type NextRequest } from 'next/server'
import { searchPlayers } from '@/lib/deadlock'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2 || q.length > 200) return NextResponse.json([])
  const results = await searchPlayers(q)
  return NextResponse.json(
    results.map((p) => ({
      accountId: p.account_id,
      name: p.personaname,
      avatar: p.avatarmedium,
      country: p.countrycode,
    })),
  )
}
