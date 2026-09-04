'use client'

import { useEffect, useState } from 'react'

// Two different sharing mechanisms live on this page, because the two
// platforms actually support two different things (verified against
// Meta's own developer docs before building this, 2026-09-04 -- see
// DECISIONS.md/progress notes):
//
// 1. Facebook/X/WhatsApp/LINE/SMS have real, documented web share-intent
//    URLs that carry a link (and for some, text) -- a plain <a> works.
// 2. Instagram/TikTok have NO web-triggerable "here's a video, load it"
//    mechanism. Instagram's real one (`instagram-reels://share` /
//    `instagram-stories://share`) passes content via native UIPasteboard
//    keys (`com.instagram.sharedSticker.*`) that only compiled native
//    app code can write -- confirmed directly from Meta's own developer
//    docs, not assumed. A browser cannot do this, on any platform, full
//    stop -- there is no purely-web equivalent of "tap once, video is
//    already loaded in their Reels composer."
//
// What this page does instead for Instagram/TikTok: attach the actual
// video as a file to the OS's native share sheet (Web Share API,
// `navigator.share` with `files`). Verified on a real device (iOS,
// 2026-09-04): tapping Instagram *inside* the OS share sheet hands the
// file directly to Instagram's own registered share extension, which
// shows Instagram's own Reel/Post/Story/Message picker -- native
// Instagram UI, not built here, and something this page has no
// influence over past the tap. That's a direct handoff, not the
// save-then-reopen-the-app detour originally expected, so there's no
// separate "now open the app" step needed afterward.
//
// Video is prefetched on page load (below), not on tap, for two real
// reasons found from the same device test: (1) an 8MB+ fetch felt slow
// starting cold at tap time -- prefetching while the visitor is still
// reading the page/watching the preview hides that latency almost
// entirely; (2) Safari requires navigator.share() to run within the
// same user-gesture window as the tap that triggered it -- awaiting a
// multi-second fetch *before* calling share() risks that window
// expiring, which throws silently (caught, no visible error). This
// showed up as needing two taps: tap 1 landed while the blob was still
// mid-fetch, so share() was called only after an `await` on a pending
// (not yet resolved) promise -- long enough for Safari to have already
// expired the tap's activation -- and failed silently; tap 2 landed
// after the blob was already cached, so the `await` resolved as a
// same-tick microtask and share() fired inside the original activation
// window. Fix: keep the fetched video as a plain Blob in state (not a
// promise), and only let these tiles be tapped once it's actually
// there, so share() is always called synchronously off the click with
// nothing awaited first.
//
// The share sheet's own preview (filename/title) is real and
// controllable; the thumbnail *image* it renders is not -- confirmed by
// checking the R2 object's own Content-Type is already correct
// (video/mp4, not the cause) -- this is the OS deciding how to
// represent the file, and there's no Web Share API field to hand it a
// custom preview image instead.

const socials = [
  { label: 'Instagram', icon: '◎', kind: 'app' as const },
  { label: 'TikTok', icon: '♪', kind: 'app' as const },
  { label: 'Facebook', icon: 'f', kind: 'link' as const, hrefFor: (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
  { label: 'X', icon: '𝕏', kind: 'link' as const, hrefFor: (url: string) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}` },
  // Threads (Meta) ships a real documented web share intent, unlike
  // Instagram -- it just pre-fills a text post with the link, no
  // file attachment, so this is a plain link tile like Facebook/X.
  { label: 'Threads', icon: '@', kind: 'link' as const, hrefFor: (url: string) => `https://www.threads.net/intent/post?text=${encodeURIComponent(url)}` },
]

const messengers = [
  { label: 'WhatsApp', icon: '◔', hrefFor: (url: string) => `https://wa.me/?text=${encodeURIComponent(url)}` },
  { label: 'LINE', icon: '•••', hrefFor: (url: string) => `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}` },
  { label: 'Messenger', icon: '⌁', hrefFor: (url: string) => `fb-messenger://share?link=${encodeURIComponent(url)}` },
  { label: 'Messages', icon: '▰', hrefFor: (url: string) => `sms:?body=${encodeURIComponent(url)}` },
]

function sanitize(part: string) {
  return part.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

export default function ReelShareClient({
  reelId,
  videoUrl,
  venueName,
  cameraLabel,
  createdAt,
}: {
  reelId: string
  videoUrl: string
  venueName: string
  cameraLabel: string | null
  createdAt: string
}) {
  const [copied, setCopied] = useState(false)
  const [appShareState, setAppShareState] = useState<Record<string, 'idle' | 'working'>>({})
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null)
  const [videoReady, setVideoReady] = useState(false)

  // Prefetch starts as soon as the page mounts, not on tap -- see the
  // header comment for why this matters for both perceived speed and
  // navigator.share()'s user-gesture timing requirement. videoReady
  // flips true once the fetch *settles* (success or failure) so a tap
  // is never left permanently stuck waiting.
  useEffect(() => {
    let cancelled = false
    // `priority: 'high'` (supported in current Safari/Chrome) plus the
    // matching <link rel="preload" as="fetch"> rendered server-side in
    // page.tsx are what actually move the needle here -- this call reuses
    // that preload instead of starting a second download, and starts
    // downloading before this JS has even finished loading/hydrating.
    fetch(videoUrl, { priority: 'high' } as RequestInit)
      .then((res) => res.blob())
      .then((blob) => {
        if (!cancelled) setVideoBlob(blob)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setVideoReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [videoUrl])

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/r/${reelId}`

  // <name>_<venue>_<date>, e.g. "Court_4_Northside_Pickleball_2026-09-04.mp4"
  const dateStr = new Date(createdAt).toISOString().slice(0, 10)
  const fileName = `${sanitize(cameraLabel || 'Highlight')}_${sanitize(venueName)}_${dateStr}.mp4`

  async function copyLink() {
    try {
      await navigator.clipboard?.writeText(shareUrl)
    } finally {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    }
  }

  async function shareToApp(label: string) {
    if (appShareState[label] === 'working' || !videoReady) return
    setAppShareState((s) => ({ ...s, [label]: 'working' }))
    try {
      // The common case: the prefetch already finished, so this is a
      // plain in-memory Blob -- everything up to and including the
      // navigator.share() call below runs synchronously off the click,
      // no `await` in between, which is what keeps it inside Safari's
      // user-gesture window. Only if the prefetch itself failed (rare)
      // do we fall back to fetching fresh here, which re-introduces the
      // same activation risk the prefetch exists to avoid.
      const blob: Blob = videoBlob ? videoBlob : await fetch(videoUrl).then((res) => res.blob())
      const file = new File([blob], fileName, { type: blob.type || 'video/mp4' })

      const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean }
      if (nav.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${venueName} — Pickleball Highlight` })
      } else if (navigator.share) {
        // This browser's Web Share API doesn't support file attachments
        // (older/desktop browsers) -- fall back to sharing the link only.
        await navigator.share({ url: shareUrl, title: `${venueName} — Pickleball Highlight` })
      } else {
        // No Web Share API at all -- just download, no share sheet exists here.
        window.location.href = videoUrl
      }
    } catch {
      // Share sheet cancelled, or the fetch failed -- either way just
      // reset, nothing else to do.
    }
    setAppShareState((s) => ({ ...s, [label]: 'idle' }))
  }

  return (
    <main className="share-page">
      <div className="share-shell">
        <header className="venue-header">
          <div className="venue-mark" aria-hidden="true">{venueName.charAt(0).toUpperCase()}</div>
          <span>{venueName}</span>
        </header>

        <section className="video-frame" aria-label="Video preview">
          {/* preload="metadata", not the browser default -- this element
              streaming the full file in the background would compete for
              bandwidth with the share-blob fetch above, which is the one
              that actually needs to finish fast. */}
          <video src={videoUrl} controls playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </section>

        <section className="repost-section">
          <h1>Repost it</h1>
          <p>Put the clip on your feed.</p>
          <div className="share-grid">
            {socials.map((item) =>
              item.kind === 'app' ? (
                <button
                  key={item.label}
                  type="button"
                  className="share-tile share-tile-strong"
                  onClick={() => shareToApp(item.label)}
                >
                  {appShareState[item.label] === 'working' || !videoReady ? (
                    <span className="tile-spinner" aria-hidden="true" />
                  ) : (
                    <strong aria-hidden="true">{item.icon}</strong>
                  )}
                  <span>{item.label}</span>
                </button>
              ) : (
                <a key={item.label} className="share-tile share-tile-strong" href={item.hrefFor(shareUrl)} target="_blank" rel="noreferrer">
                  <strong aria-hidden="true">{item.icon}</strong>
                  <span>{item.label}</span>
                </a>
              ),
            )}
          </div>
        </section>

        <section>
          <div className="eyebrow">Send to</div>
          <div className="share-grid">
            {messengers.map((item) => (
              <a className="share-tile" href={item.hrefFor(shareUrl)} target="_blank" rel="noreferrer" key={item.label}>
                <strong aria-hidden="true">{item.icon}</strong>
                <span>{item.label}</span>
              </a>
            ))}
          </div>
        </section>

        <div className="actions">
          {/* Same OS share sheet as the app tiles above, not a direct link --
              a plain <a href download> saves straight into the browser's
              downloads folder with no "Save Video" panel; routing this
              through navigator.share() instead is what makes a panel show
              up at all, consistent with how Instagram/TikTok behave. */}
          <button className="text-action" type="button" onClick={() => shareToApp('Download')}>
            {appShareState['Download'] === 'working' || !videoReady ? (
              <span className="text-action-spinner" aria-hidden="true" />
            ) : (
              <span aria-hidden="true">↓</span>
            )}{' '}
            Download
          </button>
          <button className="text-action" type="button" onClick={copyLink}>
            <span aria-hidden="true">{copied ? '✓' : '↗'}</span> {copied ? 'Link copied' : 'Copy link'}
          </button>
        </div>

        <footer className="powered-by">
          <span>Powered by</span>
          <img src="/pic-vision-logo-white.png" alt="" />
          <span>picvision AI</span>
        </footer>
      </div>
    </main>
  )
}
