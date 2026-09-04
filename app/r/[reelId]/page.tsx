import { notFound } from 'next/navigation'
import { supabasePublic } from '@/lib/supabase'
import { reelVideoUrl } from '@/lib/r2'
import ReelShareClient from './reel-share-client'

// Public, no auth -- reels' "anyone with the id can read" RLS policy
// (2026-09-04) is the whole access boundary. A wrong/deleted reelId just
// 404s here, same as any not-found row.
export default async function ReelSharePage({ params }: { params: Promise<{ reelId: string }> }) {
  const { reelId } = await params
  const supabase = supabasePublic()

  const { data: reel } = await supabase
    .from('reels')
    .select('id, r2_bucket, r2_key_ranked, venue_name, camera_label, duration_sec, rally_count, created_at')
    .eq('id', reelId)
    .maybeSingle()

  if (!reel) notFound()

  // Stable, unsigned CDN URL (ADR-075), not a presigned one -- see lib/r2.ts.
  const videoUrl = reelVideoUrl(reel.r2_bucket, reel.r2_key_ranked)

  // Rendered here (server component) instead of inside the client
  // component so these hints hit <head> before any client JS has even
  // downloaded, not just before the client's useEffect runs -- that gap
  // is real time the browser could already be spending on the video
  // fetch. preconnect skips a fresh DNS/TLS handshake for the CDN domain;
  // preload as="fetch" starts the byte download immediately, and the
  // client's later fetch(videoUrl) call reuses it instead of starting a
  // second one, as long as the request (method, credentials, URL) matches
  // -- and because this URL is stable now (no per-request signature), a
  // repeat visitor's browser cache and the CDN's own edge cache can both
  // actually reuse it too, unlike the old presigned version.
  const cdnOrigin = new URL(videoUrl).origin

  return (
    <>
      <link rel="preconnect" href={cdnOrigin} crossOrigin="anonymous" />
      <link rel="preload" as="fetch" href={videoUrl} crossOrigin="anonymous" />
      <ReelShareClient
        reelId={reel.id}
        videoUrl={videoUrl}
        venueName={reel.venue_name ?? 'Your venue'}
        cameraLabel={reel.camera_label}
        createdAt={reel.created_at}
      />
    </>
  )
}
