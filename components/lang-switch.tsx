'use client'

// EN / 中文 in the page header: saves the choice for a year and redraws the
// page in it (lib/i18n.ts).
import { useRouter } from 'next/navigation'
import { LANG_COOKIE, t, type Lang } from '@/lib/i18n'

export default function LangSwitch({ lang }: { lang: Lang }) {
  const router = useRouter()
  const choose = (next: Lang) => {
    if (next === lang) return
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
    router.refresh()
  }
  return (
    <div className="lang-switch" role="group" aria-label={t(lang, 'languageLabel')}>
      <button type="button" className={lang === 'en' ? 'active' : ''} aria-pressed={lang === 'en'} onClick={() => choose('en')}>EN</button>
      <button type="button" className={lang === 'zh-TW' ? 'active' : ''} aria-pressed={lang === 'zh-TW'} onClick={() => choose('zh-TW')} lang="zh-TW">中文</button>
    </div>
  )
}
