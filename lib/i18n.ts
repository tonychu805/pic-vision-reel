// Share-site languages (2026-09-24): English and Traditional Chinese.
// The page follows the phone's language, and an EN / 中文 switch in the
// header overrides it (remembered in a cookie). Any Chinese phone gets
// Traditional Chinese: the venues are in Taiwan, and it reads fine to
// Simplified readers too. A phone whose language is neither (or sends no
// Accept-Language at all -- e.g. some in-app browsers) also defaults to
// Traditional Chinese rather than English, 2026-09-30: every venue and
// player using this today is in Taiwan, so that's the safer default for
// someone scanning a venue's QR code, not English.

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
  return 'zh-TW'
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
  downloadAllReady: 'Ready: tap to save all',
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
  checkInTitle: 'Check in',
  signInTitle: 'Sign in',
  signInSubtitle: 'Sign in and start creating your highlight.',
  signInWithLine: 'Continue with LINE',
  signInWithGoogle: 'Continue with Google',
  signUpWithLine: 'Sign up with LINE',
  signUpWithGoogle: 'Sign up with Google',
  consentPageTitle: 'Before you continue',
  consentPrefix: 'By agreeing, you confirm you have read and understood the',
  consentNoticeLink: 'Filming notice',
  consentMiddle: 'and',
  consentPrivacyLink: 'Privacy policy',
  consentSuffix: ', and that you are 18 or older, or that a parent or legal guardian has agreed to your use of this service.',
  // Filming consent and the retention policy were two separate checkboxes
  // until 2026-09-30 -- merged into one since they were always required
  // together (never independently optional), so splitting them added a
  // click without adding any real choice. record_player_consent still
  // takes two separate booleans; the UI just sends the same value to both.
  consentEssential: 'I consent to being filmed while I play and accept the recording retention policy.',
  consentTraining: '(Optional) I agree that footage of me may be used to help train or improve PicVision’s AI models.',
  consentSubmit: 'Continue',
  checkInNoneFree: 'Every court is recording right now.',
  checkInBusy: 'Recording',
  checkInStart: 'Check in →',
  checkInEndTimeLabel: 'Playing until',
  checkInJoin: 'Join ({count}/10) →',
  checkInAlreadyJoined: "You're in this session",
  checkInEnd: 'End →',
  checkInExtendLabel: 'Change end time',
  checkInExtendSubmit: 'Update →',
  checkInSessionFull: 'Session full',
  pickEndTimeError: 'Pick a time first.',
  consentRequiredError: 'Please accept consent first.',
  cameraBusyError: 'This court just started recording -- refresh and try Join.',
  endsAtInPastError: 'Pick a time later than now.',
  endsAtTooFarError: "That's later than this venue allows.",
  sessionNotActiveError: 'This session has already ended.',
  sessionFullError: 'This session is full.',
  genericError: 'Something went wrong. Please try again.',
  signOut: 'Sign out',
  authErrorMessage: 'Sign-in did not go through. Please try again.',
  orDivider: 'or',
  emailLabel: 'Email',
  passwordLabel: 'Password',
  nameLabel: 'Name',
  signInSubmit: 'Sign in',
  signUpSubmit: 'Create account',
  signUpTitle: 'Sign up',
  signUpSubtitle: 'Create an account and start creating your highlight.',
  noAccountYet: "Don't have an account?",
  goToSignUp: 'Sign up',
  haveAccountAlready: 'Already have an account?',
  goToSignIn: 'Sign in',
  checkYourEmail: 'Check your email to confirm your account before signing in.',
  invalidEmail: 'Enter a valid email address.',
  completeSignUp: 'Complete sign up',
  accountIconLabel: 'Account',
  accountTitle: 'Account',
  backLabel: 'Back',
  saveButton: 'Save',
  savedMessage: 'Saved.',
  signedInWithLine: 'Signed in with LINE',
  changeEmailButton: 'Change email',
  newEmailLabel: 'New email',
  emailChangePending: 'Check your new email for a link to confirm the change.',
  changePasswordButton: 'Change password',
  newPasswordLabel: 'New password',
  passwordChanged: 'Password updated.',
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
  downloadAllReady: '準備好了，點一下全部儲存',
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
  checkInTitle: '報到',
  signInTitle: '登入',
  signInSubtitle: '登入，開始打造你的精彩片段。',
  signInWithLine: '用 LINE 繼續',
  signInWithGoogle: '用 Google 繼續',
  signUpWithLine: '用 LINE 帳號註冊',
  signUpWithGoogle: '用 Google 帳號註冊',
  consentPageTitle: '繼續之前',
  consentPrefix: '同意即表示您已閱讀並理解',
  consentNoticeLink: '錄影告知',
  consentMiddle: '與',
  consentPrivacyLink: '隱私權政策',
  consentSuffix: '，並確認您已年滿 18 歲或已取得法定代理人同意使用本服務。',
  consentEssential: '我同意在場上被錄影，並接受錄影保存政策。',
  consentTraining: '（非必要）我同意我的影像可被用於協助訓練或改善 PicVision 的 AI 模型。',
  consentSubmit: '繼續',
  checkInNoneFree: '目前所有球場都在錄影中。',
  checkInBusy: '錄影中',
  checkInStart: '報到 →',
  checkInEndTimeLabel: '打到幾點',
  checkInJoin: '加入（{count}/10）→',
  checkInAlreadyJoined: '你已加入這場',
  checkInEnd: '結束 →',
  checkInExtendLabel: '更改結束時間',
  checkInExtendSubmit: '更新 →',
  checkInSessionFull: '人數已滿',
  pickEndTimeError: '請先選擇時間。',
  consentRequiredError: '請先完成同意流程。',
  cameraBusyError: '這面球場剛開始錄影，重新整理後改按「加入」。',
  endsAtInPastError: '請選擇比現在晚的時間。',
  endsAtTooFarError: '超過這個場館允許的時間上限。',
  sessionNotActiveError: '這場已經結束了。',
  sessionFullError: '這場人數已滿。',
  genericError: '發生錯誤，請再試一次。',
  signOut: '登出',
  authErrorMessage: '登入沒有成功，請再試一次。',
  orDivider: '或',
  emailLabel: 'Email',
  passwordLabel: '密碼',
  nameLabel: '姓名',
  signInSubmit: '登入',
  signUpSubmit: '建立帳號',
  signUpTitle: '註冊',
  signUpSubtitle: '建立帳號，開始打造你的精彩片段。',
  noAccountYet: '還沒有帳號？',
  goToSignUp: '註冊',
  haveAccountAlready: '已經有帳號了？',
  goToSignIn: '登入',
  checkYourEmail: '請到信箱點擊確認連結後再登入。',
  invalidEmail: '請輸入正確的 email 格式。',
  completeSignUp: '完成註冊',
  accountIconLabel: '帳號',
  accountTitle: '帳號',
  backLabel: '返回',
  saveButton: '儲存',
  savedMessage: '已儲存。',
  signedInWithLine: '使用 LINE 登入',
  changeEmailButton: '更改 Email',
  newEmailLabel: '新的 Email',
  emailChangePending: '請至新信箱點擊確認連結，完成變更。',
  changePasswordButton: '更改密碼',
  newPasswordLabel: '新密碼',
  passwordChanged: '密碼已更新。',
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
