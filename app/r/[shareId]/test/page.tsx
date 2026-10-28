import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { supabasePublic } from '@/lib/supabase'
import { fetchVideoAddresses } from '@/lib/videoAddresses'
import { currentLang } from '@/lib/lang-server'
import type { FeedReel } from '@/lib/verticalFeed'
import VerticalShareClient from '../vertical-client'

// The vertical test page (2026-09-28). Since 2026-10-28 the vertical feed is
// the share page's default (../page.tsx), so a share with the venue
// desktop's 9:16 crops goes there. What's left here is the 09-28 pilot:
// clips uploaded by hand (scripts/follow_crop_session.py) to
// <brand>/vertical-test/<shareId>/ on the reels CDN with a manifest.json,
// kept so the pilot's links still play. Anything else 404s.
export const metadata: Metadata = { title: 'Your highlights (test)', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CDN = 'https://cdn.picvisionai.com'

type Row = {
  id: string
  kind: string
  rally_rank: number | null
  part_index: number | null
  score: number | string | null
  duration_sec: number | null
  brand_name: string | null
  camera_label: string | null
  created_at: string
  r2_key_ranked: string
  badge?: string | null
}
type Manifest = { v: number; slides: { id: string; label: string; file: string; durationSec: number }[] }

export default async function VerticalTestPage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params
  if (!UUID_RE.test(shareId)) notFound()

  const supabase = supabasePublic()
  const [{ data }, { data: badgeRows }] = await Promise.all([
    supabase.rpc('get_reels_by_share_id', { p_share_id: shareId }),
    supabase.rpc('get_badges_by_share_id', { p_share_id: shareId }),
  ])
  const badges = new Map(((badgeRows ?? []) as { id: string; badge: string }[]).map((b) => [b.id, b.badge]))
  const rows = ((data ?? []) as Row[]).map((r) => ({ ...r, badge: badges.get(r.id) ?? null }))
  const first = rows[0]
  if (!first) notFound()

  const venueName = first.brand_name ?? 'Your venue'
  const played = new Date(first.created_at)
  // Venue time zone (Taiwan), not UTC: a 7 AM game there is the previous day in UTC.
  const gameDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(played)
  const when = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Taipei', weekday: 'short', month: 'short', day: 'numeric' }).format(played)
  const court = (first.camera_label ?? '').replace(/^.*?-\s*/, '') || 'Court'

  const addresses = await fetchVideoAddresses(shareId)
  if (addresses && Object.keys(addresses.vertical ?? {}).length > 0) redirect(`/r/${shareId}`)

  const pilot = await pilotClips(shareId, first)
  if (!pilot?.reels.length) notFound()

  return (
    <VerticalShareClient
      reels={pilot.reels}
      addresses={{ videos: {}, vertical: pilot.urls }}
      addressesExpireAt={null}
      videosEndpoint={null}
      venueName={venueName}
      gameDate={gameDate}
      court={court}
      when={when}
      lang={await currentLang()}
      wideHref={null}
    />
  )
}

// The 09-28 pilot's hand-uploaded clips on the CDN.
async function pilotClips(shareId: string, first: Row): Promise<{ reels: FeedReel[]; urls: Record<string, string> } | null> {
  // The brand folder is the first part of this session's own reel keys
  // (<brand_id>/reels/<id>.mp4); legacy keys without one have no test clips.
  const brand = first.r2_key_ranked.split('/')[0]
  if (!UUID_RE.test(brand)) return null
  const base = `${CDN}/${brand}/vertical-test/${shareId}`
  const res = await fetch(`${base}/manifest.json`, { cache: 'no-store' })
  if (!res.ok) return null
  const manifest = (await res.json()) as Manifest
  return {
    reels: manifest.slides.map((s, i) => ({ id: s.id, kind: 'rally', rally_rank: i + 1, badge: null, duration_sec: s.durationSec })),
    urls: Object.fromEntries(manifest.slides.map((s) => [s.id, `${base}/${s.file}`])),
  }
}
