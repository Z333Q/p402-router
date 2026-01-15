import { TopNav } from "@/components/TopNav"
import { Footer } from "@/components/Footer"
import { Hero } from '@/components/landing/Hero'
import { LandingGuide } from '@/components/landing/LandingGuide'
import { Compatibility } from '@/components/landing/Compatibility'
import { Problem } from '@/components/landing/Problem'
import { WhatIsRouter } from '@/components/landing/WhatIsRouter'
import { Pillars } from '@/components/landing/Pillars'
import { BazaarLoop } from '@/components/landing/BazaarLoop'
import { Observability } from '@/components/landing/Observability'
import { Security } from '@/components/landing/Security'
import { UseCases } from '@/components/landing/UseCases'
import { Quickstart } from '@/components/landing/Quickstart'
import { FAQ } from '@/components/landing/FAQ'
import { FinalCTA } from '@/components/landing/FinalCTA'
import { AgenticPatterns } from '@/components/landing/AgenticPatterns'
import { AuditorSection } from '@/components/landing/AuditorSection'

export const dynamic = 'force-dynamic';

export default async function Page() {
    return (
        <div className="min-h-screen selection:bg-primary selection:text-black">
            <TopNav />
            <main>
                <Hero />
                <AuditorSection />
                <LandingGuide />
                <Compatibility />
                <Problem />
                <WhatIsRouter />
                <Pillars />
                <BazaarLoop />
                <Observability />
                <Security />
                <UseCases />
                <Quickstart />
                <AgenticPatterns />
                <FAQ />
                <FinalCTA />
            </main>
            <Footer />
        </div>
    )
}
