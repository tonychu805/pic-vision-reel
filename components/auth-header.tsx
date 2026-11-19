import { brandLogoUrl } from '@/lib/brandLogo'
import { venueFromNext, type NextVenue } from '@/lib/venueFromNext'
import { t, type Lang, type StringKey } from '@/lib/i18n'
import Wordmark from '@/components/wordmark'

// Shared by /login and /signup: the venue's own logo when `next` points
// back to one (the normal case, since app/[slug]/[code]/page.tsx's
// login-first gate is what sends players here) -- falls back to the
// generic PicVision AI mark otherwise. Async server component: the venue
// lookup is a plain public RPC (get_public_calendar via venueFromNext),
// same anonymous read app/[slug]/[code]/page.tsx already does.
//
// `venue` is passed by a page that already looked it up (the signup page also
// needs the name for its promotion box); undefined means look it up here.
// `venueSubtitleKey` is the subtitle that names the venue ({venue}); it is
// used instead of `subtitleKey` when a venue is known.
export default async function AuthHeader({ lang, next, titleKey, subtitleKey, venueSubtitleKey, venue: knownVenue }: {
  lang: Lang; next: string; titleKey: StringKey; subtitleKey: StringKey; venueSubtitleKey?: StringKey; venue?: NextVenue | null
}) {
  const venue = knownVenue === undefined ? await venueFromNext(next) : knownVenue

  return (
    <div className="auth-head">
      {venue ? (
        venue.logo_key ? (
          <div className={`auth-venue-plate${venue.logo_ink === 'light' ? ' auth-venue-plate--light' : ''}`}>
            <img src={brandLogoUrl(venue.logo_key)} alt={venue.brand_name} />
          </div>
        ) : (
          <div className="auth-venue-mark" aria-hidden="true">{venue.brand_name.charAt(0).toUpperCase()}</div>
        )
      ) : (
        <Wordmark size="lg" />
      )}
      <div>
        <h1>{t(lang, titleKey)}</h1>
        <p className="auth-sub">{venue && venueSubtitleKey ? t(lang, venueSubtitleKey, { venue: venue.brand_name }) : t(lang, subtitleKey)}</p>
      </div>
    </div>
  )
}
