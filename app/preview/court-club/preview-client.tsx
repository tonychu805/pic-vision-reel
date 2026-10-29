'use client'

// Design preview with sample data: the venue page's three tabs, built from
// the same classes as the real components (checkin-panel.tsx, page.tsx,
// account-form.tsx) so it shows what players will actually see. Nothing
// here talks to the server or the visitor's real account.
import { useState } from 'react'
import BottomNav, { type CalendarTab } from '@/app/[slug]/[code]/bottom-nav'
import PoweredByFooter from '@/components/powered-by-footer'
import { t, type Lang } from '@/lib/i18n'

function TimePicker({ hour, ampm }: { hour: number; ampm: string }) {
  return (
    <div className="checkin-timepicker-row">
      <select className="checkin-select" defaultValue={hour} aria-label="hour">
        {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
      </select>
      <select className="checkin-select" defaultValue={ampm} aria-label="AM/PM"><option>AM</option><option>PM</option></select>
    </div>
  )
}

function Slot({ time, lang, ready }: { time: string; lang: Lang; ready: boolean }) {
  return ready ? (
    <div className="calendar-slot calendar-slot--ready">
      <span className="session-row-copy"><strong>{time}</strong><small>{t(lang, 'sessionReady')}</small></span>
      <span className="calendar-slot-go"><span>{t(lang, 'watch')}</span><span className="play-tile" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 6.5v11a.8.8 0 0 0 1.2.7l8.6-5.5a.8.8 0 0 0 0-1.4L10.2 5.8A.8.8 0 0 0 9 6.5Z" /></svg></span></span>
    </div>
  ) : (
    <div className="calendar-slot calendar-slot--pending">
      <span className="session-row-copy"><strong>{time}</strong><small>{t(lang, 'reelsOnTheWay')}</small></span>
    </div>
  )
}

export default function CourtClubPreview() {
  const [tab, setTab] = useState<CalendarTab>('checkin')
  const [lang, setLang] = useState<Lang>('en')
  const [editing, setEditing] = useState(false)
  const [training, setTraining] = useState(false)
  const zh = lang === 'zh-TW'
  const court = (n: number) => (zh ? `${n} 號球場` : `Court ${n}`)

  return (
    <main className="share-page venue-page">
      <div className="share-shell court-club-preview">
        <header className="venue-header">
          <div className="venue-mark" aria-hidden="true">P</div>
          <span>{zh ? '示範球場' : 'Sample venue'}</span>
          <div className="lang-switch" role="group" aria-label={t(lang, 'languageLabel')}>
            <button type="button" className={zh ? '' : 'active'} onClick={() => setLang('en')}>EN</button>
            <button type="button" className={zh ? 'active' : ''} onClick={() => setLang('zh-TW')}>中文</button>
          </div>
        </header>
        <p className="preview-note">{zh ? '設計預覽 · 以下為示範資料' : 'Design preview · Sample data'}</p>

        {tab === 'checkin' && <section className="checkin-panel" aria-label={t(lang, 'checkInTitle')}>
          <div className="your-session">
            <div><span>{t(lang, 'yourSession')}</span><strong>{court(2)}</strong></div>
            <p>{t(lang, 'sessionUntil', { time: '20:00' })}</p>
          </div>
          <div className="checkin-grid">
            <div className="checkin-card checkin-card--free">
              <div className="checkin-head"><span className="checkin-name">{court(1)}</span><span className="checkin-badge checkin-badge--free">{t(lang, 'checkInStatusFree')}</span></div>
              <div><span className="checkin-field-label">{t(lang, 'checkInEndTimeLabel')}</span><TimePicker hour={7} ampm="PM" /></div>
              <button type="button" className="checkin-btn checkin-btn--primary" disabled>{t(lang, 'checkInStart')}</button>
            </div>
            <div className="checkin-card checkin-card--recording">
              <div className="checkin-head"><span className="checkin-name">{court(2)}</span><span className="checkin-badge checkin-badge--recording">{t(lang, 'checkInStatusRecording')}</span></div>
              <p className="checkin-owner-time">{t(lang, 'sessionUntil', { time: '20:00' })}</p>
              <div className="checkin-actions checkin-actions--split"><button type="button" className="checkin-btn checkin-btn--ghost" disabled>{t(lang, 'checkInExtendLabel')}</button><button type="button" className="checkin-btn checkin-btn--danger" disabled>{t(lang, 'checkInEnd')}</button></div>
            </div>
            <div className="checkin-card checkin-card--joinable">
              <div className="checkin-head"><span className="checkin-name">{court(3)}</span><span className="checkin-badge checkin-badge--joinable">3/10</span></div>
              <p className="checkin-line">{t(lang, 'checkInBookedUntil', { time: '20:30' })}</p>
              <button type="button" className="checkin-btn checkin-btn--primary" disabled>{t(lang, 'checkInJoin', { count: 3 })}</button>
            </div>
          </div>
        </section>}

        {tab === 'sessions' && <div className="sessions-view">
          <div className="sessions-heading"><h1>{t(lang, 'sessionsTitle')}</h1><p>{zh ? '10 月 29 日' : 'October 29'}</p></div>
          <section className="calendar-court"><h2>{court(1)}</h2><Slot lang={lang} time="18:00–19:00" ready /><Slot lang={lang} time="19:00–20:00" ready={false} /></section>
          <section className="calendar-court"><h2>{court(2)}<span className="session-current-tag">{t(lang, 'yourCurrentCourt')}</span></h2><Slot lang={lang} time="17:00–18:30" ready /></section>
        </div>}

        {tab === 'account' && <div className="account-layout">
          <div className="account-header">
            <div className="account-avatar" aria-hidden="true">A</div>
            <div className="account-identity">
              {editing ? (
                <div className="account-name-edit">
                  <label className="field-label" htmlFor="preview-name">{t(lang, 'nameLabel')}</label>
                  <input id="preview-name" className="field-input" defaultValue={zh ? '示範球員' : 'Alex Chen'} />
                  <div className="button-row"><button type="button" className="btn btn--primary" onClick={() => setEditing(false)}>{t(lang, 'saveButton')}</button><button type="button" className="btn btn--quiet" onClick={() => setEditing(false)}>{t(lang, 'cancel')}</button></div>
                </div>
              ) : (
                <button type="button" className="account-name-button" onClick={() => setEditing(true)}>
                  <span className="account-header-name">{zh ? '示範球員' : 'Alex Chen'}</span>
                  <span className="account-edit-hint">{t(lang, 'editName')}</span>
                </button>
              )}
            </div>
          </div>
          <section className="panel">
            <h2 className="panel-title">{t(lang, 'sectionPrivacy')}</h2>
            <label className="setting-row">
              <span className="setting-text">{t(lang, 'consentTraining')}</span>
              <span className="switch"><input type="checkbox" checked={training} onChange={(e) => setTraining(e.target.checked)} /><span className="switch-track" /></span>
            </label>
          </section>
          <section className="panel">
            <h2 className="panel-title">{t(lang, 'sectionSecurity')}</h2>
            <div className="setting-row"><span className="setting-text">{t(lang, 'signInMethodLabel')}</span><span className="tag">LINE</span></div>
          </section>
          <div className="account-footer-actions"><button type="button" className="link-button">{t(lang, 'signOut')}</button></div>
        </div>}
        <PoweredByFooter lang={lang} />
        <div style={{ height: 'calc(64px + env(safe-area-inset-bottom))', flex: 'none' }} aria-hidden="true" />
      </div>
      <BottomNav lang={lang} active={tab} onSelect={setTab} />
    </main>
  )
}
