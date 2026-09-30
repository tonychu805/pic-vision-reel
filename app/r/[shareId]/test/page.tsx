import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { supabasePublic } from '@/lib/supabase'
import VerticalShareClient, { type VerticalSlide } from './vertical-client'

// TEST page (2026-09-28), beside the real one at /r/[shareId], which it does
// not change: the same session as a full-screen 9:16 feed with Share / Send /
// Download. Production doesn't make vertical clips yet, so this only works for
// a session whose vertical clips were uploaded by hand
// (scripts/follow_crop_session.py) to <brand>/vertical-test/<shareId>/ on the
// reels CDN, with a manifest.json listing them. Anything else 404s. Same access
// rule as the real page: knowing the share id.
export const metadata: Metadata = { title: 'Your highlights (test)', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CDN = 'https://cdn.picvisionai.com'

type Row = { brand_name: string | null; camera_label: string | null; created_at: string; r2_key_ranked: string }
type Manifest = { v: number; slides: { id: string; label: string; file: string; durationSec: number }[] }

export default async function VerticalTestPage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params
  if (!UUID_RE.test(shareId)) notFound()

  const { data } = await supabasePublic().rpc('get_reels_by_share_id', { p_share_id: shareId })
  const first = ((data ?? []) as Row[])[0]
  if (!first) notFound()

  // The brand folder is the first part of this session's own reel keys
  // (<brand_id>/reels/<id>.mp4); legacy keys without one have no test clips.
  const brand = first.r2_key_ranked.split('/')[0]
  if (!UUID_RE.test(brand)) notFound()
  const base = `${CDN}/${brand}/vertical-test/${shareId}`
  const res = await fetch(`${base}/manifest.json`, { cache: 'no-store' })
  if (!res.ok) notFound()
  const manifest = (await res.json()) as Manifest

  const venueName = first.brand_name ?? 'Your venue'
  const played = new Date(first.created_at)
  // Venue time zone (Taiwan), not UTC: a 7 AM game there is the previous day in UTC.
  const gameDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(played)
  const when = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Taipei', weekday: 'short', month: 'short', day: 'numeric' }).format(played)
  const court = (first.camera_label ?? '').replace(/^.*?-\s*/, '') || 'Court'

  const slides: VerticalSlide[] = manifest.slides.map((s) => ({
    id: s.id,
    label: s.label,
    videoUrl: `${base}/${s.file}`,
    wideUrl: null,
    durationSec: s.durationSec,
    court,
    when,
  }))

  return <VerticalShareClient slides={slides} venueName={venueName} gameDate={gameDate} />
}
