import { notFound } from 'next/navigation'
import { supabasePublic } from '@/lib/supabase'
import { presignedReelUrl } from '@/lib/r2'
import ReelShareClient from './reel-share-client'

// Public, no auth -- reels' "anyone with the id can read" RLS policy
// (2026-09-04) is the whole access boundary. A wrong/deleted reelId just
// 404s here, same as any not-found row.
export default async function ReelSharePage({ params }: { params: Promise<{ reelId: string }> }) {
  const { reelId } = await params
  const supabase = supabasePublic()

  const { data: reel } = await supabase
    .from('reels')
    .select('id, r2_bucket, r2_key_ranked, venue_name, duration_sec, rally_count')
    .eq('id', reelId)
    .maybeSingle()

  if (!reel) notFound()

  const videoUrl = await presignedReelUrl(reel.r2_bucket, reel.r2_key_ranked)

  return (
    <ReelShareClient
      reelId={reel.id}
      videoUrl={videoUrl}
      venueName={reel.venue_name ?? 'Your venue'}
    />
  )
}
