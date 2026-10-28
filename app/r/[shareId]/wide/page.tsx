import { loadShare } from '../load'
import WideView from '../wide-view'

// The 16:9 page, for a share whose default view is vertical (../page.tsx).
export default async function WideSharePage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params
  const { reels, addresses } = await loadShare(shareId)
  return <WideView shareId={shareId} reels={reels} addresses={addresses} />
}
