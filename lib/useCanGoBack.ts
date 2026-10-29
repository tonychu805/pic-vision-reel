'use client'

import { useEffect, useState } from 'react'

// Whether "back" leads somewhere on this site (2026-10-29): true when the
// visitor arrived here from another page of the share site, e.g. a venue
// page's Watch link or the vertical page's Wide view. A share link opened
// straight from LINE has nowhere on the site to go back to, so the reel
// pages show no back button then. Read after mount: referrer and history
// only exist in the browser.
export function useCanGoBack(): boolean {
  const [canGoBack, setCanGoBack] = useState(false)
  useEffect(() => {
    try {
      setCanGoBack(window.history.length > 1 && !!document.referrer && new URL(document.referrer).origin === window.location.origin)
    } catch {
      setCanGoBack(false)
    }
  }, [])
  return canGoBack
}
