// Reel videos are served from a Cloudflare-fronted custom domain bound to
// the R2 bucket (ADR-075), not a presigned URL: this page's own security
// boundary is already "know the reelId" (the reels table's public RLS
// policy), so a presigned URL added expiry/signing complexity without
// protecting anything the page itself doesn't already gate -- and, being
// uniquely signed per request, defeated both browser and edge caching on
// a page whose whole point is getting reshared and reopened repeatedly.
// The R2 object key is minted from the reel's own uuid by
// cloud_pipeline/run_cloud_job.py (`reels/<id>.mp4`), so it's exactly as
// unguessable as the reelId this page is already gated on.
//
// Only one bucket is bound to this domain right now -- `bucket` is kept
// in the signature so callers don't need to change if that stops being
// true, but isn't used to build the URL yet.
const CDN_DOMAIN = 'cdn.picvisionai.com'

export function reelVideoUrl(_bucket: string, key: string) {
  return `https://${CDN_DOMAIN}/${key}`
}
