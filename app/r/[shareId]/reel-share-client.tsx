'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { brandLogoUrl } from '@/lib/brandLogo'

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
// influence over past the tap.
//
// ADR-076 (2026-09-04): a session can now produce two reels -- "full"
// (whole rally) and "burst" (just each rally's peak-intensity moment,
// "quick hits") -- sharing one page via share_id, shown as a horizontal
// scroll-snap carousel. Every slide's video is prefetched as a Blob
// eagerly on mount (not lazily per-slide) for the same reason the
// original single-video version of this page prefetches at all: Safari
// requires navigator.share() to run inside the same user-gesture window
// as the tap, with nothing awaited first -- a lazy fetch kicked off only
// once a slide becomes active would very often still be mid-flight by
// the time someone taps a share tile for it. At most two short clips, so
// prefetching both is cheap enough to just always do.
//
// The IG/TikTok/Download tiles act on whichever slide is currently
// centered in the carousel (an IntersectionObserver drives activeIndex)
// -- Facebook/X/Threads/WhatsApp/etc and Copy link are unaffected by the
// active slide, since they all just carry this one page's URL, not a
// specific video. Download all (new) shares every slide's video at once
// via a multi-file navigator.share(), falling back to sequential plain
// downloads if the browser doesn't support a multi-file share.

type Slide = {
  id: string
  kind: 'full' | 'burst'
  videoUrl: string
  durationSec: number | null
  rallyCount: number | null
}

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

const KIND_LABEL: Record<Slide['kind'], string> = { full: 'Full reel', burst: 'Quick hits' }

function sanitize(part: string) {
  return part.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

export default function ReelShareClient({
  shareId,
  slides,
  venueName,
  logoKey,
  logoInk,
  cameraLabel,
  createdAt,
}: {
  shareId: string
  slides: Slide[]
  venueName: string
  logoKey: string | null
  logoInk: 'light' | 'dark' | null
  cameraLabel: string | null
  createdAt: string
}) {
  const [copied, setCopied] = useState(false)
  const [appShareState, setAppShareState] = useState<Record<string, 'idle' | 'working'>>({})
  const [activeIndex, setActiveIndex] = useState(0)
  const [blobs, setBlobs] = useState<(Blob | null)[]>(() => slides.map(() => null))
  const [ready, setReady] = useState<boolean[]>(() => slides.map(() => false))

  const scrollRef = useRef<HTMLDivElement>(null)
  const slideRefs = useRef<(HTMLDivElement | null)[]>([])
  const ratiosRef = useRef<Record<number, number>>({})

  const dateStr = useMemo(() => new Date(createdAt).toISOString().slice(0, 10), [createdAt])

  function fileNameFor(slide: Slide) {
    const suffix = slide.kind === 'burst' ? '_quick_hits' : ''
    return `${sanitize(cameraLabel || 'Highlight')}_${sanitize(venueName)}_${dateStr}${suffix}.mp4`
  }

  // Prefetch every slide's video as a Blob on mount -- see header comment
  // for why this is eager/all rather than lazy/per-slide.
  useEffect(() => {
    let cancelled = false
    slides.forEach((slide, i) => {
      fetch(slide.videoUrl, i === 0 ? ({ priority: 'high' } as RequestInit) : undefined)
        .then((res) => res.blob())
        .then((blob) => {
          if (cancelled) return
          setBlobs((prev) => {
            const next = [...prev]
            next[i] = blob
            return next
          })
        })
        .catch(() => {})
        .finally(() => {
          if (cancelled) return
          setReady((prev) => {
            const next = [...prev]
            next[i] = true
            return next
          })
        })
    })
    return () => {
      cancelled = true
    }
    // slides is a stable server-passed prop for the life of this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Tracks which slide is most visible inside the scroll container --
  // accumulates ratios across observer callbacks (a batch only reports
  // entries that crossed a threshold, not every slide's current state)
  // so the "most visible" pick stays correct even mid-scroll.
  useEffect(() => {
    if (slides.length <= 1) return
    const container = scrollRef.current
    if (!container) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const idx = Number((entry.target as HTMLElement).dataset.index)
          ratiosRef.current[idx] = entry.isIntersecting ? entry.intersectionRatio : 0
        }
        let bestIdx = 0
        let bestRatio = -1
        for (const [k, v] of Object.entries(ratiosRef.current)) {
          if (v > bestRatio) {
            bestRatio = v
            bestIdx = Number(k)
          }
        }
        setActiveIndex(bestIdx)
      },
      { root: container, threshold: [0.5, 0.75, 0.95] },
    )
    slideRefs.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [slides.length])

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/r/${shareId}`

  async function copyLink() {
    try {
      await navigator.clipboard?.writeText(shareUrl)
    } finally {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    }
  }

  async function shareToApp(label: string, index: number) {
    if (appShareState[label] === 'working' || !ready[index]) return
    setAppShareState((s) => ({ ...s, [label]: 'working' }))
    try {
      const slide = slides[index]
      // The common case: prefetch already finished, so this is a plain
      // in-memory Blob -- everything up to and including the
      // navigator.share() call below runs synchronously off the click,
      // no `await` in between, which is what keeps it inside Safari's
      // user-gesture window. Only if the prefetch itself failed (rare)
      // do we fall back to fetching fresh here.
      const blob: Blob = blobs[index] ? blobs[index]! : await fetch(slide.videoUrl).then((res) => res.blob())
      const file = new File([blob], fileNameFor(slide), { type: blob.type || 'video/mp4' })

      const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean }
      if (nav.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${venueName} — Pickleball Highlight` })
      } else if (navigator.share) {
        // This browser's Web Share API doesn't support file attachments
        // (older/desktop browsers) -- fall back to sharing the link only.
        await navigator.share({ url: shareUrl, title: `${venueName} — Pickleball Highlight` })
      } else {
        // No Web Share API at all -- just download, no share sheet exists here.
        window.location.href = slide.videoUrl
      }
    } catch {
      // Share sheet cancelled, or the fetch failed -- either way just
      // reset, nothing else to do.
    }
    setAppShareState((s) => ({ ...s, [label]: 'idle' }))
  }

  async function downloadAll() {
    const label = 'Download all'
    if (appShareState[label] === 'working' || slides.some((_, i) => !ready[i])) return
    setAppShareState((s) => ({ ...s, [label]: 'working' }))
    try {
      const files = slides.map((slide, i) => {
        const blob = blobs[i]!  // ready[] gate above guarantees every slide settled; a failed
                                 // fetch would leave blob null and this would throw, caught below.
        return new File([blob], fileNameFor(slide), { type: blob.type || 'video/mp4' })
      })
      const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean }
      if (nav.canShare?.({ files })) {
        await navigator.share({ files, title: `${venueName} — Pickleball Highlights` })
      } else {
        // Multi-file share not supported here -- fall back to a plain
        // sequential download per file. A second navigator.share() call
        // off the same tap would just fail anyway once the first
        // consumes the user-activation window, so this isn't a share
        // sheet for either file, just a direct save of both.
        for (const file of files) {
          const url = URL.createObjectURL(file)
          const a = document.createElement('a')
          a.href = url
          a.download = file.name
          document.body.appendChild(a)
          a.click()
          a.remove()
          URL.revokeObjectURL(url)
        }
      }
    } catch {
      // Share sheet cancelled, or a blob was missing -- reset either way.
    }
    setAppShareState((s) => ({ ...s, [label]: 'idle' }))
  }

  const allReady = slides.every((_, i) => ready[i])

  return (
    <main className="share-page">
      <div className="share-shell">
        <header className="venue-header">
          {logoKey ? (
            <div className={`venue-plate${logoInk === 'light' ? ' venue-plate--light' : ''}`}>
              <img src={brandLogoUrl(logoKey)} alt={venueName} />
            </div>
          ) : (
            <div className="venue-mark" aria-hidden="true">{venueName.charAt(0).toUpperCase()}</div>
          )}
          <span>{venueName}</span>
        </header>

        <section className="video-carousel-wrap" aria-label="Video preview">
          <div className="video-carousel" ref={scrollRef}>
            {slides.map((slide, i) => (
              <div
                key={slide.id}
                className="video-slide"
                data-index={i}
                ref={(el) => {
                  slideRefs.current[i] = el
                }}
              >
                {slides.length > 1 && <span className="slide-badge">{KIND_LABEL[slide.kind]}</span>}
                {/* preload="metadata" on every slide but the first, and
                    "metadata" (not the default) even on the first -- this
                    element streaming the full file in the background
                    would compete for bandwidth with the Blob prefetch
                    above, which is the one that actually needs to finish
                    fast for sharing. */}
                <video
                  src={slide.videoUrl}
                  controls
                  playsInline
                  preload="metadata"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
            ))}
          </div>
          {slides.length > 1 && (
            <div className="carousel-dots" role="tablist" aria-label="Reel selector">
              {slides.map((_, i) => (
                <span key={i} className={`dot${i === activeIndex ? ' dot-active' : ''}`} aria-hidden="true" />
              ))}
            </div>
          )}
        </section>

        <section className="repost-section">
          <h1>Repost it</h1>
          <p>{slides.length > 1 ? `Put the ${KIND_LABEL[slides[activeIndex].kind].toLowerCase()} on your feed.` : 'Put the clip on your feed.'}</p>
          <div className="share-grid">
            {socials.map((item) =>
              item.kind === 'app' ? (
                <button
                  key={item.label}
                  type="button"
                  className="share-tile share-tile-strong"
                  onClick={() => shareToApp(item.label, activeIndex)}
                >
                  {appShareState[item.label] === 'working' || !ready[activeIndex] ? (
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
          <button className="text-action" type="button" onClick={() => shareToApp('Download', activeIndex)}>
            {appShareState['Download'] === 'working' || !ready[activeIndex] ? (
              <span className="text-action-spinner" aria-hidden="true" />
            ) : (
              <span aria-hidden="true">↓</span>
            )}{' '}
            Download
          </button>
          <button className="text-action" type="button" onClick={copyLink}>
            <span aria-hidden="true">{copied ? '✓' : '↗'}</span> {copied ? 'Link copied' : 'Copy link'}
          </button>
          {slides.length > 1 && (
            <button className="text-action" type="button" onClick={downloadAll} disabled={!allReady}>
              {appShareState['Download all'] === 'working' || !allReady ? (
                <span className="text-action-spinner" aria-hidden="true" />
              ) : (
                <span aria-hidden="true">⇊</span>
              )}{' '}
              Download all
            </button>
          )}
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
