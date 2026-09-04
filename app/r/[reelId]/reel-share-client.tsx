'use client'

import { useState } from 'react'

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
// `navigator.share` with `files`), which surfaces "Save Video"/"Save to
// Photos" as one of the share-sheet's own options -- then, best-effort,
// try to open the app right after so the user lands on its create
// screen and picks the just-saved video from their gallery. One extra
// tap versus the ideal, everything else automatic. This needs the video
// bytes to actually be fetchable cross-origin (R2 bucket CORS, set
// 2026-09-04) since attaching a File means fetching it first, not just
// linking to it.

const socials = [
  { label: 'Instagram', icon: '◎', kind: 'app' as const, appScheme: 'instagram://' },
  { label: 'TikTok', icon: '♪', kind: 'app' as const, appScheme: 'tiktok://' },
  { label: 'Facebook', icon: 'f', kind: 'link' as const, hrefFor: (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
  { label: 'X', icon: '𝕏', kind: 'link' as const, hrefFor: (url: string) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}` },
]

const messengers = [
  { label: 'WhatsApp', icon: '◔', hrefFor: (url: string) => `https://wa.me/?text=${encodeURIComponent(url)}` },
  { label: 'LINE', icon: '•••', hrefFor: (url: string) => `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}` },
  { label: 'Messenger', icon: '⌁', hrefFor: (url: string) => `fb-messenger://share?link=${encodeURIComponent(url)}` },
  { label: 'Messages', icon: '▰', hrefFor: (url: string) => `sms:?body=${encodeURIComponent(url)}` },
]

export default function ReelShareClient({
  reelId,
  videoUrl,
  venueName,
}: {
  reelId: string
  videoUrl: string
  venueName: string
}) {
  const [copied, setCopied] = useState(false)
  const [appShareState, setAppShareState] = useState<Record<string, 'idle' | 'working' | 'error'>>({})

  // NEXT_PUBLIC_APP_URL, not window.location.origin -- the latter would
  // render differently on the server (no window) vs. the client's first
  // render (window already exists by hydration time), which is exactly
  // the shape of a React hydration mismatch, not just a style nit.
  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/r/${reelId}`

  async function copyLink() {
    try {
      await navigator.clipboard?.writeText(shareUrl)
    } finally {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    }
  }

  async function shareToApp(label: string, appScheme: string) {
    setAppShareState((s) => ({ ...s, [label]: 'working' }))
    try {
      const res = await fetch(videoUrl)
      const blob = await res.blob()
      const file = new File([blob], 'highlight.mp4', { type: blob.type || 'video/mp4' })

      const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean }
      if (nav.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'My pickleball highlight' })
      } else if (navigator.share) {
        // This browser's Web Share API doesn't support file attachments
        // (older/desktop browsers) -- fall back to sharing the link only.
        await navigator.share({ url: shareUrl, title: 'My pickleball highlight' })
      } else {
        // No Web Share API at all -- just download, no share sheet exists here.
        window.location.href = videoUrl
        setAppShareState((s) => ({ ...s, [label]: 'idle' }))
        return
      }
    } catch {
      // Share sheet cancelled, or the fetch failed -- either way, don't
      // force-open the app on top of an error the user didn't ask for.
      setAppShareState((s) => ({ ...s, [label]: 'idle' }))
      return
    }
    setAppShareState((s) => ({ ...s, [label]: 'idle' }))
    // Best-effort: no reliable signal from the OS for "user picked Save,
    // not Cancel" -- this fires regardless. May also be blocked by the
    // browser if it decides too much async time passed since the actual
    // tap to still count as the same user gesture; not detectable from
    // JS either. Real-device testing item, not assumed to always work.
    window.location.href = appScheme
  }

  return (
    <main className="share-page">
      <div className="share-shell">
        <header className="venue-header">
          <div className="venue-mark" aria-hidden="true">{venueName.charAt(0).toUpperCase()}</div>
          <span>{venueName}</span>
        </header>

        <section className="video-frame" aria-label="Video preview">
          <video src={videoUrl} controls playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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
                  onClick={() => shareToApp(item.label, item.appScheme)}
                  disabled={appShareState[item.label] === 'working'}
                >
                  <strong aria-hidden="true">{item.icon}</strong>
                  <span>{appShareState[item.label] === 'working' ? 'Saving…' : item.label}</span>
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
          <a className="text-action" href={videoUrl} download="highlight.mp4"><span aria-hidden="true">↓</span> Download</a>
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
