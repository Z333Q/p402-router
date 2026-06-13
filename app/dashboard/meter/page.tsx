import { redirect } from 'next/navigation';

/**
 * Meter index is a thin redirect into the events list. Slice 3R-A:
 * preserve the incoming query string so ?demo=1&scenario=<id> survives
 * the hop into the actual surface (the redirect itself has no UI to
 * carry demo context on, so the only correct behavior is to forward
 * the params untouched).
 */
export default async function MeterIndex({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const params = await searchParams;
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
        if (typeof v === 'string') sp.set(k, v);
        else if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'string') sp.set(k, v[0]);
    }
    const qs = sp.toString();
    redirect(qs ? `/dashboard/meter/events?${qs}` : '/dashboard/meter/events');
}
