import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { supabasePublic } from '@/lib/supabase'
import { fetchVideoAddresses } from '@/lib/videoAddresses'
import { mergeParts } from '@/lib/mergeParts'
import VerticalShareClient, { type VerticalSlide } from './vertical-client'

// TEST page (2026-09-28), beside the real one at /r/[shareId], which it does
// not change: the same session as a full-screen 9:16 feed with Share / Send /
// Download. Same access rule as the real page: knowing the share id.
//
// Where the vertical clips come from, first that applies:
//   1. The venue desktop's 9:16 crops of its high-res recording (2026-10-27,
//      pic-vision desktop/electron/verticalCrop.js), signed by the console
//      like every other video here: the share page's own clips, badged
//      first, each with its sharp 16:9 version as the "wide" download.
//   2. The 09-28 pilot: clips uploaded by hand (scripts/follow_crop_session.py)
//      to <brand>/vertical-test/<shareId>/ on the reels CDN with a
//      manifest.json. Kept so the pilot's links still play.
// Anything else 404s.
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

  const slides = (await desktopSlides(shareId, rows, court, when)) ?? (await pilotSlides(shareId, first, court, when))
  if (!slides?.length) notFound()

  return <VerticalShareClient slides={slides} venueName={venueName} gameDate={gameDate} />
}

// 1. The desktop's 9:16 crops, in the share page's own order (badged first).
async function desktopSlides(shareId: string, rows: Row[], court: string, when: string): Promise<VerticalSlide[] | null> {
  const addresses = await fetchVideoAddresses(shareId)
  const vertical = addresses?.vertical ?? {}
  if (!addresses || Object.keys(vertical).length === 0) return null
  return mergeParts(rows)
    .filter((r) => r.kind === 'rally' && vertical[r.id])
    .map((r) => ({
      id: r.id,
      label: r.badge ?? `Rally ${r.rally_rank}`,
      videoUrl: vertical[r.id],
      wideUrl: addresses.videos[r.id] ?? null,
      durationSec: r.duration_sec ?? 0,
      court,
      when,
    }))
}

// 2. The 09-28 pilot's hand-uploaded clips on the CDN.
async function pilotSlides(shareId: string, first: Row, court: string, when: string): Promise<VerticalSlide[] | null> {
  // The brand folder is the first part of this session's own reel keys
  // (<brand_id>/reels/<id>.mp4); legacy keys without one have no test clips.
  const brand = first.r2_key_ranked.split('/')[0]
  if (!UUID_RE.test(brand)) return null
  const base = `${CDN}/${brand}/vertical-test/${shareId}`
  const res = await fetch(`${base}/manifest.json`, { cache: 'no-store' })
  if (!res.ok) return null
  const manifest = (await res.json()) as Manifest
  return manifest.slides.map((s) => ({
    id: s.id,
    label: s.label,
    videoUrl: `${base}/${s.file}`,
    wideUrl: null,
    durationSec: s.durationSec,
    court,
    when,
  }))
}
