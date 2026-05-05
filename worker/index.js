const defaultOrigin = 'https://dexter.mom'
const defaultSiteTitle = 'Dexter AI — Autonomous Financial Research Agent'
const defaultSiteDescription =
  'Ask any financial question. Dexter autonomously researches, validates, and reports — backed by live market data.'

const annualDiscountMultiplier = 0.5

const planCatalog = [
  { id: 'starter',    name: 'Starter',    monthlyAmountCents: 900,  currency: 'USD' },
  { id: 'pro',        name: 'Pro',         monthlyAmountCents: 2900, currency: 'USD' },
  { id: 'enterprise', name: 'Enterprise',  monthlyAmountCents: 5900, currency: 'USD' },
]

const indexablePaths = [
  '/',
  '/dexter-ai/',
  '/dexter-github/',
  '/dexter-new-blood/',
  '/dexter-all-series/',
  '/dexter-netflix/',
  '/dexter-original-sin/',
  '/dexter-resurrection/',
  '/dexter-cartoon/',
  '/privacy/',
  '/terms/',
]

const seoPageMap = new Map([
  ['/', { title: defaultSiteTitle, description: defaultSiteDescription, robots: 'index,follow' }],
  ['/dexter-ai/', { title: 'What is Dexter AI? Autonomous Financial Research Agent | Dexter AI', description: 'Dexter AI is an autonomous financial research agent powered by the virattt/dexter open-source project. Ask any financial question, get a validated research report.', robots: 'index,follow' }],
  ['/dexter-github/', { title: 'Dexter GitHub: Open-Source Financial Research Agent | Dexter AI', description: 'Explore the Dexter GitHub project by virattt — 23,500+ stars, autonomous financial research, multi-LLM support. Use our hosted SaaS version with zero setup.', robots: 'index,follow' }],
  ['/dexter-new-blood/', { title: 'Dexter: New Blood in Financial Research — AI Takes Over | Dexter AI', description: 'Like Dexter: New Blood brought a fresh chapter, AI financial research agents are writing a new chapter in how analysts work. Explore Dexter AI.', robots: 'index,follow' }],
  ['/dexter-all-series/', { title: "Dexter's Complete Research Capabilities — All Features | Dexter AI", description: "Explore the full Dexter AI feature set: task decomposition, live data, self-validation, multi-LLM support, API access, and natural language queries.", robots: 'index,follow' }],
  ['/dexter-netflix/', { title: 'Dexter on Netflix vs Dexter AI: Two Legends, One Name | Dexter AI', description: "Searching for Dexter on Netflix? We're the other Dexter — the AI financial research agent with 23,500+ GitHub stars. Find out what Dexter AI can do for your investment research.", robots: 'index,follow' }],
  ['/dexter-original-sin/', { title: "Dexter: Original Sin — The Problem With Manual Financial Research | Dexter AI", description: "The original sin of financial analysis: spending hours manually pulling data that an AI can retrieve and validate in minutes. Meet Dexter AI.", robots: 'index,follow' }],
  ['/dexter-resurrection/', { title: "Dexter: Resurrection — AI Revives Financial Research | Dexter AI", description: "Financial research is being resurrected by autonomous AI agents. Dexter AI brings autonomous task decomposition, live data, and self-validation to every analyst's workflow.", robots: 'index,follow' }],
  ['/dexter-cartoon/', { title: "Dexter's Lab for Finance: Build an AI Research Machine | Dexter AI", description: "Like Dexter's Lab, Dexter AI is where financial research experiments happen. Autonomous agents, live data retrieval, and validated reports — built in your browser.", robots: 'index,follow' }],
  ['/privacy/', { title: 'Privacy Policy | Dexter AI', description: 'Read how Dexter AI processes visitor, account, order, and payment information.', robots: 'index,follow' }],
  ['/terms/', { title: 'Terms of Service | Dexter AI', description: 'Review the Dexter AI Terms of Service for account, payment, and usage.', robots: 'index,follow' }],
  ['/checkout/', { title: 'Checkout | Dexter AI', description: 'Complete your Dexter AI plan checkout.', robots: 'noindex,nofollow' }],
])

const creemProductCache = new Map()

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message)
    this.statusCode = statusCode
  }
}

function formatMoney(amountCents, currency) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency,
    maximumFractionDigits: amountCents % 100 === 0 ? 0 : 2,
  }).format(amountCents / 100)
}

function getEnv(env, key) {
  const value = env?.[key]
  return typeof value === 'string' ? value.trim() : ''
}

async function getSecretValue(value) {
  if (typeof value === 'string') return value.trim()
  if (value && typeof value.get === 'function') {
    const resolved = await value.get()
    return typeof resolved === 'string' ? resolved.trim() : ''
  }
  return ''
}

async function firstSecretEnv(env, ...keys) {
  for (const key of keys) {
    const value = await getSecretValue(env?.[key])
    if (value) return value
  }
  return ''
}

function isTemporaryOrigin(origin) {
  try { return new URL(origin).hostname.endsWith('.workers.dev') } catch { return false }
}

function getPublicOrigin(request, env) {
  const appOrigin = getEnv(env, 'APP_ORIGIN')
  if (appOrigin) {
    const origins = appOrigin.split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean)
    const pub = origins.find(o => !isTemporaryOrigin(o))
    if (pub) return pub
  }
  return defaultOrigin
}

function getSecurityHeaders() {
  return new Headers({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  })
}

function jsonResponse(data, status = 200) {
  const headers = getSecurityHeaders()
  headers.set('Content-Type', 'application/json; charset=utf-8')
  return new Response(JSON.stringify(data), { status, headers })
}

function errorResponse(statusCode, message) {
  return jsonResponse({ error: message }, statusCode)
}

async function getOrCreateCreemProduct(apiKey, plan, billingCycle, origin) {
  const cacheKey = `${plan.id}:${billingCycle}`
  if (creemProductCache.has(cacheKey)) return creemProductCache.get(cacheKey)

  const monthlyAmount = billingCycle === 'annual'
    ? Math.round(plan.monthlyAmountCents * annualDiscountMultiplier)
    : plan.monthlyAmountCents

  const totalAmount = billingCycle === 'annual' ? monthlyAmount * 12 : monthlyAmount
  const billingLabel = billingCycle === 'annual' ? 'annual' : 'monthly'
  const displayPrice = formatMoney(monthlyAmount, plan.currency)

  const productResp = await fetch('https://api.creem.io/v1/products', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `Dexter AI ${plan.name} (${billingLabel})`,
      description: `${displayPrice}/mo · ${billingCycle === 'annual' ? 'Billed annually' : 'Billed monthly'} · Autonomous financial research`,
      price: totalAmount,
      currency: plan.currency,
      billing_type: 'one_time',
      success_url: `${origin}/?checkout=success`,
    }),
  })

  if (!productResp.ok) {
    const body = await productResp.text()
    throw new HttpError(502, `Creem product error: ${body}`)
  }

  const product = await productResp.json()
  const productId = product.id || product.product_id
  if (!productId) throw new HttpError(502, 'Creem did not return a product ID')

  creemProductCache.set(cacheKey, productId)
  return productId
}

async function createCreemCheckout(apiKey, productId, origin) {
  const checkoutResp = await fetch('https://api.creem.io/v1/checkouts', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product_id: productId,
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancelled`,
    }),
  })

  if (!checkoutResp.ok) {
    const body = await checkoutResp.text()
    throw new HttpError(502, `Creem checkout error: ${body}`)
  }

  const checkout = await checkoutResp.json()
  const checkoutUrl = checkout.checkout_url || checkout.url
  if (!checkoutUrl) throw new HttpError(502, 'Creem did not return a checkout URL')

  return checkoutUrl
}

async function handleLaunchCheckout(request, env) {
  if (request.method !== 'POST') return errorResponse(405, 'Method not allowed')

  const apiKey = await firstSecretEnv(env, 'API_PROD_KEY', 'CREEM_API_KEY')
  if (!apiKey) return errorResponse(503, 'Payment is not configured for this deployment.')

  let body
  try {
    body = await request.json()
  } catch {
    return errorResponse(400, 'Invalid JSON body')
  }

  const { planId, billingCycle = 'annual' } = body
  const plan = planCatalog.find(p => p.id === planId)
  if (!plan) return errorResponse(400, `Unknown plan: ${planId}`)

  const origin = getPublicOrigin(request, env)

  try {
    const productId = await getOrCreateCreemProduct(apiKey, plan, billingCycle, origin)
    const checkoutUrl = await createCreemCheckout(apiKey, productId, origin)
    return jsonResponse({ checkoutUrl, planId, billingCycle })
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.statusCode, err.message)
    return errorResponse(500, 'Internal server error')
  }
}

function handleRuntime(request, env) {
  const origin = getPublicOrigin(request, env)
  return jsonResponse({ ok: true, publicAppOrigin: origin, ts: Date.now() })
}

function buildSitemapXml(origin) {
  const today = new Date().toISOString().slice(0, 10)
  const urls = indexablePaths.map(path => `  <url>
    <loc>${origin}${path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${path === '/' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${path === '/' ? '1.0' : '0.8'}</priority>
  </url>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`
}

function handleSitemap(request, env) {
  const origin = getPublicOrigin(request, env)
  const headers = getSecurityHeaders()
  headers.set('Content-Type', 'application/xml; charset=utf-8')
  headers.set('Cache-Control', 'public, max-age=3600')
  return new Response(buildSitemapXml(origin), { status: 200, headers })
}

function handleRobots(request, env) {
  const origin = getPublicOrigin(request, env)
  const headers = getSecurityHeaders()
  headers.set('Content-Type', 'text/plain; charset=utf-8')
  const body = `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`
  return new Response(body, { status: 200, headers })
}

async function handleRequest(request, env) {
  const url = new URL(request.url)
  const path = url.pathname

  if (path === '/api/launch-checkout') return handleLaunchCheckout(request, env)
  if (path === '/api/runtime') return handleRuntime(request, env)
  if (path === '/sitemap.xml') return handleSitemap(request, env)
  if (path === '/robots.txt') return handleRobots(request, env)

  return env.ASSETS.fetch(request)
}

export default {
  async fetch(request, env) {
    try {
      return await handleRequest(request, env)
    } catch (err) {
      return errorResponse(500, 'Internal server error')
    }
  },
}
