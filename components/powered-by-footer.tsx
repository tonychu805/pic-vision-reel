import { t, type Lang } from '@/lib/i18n'
import Wordmark from '@/components/wordmark'

// Same footer as app/r/[shareId]/reel-share-client.tsx's, pulled out so
// /login and /signup can use the identical mark without depending on that
// (client-only) component.
export default function PoweredByFooter({ lang, tone = 'paper' }: { lang: Lang; tone?: 'paper' | 'night' }) {
  return (
    <footer className="powered-by">
      <span>{t(lang, 'poweredBy')}</span>
      <Wordmark tone={tone} size="sm" />
    </footer>
  )
}
