import Link from 'next/link';

export function CommandPaletteBar() {
  const links = [
    ['/docs/wdk/quickstart', 'Quickstart'],
    ['/docs/wdk/api-reference', 'API'],
    ['/docs/wdk/errors', 'Errors'],
    ['/docs/wdk/migration', 'Migration'],
    ['/docs/wdk/security', 'Security'],
  ] as const;

  return (
    <section className="border-2 border-black bg-neutral-100 p-3 mb-6">
      <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-widest">
        <span className="px-2 py-1 border-2 border-black bg-white">⌘K</span>
        <span>Command-palette first nav</span>
        <span className="text-cyan-600">Jump:</span>
        {links.map(([href, label]) => (
          <Link key={href} href={href} className="px-2 py-1 border-2 border-black bg-white hover:bg-primary transition-transform hover:-translate-y-0.5">
            {label}
          </Link>
        ))}
      </div>
    </section>
  );
}
