import type { Metadata } from 'next'
import { supabasePublic } from '@/lib/supabase'
import { brandLogoUrl, type LogoInk } from '@/lib/brandLogo'
import { byCourt, slotLabel, type CalendarGame } from '@/lib/calendar'

// A venue's public game calendar, opened by QR code at the venue: today's
// games on the courts the venue chose, each linking to its reels page.
// Everything that decides what's shown is in get_public_calendar (console
// migration 20260924050000): nothing unless the venue switched it on today,
// the code is right, and only the chosen cameras. Never cached, never indexed.
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: "Today's games", robots: { index: false, follow: false } }

type Calendar = { brand_name: string; logo_key: string | null; logo_ink: LogoInk | null; timezone: string; games: CalendarGame[] }

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,31}$/i
const CODE_RE = /^[a-z0-9]{8,64}$/i

export default async function CalendarPage({ params }: { params: Promise<{ slug: string; code: string }> }) {
  const { slug, code } = await params
  const { data } = SLUG_RE.test(slug) && CODE_RE.test(code)
    ? await supabasePublic().rpc('get_public_calendar', { p_slug: slug, p_code: code })
    : { data: null }
  const cal = data as Calendar | null

  if (!cal) {
    // Same answer for a wrong code, a switched-off calendar and an unknown
    // venue: nothing here tells a stranger which one it was.
    return (
      <main className="share-page">
        <div className="share-shell" style={{ alignItems: 'center', textAlign: 'center', paddingTop: 80 }}>
          <p style={{ fontSize: 13.5, color: 'var(--muted)' }}>This calendar isn&apos;t available right now.</p>
        </div>
      </main>
    )
  }

  const courts = byCourt(cal.games)
  return (
    <main className="share-page">
      <div className="share-shell">
        <header className="venue-header">
          {cal.logo_key ? (
            <div className={`venue-plate${cal.logo_ink === 'light' ? ' venue-plate--light' : ''}`}>
              <img src={brandLogoUrl(cal.logo_key)} alt={cal.brand_name} />
            </div>
          ) : (
            <div className="venue-mark" aria-hidden="true">{cal.brand_name.charAt(0).toUpperCase()}</div>
          )}
          <span>{cal.brand_name}</span>
        </header>

        <div>
          <div className="eyebrow">Today&apos;s games</div>
          {courts.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 13.5 }}>No games recorded yet today.</p>}
          {courts.map((c) => (
            <section key={c.court} className="calendar-court">
              <h2>{c.court}</h2>
              {c.games.map((g) => g.share_id ? (
                <a key={g.started_at} className="calendar-slot" href={`/r/${g.share_id}`}>
                  <span>{slotLabel(g, cal.timezone)}</span>
                  <span className="calendar-slot-go">Watch →</span>
                </a>
              ) : (
                <div key={g.started_at} className="calendar-slot calendar-slot--pending">
                  <span>{slotLabel(g, cal.timezone)}</span>
                  <span>Reels on the way</span>
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
