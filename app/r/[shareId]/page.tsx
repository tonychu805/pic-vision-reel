import { notFound } from 'next/navigation'
import { supabasePublic } from '@/lib/supabase'
import { reelVideoUrl } from '@/lib/r2'
import ReelShareClient from './reel-share-client'

// Public, no auth -- reels' "anyone with the id can read" RLS policy
// (2026-09-04) is the whole access boundary, unchanged by ADR-076's
// share_id column (still just USING (true), gated only by knowing a
// value to query on). A wrong/deleted shareId just 404s here, same as
// any not-found row.
//
// One page per SESSION now, not per reel (ADR-076, operator: "one
// session id, one share page") -- share_id groups up to two reel rows
// (full + burst-moments), ordered oldest-first so "full" (reported
// first by cloud_pipeline/run_desktop_job.py's _report_reels loop) is
// always the first carousel slide when both exist.
export default async function ReelSharePage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params
  const supabase = supabasePublic()

  const { data: reels } = await supabase
    .from('reels')
    .select('id, kind, r2_bucket, r2_key_ranked, brand_name, camera_label, duration_sec, rally_count, created_at')
    .eq('share_id', shareId)
    .order('created_at', { ascending: true })

  if (!reels || reels.length === 0) notFound()

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
