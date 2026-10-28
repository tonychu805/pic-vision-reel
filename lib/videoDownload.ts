// HTTP errors have bodies too. Never offer one as a downloaded/shared video.
export async function fetchVideoBlob(url: string, init?: RequestInit): Promise<Blob> {
  const response = await fetch(url, init)
  if (!response.ok) throw new Error(`video download: HTTP ${response.status}`)
  return response.blob()
}
