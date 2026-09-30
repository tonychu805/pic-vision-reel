// A small person icon next to LangSwitch in the venue page's header,
// linking to /account -- only rendered on pages that already know the
// visitor is signed in (app/[slug]/[code]/page.tsx redirects to /login
// otherwise), so no auth check needed here.
import Link from 'next/link'
import { t, type Lang } from '@/lib/i18n'

export default function AccountIcon({ lang }: { lang: Lang }) {
  return (
    <Link
      href="/account"
      aria-label={t(lang, 'accountIconLabel')}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, color: 'var(--text)' }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
      </svg>
    </Link>
  )
}
