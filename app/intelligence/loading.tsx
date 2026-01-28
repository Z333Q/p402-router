export default function IntelligenceLoading() {
    return (
        <div className="min-h-screen bg-white flex flex-col justify-center items-center font-sans">
            <div className="w-12 h-12 bg-black text-[#B6FF2E] flex items-center justify-center font-black text-xl mb-6 animate-pulse">
                P402
            </div>
            <div className="w-48 h-1 bg-neutral-100 border border-black overflow-hidden relative">
                <div className="absolute inset-0 bg-[#B6FF2E] animate-loading-bar origin-left w-full h-full" />
            </div>
            <span className="mt-4 font-mono text-[10px] uppercase tracking-widest text-neutral-400">
                Retrieving Research...
            </span>
        </div>
    );
}
