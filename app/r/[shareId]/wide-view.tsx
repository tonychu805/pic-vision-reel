import { notFound } from 'next/navigation'
import { videosEndpoint, type VideoAddresses } from '@/lib/videoAddresses'
import { currentLang } from '@/lib/lang-server'
import ReelShareClient from './reel-share-client'
import type { ShareReel } from './load'

// The 16:9 page: every reel of the session (rally clips, quick hits, full
// reel) in a carousel. The default view until 2026-10-28; now the default
// only for a share with no 9:16 crops, and at /r/<id>/wide for the rest.
export default async function WideView({ shareId, reels, addresses }: { shareId: string; reels: ShareReel[]; addresses: VideoAddresses }) {
  const slides = reels
    .filter((r) => addresses.videos[r.id])
    .map((r) => ({
      id: r.id,
      kind: r.kind as 'full' | 'burst' | 'rally',
      rallyRank: r.rally_rank,
      badge: r.badge ?? null,
      videoUrl: addresses.videos[r.id],
      durationSec: r.duration_sec,
      rallyCount: r.rally_count,
    }))
  if (slides.length === 0) notFound()

  const first = reels[0]

  // Rendered here (server component) instead of inside the client
  // component so this hint hits <head> before any client JS has even
  // downloaded, not just before the client's useEffect runs -- covers the
  // first (most likely to be watched/shared first) slide specifically.
  // The client component then fetches the on-screen slide and the next one
  // as Blobs (lib/loadWindow.ts), so share tiles can call navigator.share()
  // synchronously off the tap -- an awaited fetch mid-gesture silently
  // misses Safari's activation window.
  const cdnOrigin = new URL(slides[0].videoUrl).origin

  return (
    <>
      <link rel="preconnect" href={cdnOrigin} crossOrigin="anonymous" />
      <link rel="preload" as="fetch" href={slides[0].videoUrl} crossOrigin="anonymous" />
      <ReelShareClient
        shareId={shareId}
        slides={slides}
        addressesExpireAt={addresses.expiresAt}
        videosEndpoint={videosEndpoint(shareId)}
        venueName={first.brand_name ?? 'Your venue'}
        logoKey={first.brand_logo_key}
        logoInk={first.brand_logo_ink}
        cameraLabel={first.camera_label}
        createdAt={first.created_at}
        lang={await currentLang()}
      />
    </>
  )
}
