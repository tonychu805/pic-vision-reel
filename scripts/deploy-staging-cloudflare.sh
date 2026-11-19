#!/usr/bin/env bash
# Builds this checkout with OpenNext and deploys it to the Cloudflare staging
# worker picvision-reel-cf-test (operator decision 2026-11-20: staging runs on Cloudflare Workers
# against the Tokyo staging Supabase; the Netlify staging sites are retired).
#
# Only public build-time values live here. Secrets are set once on the worker
# (npx wrangler secret bulk <file> --name picvision-reel-cf-test) and are never in this repo.
#
# Usage: scripts/deploy-staging-cloudflare.sh          (dry run: prints what it would do)
#        scripts/deploy-staging-cloudflare.sh --yes
set -euo pipefail
cd "$(dirname "$0")/.."

export NEXT_PUBLIC_SUPABASE_URL=https://boorzbxduhsgbkilovyq.supabase.co
export NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_nP9xYoiNF2V8gWx_PN6-6w_IYt5PPee
export NEXT_PUBLIC_ASSET_CDN_HOST=pub-ef294468355b44739a70f2680223c01b.r2.dev
export NEXT_PUBLIC_CONSOLE_URL=https://picvision-console-cf-staging.tony-chu805.workers.dev
export NEXT_PUBLIC_APP_URL=https://picvision-reel-cf-test.tony-chu805.workers.dev
export NEXT_PUBLIC_AUTH0_DOMAIN=dev-y4y6sdzsmcwfm4pn.us.auth0.com
# Auth0 client ids are public (they appear in every login URL).
export NEXT_PUBLIC_AUTH0_CLIENT_ID=eXsgR6SRwcssbVCEGlkraBHqg0vwsA4q
echo "commit:  $(git rev-parse --short HEAD) ($(git rev-parse --abbrev-ref HEAD))$(git diff --quiet || echo ', with uncommitted changes')"
echo "worker:  picvision-reel-cf-test"
if [ "${1:-}" != "--yes" ]; then echo "dry run -- re-run with --yes to build and deploy"; exit 0; fi
npx opennextjs-cloudflare build
npx opennextjs-cloudflare deploy
echo "deployed: https://picvision-reel-cf-test.tony-chu805.workers.dev"
