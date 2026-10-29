import { currentLang } from '@/lib/lang-server'
import { videosEndpoint } from '@/lib/videoAddresses'
import { verticalFeed } from '@/lib/verticalFeed'
import { isFlagOn } from '@/lib/featureFlags'
import { loadShare } from './load'
import WideView from './wide-view'
import VerticalShareClient from './vertical-client'

// The share page. Vertical (9:16) by default (operator, 2026-10-28), once
// the venue desktop has sent at least one 9:16 crop for the session
// (lib/verticalFeed.ts); the wide page otherwise, and always at
// /r/<id>/wide.
export default async function ReelSharePage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params
  const { reels, addresses } = await loadShare(shareId)

  const feed = verticalFeed(reels, addresses)
  if (!feed) return <WideView shareId={shareId} reels={reels} addresses={addresses} />

  const first = reels[0]
  const played = new Date(first.created_at)
  // Venue time zone (Taiwan), not UTC: a 7 AM game there is the previous day in UTC.
  const gameDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(played)
  const lang = await currentLang()
  const when = new Intl.DateTimeFormat(lang, { timeZone: 'Asia/Taipei', weekday: 'short', month: 'short', day: 'numeric' }).format(played)
  const court = (first.camera_label ?? '').replace(/^.*?-\s*/, '') || 'Court'
  const cdnOrigin = new URL(feed[0].videoUrl).origin
  // Hidden while the PostHog flag is off (operator, 2026-10-29).
  const soundButton = await isFlagOn('share-sound-button')

  return (
    <>
      <link rel="preconnect" href={cdnOrigin} crossOrigin="anonymous" />
      <link rel="preload" as="fetch" href={feed[0].videoUrl} crossOrigin="anonymous" />
      <VerticalShareClient
        reels={reels.filter((r) => r.kind === 'rally')}
        addresses={addresses}
        addressesExpireAt={addresses.expiresAt}
        videosEndpoint={videosEndpoint(shareId)}
        venueName={first.brand_name ?? 'Your venue'}
        gameDate={gameDate}
        court={court}
        when={when}
        lang={lang}
        wideHref={`/r/${shareId}/wide`}
        soundButton={soundButton}
      />
    </>
  )
}
