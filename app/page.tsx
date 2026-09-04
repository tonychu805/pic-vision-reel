// No index concept here -- every real page is per-reel (/r/[reelId]),
// generated once a highlight finishes processing (ADR-074) and sent
// directly to whoever's getting the clip. This root route only exists
// because Next.js requires one; nothing links here for real.
export default function Page() {
  return (
    <main className="share-page">
      <div className="share-shell" style={{ alignItems: 'center', textAlign: 'center', paddingTop: 80 }}>
        <p style={{ fontSize: 13.5, color: 'var(--muted)' }}>
          This page shows one specific highlight reel — you&apos;ll need the link you were sent.
        </p>
      </div>
    </main>
  )
}
