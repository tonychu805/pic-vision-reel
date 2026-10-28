import { notFound } from 'next/navigation'
import { supabasePublic } from '@/lib/supabase'
import { fetchVideoAddresses, type VideoAddresses } from '@/lib/videoAddresses'
import { mergeParts } from '@/lib/mergeParts'

// What both views of a share page read (./page.tsx, ./wide/page.tsx).
//
// Public, no auth -- knowing the share_id is the whole access boundary.
// get_reels_by_share_id() (see lib/supabase.ts) is the only read path the
// anon key has; a wrong/deleted/malformed shareId just 404s here.
//
// One page per SESSION, not per reel (ADR-076, operator: "one session id,
// one share page") -- share_id groups up to 12 reel rows now (up to 10
// individual top-ranked rally clips + burst-moments + full, 2026-09-12).
// The function's own ORDER BY (not this page) is what fixes the order:
// rally clips by rally_rank (i.e. by score, best first), then burst, then
// full -- encoded in the DB rather than left to upload/report order.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type ShareReel = {
  id: string
  kind: string
  rally_rank: number | null
  r2_bucket: string
  r2_key_ranked: string
  brand_name: string | null
  brand_logo_key: string | null
  brand_logo_ink: 'light' | 'dark' | null
  camera_label: string | null
  duration_sec: number | null
  rally_count: number | null
  created_at: string
  part_index: number | null
  score: number | string | null
  badge?: string | null
}

export async function loadShare(shareId: string): Promise<{ reels: ShareReel[]; addresses: VideoAddresses }> {
  if (!UUID_RE.test(shareId)) notFound()

  const supabase = supabasePublic()
  const [{ data }, { data: badgeRows }] = await Promise.all([
    supabase.rpc('get_reels_by_share_id', { p_share_id: shareId }),
    // A session's badges, decided once its last part is in (console
    // lib/badges.ts). An error -- a database without the function yet --
    // just means no badges, never a broken page.
    supabase.rpc('get_badges_by_share_id', { p_share_id: shareId }),
  ])
  const badges = new Map(((badgeRows ?? []) as { id: string; badge: string }[]).map((b) => [b.id, b.badge]))
  // A session sent in parts shows as one familiar set of reels (lib/mergeParts.ts),
  // badged clips first.
  const reels = mergeParts(((data ?? []) as ShareReel[]).map((r) => ({ ...r, badge: badges.get(r.id) ?? null })))

  if (reels.length === 0) notFound()

  // Signed, 1-hour video addresses from the console (lib/videoAddresses.ts).
  // null = the share is unknown, removed or past its 30 days.
  const addresses = await fetchVideoAddresses(shareId)
  if (!addresses) notFound()
  return { reels, addresses }
}
