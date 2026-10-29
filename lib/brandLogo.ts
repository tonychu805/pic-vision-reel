// Brand logo on the public share page.
//
// Deliberately duplicated from pic-vision-cloud-console/lib/brandLogo.ts
// rather than imported: these are genuinely separate deployable apps, the
// same way lib/r2.ts is already duplicated across the boundary.
//
// The rule it encodes: a transparent logo only works on one kind of
// background. Venues upload what's on their letterhead -- dark ink for
// white paper -- so drawing it straight onto this page's dark shell makes
// it invisible. It always sits on a plate whose colour is constant, chosen
// by the `ink` measured when the file was uploaded.
export type LogoInk = 'light' | 'dark'

// The production CDN in front of the public bucket, unless this deploy says
// otherwise: staging uploads go to the staging public bucket, which
// cdn.picvisionai.com does not serve, so its logos never showed (2026-10-29).
// Read at build time (NEXT_PUBLIC_), same as the console's copy.
const CDN_DOMAIN = process.env.NEXT_PUBLIC_ASSET_CDN_HOST || 'cdn.picvisionai.com'

export function brandLogoUrl(key: string): string {
  return `https://${CDN_DOMAIN}/${key}`
}
