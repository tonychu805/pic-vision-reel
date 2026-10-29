// HTTP errors have bodies too. Never offer one as a downloaded/shared video.
//
// cache: 'no-store' (2026-10-29): the page's <video> elements load the same
// signed address without CORS, and R2 answers a request with no Origin
// header without `Vary: Origin` -- so the browser cached that response with
// no Access-Control-Allow-Origin and handed it to this CORS fetch, which
// then failed ("有影片無法載入"; one clip per page on staging and
// production). Skipping the HTTP cache always gets R2's CORS answer.
export async function fetchVideoBlob(url: string, init?: RequestInit): Promise<Blob> {
  const response = await fetch(url, { ...init, cache: 'no-store' })
  if (!response.ok) throw new Error(`video download: HTTP ${response.status}`)
  return response.blob()
}
