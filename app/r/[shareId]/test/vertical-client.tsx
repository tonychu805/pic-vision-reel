'use client'

import { useEffect, useRef, useState } from 'react'
import { slidesToLoad } from '@/lib/loadWindow'
import s from './vertical.module.css'
import { BRAND_ICONS, type BrandIcon } from './brandIcons'

// Same sharing mechanics as the live page (../reel-share-client.tsx):
// every app option attaches the clip itself to the phone's share panel
// (navigator.share with files), which Safari only allows straight off a tap
// with nothing awaited -- so clips are prefetched as Blobs, the one on screen
// and the next (lib/loadWindow.ts). A browser that can't attach files falls
// back to the app's own link-sharing address, where it has one.

export type VerticalSlide = {
  id: string
  label: string
  videoUrl: string
  wideUrl: string | null
  durationSec: number
  court: string
  when: string
}

type SheetKind = 'share' | 'send' | 'download'
type AppOption = { name: string; icon: BrandIcon; hrefFor?: (url: string) => string }

const SHARE_APPS: AppOption[] = [
  { name: 'Instagram', icon: BRAND_ICONS.instagram },
  { name: 'TikTok', icon: BRAND_ICONS.tiktok },
  { name: 'Facebook', icon: BRAND_ICONS.facebook, hrefFor: (u) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}` },
  { name: 'X', icon: BRAND_ICONS.x, hrefFor: (u) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(u)}` },
]
const SEND_APPS: AppOption[] = [
  { name: 'LINE', icon: BRAND_ICONS.line, hrefFor: (u) => `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(u)}` },
  { name: 'WhatsApp', icon: BRAND_ICONS.whatsapp, hrefFor: (u) => `https://wa.me/?text=${encodeURIComponent(u)}` },
  { name: 'Messenger', icon: BRAND_ICONS.messenger, hrefFor: (u) => `fb-messenger://share?link=${encodeURIComponent(u)}` },
  { name: 'Messages', icon: BRAND_ICONS.messages, hrefFor: (u) => `sms:?body=${encodeURIComponent(u)}` },
]

function fmt(sec: number) {
  const t = Math.round(sec)
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}

export default function VerticalShareClient({ slides, venueName, gameDate }: { slides: VerticalSlide[]; venueName: string; gameDate: string }) {
  const [active, setActive] = useState(0)
  const [sheet, setSheet] = useState<SheetKind | null>(null)
  const [toast, setToast] = useState('')
  const [soundOn, setSoundOn] = useState(false)
  const [blobs, setBlobs] = useState<Record<string, Blob>>({})
  const [ready, setReady] = useState<Record<string, boolean>>({})
  const [wantAll, setWantAll] = useState(false)
  const requested = useRef<Set<string>>(new Set())
  const feedRef = useRef<HTMLDivElement>(null)
  const slideRefs = useRef<(HTMLDivElement | null)[]>([])
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const toastTimer = useRef<number | undefined>(undefined)
  const pageUrl = typeof window !== 'undefined' ? window.location.href : ''

  function load(url: string) {
    if (requested.current.has(url)) return
    requested.current.add(url)
    fetch(url)
      .then((r) => r.blob())
      .then((b) => setBlobs((p) => ({ ...p, [url]: b })))
      .catch(() => {})
      .finally(() => setReady((p) => ({ ...p, [url]: true })))
  }

  // The clip on screen and the next one.
  useEffect(() => {
    slidesToLoad(active, slides.length).forEach((i) => load(slides[i].videoUrl))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  // Which clip is on screen.
  useEffect(() => {
    const root = feedRef.current
    if (!root) return
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index))
      },
      { root, threshold: 0.6 },
    )
    slideRefs.current.forEach((el) => el && obs.observe(el))
    return () => obs.disconnect()
  }, [slides.length])

  // Play only the clip on screen.
  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return
      v.muted = !soundOn
      if (i === active) v.play().catch(() => {})
      else v.pause()
    })
  }, [active, soundOn])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  function showToast(msg: string) {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 1800)
  }

  const cur = slides[active]
  // e.g. PGC_未來球場實驗室_2026-09-26_Rally_1.mp4
  const fileName = (slide: VerticalSlide, wide = false) =>
    [venueName.replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, ''), gameDate, slide.label.replace(/\s+/g, '_') + (wide ? '_wide' : '')]
      .filter(Boolean).join('_') + '.mp4'

  // Everything up to navigator.share runs synchronously off the tap when the
  // clip is already loaded (the usual case), which keeps it inside Safari's
  // tap window.
  async function shareFile(url: string, name: string, linkFallback?: string) {
    const blob = blobs[url]
    if (!blob) return
    const file = new File([blob], name, { type: blob.type || 'video/mp4' })
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean }
    try {
      if (nav.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${venueName} — ${cur.label}` })
      } else if (linkFallback) {
        window.open(linkFallback, '_blank', 'noopener,noreferrer')
      } else if (navigator.share) {
        await navigator.share({ url: pageUrl, title: `${venueName} — ${cur.label}` })
      } else {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(file)
        a.download = name
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(a.href)
      }
    } catch {
      // Share panel cancelled.
    }
  }

  // Share and Send go straight to the phone's own share panel with the clip
  // attached (operator, 2026-09-28): a web page can't hand a video to one
  // particular app, so a panel of app tiles in front of it only made people
  // choose the app twice. Both run synchronously off the tap when the clip
  // is loaded, which Safari requires. Our own tile panel is only the
  // fallback for a browser that can't share files (mostly desktop), where
  // each tile shares the page link instead.
  function shareDirect(kind: 'share' | 'send') {
    const blob = blobs[cur.videoUrl]
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean }
    const file = blob ? new File([blob], fileName(cur), { type: blob.type || 'video/mp4' }) : null
    if (file && nav.canShare?.({ files: [file] })) {
      navigator.share({ files: [file], title: `${venueName} — ${cur.label}` }).catch(() => {})
      return
    }
    if (!blob && typeof nav.canShare === 'function') {
      // A phone that can share files, but this clip is still downloading.
      load(cur.videoUrl)
      showToast('Getting the video ready: tap again in a moment')
      return
    }
    setSheet(kind)
  }

  function pickApp(app: AppOption) {
    setSheet(null)
    shareFile(cur.videoUrl, fileName(cur), app.hrefFor?.(pageUrl))
  }

  async function copyLink() {
    setSheet(null)
    try {
      await navigator.clipboard.writeText(pageUrl)
      showToast('Link copied')
    } catch {
      showToast("Couldn't copy the link")
    }
  }

  function openDownload() {
    setSheet('download')
    if (cur.wideUrl) load(cur.wideUrl) // on its way before they pick it
  }

  const allReady = slides.every((sl) => ready[sl.videoUrl])
  async function downloadAll() {
    if (!allReady) {
      setWantAll(true)
      slides.forEach((sl) => load(sl.videoUrl))
      return
    }
    setSheet(null)
    const files = slides.filter((sl) => blobs[sl.videoUrl]).map((sl) => new File([blobs[sl.videoUrl]], fileName(sl), { type: 'video/mp4' }))
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean }
    try {
      if (nav.canShare?.({ files })) await navigator.share({ files, title: `${venueName} — highlights` })
      else
        for (const f of files) {
          const a = document.createElement('a')
          a.href = URL.createObjectURL(f)
          a.download = f.name
          document.body.appendChild(a)
          a.click()
          a.remove()
          URL.revokeObjectURL(a.href)
        }
    } catch {
      // cancelled
    }
    setWantAll(false)
  }

  const curReady = !!ready[cur.videoUrl]
  const wideReady = !!(cur.wideUrl && ready[cur.wideUrl])

  return (
    <main className={s.page}>
      <div className={s.feed} ref={feedRef}>
        {slides.map((sl, i) => (
          <div key={sl.id} className={s.slide} data-index={i} ref={(el) => { slideRefs.current[i] = el }}>
            <video
              ref={(el) => { videoRefs.current[i] = el }}
              className={s.video}
              src={sl.videoUrl}
              muted
              loop
              playsInline
              preload="metadata"
              onClick={() => setSoundOn((v) => !v)}
            />
            <div className={s.shadeBottom} />
            <div className={s.caption}>
              <div className={s.captionRow}>
                <span className={s.badge}>{sl.label}</span>
                <span className={s.muted}>{fmt(sl.durationSec)}</span>
              </div>
              <div className={s.court}>{sl.court}</div>
              <div className={s.muted}>{sl.when}</div>
            </div>
          </div>
        ))}
      </div>

      <header className={s.top}>
        <div className={s.venue}>
          <span className={s.venueName}>{venueName}</span>
          <span className={s.muted}>{cur.label} of {slides.length}</span>
        </div>
        <button type="button" className={s.iconBtn} onClick={() => setSoundOn((v) => !v)} aria-label={soundOn ? 'Mute' : 'Turn sound on'}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5L6 9H2v6h4l5 4V5z" />
            {soundOn ? <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /> : <path d="M22 9l-6 6M16 9l6 6" />}
          </svg>
        </button>
      </header>

      <div className={s.rail}>
        <button type="button" className={s.railBtn} onClick={() => shareDirect('share')}>
          <span className={s.railIcon}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12" /><path d="M7 8l5-5 5 5" /><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></svg>
          </span>
          <span className={s.railLabel}>Share</span>
        </button>
        <button type="button" className={s.railBtn} onClick={() => shareDirect('send')}>
          <span className={s.railIcon}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" /></svg>
          </span>
          <span className={s.railLabel}>Send</span>
        </button>
        <button type="button" className={s.railBtn} onClick={openDownload}>
          <span className={s.railIcon}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M5 21h14" /></svg>
          </span>
          <span className={s.railLabel}>Download</span>
        </button>
      </div>

      <div className={s.dots} aria-hidden="true">
        {slides.map((sl, i) => <span key={sl.id} className={`${s.dot}${i === active ? ` ${s.dotActive}` : ''}`} />)}
      </div>

      {sheet && (
        <div className={s.sheetWrap}>
          <button type="button" className={s.backdrop} aria-label="Close" onClick={() => setSheet(null)} />
          <div className={s.sheet} role="dialog" aria-label={sheet}>
            <div className={s.grabber} />
            <div className={s.sheetHead}>
              <div>
                <div className={s.sheetTitle}>{sheet === 'share' ? `Share ${cur.label}` : sheet === 'send' ? `Send ${cur.label}` : 'Download'}</div>
                <div className={s.sheetSub}>
                  {sheet === 'share' ? 'Posts the video itself. Pick where it goes.' : sheet === 'send' ? 'Sends the video to a friend or group.' : 'Saved to your phone’s photos or files.'}
                </div>
              </div>
              <button type="button" className={s.closeBtn} aria-label="Close" onClick={() => setSheet(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9698a5" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>
              </button>
            </div>

            {sheet !== 'download' ? (
              <div className={s.grid}>
                {(sheet === 'share' ? SHARE_APPS : SEND_APPS).map((app) => (
                  <button key={app.name} type="button" className={s.gridBtn} onClick={() => pickApp(app)} disabled={!curReady}>
                    <span className={s.tile} style={{ background: app.icon.hex }}>
                      {curReady ? (
                        <svg width="30" height="30" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d={app.icon.path} /></svg>
                      ) : <span className={s.spinner} />}
                    </span>
                    <span className={s.tileName}>{app.name}</span>
                  </button>
                ))}
                {sheet === 'send' && (
                  <button type="button" className={s.gridBtn} onClick={copyLink}>
                    <span className={s.tile} style={{ background: '#44465a' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg>
                    </span>
                    <span className={s.tileName}>Copy link</span>
                  </button>
                )}
              </div>
            ) : (
              <div className={s.list}>
                <button type="button" className={s.listBtn} disabled={!curReady} onClick={() => { setSheet(null); shareFile(cur.videoUrl, fileName(cur)) }}>
                  <span className={s.listIcon}>{curReady ? <DownloadIcon /> : <span className={s.spinner} />}</span>
                  <span className={s.listText}><span className={s.listName}>This clip</span><span className={s.listDetail}>{cur.label} · {fmt(cur.durationSec)} · vertical</span></span>
                </button>
                <button type="button" className={s.listBtn} disabled={wantAll && !allReady} onClick={downloadAll}>
                  <span className={s.listIcon}>{wantAll && !allReady ? <span className={s.spinner} /> : <DownloadIcon />}</span>
                  <span className={s.listText}>
                    <span className={s.listName}>{wantAll && allReady ? 'Ready: tap to save all' : `All ${slides.length} clips`}</span>
                    <span className={s.listDetail}>Every rally from this game</span>
                  </span>
                </button>
                {cur.wideUrl && (
                  <button type="button" className={s.listBtn} disabled={!wideReady} onClick={() => { setSheet(null); shareFile(cur.wideUrl!, fileName(cur, true)) }}>
                    <span className={s.listIcon}>{wideReady ? <DownloadIcon /> : <span className={s.spinner} />}</span>
                    <span className={s.listText}><span className={s.listName}>Wide version</span><span className={s.listDetail}>{cur.label} · 16:9, the whole court</span></span>
                  </button>
                )}
              </div>
            )}
            <div className={s.foot}>Powered by picvision AI · prototype</div>
          </div>
        </div>
      )}

      {toast && <div className={s.toast} role="status">{toast}</div>}
    </main>
  )
}

function DownloadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b9b0f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M5 21h14" /></svg>
  )
}
