// PIC-146 (security audit, 2026-09-10, tracked in the pic-vision-cloud-
// console repo -- this app has its own copy of the finding since it's a
// separately deployed Next.js app, not a shared config). No CSP/HSTS/
// security headers were set anywhere. This is the one app in the family a
// stranger actually loads by clicking a link, not an authenticated
// operator, which makes real defense-in-depth here worth more than on the
// console.
//
// 'unsafe-inline' on script-src/style-src, not a nonce (see the console
// repo's own next.config.mjs for the fuller reasoning) -- this app has no
// inline <script> of its own, but Next's own hydration scripts still need
// it without a nonce, per Next's docs (app/guides/content-security-
// policy)'s own non-nonce example.
//
// Every external domain below is real, checked against this app's own
// code:
//   - cdn.picvisionai.com (lib/r2.ts, lib/brandLogo.ts): the reel video
//     and brand logo both load from here. Needed in THREE places, not
//     just img-src -- reel-share-client.tsx's <video src> needs
//     media-src, and it's SEPARATELY fetch()'d as a Blob for the native
//     share-sheet feature (Web Share API needs a real File, not a src
//     URL), which needs connect-src. Missing either would silently break
//     a real feature, not just fail to warn about a real one.
//   - fonts.googleapis.com / fonts.gstatic.com (app/globals.css's
//     @import): confirmed by fetching the actual stylesheet, not assumed
//     -- Google Fonts serves the CSS from googleapis.com (style-src, it's
//     an @import) but the .woff2/.ttf files themselves from a DIFFERENT
//     domain, gstatic.com (font-src).
//
// No connect-src for Supabase here, unlike the console app: this app's
// Supabase client only runs in the server component (app/r/[shareId]/
// page.tsx), never in the 'use client' one -- the browser never talks to
// it directly, so it isn't in the allow-list.
//
// tally.so (2026-09-22, the reel-share-client.tsx feedback button): this
// CSP is exactly why that button did nothing when tapped -- the browser
// silently blocked both the embed script (script-src) and the popup it
// opens, which is a real cross-origin <iframe> to tally.so, not an inline
// widget (frame-src, previously absent here and so falling back to
// default-src 'self'). Checked against tally.so's own widgets/embed.js:
// no fetch()/XHR calls in it at all, so connect-src needs nothing added --
// the form itself submits from inside the framed document, under tally.so's
// own CSP, not this page's.
//
// Signed reel addresses (2026-10-27, ADR-142): reels now play from the
// private bucket through signed addresses on the R2 account endpoint
// (<bucket>.<account>.r2.cloudflarestorage.com -- the production and the
// staging bucket share that account), and the browser re-asks the console
// for fresh addresses before they run out (lib/videoAddresses.ts). Without
// both in media-src/connect-src the page rendered but no reel played --
// caught on the staging share site before it reached production.
const isDev = process.env.NODE_ENV === 'development'
const r2 = 'https://*.a4990d92f47faeb0b0d0cbc35e64da92.r2.cloudflarestorage.com'
const consoleOrigin = new URL(process.env.NEXT_PUBLIC_CONSOLE_URL || 'https://console.picvisionai.com').origin
// Public assets (venue logos): the production CDN unless this deploy points
// elsewhere -- staging's public bucket has its own address (lib/brandLogo.ts).
const assetOrigin = `https://${process.env.NEXT_PUBLIC_ASSET_CDN_HOST || 'cdn.picvisionai.com'}`

const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' https://tally.so${isDev ? " 'unsafe-eval'" : ''};
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data: https://cdn.picvisionai.com ${assetOrigin};
    media-src 'self' https://cdn.picvisionai.com ${r2};
    connect-src 'self' https://cdn.picvisionai.com ${r2} ${consoleOrigin};
    font-src 'self' https://fonts.gstatic.com;
    frame-src https://tally.so;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim()

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Dev-only: without this, Next blocks cross-origin HMR/JS chunk requests
  // from a real phone accessing this over Tailscale (not localhost), which
  // silently breaks hydration -- the page renders but no click handler
  // ever attaches, which looks exactly like "nothing happens when I tap
  // the button" (2026-09-04, real-device test over Tailscale). Both the
  // bare Tailscale IP and the tailnet HTTPS hostname (`tailscale serve`,
  // needed for navigator.share() -- that API requires a secure context,
  // which a bare-IP http:// origin doesn't qualify for) can show up
  // depending on how the link was opened.
  allowedDevOrigins: ['100.108.136.43', 'tonychu-compute-lab.tail5438df.ts.net'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: cspHeader },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
