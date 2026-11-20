#!/usr/bin/env bash
# Builds this checkout with OpenNext and deploys it to the Cloudflare PRODUCTION
# worker picvision-reel at share.picvisionai.com (operator decision 2026-11-20: production moved to Cloudflare Workers
# and the Tokyo production Supabase livengwqudbxlflrzfte; Netlify retired).
#
# Only public build-time values live here. Secrets are set once on the worker
# (npx wrangler secret bulk <file> --name picvision-reel) and are never in this repo.
#
# Usage: scripts/deploy-production-cloudflare.sh          (dry run: prints what it would do)
#        scripts/deploy-production-cloudflare.sh --yes
set -euo pipefail
cd "$(dirname "$0")/.."

export NEXT_PUBLIC_SUPABASE_URL=https://livengwqudbxlflrzfte.supabase.co
export NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_q4fVb0CEac07aVFwrPFgZw_VgPdwzSg
export NEXT_PUBLIC_ASSET_CDN_HOST=cdn.picvisionai.com
export NEXT_PUBLIC_CONSOLE_URL=https://console.picvisionai.com
export NEXT_PUBLIC_APP_URL=https://share.picvisionai.com
export NEXT_PUBLIC_AUTH0_DOMAIN=dev-y4y6sdzsmcwfm4pn.us.auth0.com
# Auth0 client ids are public (they appear in every login URL).
export NEXT_PUBLIC_AUTH0_CLIENT_ID=eXsgR6SRwcssbVCEGlkraBHqg0vwsA4q
echo "commit:  $(git rev-parse --short HEAD) ($(git rev-parse --abbrev-ref HEAD))$(git diff --quiet || echo ', with uncommitted changes')"
echo "worker:  picvision-reel"
if [ "${1:-}" != "--yes" ]; then echo "dry run -- re-run with --yes to build and deploy"; exit 0; fi
npx opennextjs-cloudflare build
npx opennextjs-cloudflare deploy --env production
echo "deployed: https://picvision-reel.tony-chu805.workers.dev"
