import { NextResponse } from 'next/server'
import { trackImpersonationAction, type ActionType } from '@/lib/track-impersonation-action'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { actionType, actionPath, actionDetails } = await req.json()

    if (!actionType || typeof actionType !== 'string') {
      return NextResponse.json({ error: 'Action type is required' }, { status: 400 })
    }

    await trackImpersonationAction(
      actionType as ActionType,
      actionPath,
      actionDetails
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error tracking action:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
