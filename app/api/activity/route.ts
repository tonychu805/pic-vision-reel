import { NextResponse } from 'next/server'
import { supabasePublic } from '@/lib/supabase'
import { parseActivity } from '@/lib/activity'

// One share-page event (lib/activity.ts) into the database. Always 204:
// the page fires and forgets, and record_share_event() itself drops
// anything that doesn't belong (a closed link, a clip from another session).
export async function POST(req: Request) {
  const event = parseActivity(await req.json().catch(() => null))
  if (event) {
    await supabasePublic()
      .rpc('record_share_event', { p_share_id: event.shareId, p_kind: event.kind, p_reel_id: event.reelId, p_via_share: event.viaShare })
      .then(() => undefined, () => undefined)
  }
  return new NextResponse(null, { status: 204 })
}
