import { brandLogoUrl } from '@/lib/brandLogo'
import { venueFromNext } from '@/lib/venueFromNext'
import { t, type Lang, type StringKey } from '@/lib/i18n'
import Wordmark from '@/components/wordmark'

// Shared by /login and /signup: the venue's own logo when `next` points
// back to one (the normal case, since app/[slug]/[code]/page.tsx's
// login-first gate is what sends players here) -- falls back to the
// generic PicVision AI mark otherwise. Async server component: the venue
// lookup is a plain public RPC (get_public_calendar via venueFromNext),
// same anonymous read app/[slug]/[code]/page.tsx already does.
export default async function AuthHeader({ lang, next, titleKey, subtitleKey }: { lang: Lang; next: string; titleKey: StringKey; subtitleKey: StringKey }) {
  const venue = await venueFromNext(next)

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
        <p className="auth-sub">{t(lang, subtitleKey)}</p>
      </div>
    </div>
  )
}
