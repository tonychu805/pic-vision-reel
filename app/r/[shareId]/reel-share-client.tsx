'use client'

import Script from 'next/script'
import { useEffect, useMemo, useRef, useState } from 'react'
import { brandLogoUrl } from '@/lib/brandLogo'
import { slidesToLoad } from '@/lib/loadWindow'
import { t, type Lang } from '@/lib/i18n'
import LangSwitch from '@/components/lang-switch'

// Feedback form (Tally, form ODRRQR) for the player actually watching
// their highlight -- not the venue operator's console. Tally's own script
// turns any element with `data-tally-open` into a popup trigger; nothing
// else to wire up.
const TALLY_FORM_ID = 'ODRRQR'

// How sharing works on this page (revised 2026-09-24, operator: sharing the
// page link instead of the footage wasn't what players wanted).
//
// Every tile shares the VIDEO itself: it attaches the current clip as a file
// to the phone's own share panel (Web Share API, `navigator.share` with
// `files`), and the player picks the app there. That is the only way a web
// page can hand a video to another app: no platform offers a web link that
// arrives with a video already loaded. Verified for Instagram on a real
// device (iOS, 2026-09-04): its share extension shows Instagram's own
// Reel/Post/Story picker; what Facebook, X, WhatsApp, LINE, Messenger and
// Messages show after that tap is theirs, not something this page controls.
//
// A browser that can't attach files (most desktop browsers) falls back to
// the tile's old link-sharing address where it has one (Facebook sharer, X
// intent, WhatsApp, LINE, Messenger, SMS), so those still share the page
// link there. Threads was removed: it didn't take the video.
//
// ADR-076 (2026-09-04): a session can now produce multiple reels -- "full"
// (whole rally, now a shorter clip), "burst" (just each rally's
// peak-intensity moment, "quick hits"), and, since 2026-09-12, up to 10
// individual "rally" clips (the same top-ranked rallies "full" is built
// from, delivered as separate un-concatenated files instead of one reel,
// ordered by rally_rank -- best score first). All share one page via
// share_id, shown as a horizontal scroll-snap carousel; the DB's own
// ORDER BY (get_reels_by_share_id) is what puts rally clips first, burst
// second, full last -- this component just renders whatever order the
// slides prop already arrives in. Videos are prefetched as Blobs because
// Safari requires navigator.share() to run inside the same user-gesture
// window as the tap, with nothing awaited first. Only the slide on screen
// and the next one are fetched (lib/loadWindow.ts, 2026-09-28): fetching
// all ~12 on open cost about 56 MB on the 9/25 field test. Fetching one
// slide ahead means the slide someone swipes to is usually already loaded;
// if not, its tiles show a spinner until it is.
//
// Every share tile and Download act on whichever slide is currently
// centered in the carousel (an IntersectionObserver drives activeIndex);
// only Copy link is unaffected, since it carries this page's URL, not a
// specific video. Download all shares every slide's video at once via a
// multi-file navigator.share(), falling back to sequential plain downloads
// if the browser doesn't support a multi-file share. Because the slides
// aren't all loaded up front, it takes two taps: the first fetches whatever
// is missing, the second ("Ready: tap to save all") shares them inside
// Safari's tap window.

type Slide = {
  id: string
  kind: 'full' | 'burst' | 'rally'
  rallyRank: number | null
  videoUrl: string
  durationSec: number | null
  rallyCount: number | null
}

const socials = [
  { label: 'Instagram', icon: '◎' },
  { label: 'TikTok', icon: '♪' },
  { label: 'Facebook', icon: 'f', hrefFor: (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
  { label: 'X', icon: '𝕏', hrefFor: (url: string) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}` },
]

const messengers = [
  { label: 'WhatsApp', icon: '◔', hrefFor: (url: string) => `https://wa.me/?text=${encodeURIComponent(url)}` },
  { label: 'LINE', icon: '•••', hrefFor: (url: string) => `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}` },
  { label: 'Messenger', icon: '⌁', hrefFor: (url: string) => `fb-messenger://share?link=${encodeURIComponent(url)}` },
  { label: 'Messages', labelKey: 'messages' as const, icon: '▰', hrefFor: (url: string) => `sms:?body=${encodeURIComponent(url)}` },
]

function sanitize(part: string) {
  return part.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

// 'rally' slides need their own rank in the label ("Rally 3"), so this is
// a function rather than the static Record the two fixed kinds used to be
// enough for.
function kindLabel(slide: Slide, lang: Lang): string {
  if (slide.kind === 'rally') return t(lang, 'rally', { n: slide.rallyRank ?? '' }).trim()
  return t(lang, slide.kind === 'burst' ? 'quickHits' : 'fullReel')
}

export default function ReelShareClient({
  shareId,
  slides,
  venueName,
  logoKey,
  logoInk,
  cameraLabel,
  createdAt,
  lang,
}: {
  shareId: string
  slides: Slide[]
  venueName: string
  logoKey: string | null
  logoInk: 'light' | 'dark' | null
  cameraLabel: string | null
  createdAt: string
  lang: Lang
}) {
  const [copied, setCopied] = useState(false)
  const [appShareState, setAppShareState] = useState<Record<string, 'idle' | 'working'>>({})
  const [activeIndex, setActiveIndex] = useState(0)
  const [blobs, setBlobs] = useState<(Blob | null)[]>(() => slides.map(() => null))
  const [ready, setReady] = useState<boolean[]>(() => slides.map(() => false))

  // Demo-admin mode: a hidden date picker for jumping between candidate
  // demo sessions from one bookmarked share link, instead of needing a
  // different URL per candidate clip. Password-gated server-side
  // (app/api/admin/login) -- nothing here trusts the client, this state is
  // just UI, not the actual access check.
  const [adminOpen, setAdminOpen] = useState(false)
  const [adminAuthed, setAdminAuthed] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [adminError, setAdminError] = useState(false)
  const [adminBusy, setAdminBusy] = useState(false)
  const [demoDate, setDemoDate] = useState('')
  const [demoSessions, setDemoSessions] = useState<
    { share_id: string; camera_label: string | null; created_at: string; reel_count: number }[] | null
  >(null)
  const [demoSessionsLoading, setDemoSessionsLoading] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const slideRefs = useRef<(HTMLDivElement | null)[]>([])
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const ratiosRef = useRef<Record<number, number>>({})

  const dateStr = useMemo(() => new Date(createdAt).toISOString().slice(0, 10), [createdAt])

  function fileNameFor(slide: Slide) {
    const suffix = slide.kind === 'burst' ? '_quick_hits' : slide.kind === 'rally' ? `_rally_${slide.rallyRank}` : ''
    return `${sanitize(cameraLabel || 'Highlight')}_${sanitize(venueName)}_${dateStr}${suffix}.mp4`
  }

  // Fetch one slide's video as a Blob, once. Blobs are kept for the life of
  // the page, so swiping back never re-downloads.
  const requestedRef = useRef<Set<number>>(new Set())
  const mountedRef = useRef(true)
  useEffect(() => () => {
    mountedRef.current = false
  }, [])

  function load(i: number) {
    if (requestedRef.current.has(i)) return
    requestedRef.current.add(i)
    const slide = slides[i]
    fetch(slide.videoUrl, i === activeIndex ? ({ priority: 'high' } as RequestInit) : undefined)
      .then((res) => res.blob())
      .then((blob) => {
        if (!mountedRef.current) return
        setBlobs((prev) => {
          const next = [...prev]
          next[i] = blob
          return next
        })
      })
      .catch(() => {})
      .finally(() => {
        if (!mountedRef.current) return
        setReady((prev) => {
          const next = [...prev]
          next[i] = true
          return next
        })
      })
  }

  // The slide on screen and the next one -- see the header comment.
  useEffect(() => {
    slidesToLoad(activeIndex, slides.length).forEach(load)
    // load() only reads refs and the stable slides prop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex])

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

  // Autoplay whichever slide is active -- the very first one on open, and
  // whichever one scrolls into view after that (activeIndex, tracked by
  // the observer above, covers both). Every other slide is paused rather
  // than left running: a scroll-snap carousel only ever shows one at a
  // time, so a background one still playing would be wasted decode work
  // and, worse, a second audio track. Muted is what makes the initial
  // autoplay reliable at all -- every mainstream browser (this page's own
  // iOS Safari audience very much included) blocks unmuted autoplay
  // outright; the native `controls` bar still lets someone unmute by hand.
  // .play() is a Promise that rejects if the browser declines anyway (a
  // user interaction requirement this muted/playsInline combo is meant to
  // satisfy, but not guaranteed on every browser) -- caught and ignored,
  // since a video that simply sits on its poster frame until tapped is a
  // fine fallback, not an error.
  useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return
      if (i === activeIndex) {
        video.play().catch(() => {})
      } else {
        video.pause()
      }
    })
  }, [activeIndex])

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/r/${shareId}`

  async function copyLink() {
    try {
      await navigator.clipboard?.writeText(shareUrl)
    } finally {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    }
  }

  // linkFallback: where a browser that can't attach files should go instead
  // (the app's own link-sharing address); without one it shares or opens
  // the link another way, as before.
  async function shareToApp(label: string, index: number, linkFallback?: string) {
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
        await navigator.share({ files: [file], title: t(lang, 'shareTitleOne', { venue: venueName }) })
      } else if (linkFallback) {
        // Opened straight off the tap (nothing awaited first when the video
        // was prefetched), so it isn't treated as a pop-up.
        window.open(linkFallback, '_blank', 'noopener,noreferrer')
      } else if (navigator.share) {
        // This browser's Web Share API doesn't support file attachments
        // (older/desktop browsers) -- fall back to sharing the link only.
        await navigator.share({ url: shareUrl, title: t(lang, 'shareTitleOne', { venue: venueName }) })
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

  // First tap: fetch every slide not loaded yet. The share itself has to wait
  // for a second tap, since Safari only opens the share panel straight off a
  // tap with nothing awaited first.
  const [wantAll, setWantAll] = useState(false)

  async function downloadAll() {
    const label = 'Download all'
    if (slides.some((_, i) => !ready[i])) {
      setWantAll(true)
      slides.forEach((_, i) => load(i))
      return
    }
    if (appShareState[label] === 'working') return
    setAppShareState((s) => ({ ...s, [label]: 'working' }))
    try {
      const files = slides.map((slide, i) => {
        const blob = blobs[i]!  // ready[] gate above guarantees every slide settled; a failed
                                 // fetch would leave blob null and this would throw, caught below.
        return new File([blob], fileNameFor(slide), { type: blob.type || 'video/mp4' })
      })
      const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean }
      if (nav.canShare?.({ files })) {
        await navigator.share({ files, title: t(lang, 'shareTitleMany', { venue: venueName }) })
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

  async function submitAdminPassword(e: React.FormEvent) {
    e.preventDefault()
    if (adminBusy) return
    setAdminBusy(true)
    setAdminError(false)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword }),
      })
      if (res.ok) {
        setAdminAuthed(true)
        setAdminPassword('')
      } else {
        setAdminError(true)
      }
    } catch {
      setAdminError(true)
    }
    setAdminBusy(false)
  }

  async function loadDemoSessions(date: string) {
    setDemoDate(date)
    if (!date) {
      setDemoSessions(null)
      return
    }
    setDemoSessionsLoading(true)
    try {
      const res = await fetch(`/api/admin/sessions?shareId=${shareId}&date=${date}`)
      if (res.ok) {
        const data = await res.json() as { sessions: typeof demoSessions }
        setDemoSessions(data.sessions ?? [])
      } else {
        setDemoSessions([])
      }
    } catch {
      setDemoSessions([])
    }
    setDemoSessionsLoading(false)
  }

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
          <LangSwitch lang={lang} />
        </header>

        <section className="video-carousel-wrap" aria-label={t(lang, 'videoPreview')}>
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
                {slides.length > 1 && <span className="slide-badge">{kindLabel(slide, lang)}</span>}
                {/* preload="metadata" on every slide but the first, and
                    "metadata" (not the default) even on the first -- this
                    element streaming the full file in the background
                    would compete for bandwidth with the Blob prefetch
                    above, which is the one that actually needs to finish
                    fast for sharing. muted is required for the autoplay
                    effect above to have any chance of working at all --
                    see its own comment. */}
                <video
                  ref={(el) => {
                    videoRefs.current[i] = el
                  }}
                  src={slide.videoUrl}
                  controls
                  playsInline
                  muted
                  preload="metadata"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
            ))}
          </div>
          {slides.length > 1 && (
            <div className="carousel-dots" role="tablist" aria-label={t(lang, 'reelSelector')}>
              {slides.map((_, i) => (
                <span key={i} className={`dot${i === activeIndex ? ' dot-active' : ''}`} aria-hidden="true" />
              ))}
            </div>
          )}
        </section>

        <section className="repost-section">
          <h1>{t(lang, 'repostIt')}</h1>
          <p>{slides.length > 1 ? t(lang, 'putKindOnFeed', { kind: lang === 'en' ? kindLabel(slides[activeIndex], lang).toLowerCase() : kindLabel(slides[activeIndex], lang) }) : t(lang, 'putClipOnFeed')}</p>
          <div className="share-grid">
            {socials.map((item) => (
              <ShareTile key={item.label} label={item.label} icon={item.icon} strong
                busy={appShareState[item.label] === 'working' || !ready[activeIndex]}
                onClick={() => shareToApp(item.label, activeIndex, 'hrefFor' in item && item.hrefFor ? item.hrefFor(shareUrl) : undefined)} />
            ))}
          </div>
        </section>

        <section>
          <div className="eyebrow">{t(lang, 'sendVideoTo')}</div>
          <div className="share-grid">
            {messengers.map((item) => (
              <ShareTile key={item.label} label={'labelKey' in item && item.labelKey ? t(lang, item.labelKey) : item.label} icon={item.icon}
                busy={appShareState[item.label] === 'working' || !ready[activeIndex]}
                onClick={() => shareToApp(item.label, activeIndex, item.hrefFor(shareUrl))} />
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
            {t(lang, 'download')}
          </button>
          <button className="text-action" type="button" onClick={copyLink}>
            <span aria-hidden="true">{copied ? '✓' : '↗'}</span> {copied ? t(lang, 'linkCopied') : t(lang, 'copyLink')}
          </button>
          {slides.length > 1 && (
            <button className="text-action" type="button" onClick={downloadAll} disabled={wantAll && !allReady}>
              {appShareState['Download all'] === 'working' || (wantAll && !allReady) ? (
                <span className="text-action-spinner" aria-hidden="true" />
              ) : (
                <span aria-hidden="true">⇊</span>
              )}{' '}
              {t(lang, wantAll && allReady ? 'downloadAllReady' : 'downloadAll')}
            </button>
          )}
        </div>

        <div className="demo-admin">
          {!adminOpen ? (
            <button type="button" className="demo-admin-trigger" onClick={() => setAdminOpen(true)}>
              Admin login
            </button>
          ) : !adminAuthed ? (
            <form className="demo-admin-form" onSubmit={submitAdminPassword}>
              <input
                type="password"
                className="demo-admin-input"
                placeholder="Password"
                autoFocus
                value={adminPassword}
                onChange={(e) => { setAdminPassword(e.target.value); setAdminError(false) }}
              />
              <button type="submit" className="demo-admin-trigger" disabled={adminBusy || !adminPassword}>
                {adminBusy ? '…' : 'Go'}
              </button>
              {adminError && <span className="demo-admin-error">Wrong password</span>}
            </form>
          ) : (
            <div className="demo-admin-picker">
              <input
                type="date"
                className="demo-admin-input"
                value={demoDate}
                onChange={(e) => loadDemoSessions(e.target.value)}
              />
              {demoSessionsLoading && <span className="demo-admin-error">Loading…</span>}
              {demoSessions && demoSessions.length === 0 && !demoSessionsLoading && (
                <span className="demo-admin-error">No sessions that day</span>
              )}
              {demoSessions && demoSessions.length > 0 && (
                <ul className="demo-admin-list">
                  {demoSessions.map((s) => (
                    <li key={s.share_id}>
                      <a href={`/r/${s.share_id}`}>
                        {s.camera_label ?? 'Camera'} · {new Date(s.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · {s.reel_count} clips
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <footer className="powered-by">
          <span>{t(lang, 'poweredBy')}</span>
          <img src="/pic-vision-logo-white.png" alt="" />
          <span>picvision AI</span>
        </footer>
      </div>

      {/* afterInteractive, not lazyOnload: Tally binds one click listener on
          `document` when this script runs, so what matters is whether it
          has finished loading by the time someone taps Feedback -- and
          lazyOnload doesn't even inject the tag until every resource on the
          page has fetched, which on this page includes every slide's full
          video blob (prefetched eagerly on mount, see the header comment).
          A tap that lands before that finishes did nothing, silently. */}
      <Script src="https://tally.so/widgets/embed.js" strategy="afterInteractive" />
      <button
        type="button"
        className="feedback-fab"
        data-tally-open={TALLY_FORM_ID}
        data-tally-emoji-text="👋"
        data-tally-emoji-animation="wave"
      >
        {t(lang, 'feedback')}
      </button>
    </main>
  )
}

function ShareTile({ label, icon, strong, busy, onClick }: { label: string; icon: string; strong?: boolean; busy: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`share-tile${strong ? ' share-tile-strong' : ''}`} onClick={onClick}>
      {busy ? <span className="tile-spinner" aria-hidden="true" /> : <strong aria-hidden="true">{icon}</strong>}
      <span>{label}</span>
    </button>
  )
}
