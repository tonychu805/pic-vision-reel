// Share-site languages (2026-09-24): English and Traditional Chinese.
// The page follows the phone's language, and an EN / 中文 switch in the
// header overrides it (remembered in a cookie). Any Chinese phone gets
// Traditional Chinese: the venues are in Taiwan, and it reads fine to
// Simplified readers too.

export type Lang = 'en' | 'zh-TW'
export const LANGS: Lang[] = ['en', 'zh-TW']
export const LANG_COOKIE = 'pv_lang'

/** The saved choice if there is one, else the first language the phone asks for that we have. */
export function pickLang(saved: string | null | undefined, acceptLanguage: string | null | undefined): Lang {
  if (saved === 'en' || saved === 'zh-TW') return saved
  const wanted = (acceptLanguage ?? '')
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=')
      return { tag: tag.toLowerCase(), q: q ? Number(q) : 1 }
    })
    .filter((x) => x.tag && !Number.isNaN(x.q))
    .sort((a, b) => b.q - a.q)
  for (const { tag } of wanted) {
    if (tag.startsWith('zh')) return 'zh-TW'
    if (tag.startsWith('en')) return 'en'
  }
  return 'en'
}

const en = {
  pageTitle: 'Your highlight is ready',
  pageDescription: 'Watch and share your pickleball highlight, powered by picvision AI.',
  rally: 'Rally {n}',
  quickHits: 'Quick hits',
  fullReel: 'Full reel',
  repostIt: 'Repost it',
  putKindOnFeed: 'Put the {kind} on your feed.',
  putClipOnFeed: 'Put the clip on your feed.',
  sendVideoTo: 'Send the video to',
  messages: 'Messages',
  download: 'Download',
  copyLink: 'Copy link',
  linkCopied: 'Link copied',
  downloadAll: 'Download all',
  poweredBy: 'Powered by',
  feedback: 'Feedback',
  videoPreview: 'Video preview',
  reelSelector: 'Reel selector',
  shareTitleOne: '{venue} — Pickleball Highlight',
  shareTitleMany: '{venue} — Pickleball Highlights',
  todaysGames: "Today's games",
  noGamesYet: 'No games recorded yet today.',
  watch: 'Watch →',
  reelsOnTheWay: 'Reels on the way',
  calendarUnavailable: "This calendar isn't available right now.",
  homeHint: "This page shows one specific highlight reel — you'll need the link you were sent.",
  languageLabel: 'Language',
}

export type StringKey = keyof typeof en

const zhTW: Record<StringKey, string> = {
  pageTitle: '你的精彩片段準備好了',
  pageDescription: '觀看並分享你的匹克球精彩片段，由 picvision AI 提供。',
  rally: '精彩回合 {n}',
  quickHits: '精華快剪',
  fullReel: '完整精華',
  repostIt: '分享出去',
  putKindOnFeed: '把「{kind}」分享到你的動態。',
  putClipOnFeed: '把這段影片分享到你的動態。',
  sendVideoTo: '傳送影片給',
  messages: '簡訊',
  download: '下載',
  copyLink: '複製連結',
  linkCopied: '已複製連結',
  downloadAll: '全部下載',
  poweredBy: '技術提供',
  feedback: '意見回饋',
  videoPreview: '影片預覽',
  reelSelector: '選擇影片',
  shareTitleOne: '{venue} — 匹克球精彩片段',
  shareTitleMany: '{venue} — 匹克球精彩片段',
  todaysGames: '今日場次',
  noGamesYet: '今天還沒有錄影的場次。',
  watch: '觀看 →',
  reelsOnTheWay: '影片製作中',
  calendarUnavailable: '這個行事曆目前無法使用。',
  homeHint: '這個網站只會顯示特定的精彩片段，請用你收到的連結開啟。',
  languageLabel: '語言',
}

const STRINGS: Record<Lang, Record<StringKey, string>> = { en, 'zh-TW': zhTW }

/** A string in `lang`, with {name} placeholders filled from `vars`. */
export function t(lang: Lang, key: StringKey, vars: Record<string, string | number> = {}): string {
  const text = STRINGS[lang]?.[key] ?? en[key]
  return text.replace(/\{(\w+)\}/g, (_, name) => (name in vars ? String(vars[name]) : `{${name}}`))
}

/** Every key has a translation in every language (held by lib/i18n.test.ts). */
export function missingKeys(): string[] {
  return LANGS.flatMap((lang) => (Object.keys(en) as StringKey[]).filter((k) => !STRINGS[lang][k]).map((k) => `${lang}:${k}`))
}
