'use client'

import { useState } from 'react'
import BottomNav, { type CalendarTab } from '@/app/[slug]/[code]/bottom-nav'
import { t, type Lang } from '@/lib/i18n'

export default function CourtClubPreview() {
  const [tab, setTab] = useState<CalendarTab>('checkin')
  const [lang, setLang] = useState<Lang>('en')
  const [previewEditing, setPreviewEditing] = useState(false)
  const zh = lang === 'zh-TW'

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

        {tab === 'checkin' && <section className="calendar-court checkin-panel">
          <h2>{t(lang, 'checkInTitle')}</h2>
          <div className="your-session">
            <div><span>{t(lang, 'yourSession')}</span><strong>{zh ? '2 號球場' : 'Court 2'}</strong></div>
            <p>{t(lang, 'sessionUntil', { time: '20:00' })}</p>
          </div>
          <div className="checkin-grid">
            <div className="checkin-card checkin-card--free">
              <div className="checkin-head"><span className="checkin-name">{zh ? '1 號球場' : 'Court 1'}</span><span className="checkin-badge checkin-badge--free">{t(lang, 'checkInStatusFree')}</span></div>
              <span className="checkin-field-label">{t(lang, 'checkInEndTimeLabel')}</span>
              <div className="checkin-timepicker-row"><div className="checkin-select">7</div><div className="checkin-select">PM</div></div>
              <button type="button" className="checkin-btn checkin-btn--primary" disabled>{t(lang, 'checkInStart')}</button>
            </div>
            <div className="checkin-card checkin-card--recording">
              <div className="checkin-head"><span className="checkin-name">{zh ? '2 號球場' : 'Court 2'}</span><span className="checkin-badge checkin-badge--recording">{t(lang, 'checkInStatusRecording')}</span></div>
              <p className="checkin-line">✓ {t(lang, 'recordingConfirmed')}</p>
              <span className="checkin-field-label">{t(lang, 'checkInExtendLabel')}</span>
              <div className="checkin-timepicker-row"><div className="checkin-select">8</div><div className="checkin-select">PM</div></div>
              <div className="checkin-actions checkin-actions--split"><button className="checkin-btn checkin-btn--ghost" disabled>{t(lang, 'checkInExtendSubmit')}</button><button className="checkin-btn checkin-btn--danger" disabled>{t(lang, 'checkInEnd')}</button></div>
            </div>
            <div className="checkin-card checkin-card--joinable">
              <div className="checkin-head"><span className="checkin-name">{zh ? '3 號球場' : 'Court 3'}</span><span className="checkin-badge checkin-badge--joinable">3/10</span></div>
              <p className="checkin-line">{t(lang, 'checkInBookedUntil', { time: '20:30' })}</p>
              <button className="checkin-btn checkin-btn--primary" disabled>{t(lang, 'checkInJoin', { count: 3 })}</button>
            </div>
          </div>
        </section>}

        {tab === 'sessions' && <div className="sessions-view">
          <div className="sessions-heading recording-heading"><h1>{t(lang, 'sessionsTitle')}</h1><p>{zh ? '10 月 29 日' : 'October 29'}</p></div>
          <section className="calendar-court"><h2>{zh ? '1 號球場' : 'Court 1'}</h2><div className="calendar-slot calendar-slot--ready"><span className="session-row-copy"><strong>18:00–19:00</strong><small>{t(lang, 'sessionReady')}</small></span><span className="calendar-slot-go">{t(lang, 'watch')}</span></div><div className="calendar-slot calendar-slot--pending"><span className="session-row-copy"><strong>19:00–20:00</strong><small>{t(lang, 'reelsOnTheWay')}</small></span></div></section>
          <section className="calendar-court"><h2>{zh ? '2 號球場' : 'Court 2'}<span className="session-current-tag">{t(lang, 'yourCurrentCourt')}</span></h2><div className="calendar-slot calendar-slot--ready"><span className="session-row-copy"><strong>17:00–18:30</strong><small>{t(lang, 'sessionReady')}</small></span><span className="calendar-slot-go">{t(lang, 'watch')}</span></div></section>
        </div>}

        {tab === 'account' && <div className="preview-account">
          <div className="account-header"><div className="account-avatar">A</div><div><button className="account-name-button" onClick={() => setPreviewEditing(true)}><span className="account-header-name">{zh ? '示範球員' : 'Alex Chen'}</span><svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4Z"/></svg></button></div></div>
          {previewEditing && <div className="account-name-edit"><label htmlFor="preview-name">{t(lang, 'nameLabel')}</label><input id="preview-name" className="field-input" defaultValue={zh ? '示範球員' : 'Alex Chen'} /><div className="account-name-actions"><button className="checkin-btn checkin-btn--primary" onClick={() => setPreviewEditing(false)}>{t(lang, 'saveButton')}</button><button className="checkin-btn checkin-btn--ghost" onClick={() => setPreviewEditing(false)}>{t(lang, 'cancel')}</button></div></div>}
          <section className="account-section account-panel"><h2 className="account-section-title">{t(lang, 'sectionPrivacy')}</h2><div className="account-row"><span className="account-row-text">{t(lang, 'consentTraining')}</span><span className="preview-toggle" aria-hidden="true" /></div></section>
          <section className="account-section account-panel"><h2 className="account-section-title">{t(lang, 'sectionSecurity')}</h2><div className="account-row"><span className="account-row-text">{t(lang, 'signInMethodLabel')}</span><span className="account-badge">LINE</span></div></section>
        </div>}
      </div>
      <BottomNav lang={lang} active={tab} onSelect={setTab} />
    </main>
  )
}
