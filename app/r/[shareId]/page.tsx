import { notFound } from 'next/navigation'
import { supabasePublic } from '@/lib/supabase'
import { reelVideoUrl } from '@/lib/r2'
import ReelShareClient from './reel-share-client'

// Public, no auth -- knowing the share_id is the whole access boundary.
// get_reels_by_share_id() (see lib/supabase.ts) is the only read path the
// anon key has; a wrong/deleted/malformed shareId just 404s here.
//
// One page per SESSION, not per reel (ADR-076, operator: "one session id,
// one share page") -- share_id groups up to two reel rows (full +
// burst-moments); the function orders them oldest-first so "full"
// (reported first by cloud_pipeline/run_desktop_job.py's _report_reels
// loop) is always the first carousel slide when both exist.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type ShareReel = {
  id: string
  kind: string
  r2_bucket: string
  r2_key_ranked: string
  brand_name: string | null
  camera_label: string | null
  duration_sec: number | null
  rally_count: number | null
  created_at: string
}

export default async function ReelSharePage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params
  if (!UUID_RE.test(shareId)) notFound()

  const supabase = supabasePublic()
  const { data } = await supabase.rpc('get_reels_by_share_id', { p_share_id: shareId })
  const reels = (data ?? []) as ShareReel[]

  if (reels.length === 0) notFound()

  const slides = reels.map((r) => ({
    id: r.id,
    kind: r.kind as 'full' | 'burst',
    videoUrl: reelVideoUrl(r.r2_bucket, r.r2_key_ranked),
    durationSec: r.duration_sec,
    rallyCount: r.rally_count,
  }))

  const first = reels[0]

  // Rendered here (server component) instead of inside the client
  // component so this hint hits <head> before any client JS has even
  // downloaded, not just before the client's useEffect runs -- covers the
  // first (most likely to be watched/shared first) slide specifically.
  // The client component itself prefetches EVERY slide's video blob
  // eagerly on mount, not just the first / not lazily per-slide -- at
  // most 2 short clips, so the bandwidth cost is small, and it keeps
  // every share/download tile (including "download all") able to call
  // navigator.share() synchronously off the tap with nothing to await --
  // a lazy per-slide fetch would reintroduce the exact bug the original
  // single-video version of this page already hit and fixed (an awaited
  // fetch mid-gesture silently misses Safari's activation window).
  const cdnOrigin = new URL(slides[0].videoUrl).origin

  return (
    <>
      <link rel="preconnect" href={cdnOrigin} crossOrigin="anonymous" />
      <link rel="preload" as="fetch" href={slides[0].videoUrl} crossOrigin="anonymous" />
      <ReelShareClient
        shareId={shareId}
        slides={slides}
        venueName={first.brand_name ?? 'Your venue'}
        cameraLabel={first.camera_label}
        createdAt={first.created_at}
      />
    </>
  )
}
