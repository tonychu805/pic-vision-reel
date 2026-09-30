import { t, type Lang } from '@/lib/i18n'

// Same markup as app/r/[shareId]/reel-share-client.tsx's footer, pulled
// out so /login and /signup can use the identical mark without depending
// on that (client-only) component.
export default function PoweredByFooter({ lang }: { lang: Lang }) {
  return (
    <footer className="powered-by">
      <span>{t(lang, 'poweredBy')}</span>
      <img src="/pic-vision-logo-white.png" alt="" />
      <span>picvision AI</span>
    </footer>
  )
}
