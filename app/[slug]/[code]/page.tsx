import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { supabasePublic } from '@/lib/supabase'
import { createClient as createServerSupabase } from '@/lib/supabaseServer'
import { brandLogoUrl, type LogoInk } from '@/lib/brandLogo'
import { byCourt, dateLabel, slotLabel, type CalendarGame } from '@/lib/calendar'
import { t } from '@/lib/i18n'
import { currentLang } from '@/lib/lang-server'
import LangSwitch from '@/components/lang-switch'
import AccountIcon from '@/components/account-icon'
import CheckinPanel, { type CheckInOption } from './checkin-panel'

// A venue's public game calendar, opened by QR code at the venue: today's
// games on the courts the venue chose, each linking to its reels page.
// Everything that decides what's shown is in get_public_calendar (console
// migration 20260924050000): nothing unless the venue switched it on today,
// the code is right, and only the chosen cameras. Never cached, never indexed.
export const dynamic = 'force-dynamic'
export async function generateMetadata(): Promise<Metadata> {
  return { title: t(await currentLang(), 'todaysGames'), robots: { index: false, follow: false } }
}

type Calendar = { brand_name: string; logo_key: string | null; logo_ink: LogoInk | null; timezone: string; games: CalendarGame[] }

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,31}$/i
const CODE_RE = /^[a-z0-9]{8,64}$/i

export default async function CalendarPage({ params }: { params: Promise<{ slug: string; code: string }> }) {
  const { slug, code } = await params
  const validSlugCode = SLUG_RE.test(slug) && CODE_RE.test(code)
  const lang = await currentLang()

  // This page (QR-code entry point, both watching past reels and self-
  // serve check-in) now requires a signed-in player before showing
  // anything -- operator decision 2026-09-29: unauthenticated calendar
  // viewing was intentionally supported before, but check-in is now the
  // primary reason to scan the code, and a login-first gate is simpler
  // than two different landing experiences. Checked before validating
  // slug/code so a bad code doesn't behave differently pre-login and
  // reveal anything (redirect() throws internally; must run in the
  // component body, not inside a conditional expression it can't escape).
  const authedSupabase = await createServerSupabase()
  const { data: userData } = await authedSupabase.auth.getUser()
  if (!userData.user) {
    redirect(`/login?next=${encodeURIComponent(`/${slug}/${code}`)}`)
  }

  const { data } = validSlugCode
    ? await supabasePublic().rpc('get_public_calendar', { p_slug: slug, p_code: code })
    : { data: null }
  const cal = data as Calendar | null

  let checkInOptions: CheckInOption[] = []
  if (validSlugCode) {
    const { data: options } = await authedSupabase.rpc('get_check_in_options', { p_slug: slug, p_code: code })
    checkInOptions = (options ?? []) as CheckInOption[]
  }

  // Consent is a step in getting a player's account working (2026-09-30
  // operator decision), not something to ask for after landing on a
  // venue page -- redirect through /consent the same way an unauthenticated
  // visit redirects through /login. Only checked when there's actually a
  // camera to read has_current_consent off of; an empty/unavailable
  // calendar has nothing to check in on anyway.
  if (checkInOptions.length > 0 && !checkInOptions[0].has_current_consent) {
    redirect(`/consent?next=${encodeURIComponent(`/${slug}/${code}`)}`)
  }

  if (!cal) {
    // Same answer for a wrong code, a switched-off calendar and an unknown
    // venue: nothing here tells a stranger which one it was.
    return (
      <main className="share-page">
        <div className="share-shell" style={{ alignItems: 'center', textAlign: 'center', paddingTop: 80 }}>
          <p style={{ fontSize: 13.5, color: 'var(--muted)' }}>{t(lang, 'calendarUnavailable')}</p>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AccountIcon lang={lang} />
            <LangSwitch lang={lang} />
          </div>
        </header>

        <CheckinPanel lang={lang} slug={slug} code={code} options={checkInOptions} />

        <div>
          <div className="eyebrow">{t(lang, 'todaysGames')} · {dateLabel(new Date(), cal.timezone, lang)}</div>
          {courts.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 13.5 }}>{t(lang, 'noGamesYet')}</p>}
          {courts.map((c) => (
            <section key={c.court} className="calendar-court">
              <h2>{c.court}</h2>
              {c.games.map((g) => g.share_id ? (
                <a key={g.started_at} className="calendar-slot" href={`/r/${g.share_id}`}>
                  <span>{slotLabel(g, cal.timezone)}</span>
                  <span className="calendar-slot-go">{t(lang, 'watch')}</span>
                </a>
              ) : (
                <div key={g.started_at} className="calendar-slot calendar-slot--pending">
                  <span>{slotLabel(g, cal.timezone)}</span>
                  <span>{t(lang, 'reelsOnTheWay')}</span>
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
