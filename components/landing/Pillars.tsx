export function Pillars() {
    return (
        <section className="py-24">
            <div className="container mx-auto px-6 max-w-7xl">
                <h2 className="text-3xl font-black uppercase mb-12 italic border-b-2 border-primary w-fit pr-8">Product pillars</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <PillarCard title="Dynamic Routing" body="Always pick the best path for every request. We track provider health and speed in real-time." />
                    <PillarCard title="Global Spend Caps" body="Set strict limits for every agent and every route. No more surprise bills from runaway API calls." />
                    <PillarCard title="Auto-Discovery" body="Automatically list your services on the Bazaar with fresh, accurate metadata that updates itself." />
                    <PillarCard title="Cost Intelligence" body="Track every penny from the initial request to the final settlement. Know exactly why calls fail." />
                </div>
            </div>
        </section>
    )
}

function PillarCard({ title, body }: { title: string; body: string }) {
    return (
        <div className="border-t-2 border-black pt-4">
            <div className="font-extrabold mb-2 uppercase text-xs tracking-widest text-neutral-900">{title}</div>
            <div className="text-sm text-neutral-600">{body}</div>
        </div>
    )
}
