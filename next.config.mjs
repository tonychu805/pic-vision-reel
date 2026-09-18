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
const isDev = process.env.NODE_ENV === 'development'

const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''};
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data: https://cdn.picvisionai.com;
    media-src 'self' https://cdn.picvisionai.com;
    connect-src 'self' https://cdn.picvisionai.com;
    font-src 'self' https://fonts.gstatic.com;
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
