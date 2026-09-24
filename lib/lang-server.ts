// The language for this request, on the server: the saved switch choice,
// else the phone's Accept-Language (lib/i18n.ts).
import { cookies, headers } from 'next/headers'
import { LANG_COOKIE, pickLang, type Lang } from './i18n'

export async function currentLang(): Promise<Lang> {
  const [c, h] = await Promise.all([cookies(), headers()])
  return pickLang(c.get(LANG_COOKIE)?.value, h.get('accept-language'))
}
