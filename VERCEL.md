# Vercel Deployment

## Required Secret

Configure the payment secret in Vercel Project Settings, not in this repository:

```env
CREEM_API_KEY=your_creem_live_api_key
```

Apply it to the Production environment, then redeploy the project.

## Committed Runtime Defaults

Non-secret production defaults live in `vercel.json`:

```env
APP_ORIGIN=https://mirofish.work
CREEM_DEFAULT_SUCCESS_URL=https://mirofish.work/
CREEM_ENV=live
```

The checkout API reads `CREEM_API_KEY` as the live Creem key, then redirects successful checkouts back to the configured MiroFish origin.
