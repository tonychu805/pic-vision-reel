@AGENTS.md

## Staging (since 2026-11-20: Cloudflare Workers + Tokyo database)

Operator decision 2026-11-20: the database moves to Tokyo and the sites from
Netlify to Cloudflare. Staging already runs there; production stays on Netlify
and the us-west-1 database until the production cutover.

| site | staging address | repo |
|---|---|---|
| console | https://picvision-console-cf-staging.tony-chu805.workers.dev | pic-vision-cloud-console |
| share / reel | https://picvision-reel-cf-test.tony-chu805.workers.dev | pic-vision-reel |
| website | https://picvision-website-cf-staging.tony-chu805.workers.dev | pic-vision-website |
| database | Supabase `pic-vision-console-staging-tokyo` (`boorzbxduhsgbkilovyq`) | |

The Netlify staging sites and the old us-west-1 staging project are retired:
don't review on them or fix them. The console repo's CLAUDE.md has the full
staging rules (review gate, secrets, wrangler gotcha).

- Stage a change: check out the branch, `scripts/deploy-staging-cloudflare.sh`
  (dry run), then `--yes`. Deploy only when the operator asks.
- Secrets are set once on the worker (`npx wrangler secret bulk <json> --name <worker>`)
  and never committed; public build-time values live in the deploy script.
- Build with `@opennextjs/cloudflare` (>= 1.20 for Next 16.4); `.open-next/`
  and `.wrangler/` are build output.
- Cloudflare runs Next middleware on the edge only, so the session refresh is
  `middleware.ts` (edge, `atob`), not Next 16's Node `proxy.ts`.
