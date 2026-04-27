# Production Inspection Script

This script turns the MiroFish runtime and analytics checks into one reusable read-only command.

Current script path: `scripts/inspect-production-analytics.mjs`

## What it checks

- SSH into the MiroFish production host with a private key or password when using the default remote mode
- Detect the active `EnvironmentFile` from the `systemd` service in remote mode
- Check the `systemd` service state and public site health in remote mode
- Query PostgreSQL analytics data from the MiroFish runtime database
- Summarize referrers, landing paths, page routes, CTA clicks, funnel movement, checkout failures, and deduplicated payments
- Summarize Nginx page/API/static/console proxy traffic from access logs in remote mode

## Commands

Run the default MiroFish Neon text report:

```bash
npm run prod:inspect
```

The default analytics target is `neon-emerald-park` (`neondb_owner@ep-damp-moon-an7f40eu-pooler.c-6.us-east-1.aws.neon.tech:5432/neondb`). The password is intentionally not stored in this repository; the local script reads the DPAPI-encrypted password file when present, or you can provide `MIROFISH_ANALYTICS_DB_PASSWORD`, `MIROFISH_ANALYTICS_DATABASE_URL`, `PGPASSWORD`, `DATABASE_URL`, or `POSTGRES_URL`.

Query a local or Neon PostgreSQL source explicitly:

```bash
npm run prod:inspect -- --local-db --skip-health
```

Write a JSON report:

```bash
npm run prod:inspect -- --local-db --skip-health --format json --output ../推广/exports/mirofish-production-analytics-report.json
```

Inspect a different service or SSH key:

```bash
npm run prod:inspect:remote -- --service mirofish.service --ssh-key-path ~/.ssh/mirofish_prod_key
```

Skip health checks and query only analytics:

```bash
npm run prod:inspect -- --skip-health
```

## Data Source

- The script loads `.env.production` by default.
- `npm run prod:inspect` defaults to the MiroFish Neon analytics database.
- `--local-db` skips SSH and uses the current process environment plus loaded env files, falling back to the non-secret `neon-emerald-park` host/user/database defaults.
- SSH settings come from CLI flags first, then `DEPLOY_*`, `MIROFISH_DEPLOY_*`, and `MIROFISH_SERVER_*` variables.
- The remote env file defaults to `/data/mirofish/mirofish.env`, or the active `EnvironmentFile` detected from `mirofish.service`.
- PostgreSQL uses `MIROFISH_ANALYTICS_DATABASE_URL` or `MIROFISH_POSTGRES_URL` first, then the non-secret `neon-emerald-park` defaults plus `MIROFISH_ANALYTICS_DB_PASSWORD` / `PGPASSWORD` / `POSTGRES_PASSWORD` / the local DPAPI secret file. Generic `DATABASE_URL` / `POSTGRES_URL` fallbacks are only used when no MiroFish-specific URL, discrete config, or local DPAPI secret is available.
- The report is read-only. It does not modify the remote host or database.
