import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            // AI crawlers — full access to all public pages including llms.txt
            { userAgent: 'GPTBot',           allow: '/' },
            { userAgent: 'ChatGPT-User',     allow: '/' },
            { userAgent: 'ClaudeBot',        allow: '/' },
            { userAgent: 'anthropic-ai',     allow: '/' },
            { userAgent: 'PerplexityBot',    allow: '/' },
            { userAgent: 'cohere-ai',        allow: '/' },
            { userAgent: 'Omgilibot',        allow: '/' },
            { userAgent: 'YouBot',           allow: '/' },
            { userAgent: 'Diffbot',          allow: '/' },
            { userAgent: 'AI2Bot',           allow: '/' },
            { userAgent: 'CCBot',            allow: '/' },
            // Standard crawlers
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/dashboard/', '/api/v1/', '/api/v2/', '/api/auth/', '/api/internal/'],
            },
        ],
        sitemap: 'https://p402.io/sitemap.xml',
    }
}
