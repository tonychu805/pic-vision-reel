// IP for consent records, read server-side from what the proxy says --
// never from anything the client could have put in the URL.
export function clientIp(h: Headers): string | null {
  return h.get('cf-connecting-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
}
