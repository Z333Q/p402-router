interface FAQItemProps {
    question: string;
    children: React.ReactNode;
}

export function FAQItem({ question, children }: FAQItemProps) {
    return (
        <details className="border-2 border-neutral-200 bg-white">
            <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between hover:bg-neutral-50">
                <span className="text-sm font-black text-black uppercase tracking-wide">{question}</span>
                <span className="text-2xl font-black text-neutral-400 leading-none group-open:rotate-45 transition-transform">+</span>
            </summary>
            <div className="px-5 pb-5 pt-2 text-sm font-mono text-neutral-800 leading-relaxed space-y-3">
                {children}
            </div>
        </details>
    );
}
