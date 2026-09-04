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
}

export default nextConfig
