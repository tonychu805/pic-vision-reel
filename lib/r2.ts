// Server-only R2 client -- same as pic-vision-cloud-console's lib/r2.ts,
// duplicated here (not imported across the repo boundary) since this is
// a genuinely separate deployable app (different domain, different
// audience -- public venue-goers, not authenticated venue owners).
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

function r2Client() {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
  if (!accountId) throw new Error('CLOUDFLARE_R2_ACCOUNT_ID not set')
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
    },
  })
}

export async function presignedReelUrl(bucket: string, key: string, expiresIn = 3600) {
  const client = r2Client()
  const command = new GetObjectCommand({ Bucket: bucket, Key: key })
  return getSignedUrl(client, command, { expiresIn })
}
