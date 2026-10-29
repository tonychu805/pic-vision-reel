'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { slidesToLoad } from '@/lib/loadWindow'
import { t, type Lang, type StringKey } from '@/lib/i18n'
import { needsRefresh, REFRESH_BEFORE_MS } from '@/lib/videoAddresses'
import { clip, type Addresses, type FeedClip, type FeedReel } from '@/lib/verticalFeed'
import { fetchVideoBlob } from '@/lib/videoDownload'
import Wordmark from '@/components/wordmark'
import { useCanGoBack } from '@/lib/useCanGoBack'
import s from './vertical.module.css'
import { BRAND_ICONS, type BrandIcon } from './brandIcons'

// The share page's default view (2026-10-28; a /test page from 2026-09-28
// until then): the session's rally clips as a full-screen 9:16 feed with
// Share / Send / Download. Which clips, and crop-or-fitted for each, is
// lib/verticalFeed.ts.
//
// Same sharing mechanics as the wide page (./reel-share-client.tsx):
// every app option attaches the clip itself to the phone's share panel
// (navigator.share with files), which Safari only allows straight off a tap
// with nothing awaited -- so clips are prefetched as Blobs, the one on screen
// and the next (lib/loadWindow.ts). A browser that can't attach files falls
// back to the app's own link-sharing address, where it has one.
//
// Video addresses last an hour (ADR-142); like the wide page, they're
// re-asked shortly before they run out, which also brings in crops that
// arrived since the page loaded.
//
// Clubhouse layout (2026-10-29): the video is the page. Tap anywhere to
// pause; the only always-on chrome is the caption, the action rail and a
// thin progress line along the bottom edge, which is also the seek bar.

const BADGE_KEYS: Record<string, StringKey> = {
  'Kitchen War': 'badgeKitchenWar',
  'Quick Hands': 'badgeQuickHands',
  'Hardest Swing': 'badgeHardestSwing',
  'First Strike': 'badgeFirstStrike',
  'Killer Shot': 'badgeKillerShot',
}

export type VerticalProps = {
  reels: FeedReel[]
  addresses: Addresses
  // null: fixed addresses (the 09-28 pilot's CDN clips), never refreshed.
  addressesExpireAt: string | null
  videosEndpoint: string | null
  venueName: string
  gameDate: string
  court: string
  when: string
  lang: Lang
  // The wide page for this share, when there is one.
  wideHref: string | null
  // The sound on/off button and its hint; behind the share-sound-button
  // PostHog flag (lib/featureFlags.ts), off = hidden and clips stay muted.
  soundButton?: boolean
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

// How long the "tap for sound" hint stays up on the first clip.
const SOUND_HINT_MS = 5000

function fmt(sec: number) {
  const t = Math.max(0, Math.round(sec))
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}

export default function VerticalShareClient({ reels, addresses: initialAddresses, addressesExpireAt, videosEndpoint, venueName, gameDate, court, when, lang, wideHref, soundButton = false }: VerticalProps) {
  const [addresses, setAddresses] = useState<Addresses>(initialAddresses)
  const slides: FeedClip[] = useMemo(
    () => reels.filter((r) => addresses.vertical?.[r.id] || addresses.videos[r.id]).map((r) => clip(r, addresses)),
    [reels, addresses],
  )
  const badgeName = (c: FeedClip) => (c.badge && BADGE_KEYS[c.badge] ? t(lang, BADGE_KEYS[c.badge]) : null)
  const rallyName = (c: FeedClip) => t(lang, 'rally', { n: c.rallyRank ?? '' })
  const label = (c: FeedClip) => badgeName(c) ?? rallyName(c)
  const [active, setActive] = useState(0)
  const canGoBack = useCanGoBack()
  const [sheet, setSheet] = useState<SheetKind | null>(null)
  const [toast, setToast] = useState('')
  const [soundOn, setSoundOn] = useState(false)
  const [soundHint, setSoundHint] = useState(true)
  const [paused, setPaused] = useState(false)
  const [scrub, setScrub] = useState<{ at: number; of: number } | null>(null)
  const [blobs, setBlobs] = useState<Record<string, Blob>>({})
  const [failedDownloads, setFailedDownloads] = useState<string[]>([])
  const [wantAll, setWantAll] = useState(false)
  const requested = useRef<Set<string>>(new Set())
  const feedRef = useRef<HTMLDivElement>(null)
  const slideRefs = useRef<(HTMLDivElement | null)[]>([])
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const fillRef = useRef<HTMLDivElement>(null)
  const seekRef = useRef<HTMLInputElement>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  const pageUrl = typeof window !== 'undefined' ? window.location.href : ''

  function load(url: string) {
    if (requested.current.has(url)) return
    requested.current.add(url)
    setFailedDownloads((prev) => prev.filter((failed) => failed !== url))
    fetchVideoBlob(url)
      .then((b) => setBlobs((p) => ({ ...p, [url]: b })))
      .catch(() => {
        requested.current.delete(url)
        setFailedDownloads((prev) => [...prev, url])
        setWantAll(false)
      })
  }

  // Re-prepare the current/next files when signed addresses or crops change.
  useEffect(() => {
    const liveUrls = new Set(slides.flatMap((slide) => [slide.videoUrl, slide.wideUrl]))
    setFailedDownloads((previous) => {
      const current = previous.filter((url) => liveUrls.has(url))
      return current.length === previous.length ? previous : current
    })
    slidesToLoad(active, slides.length).forEach((i) => load(slides[i].videoUrl))
    if (sheet === 'download' && slides[active]?.wideUrl) load(slides[active].wideUrl!)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, slides, sheet])

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

  // A new clip always starts playing, whatever the last one was doing.
  useEffect(() => { setPaused(false); setScrub(null) }, [active])

  useEffect(() => {
    if (!soundHint) return
    const id = window.setTimeout(() => setSoundHint(false), SOUND_HINT_MS)
    return () => window.clearTimeout(id)
  }, [soundHint])

  // Updating a video src resets playback. Capture its position and play/pause
  // state before assigning a renewed address, and restore them once loaded.
  const playbackRef = useRef({ active: -1, soundOn, paused })
  useEffect(() => {
    const activeChanged = playbackRef.current.active !== active
    const soundChanged = playbackRef.current.soundOn !== soundOn
    const pausedChanged = playbackRef.current.paused !== paused
    const cleanups: (() => void)[] = []
    videoRefs.current.forEach((v, i) => {
      if (!v) return
      v.muted = !soundOn
      const hasSource = v.hasAttribute('src')
      const shouldPlay = i === active && !paused && (!hasSource || activeChanged || soundChanged || pausedChanged || !v.paused)
      if (v.getAttribute('src') !== slides[i].videoUrl) {
        const position = v.currentTime
        const restore = () => {
          if (position > 0) v.currentTime = Number.isFinite(v.duration) ? Math.min(position, v.duration) : position
          if (shouldPlay) v.play().catch(() => {})
        }
        v.addEventListener('loadedmetadata', restore, { once: true })
        cleanups.push(() => v.removeEventListener('loadedmetadata', restore))
        v.src = slides[i].videoUrl
      } else if (shouldPlay) {
        v.play().catch(() => {})
      }
      if (i !== active || paused) v.pause()
    })
    playbackRef.current = { active, soundOn, paused }
    return () => cleanups.forEach((cleanup) => cleanup())
  }, [active, soundOn, paused, slides])

  // The progress line follows the clip on screen frame by frame, read
  // straight off its <video> -- not from loadedmetadata, which a clip that
  // loaded earlier never fires again (the 10-28 staging bar sat full on
  // clip 2). Written to the DOM directly: a re-render per frame for a 3px
  // line would be waste.
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const v = videoRefs.current[active]
      const d = v && Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 0
      const p = d ? v!.currentTime / d : 0
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${p})`
      if (seekRef.current && !scrub) {
        seekRef.current.max = String(d || 1)
        seekRef.current.value = String(v?.currentTime ?? 0)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, scrub])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  // Fresh addresses shortly before these run out (and whatever crops have
  // arrived since). A failed ask keeps the current ones and tries again on
  // the next tick.
  const expiresRef = useRef(addressesExpireAt)
  useEffect(() => {
    if (!videosEndpoint || !expiresRef.current) return
    const id = window.setInterval(async () => {
      if (!expiresRef.current || !needsRefresh(expiresRef.current, Date.now() + REFRESH_BEFORE_MS)) return
      try {
        const res = await fetch(videosEndpoint, { cache: 'no-store' })
        if (!res.ok) return
        const body = (await res.json()) as { expiresAt: string; videos: Record<string, string>; vertical?: Record<string, string> }
        expiresRef.current = body.expiresAt
        setAddresses((a) => ({ videos: { ...a.videos, ...body.videos }, vertical: { ...(a.vertical ?? {}), ...(body.vertical ?? {}) } }))
      } catch {
        // offline for a moment
      }
    }, 60_000)
    return () => window.clearInterval(id)
  }, [videosEndpoint])

  function showToast(msg: string) {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 1800)
  }

  function toggleSound() {
    setSoundOn((v) => !v)
    setSoundHint(false)
  }

  function seekTo(value: number) {
    const v = videoRefs.current[active]
    if (!v) return
    v.currentTime = value
    const d = Number.isFinite(v.duration) ? v.duration : 0
    setScrub({ at: value, of: d })
  }

  const cur = slides[active]
  // e.g. PGC_未來球場實驗室_2026-09-26_Rally_1.mp4
  const fileName = (slide: FeedClip, wide = false) =>
    [venueName.replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, ''), gameDate, label(slide).replace(/\s+/g, '_') + (wide ? '_wide' : '')]
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
        await navigator.share({ files: [file], title: `${venueName} — ${label(cur)}` })
      } else if (linkFallback) {
        window.open(linkFallback, '_blank', 'noopener,noreferrer')
      } else if (navigator.share) {
        await navigator.share({ url: pageUrl, title: `${venueName} — ${label(cur)}` })
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
      navigator.share({ files: [file], title: `${venueName} — ${label(cur)}` }).catch(() => {})
      return
    }
    if (!blob && typeof nav.canShare === 'function') {
      // A phone that can share files, but this clip is still downloading.
      load(cur.videoUrl)
      showToast(t(lang, 'vPreparing'))
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
      showToast(t(lang, 'linkCopied'))
    } catch {
      showToast(t(lang, 'vCopyFailed'))
    }
  }

  function openDownload() {
    setSheet('download')
    if (cur.wideUrl) load(cur.wideUrl) // on its way before they pick it
  }

  const allReady = slides.every((sl) => !!blobs[sl.videoUrl])
  async function downloadAll() {
    if (!allReady) {
      setWantAll(true)
      slides.forEach((sl) => load(sl.videoUrl))
      return
    }
    setSheet(null)
    const files = slides.map((sl) => new File([blobs[sl.videoUrl]], fileName(sl), { type: 'video/mp4' }))
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean }
    try {
      if (nav.canShare?.({ files })) await navigator.share({ files, title: t(lang, 'shareTitleMany', { venue: venueName }) })
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

  const curReady = !!blobs[cur.videoUrl]
  const wideReady = !!(cur.wideUrl && blobs[cur.wideUrl])
  const activeVideo = videoRefs.current[active]
  const showTime = paused || scrub
  const timeAt = scrub?.at ?? activeVideo?.currentTime ?? 0
  const timeOf = scrub?.of || (activeVideo && Number.isFinite(activeVideo.duration) ? activeVideo.duration : cur.durationSec)

  return (
    <main className={s.page}>
      <div className={s.feed} ref={feedRef}>
        {slides.map((sl, i) => {
          const badge = badgeName(sl)
          return (
            <div key={sl.id} className={s.slide} data-index={i} ref={(el) => { slideRefs.current[i] = el }}>
              <video
                ref={(el) => { videoRefs.current[i] = el }}
                className={sl.wide ? `${s.video} ${s.videoWide}` : s.video}
                muted
                loop
                playsInline
                preload="metadata"
                onClick={() => setPaused((v) => !v)}
              />
              <div className={s.shadeBottom} />
              <div className={s.caption}>
                {badge && <span className={s.badge}>{t(lang, 'vBadge')}</span>}
                <h2 className={badge ? `${s.title} ${s.titleBadge}` : s.title}>{badge ?? rallyName(sl)}</h2>
                <p className={s.meta}>{[badge ? rallyName(sl) : null, fmt(sl.durationSec), court].filter(Boolean).join('  ·  ')}</p>
                <p className={s.metaWhen}>{when}</p>
              </div>
            </div>
          )
        })}
      </div>

      {showTime && (
        <button type="button" className={s.pauseOverlay} onClick={() => { setPaused(false); setScrub(null) }} aria-label={t(lang, 'vPlay')}>
          <span className={s.pauseGlyph} aria-hidden="true">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" /></svg>
          </span>
          <span className={s.pauseTime}>{fmt(timeAt)} / {fmt(timeOf)}</span>
        </button>
      )}

      <header className={s.top}>
        {canGoBack && (
          <button type="button" className={s.backBtn} onClick={() => window.history.back()} aria-label={t(lang, 'backLabel')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>
          </button>
        )}
        <div className={s.venue}>
          <span className={s.venueName}>{venueName}</span>
          <span className={s.position} aria-label={t(lang, 'vPosition', { n: active + 1, total: slides.length })}>
            {String(active + 1).padStart(2, '0')}<span className={s.positionOf}> / {String(slides.length).padStart(2, '0')}</span>
          </span>
        </div>
        {wideHref && (
          <a className={s.chip} href={wideHref}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="2" /></svg>
            {t(lang, 'vWideView')}
          </a>
        )}
        {soundButton && <div className={s.soundWrap}>
          {soundHint && !soundOn && <span className={s.soundHint} role="status">{t(lang, 'vTapForSound')}</span>}
          <button type="button" className={soundOn ? `${s.iconBtn} ${s.iconBtnOn}` : s.iconBtn} onClick={toggleSound} aria-label={t(lang, soundOn ? 'vMute' : 'vSoundOn')} aria-pressed={soundOn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 5 6 9H3v6h3l5 4V5Z" />
              {soundOn ? <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /> : <path d="m22 9-6 6M16 9l6 6" />}
            </svg>
          </button>
        </div>}
      </header>

      <nav className={s.rail} aria-label={t(lang, 'vShare')}>
        <RailButton label={t(lang, 'vShare')} onClick={() => shareDirect('share')}>
          <path d="M12 15V3" /><path d="m7 8 5-5 5 5" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
        </RailButton>
        <RailButton label={t(lang, 'vSend')} onClick={() => shareDirect('send')}>
          <path d="M21.5 2.5 10.6 13.4" /><path d="m21.5 2.5-7 19-3.9-8.1-8.1-3.9 19-7Z" />
        </RailButton>
        <RailButton label={t(lang, 'download')} onClick={openDownload}>
          <path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" />
        </RailButton>
      </nav>

      <div className={s.progress}>
        <div className={s.progressTrack}><div className={s.progressFill} ref={fillRef} /></div>
        <input
          ref={seekRef}
          type="range" min="0" step="0.05" defaultValue="0"
          className={s.seek}
          aria-label={t(lang, 'vSeek')}
          onPointerDown={() => setPaused(true)}
          onInput={(e) => seekTo(Number(e.currentTarget.value))}
          onPointerUp={() => { setPaused(false); setScrub(null) }}
          onKeyUp={() => setScrub(null)}
        />
      </div>

      {sheet && (
        <div className={s.sheetWrap}>
          <button type="button" className={s.backdrop} aria-label={t(lang, 'vClose')} onClick={() => setSheet(null)} />
          <div className={s.sheet} role="dialog" aria-label={sheet}>
            <div className={s.grabber} />
            <div className={s.sheetHead}>
              <div>
                <div className={s.sheetTitle}>{sheet === 'share' ? t(lang, 'vShareTitle', { clip: label(cur) }) : sheet === 'send' ? t(lang, 'vSendTitle', { clip: label(cur) }) : t(lang, 'download')}</div>
                <div className={s.sheetSub}>
                  {t(lang, sheet === 'share' ? 'vShareSub' : sheet === 'send' ? 'vSendSub' : 'vDownloadSub')}
                </div>
              </div>
              <button type="button" className={s.closeBtn} aria-label={t(lang, 'vClose')} onClick={() => setSheet(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>
              </button>
            </div>

            {sheet !== 'download' ? (
              <div className={s.grid}>
                {(sheet === 'share' ? SHARE_APPS : SEND_APPS).map((app) => (
                  <button key={app.name} type="button" className={s.gridBtn} onClick={() => pickApp(app)} disabled={!curReady}>
                    <span className={s.tile} style={{ background: app.icon.hex }}>
                      {curReady ? (
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d={app.icon.path} /></svg>
                      ) : <span className={s.spinner} />}
                    </span>
                    <span className={s.tileName}>{app.name}</span>
                  </button>
                ))}
                {sheet === 'send' && (
                  <button type="button" className={s.gridBtn} onClick={copyLink}>
                    <span className={`${s.tile} ${s.tileNeutral}`}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg>
                    </span>
                    <span className={s.tileName}>{t(lang, 'copyLink')}</span>
                  </button>
                )}
              </div>
            ) : (
              <div className={s.list}>
                <button type="button" className={s.listBtn} disabled={!curReady} onClick={() => { setSheet(null); shareFile(cur.videoUrl, fileName(cur)) }}>
                  <span className={s.listIcon}>{curReady ? <DownloadIcon /> : <span className={s.spinner} />}</span>
                  <span className={s.listText}><span className={s.listName}>{t(lang, 'vThisClip')}</span><span className={s.listDetail}>{label(cur)} · {fmt(cur.durationSec)}{cur.wide ? '' : ` · ${t(lang, 'vVertical')}`}</span></span>
                </button>
                <button type="button" className={s.listBtn} disabled={wantAll && !allReady} onClick={downloadAll}>
                  <span className={s.listIcon}>{wantAll && !allReady ? <span className={s.spinner} /> : <DownloadIcon />}</span>
                  <span className={s.listText}>
                    <span className={s.listName}>{wantAll && allReady ? t(lang, 'downloadAllReady') : t(lang, 'vAllClips', { n: slides.length })}</span>
                    <span className={s.listDetail}>{t(lang, 'vEveryRally')}</span>
                  </span>
                </button>
                {cur.wideUrl && (
                  <button type="button" className={s.listBtn} disabled={!wideReady} onClick={() => { setSheet(null); shareFile(cur.wideUrl!, fileName(cur, true)) }}>
                    <span className={s.listIcon}>{wideReady ? <DownloadIcon /> : <span className={s.spinner} />}</span>
                    <span className={s.listText}><span className={s.listName}>{t(lang, 'vWideVersion')}</span><span className={s.listDetail}>{label(cur)} · {t(lang, 'vWideDetail')}</span></span>
                  </button>
                )}
              </div>
            )}
            <div className={s.foot}><span>{t(lang, 'poweredBy')}</span><Wordmark tone="night" size="sm" /></div>
          </div>
        </div>
      )}

      {failedDownloads.length > 0 && (
        <div className={s.downloadError} role="alert">
          <span>{t(lang, 'videoLoadFailed')}</span>
          <button type="button" onClick={() => failedDownloads.forEach(load)}>{t(lang, 'retry')}</button>
        </div>
      )}
      {toast && <div className={s.toast} role="status">{toast}</div>}
    </main>
  )
}

function RailButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={s.railBtn} onClick={onClick}>
      <span className={s.railIcon}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
      </span>
      <span className={s.railLabel}>{label}</span>
    </button>
  )
}

function DownloadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>
  )
}
