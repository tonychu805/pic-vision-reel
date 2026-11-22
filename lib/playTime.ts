// When a rally's play began, as the venue's wall-clock time ("20:14").
// The console's get_play_times_by_share_id works it out from the recording's
// start, the part's offset and the clip's start; venues are in Taiwan.
export function playTime(iso: string | null | undefined): string | null {
  if (!iso) return null
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return null
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(at)
}
