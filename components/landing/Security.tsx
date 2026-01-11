export function Security() {
    return (
        <section className="bg-neutral-100 border-y-2 border-black py-24">
            <div className="container mx-auto px-6 max-w-7xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-3xl font-extrabold uppercase mb-4 leading-tight border-b-2 border-black pb-4">Safe defaults for paid endpoints.</h2>
                        <p className="text-neutral-600">
                            Keep buyer keys on the buyer side. Sellers verify signatures and
                            settle through facilitators.
                        </p>
                    </div>
                    <div className="card p-8 border-2 border-black bg-white">
                        <ul className="flex flex-col gap-4 list-none">
                            <CheckItem>Role-based access for admin actions</CheckItem>
                            <CheckItem>Key rotation for Router API keys</CheckItem>
                            <CheckItem>Least-privilege secrets per environment</CheckItem>
                            <CheckItem>Audit log for policy changes</CheckItem>
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    )
}

function CheckItem({ children }: { children: React.ReactNode }) {
    return (
        <li className="flex items-center gap-3 font-bold text-sm">
            <div className="w-5 h-5 bg-success border-2 border-black flex items-center justify-center shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="text-black">
                    <path d="M5 12l5 5L19 7" />
                </svg>
            </div>
            {children}
        </li>
    )
}
