// The PicVision mark, drawn inline so it is crisp on any ground: the ball
// from public/icon.svg plus the name in the page's own type. Replaces the
// white PNG (pic-vision-logo-white.png), which shrank to an unreadable
// smudge in the footer and vanished on light pages (2026-10-29).
// `ball={false}`: the name alone -- the "Powered by" lines (operator,
// 2026-10-29: the mark there read as clutter).
export default function Wordmark({ tone = 'paper', size = 'md', ball = true }: { tone?: 'paper' | 'night'; size?: 'sm' | 'md' | 'lg'; ball?: boolean }) {
  return (
    <span className={`wordmark wordmark--${tone} wordmark--${size}`}>
      {ball && <svg viewBox="0 0 24 24" aria-hidden="true" className="wordmark-ball">
        <circle cx="12" cy="12" r="11" className="wordmark-ball-body" />
        <circle cx="8.2" cy="8.4" r="1.7" className="wordmark-ball-hole" />
        <circle cx="13.6" cy="7.1" r="1.5" className="wordmark-ball-hole" />
        <circle cx="16.6" cy="12" r="1.7" className="wordmark-ball-hole" />
        <circle cx="10.6" cy="13.2" r="1.7" className="wordmark-ball-hole" />
        <circle cx="13.4" cy="17.4" r="1.5" className="wordmark-ball-hole" />
        <circle cx="6.8" cy="16" r="1.3" className="wordmark-ball-hole" />
      </svg>}
      <span className="wordmark-text">PicVision</span>
    </span>
  )
}
