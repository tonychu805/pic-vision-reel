import { t, type Lang } from '@/lib/i18n'

// The required box's label, shared by signup and the updated-terms page so a
// player agrees to the same words either way.
export default function ConsentSentence({ lang }: { lang: Lang }) {
  // Opening a policy link must not tick the box on the way.
  const link = (href: string, text: string) => (
    <a href={href} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>{text}</a>
  )
  return (
    <span>
      {t(lang, 'consentPrefix')}{' '}
      {link('https://picvisionai.com/venue-player-notice-template', t(lang, 'consentNoticeLink'))}
      {t(lang, 'consentListSep')}
      {link('https://picvisionai.com/privacy', t(lang, 'consentPrivacyLink'))}
      {' '}{t(lang, 'consentMiddle')}{' '}
      {link('https://picvisionai.com/player-terms', t(lang, 'consentTermsLink'))}
      {t(lang, 'consentSuffix')}{t(lang, 'emailNotice')}
    </span>
  )
}
