import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/dashboard/', '/api/v1/', '/api/auth/'],
        },
        sitemap: 'https://p402.io/sitemap.xml',
    }
}
