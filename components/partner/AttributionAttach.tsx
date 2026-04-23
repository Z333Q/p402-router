'use client'

/**
 * AttributionAttach
 * =================
 * Invisible component. Fires POST /api/partner/attribution/attach exactly
 * once per browser session after a user authenticates.
 *
 * Placement: inside any authenticated layout (e.g. dashboard layout).
 * The request sends the HttpOnly p402_ref cookie automatically.
 * The server handles all logic; this component is intentionally dumb.
 *
 * localStorage key `p402_attr_attached` prevents repeat calls
 * across page navigations within the same session.
 */

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'

export function AttributionAttach() {
    const { data: session, status } = useSession()
    const tenantId = (session?.user as { tenantId?: string } | undefined)?.tenantId

    useEffect(() => {
        if (status !== 'authenticated' || !tenantId) return

        // Already attached this session
        const key = `p402_attr_attached_${tenantId}`
        if (sessionStorage.getItem(key)) return

        sessionStorage.setItem(key, '1')

        // Fire and forget — never block the user's session
        fetch('/api/partner/attribution/attach', {
            method: 'POST',
            credentials: 'same-origin', // ensures HttpOnly cookie is sent
        }).catch(() => {
            // silent — attribution must never degrade the product
            sessionStorage.removeItem(key)
        })
    }, [status, tenantId])

    return null
}
