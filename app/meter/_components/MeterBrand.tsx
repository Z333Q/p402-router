import Link from 'next/link';

interface MeterBrandProps {
  /** Name of the current demo section, shown as the final breadcrumb crumb */
  section?: string;
  /** Switch to light colour palette when the page is in light mode */
  light?: boolean;
}

/**
 * Left-side brand lockup for every meter page header.
 * Logo links to the landing page; "Meter" links to the meter hub.
 */
export function MeterBrand({ section, light = false }: MeterBrandProps) {
  const dot = (
    <span className={light ? 'text-neutral-300' : 'text-neutral-700'}>·</span>
  );

  return (
    <div className="flex items-center gap-2.5 min-w-0">
      {/* Logo mark — always links to landing page */}
      <Link href="/" className="flex items-center gap-2 no-underline shrink-0 group">
        <div className="w-7 h-7 bg-primary border-2 border-black flex items-center justify-center overflow-hidden shrink-0">
          <img src="/favicon.png" alt="P402" className="w-5 h-5" />
        </div>
        <span className={`font-black uppercase tracking-tighter italic text-sm ${light ? 'text-neutral-900' : 'text-neutral-50'} group-hover:text-primary transition-colors`}>
          P402<span className="text-primary not-italic">.io</span>
        </span>
      </Link>

      {dot}

      {/* Meter hub link */}
      <Link
        href="/meter"
        className={`text-sm font-bold uppercase tracking-tight no-underline transition-colors hover:text-primary ${light ? 'text-neutral-600' : 'text-neutral-400'}`}
      >
        Meter
      </Link>

      {/* Optional current-section crumb */}
      {section && (
        <>
          {dot}
          <span className={`text-sm font-bold uppercase tracking-tight truncate ${light ? 'text-neutral-900' : 'text-neutral-50'}`}>
            {section}
          </span>
        </>
      )}
    </div>
  );
}
