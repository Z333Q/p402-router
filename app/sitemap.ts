import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://p402.io'
    const now = new Date()

    return [
        // ── Core pages ────────────────────────────────────────────────
        { url: baseUrl,                             lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
        { url: `${baseUrl}/pricing`,                lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },
        { url: `${baseUrl}/pricing/metric-definition`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/trust`,                  lastModified: now, changeFrequency: 'weekly',  priority: 0.95 },
        { url: `${baseUrl}/status`,                 lastModified: now, changeFrequency: 'hourly',  priority: 0.8 },

        // ── Product pages ─────────────────────────────────────────────
        { url: `${baseUrl}/product/controls`,       lastModified: now, changeFrequency: 'monthly', priority: 0.75 },
        { url: `${baseUrl}/product/ecosystem`,      lastModified: now, changeFrequency: 'monthly', priority: 0.75 },
        { url: `${baseUrl}/product/escrow`,         lastModified: now, changeFrequency: 'monthly', priority: 0.75 },
        { url: `${baseUrl}/product/orchestration`,  lastModified: now, changeFrequency: 'monthly', priority: 0.75 },
        { url: `${baseUrl}/product/payments`,       lastModified: now, changeFrequency: 'monthly', priority: 0.75 },
        { url: `${baseUrl}/product/routing`,        lastModified: now, changeFrequency: 'monthly', priority: 0.75 },

        // ── Developer pages ───────────────────────────────────────────
        { url: `${baseUrl}/developers`,             lastModified: now, changeFrequency: 'weekly',  priority: 0.95 },
        { url: `${baseUrl}/developers/quickstart`,  lastModified: now, changeFrequency: 'weekly',  priority: 0.95 },

        // ── Intelligence + marketplace ────────────────────────────────
        { url: `${baseUrl}/intelligence`,           lastModified: now, changeFrequency: 'daily',   priority: 0.7 },
        { url: `${baseUrl}/bazaar`,                 lastModified: now, changeFrequency: 'hourly',  priority: 0.7 },
        { url: `${baseUrl}/get-access`,             lastModified: now, changeFrequency: 'monthly', priority: 0.5 },

        // ── Documentation hub ─────────────────────────────────────────
        { url: `${baseUrl}/docs`,                   lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },

        // ── Docs — primary developer references ──────────────────────
        { url: `${baseUrl}/docs/api`,               lastModified: now, changeFrequency: 'weekly',  priority: 0.85 },
        { url: `${baseUrl}/docs/router`,            lastModified: now, changeFrequency: 'weekly',  priority: 0.85 },
        { url: `${baseUrl}/docs/sdk`,               lastModified: now, changeFrequency: 'weekly',  priority: 0.85 },
        { url: `${baseUrl}/docs/skill`,             lastModified: now, changeFrequency: 'weekly',  priority: 0.85 },

        // ── Docs — protocol references ────────────────────────────────
        { url: `${baseUrl}/docs/a2a`,               lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
        { url: `${baseUrl}/docs/facilitator`,       lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
        { url: `${baseUrl}/docs/mandates`,          lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
        { url: `${baseUrl}/docs/mcp`,               lastModified: now, changeFrequency: 'weekly',  priority: 0.75 },
        { url: `${baseUrl}/docs/erc8004`,           lastModified: now, changeFrequency: 'weekly',  priority: 0.75 },
        { url: `${baseUrl}/docs/bazaar`,            lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
        { url: `${baseUrl}/docs/v2-spec`,           lastModified: now, changeFrequency: 'monthly', priority: 0.65 },

        // ── Docs — WDK ────────────────────────────────────────────────
        { url: `${baseUrl}/docs/wdk`,               lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/docs/wdk/quickstart`,    lastModified: now, changeFrequency: 'monthly', priority: 0.65 },
        { url: `${baseUrl}/docs/wdk/api-reference`, lastModified: now, changeFrequency: 'monthly', priority: 0.65 },
        { url: `${baseUrl}/docs/wdk/migration`,     lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
        { url: `${baseUrl}/docs/wdk/security`,      lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
        { url: `${baseUrl}/docs/wdk/errors`,        lastModified: now, changeFrequency: 'monthly', priority: 0.6 },

        // ── Intelligence research ─────────────────────────────────────
        { url: `${baseUrl}/intelligence/research/x402-standard`,            lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${baseUrl}/intelligence/research/ap2-mandates`,             lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${baseUrl}/intelligence/research/verifiable-compute`,       lastModified: now, changeFrequency: 'monthly', priority: 0.75 },
        { url: `${baseUrl}/intelligence/research/flash-crash-protection`,   lastModified: now, changeFrequency: 'monthly', priority: 0.75 },
        { url: `${baseUrl}/intelligence/research/economics-of-latency`,     lastModified: now, changeFrequency: 'monthly', priority: 0.75 },
        { url: `${baseUrl}/intelligence/research/black-friday-swarm`,       lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/intelligence/research/medical-data-heist`,       lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/intelligence/research/supply-chain-miracle`,     lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/intelligence/agentic-orchestration`,             lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/intelligence/machine-governance`,                lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/intelligence/protocol-economics`,                lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/intelligence/sentinel-layer`,                    lastModified: now, changeFrequency: 'monthly', priority: 0.7 },

        // ── P402 Meter — per-token AI billing on Tempo ────────────────
        { url: `${baseUrl}/meter`,                          lastModified: now, changeFrequency: 'weekly',  priority: 0.95 },
        { url: `${baseUrl}/meter/healthcare`,               lastModified: now, changeFrequency: 'weekly',  priority: 0.9  },
        { url: `${baseUrl}/meter/legal`,                    lastModified: now, changeFrequency: 'weekly',  priority: 0.9  },
        { url: `${baseUrl}/meter/real-estate`,              lastModified: now, changeFrequency: 'weekly',  priority: 0.9  },
        { url: `${baseUrl}/meter/enterprise`,               lastModified: now, changeFrequency: 'weekly',  priority: 0.9  },
        { url: `${baseUrl}/meter/about/billing`,            lastModified: now, changeFrequency: 'monthly', priority: 0.75 },
        { url: `${baseUrl}/meter/about/routing`,            lastModified: now, changeFrequency: 'monthly', priority: 0.75 },
        { url: `${baseUrl}/meter/about/tracing`,            lastModified: now, changeFrequency: 'monthly', priority: 0.75 },
        { url: `${baseUrl}/meter/about/audit`,              lastModified: now, changeFrequency: 'monthly', priority: 0.75 },
        { url: `${baseUrl}/meter/about/optimization`,       lastModified: now, changeFrequency: 'monthly', priority: 0.75 },

        // ── SEO landing pages (V5 §18.3) ──────────────────────────────
        { url: `${baseUrl}/ai-spend-audit`,                  lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },
        { url: `${baseUrl}/enterprise-ai-budget-dashboard`,  lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },
        { url: `${baseUrl}/ai-token-usage-dashboard`,        lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },
        { url: `${baseUrl}/embedded-ai-margin-control`,      lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },
        { url: `${baseUrl}/ai-cogs-dashboard`,               lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },
        { url: `${baseUrl}/ai-cost-optimization`,            lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },

        // ── Partner program ───────────────────────────────────────────
        { url: `${baseUrl}/partners`,                       lastModified: now, changeFrequency: 'weekly',  priority: 0.85 },
        { url: `${baseUrl}/partners/apply`,                 lastModified: now, changeFrequency: 'monthly', priority: 0.7  },

        // ── Changelog ─────────────────────────────────────────────────
        { url: `${baseUrl}/changelog`,                      lastModified: now, changeFrequency: 'weekly',  priority: 0.6  },

        // ── Legal ─────────────────────────────────────────────────────
        { url: `${baseUrl}/terms`,                  lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
        { url: `${baseUrl}/privacy`,                lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    ]
}
