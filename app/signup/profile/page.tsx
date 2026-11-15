import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { t } from '@/lib/i18n'
import { currentLang } from '@/lib/lang-server'
import { createClient } from '@/lib/supabaseServer'
import LangSwitch from '@/components/lang-switch'
import AuthHeader from '@/components/auth-header'
import SignupProfileForm from '@/components/signup-profile-form'
import PoweredByFooter from '@/components/powered-by-footer'

// Basic information, asked once (operator 2026-11-16): after signing up by
// any route, and once for players who signed up before it existed. The venue
// page and /account send a player here until players.profile_completed_at
// is set, then this page sends them straight on to `next`.
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return { title: t(await currentLang(), 'profileTitle'), robots: { index: false, follow: false } }
}

export default async function SignupProfilePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  const lang = await currentLang()
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/account'

  const supabase = await createClient()
  const { data: playerId } = await supabase.rpc('current_player_id')
  if (!playerId) redirect(`/login?next=${encodeURIComponent(`/signup/profile?next=${encodeURIComponent(safeNext)}`)}`)

  const { data: player } = await supabase
    .from('players').select('display_name, profile_completed_at').eq('id', playerId).maybeSingle()
  if (player?.profile_completed_at) redirect(safeNext)

  return (
    <main className="share-page">
      <div className="share-shell">
        <div className="consent-topbar">
          <LangSwitch lang={lang} />
        </div>
        <div className="auth-main">
          <AuthHeader lang={lang} next={safeNext} titleKey="profileTitle" subtitleKey="profileSubtitle" />
          <SignupProfileForm lang={lang} next={safeNext} initialName={player?.display_name ?? ''} />
        </div>
        <PoweredByFooter lang={lang} />
      </div>
    </main>
  )
}
