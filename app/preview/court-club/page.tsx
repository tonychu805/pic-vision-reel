import type { Metadata } from 'next'
import CourtClubPreview from './preview-client'

export const metadata: Metadata = { title: 'Court Club design preview · PicVision', robots: { index: false, follow: false } }

export default function Page() {
  return <CourtClubPreview />
}
