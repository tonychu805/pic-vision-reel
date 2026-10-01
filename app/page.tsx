// Predates the self-serve login/check-in system (originally: no real
// reason to land here, every real page is per-reel or per-venue-QR-code,
// sent directly to whoever needs it). Now that a player might reasonably
// type or bookmark the bare domain -- to sign in, check their account,
// or because a venue's QR code happened to be deactivated when they
// scanned it -- a dead-end hint page is the wrong answer; send them to
// the one place that's actually useful without a specific link in hand.
import { redirect } from 'next/navigation'

export default function Page() {
  redirect('/login')
}
