'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    Badge,
    Button,
    Card,
    CodeBlock,
    ProgressBar,
    StatusDot,
    Stat
} from '../_components/ui';
import { auditRepository, AuditResult } from '@/lib/auditor';
import { ScalingChart, AnimatedCounter, CostProjector, ConfidenceMeter } from './_components/ScalingChart';
import { ShareDownload, SocialCard } from './_components/ShareDownload';
import { DeploymentGuide } from './_components/DeploymentGuide';
import {
    Github,
    Zap,
    CheckCircle2,
    Circle,
    Play,
    RefreshCcw,
    ArrowUpRight,
    TrendingUp,
    Gauge,
    Sparkles,
    Target,
    Layers,
    ChevronRight
} from 'lucide-react';
import { useAccount, useBalance } from 'wagmi';

export default function AuditPage() {
    const { address, isConnected } = useAccount();
    const { data: balanceData } = useBalance({
        address,
        chainId: 8453,
    });

    const [repoUrl, setRepoUrl] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [scanStep, setScanStep] = useState('');
    const [scanProgress, setScanProgress] = useState(0);
    const [result, setResult] = useState<AuditResult | null>(null);
    const [selectedOpt, setSelectedOpt] = useState<any>(null);
    const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'failed'>('idle');
    const [activeSection, setActiveSection] = useState<'overview' | 'optimizations' | 'scaling' | 'deploy'>('overview');
    const searchParams = useSearchParams();

    const usdcBalance = Number(balanceData?.formatted || 0);
    const hasFunds = usdcBalance > 0;

    useEffect(() => {
        const url = searchParams.get('url');
        if (url && !isScanning && !result) {
            setRepoUrl(url);
            handleAudit(url);
        }
    }, [searchParams]);

    const handleAudit = async (customUrl?: string) => {
        const targetUrl = customUrl || repoUrl;
        if (!targetUrl) return;

        setIsScanning(true);
        setResult(null);

        // Enhanced Scan Sequence
        const steps = [
            { msg: 'Cloning Repository Metadata...', progress: 15 },
            { msg: 'Scanning Dependencies...', progress: 30 },
            { msg: 'Detecting AI Models & Frameworks...', progress: 50 },
            { msg: 'Analyzing Usage Patterns...', progress: 70 },
            { msg: 'Calculating Cost Estimates...', progress: 85 },
            { msg: 'Generating Optimizations...', progress: 95 },
        ];

        for (const step of steps) {
            setScanStep(step.msg);
            setScanProgress(step.progress);
            await new Promise(r => setTimeout(r, 400));
        }

        const auditData = await auditRepository(targetUrl);
        setResult(auditData);
        setIsScanning(false);
        setScanProgress(100);
    };

    const totalSavings = result?.optimizations.reduce((acc, opt) => acc + opt.projectedSavings, 0) || 0;
    const savingsPercent = result?.estimatedMonthlySpend ? Math.round((totalSavings / result.estimatedMonthlySpend) * 100) : 0;

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Badge variant="primary">World-Class</Badge>
                        <Badge variant="default">v2.0</Badge>
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter text-black italic">
                        AI Cost <span className="text-primary NOT-italic">Auditor</span>
                    </h1>
                    <p className="text-neutral-500 font-bold uppercase text-xs tracking-widest max-w-md">
                        Model-level detection • Tier-aware pricing • LangChain-quality optimizations
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <StatusDot status="healthy" label="Analysis Engine" />
                    {result && <ShareDownload result={result} repoUrl={repoUrl} />}
                </div>
            </div>

            {/* Input Section */}
            <Card className="!p-4 sm:!p-8 border-4 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Github className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 h-5 w-5" />
                        <input
                            type="text"
                            placeholder="https://github.com/your-org/your-repo"
                            className="w-full bg-white border-2 border-black p-4 pl-12 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                            value={repoUrl}
                            onChange={(e) => setRepoUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAudit()}
                        />
                    </div>
                    <Button
                        onClick={() => handleAudit()}
                        size="lg"
                        loading={isScanning}
                        disabled={!repoUrl || isScanning}
                        className="h-14 px-12 !text-lg w-full sm:w-auto"
                    >
                        {isScanning ? 'Analyzing...' : 'Run Deep Audit'}
                    </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase">Try:</span>
                    {['langchain-ai/langchain', 'openai/openai-python', 'anthropics/anthropic-sdk-python'].map(repo => (
                        <button
                            key={repo}
                            onClick={() => setRepoUrl(`https://github.com/${repo}`)}
                            className="text-[10px] font-bold text-primary hover:underline"
                        >
                            {repo}
                        </button>
                    ))}
                </div>
            </Card>

            {/* Scanning State */}
            {isScanning && (
                <div className="space-y-4 animate-in fade-in duration-500">
                    <div className="flex justify-between items-end">
                        <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">
                            <Sparkles className="inline w-4 h-4 mr-2 animate-spin" />
                            {scanStep}
                        </p>
                        <span className="font-mono text-xs font-bold">{Math.round(scanProgress)}%</span>
                    </div>
                    <ProgressBar value={scanProgress} variant="success" className="h-6" />
                </div>
            )}

            {/* Results Section */}
            {result && !isScanning && (
                <div className="space-y-12 animate-in zoom-in-95 duration-500">
                    {result.estimatedMonthlySpend === 0 ? (
                        <div className="p-12 border-4 border-dashed border-neutral-200 text-center space-y-4">
                            <div className="text-6xl">🔍</div>
                            <h2 className="text-3xl font-black uppercase">No AI Usage Detected</h2>
                            <p className="text-neutral-500 max-w-lg mx-auto font-medium">
                                We couldn't find any AI SDKs, models, or API keys in this repository.
                                Make sure it contains actual application code with AI provider integrations.
                            </p>
                            <Button variant="secondary" onClick={() => { setRepoUrl(''); setResult(null); }}>Try Another Repository</Button>
                        </div>
                    ) : (
                        <>
                            {/* Navigation Tabs */}
                            <div className="flex overflow-x-auto border-b-4 border-black">
                                {[
                                    { id: 'overview', label: 'Overview', icon: Target },
                                    { id: 'optimizations', label: 'Optimizations', icon: Zap },
                                    { id: 'scaling', label: 'Scaling', icon: TrendingUp },
                                    { id: 'deploy', label: 'Deploy', icon: Layers },
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveSection(tab.id as any)}
                                        className={`flex items-center gap-2 px-6 py-4 text-xs font-black uppercase tracking-widest transition-colors whitespace-nowrap ${activeSection === tab.id
                                                ? 'bg-primary text-black'
                                                : 'bg-white text-neutral-500 hover:text-black hover:bg-neutral-50'
                                            }`}
                                    >
                                        <tab.icon size={16} />
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Overview Section */}
                            {activeSection === 'overview' && (
                                <div className="space-y-8 animate-in fade-in duration-300">
                                    {/* Hero Stats */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                        <Card className="!bg-primary border-4 border-black">
                                            <div className="text-[10px] font-black uppercase text-black/60 mb-2">Monthly Spend</div>
                                            <div className="text-4xl font-black font-mono">
                                                <AnimatedCounter value={result.estimatedMonthlySpend} prefix="$" />
                                            </div>
                                        </Card>
                                        <Card className="!bg-black text-white border-4 border-primary">
                                            <div className="text-[10px] font-black uppercase text-neutral-400 mb-2">Potential Savings</div>
                                            <div className="text-4xl font-black font-mono text-primary">
                                                <AnimatedCounter value={totalSavings} prefix="$" />
                                            </div>
                                        </Card>
                                        <Card className="border-4 border-black">
                                            <div className="text-[10px] font-black uppercase text-neutral-400 mb-2">Detected Models</div>
                                            <div className="text-4xl font-black font-mono">
                                                {result.usageBreakdown.length}
                                            </div>
                                        </Card>
                                        <Card className="border-4 border-black">
                                            <ConfidenceMeter value={result.confidence} />
                                        </Card>
                                    </div>

                                    {/* Detected Stack */}
                                    <Card className="border-4 border-black">
                                        <h3 className="text-xl font-black uppercase mb-6">Detected AI Stack</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                            <div>
                                                <div className="text-[10px] font-bold uppercase text-neutral-400 mb-2">Providers</div>
                                                <div className="flex flex-wrap gap-2">
                                                    {result.detectedStack.providers.map(p => (
                                                        <Badge key={p} variant="default">{p}</Badge>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-bold uppercase text-neutral-400 mb-2">Models</div>
                                                <div className="flex flex-wrap gap-2">
                                                    {result.detectedStack.models.slice(0, 4).map(m => (
                                                        <Badge key={m} variant="primary">{m}</Badge>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-bold uppercase text-neutral-400 mb-2">Frameworks</div>
                                                <div className="flex flex-wrap gap-2">
                                                    {result.detectedStack.frameworks.length > 0
                                                        ? result.detectedStack.frameworks.map(f => (
                                                            <Badge key={f} variant="warning">{f}</Badge>
                                                        ))
                                                        : <span className="text-sm text-neutral-400">None detected</span>
                                                    }
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-bold uppercase text-neutral-400 mb-2">Patterns</div>
                                                <div className="flex flex-wrap gap-2">
                                                    {result.detectedStack.patterns.length > 0
                                                        ? result.detectedStack.patterns.map(p => (
                                                            <Badge key={p} variant="danger">{p}</Badge>
                                                        ))
                                                        : <span className="text-sm text-neutral-400">Standard API</span>
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    </Card>

                                    {/* Cost Breakdown */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        <Card className="border-4 border-black">
                                            <h3 className="text-xl font-black uppercase mb-6">Cost Breakdown</h3>
                                            <div className="space-y-4">
                                                {result.usageBreakdown.map((item, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-4 bg-neutral-50 border-2 border-black">
                                                        <div>
                                                            <div className="font-black text-sm">{item.model}</div>
                                                            <div className="text-[10px] text-neutral-500">{item.provider} • ${item.costPer1kTokens.toFixed(4)}/1K tokens</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-xl font-black font-mono">${item.estimatedCost.toLocaleString()}</div>
                                                            <div className="text-[10px] text-neutral-400">{item.callsPerDay.toLocaleString()}/day</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </Card>

                                        {/* Alternatives */}
                                        <Card className="border-4 border-black">
                                            <h3 className="text-xl font-black uppercase mb-6">Smart Alternatives</h3>
                                            <div className="space-y-4">
                                                {result.alternatives.map((alt, idx) => (
                                                    <div key={idx} className="p-4 bg-neutral-50 border-2 border-black">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <Badge variant={alt.type === 'cost' ? 'success' : alt.type === 'speed' ? 'warning' : 'primary'}>
                                                                {alt.type.toUpperCase()}
                                                            </Badge>
                                                            {alt.expectedSavings > 0 && (
                                                                <span className="text-xs font-black text-green-600">-${alt.expectedSavings}/mo</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 font-black text-sm mb-1">
                                                            <span className="text-neutral-400 line-through">{alt.current}</span>
                                                            <ArrowUpRight size={14} />
                                                            <span>{alt.suggestion}</span>
                                                        </div>
                                                        <p className="text-xs text-neutral-500">{alt.reasoning}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </Card>
                                    </div>
                                </div>
                            )}

                            {/* Optimizations Section */}
                            {activeSection === 'optimizations' && (
                                <div className="space-y-8 animate-in fade-in duration-300">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-3xl font-black uppercase italic">Optimization Feed</h2>
                                            <p className="text-neutral-500 text-sm">Ranked by impact • Total savings: <span className="font-black text-primary">${totalSavings}/mo</span></p>
                                        </div>
                                        <Badge variant="primary" className="!bg-black !text-primary animate-pulse">AI-Powered</Badge>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {result.optimizations.map((opt, idx) => (
                                            <Card key={opt.id} className={`border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${idx === 0 ? '!border-primary' : ''}`}>
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-10 h-10 rounded-full bg-black text-primary flex items-center justify-center font-black text-lg">
                                                            {idx + 1}
                                                        </span>
                                                        <div>
                                                            <h3 className="font-black uppercase">{opt.title}</h3>
                                                            <div className="flex gap-2 mt-1">
                                                                <Badge variant={opt.impact === 'critical' ? 'danger' : opt.impact === 'high' ? 'warning' : 'default'} className="!text-[8px]">
                                                                    {opt.impact}
                                                                </Badge>
                                                                <Badge variant="default" className="!text-[8px]">{opt.effort} effort</Badge>
                                                                <Badge variant="success" className="!text-[8px]">{opt.category}</Badge>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-2xl font-black text-primary">${opt.projectedSavings}</div>
                                                        <div className="text-[10px] text-neutral-400">per month</div>
                                                    </div>
                                                </div>

                                                <p className="text-sm text-neutral-600 mb-4">{opt.description}</p>

                                                <CodeBlock code={opt.codeExample} language={result.detectedStack.language === 'python' ? 'python' : 'typescript'} />

                                                <Button
                                                    variant="dark"
                                                    size="sm"
                                                    className="w-full mt-4"
                                                    onClick={() => navigator.clipboard.writeText(opt.codeExample)}
                                                >
                                                    Copy Code
                                                </Button>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Scaling Section */}
                            {activeSection === 'scaling' && (
                                <div className="space-y-8 animate-in fade-in duration-300">
                                    <div>
                                        <h2 className="text-3xl font-black uppercase italic mb-2">Scaling Economics</h2>
                                        <p className="text-neutral-500 text-sm">See how costs scale with volume—and how much P402 saves at each tier</p>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        <Card className="border-4 border-black">
                                            <ScalingChart data={result.scalingAnalysis} />
                                        </Card>

                                        <CostProjector
                                            baseSpend={result.estimatedMonthlySpend}
                                            baseCalls={result.usageBreakdown.reduce((sum, u) => sum + u.callsPerDay, 0)}
                                        />
                                    </div>

                                    {/* Scaling Table */}
                                    <Card className="border-4 border-black overflow-hidden !p-0">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left font-mono">
                                                <thead className="bg-black text-white text-[10px] uppercase tracking-widest">
                                                    <tr>
                                                        <th className="p-4">Daily Volume</th>
                                                        <th className="p-4">Without P402</th>
                                                        <th className="p-4">With P402</th>
                                                        <th className="p-4">Monthly Savings</th>
                                                        <th className="p-4">ROI</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-sm">
                                                    {result.scalingAnalysis.map((row, i) => (
                                                        <tr key={i} className="border-b-2 border-neutral-100 hover:bg-primary/5 transition-colors">
                                                            <td className="p-4 font-black">{row.callsPerDay.toLocaleString()}</td>
                                                            <td className="p-4 text-neutral-400">${row.legacyMonthly.toLocaleString()}</td>
                                                            <td className="p-4 font-black">${row.p402Monthly.toLocaleString()}</td>
                                                            <td className="p-4 text-primary font-black">${row.savings.toLocaleString()}</td>
                                                            <td className="p-4">
                                                                <span className="px-2 py-1 bg-primary text-black font-black text-xs">+{row.savingsPercent}%</span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </Card>
                                </div>
                            )}

                            {/* Deploy Section */}
                            {activeSection === 'deploy' && (
                                <div className="space-y-8 animate-in fade-in duration-300">
                                    <div>
                                        <h2 className="text-3xl font-black uppercase italic mb-2">Implementation Playbook</h2>
                                        <p className="text-neutral-500 text-sm">
                                            Customized for your {result.detectedStack.language.toUpperCase()} stack with {result.detectedStack.providers.join(' + ')}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        <div className="lg:col-span-2">
                                            <DeploymentGuide guide={result.deploymentGuide} stack={result.detectedStack} />
                                        </div>

                                        <div className="space-y-6">
                                            {/* Social Card Preview */}
                                            <Card className="border-4 border-black !p-0 overflow-hidden">
                                                <div className="p-4 bg-neutral-100 border-b-2 border-black">
                                                    <div className="text-[10px] font-bold uppercase text-neutral-500">Share Your Results</div>
                                                </div>
                                                <div className="p-4">
                                                    <SocialCard result={result} repoUrl={repoUrl} />
                                                </div>
                                            </Card>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* V2 Upgrade CTA */}
                            <section className="bg-black text-white p-8 sm:p-16 border-4 border-primary text-center space-y-8">
                                <div className="inline-block px-4 py-1 bg-primary text-black font-black text-xs uppercase tracking-widest mb-4">
                                    Ready to Save ${totalSavings}/month?
                                </div>
                                <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter italic text-primary">
                                    Start optimizing today.
                                </h2>
                                <p className="text-lg sm:text-xl text-neutral-400 max-w-2xl mx-auto">
                                    P402 V2 handles routing, caching, and failover automatically.
                                    Pay with one unified API key across all providers.
                                </p>
                                <div className="flex flex-col sm:flex-row justify-center gap-4">
                                    <Button variant="primary" size="lg" className="px-12 h-16 !text-xl">
                                        Get Started Free
                                    </Button>
                                    <Button variant="secondary" size="lg" className="px-12 h-16 !text-xl !bg-transparent !text-white !border-white hover:!bg-white hover:!text-black">
                                        Schedule Demo
                                    </Button>
                                </div>
                            </section>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
