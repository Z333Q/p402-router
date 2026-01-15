'use client';

import React, { useState } from 'react';
import { DeploymentGuide as DeploymentGuideType, DetectedStack } from '@/lib/auditor';
import { Button, CodeBlock } from '../../_components/ui';
import { Copy, Check, Terminal, Code, Rocket, Clock, ExternalLink } from 'lucide-react';

interface DeploymentGuideProps {
    guide: DeploymentGuideType;
    stack: DetectedStack;
    className?: string;
}

export function DeploymentGuide({ guide, stack, className = '' }: DeploymentGuideProps) {
    const [activeTab, setActiveTab] = useState<'quick' | 'full'>('quick');
    const [copied, setCopied] = useState<string | null>(null);

    const copyToClipboard = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(id);
            setTimeout(() => setCopied(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const isPython = stack.language === 'python';

    return (
        <div className={`border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden ${className}`}>
            {/* Header */}
            <div className="bg-black text-white p-6">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <Rocket className="w-6 h-6 text-primary" />
                        <h3 className="text-xl font-black uppercase tracking-tight italic">Implementation Playbook</h3>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-400">
                        <Clock className="w-4 h-4" />
                        {guide.estimatedTime}
                    </div>
                </div>
                <p className="text-sm text-neutral-400">
                    Tailored for your {stack.language.toUpperCase()} stack with {stack.providers.join(' + ')}
                </p>
            </div>

            {/* Tabs */}
            <div className="flex border-b-2 border-black">
                <button
                    onClick={() => setActiveTab('quick')}
                    className={`flex-1 px-6 py-4 text-xs font-black uppercase tracking-widest transition-colors ${activeTab === 'quick'
                        ? 'bg-primary text-black'
                        : 'bg-neutral-100 text-neutral-500 hover:text-black'
                        }`}
                >
                    ⚡ Quick Start (3 min)
                </button>
                <button
                    onClick={() => setActiveTab('full')}
                    className={`flex-1 px-6 py-4 text-xs font-black uppercase tracking-widest transition-colors ${activeTab === 'full'
                        ? 'bg-primary text-black'
                        : 'bg-neutral-100 text-neutral-500 hover:text-black'
                        }`}
                >
                    🔧 Full Integration
                </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
                {activeTab === 'quick' && (
                    <>
                        {/* Step 1: Install */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-black text-sm">1</span>
                                <span className="font-black uppercase text-sm">Install SDK</span>
                            </div>
                            <div className="relative group">
                                <div className="bg-neutral-900 text-primary font-mono text-sm p-4 border-2 border-black">
                                    <Terminal className="inline-block w-4 h-4 mr-2 opacity-50" />
                                    {guide.sdkInstall}
                                </div>
                                <button
                                    onClick={() => copyToClipboard(guide.sdkInstall, 'install')}
                                    className="absolute top-2 right-2 p-2 bg-neutral-800 hover:bg-neutral-700 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    {copied === 'install' ? <Check size={14} className="text-primary" /> : <Copy size={14} className="text-neutral-400" />}
                                </button>
                            </div>
                        </div>

                        {/* Step 2: Initialize */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-black text-sm">2</span>
                                <span className="font-black uppercase text-sm">Replace Your AI Calls</span>
                            </div>
                            <div className="relative group">
                                <CodeBlock code={guide.quickStart} language={isPython ? 'python' : 'typescript'} />
                                <button
                                    onClick={() => copyToClipboard(guide.quickStart, 'quick')}
                                    className="absolute top-2 right-2 p-2 bg-neutral-800 hover:bg-neutral-700 transition-colors"
                                >
                                    {copied === 'quick' ? <Check size={14} className="text-primary" /> : <Copy size={14} className="text-neutral-400" />}
                                </button>
                            </div>
                        </div>

                        {/* Step 3: Deploy */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-primary text-black flex items-center justify-center font-black text-sm">3</span>
                                <span className="font-black uppercase text-sm">Deploy & Save</span>
                            </div>
                            <div className="bg-primary/10 border-2 border-primary p-4 space-y-2">
                                <p className="text-sm font-medium">
                                    That's it! P402 automatically handles:
                                </p>
                                <ul className="text-sm text-neutral-600 space-y-1">
                                    <li className="flex items-center gap-2">
                                        <Check size={14} className="text-primary" /> Smart model routing
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check size={14} className="text-primary" /> Semantic caching
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check size={14} className="text-primary" /> Fallback chains
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check size={14} className="text-primary" /> Cost tracking
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'full' && (
                    <>
                        {/* Full Integration Code */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="font-black uppercase text-sm">Complete Migration Example</span>
                                <span className="text-[10px] font-bold text-neutral-400 uppercase">
                                    {isPython ? 'Python' : 'TypeScript'}
                                </span>
                            </div>
                            <div className="relative group">
                                <CodeBlock code={guide.fullIntegration} language={isPython ? 'python' : 'typescript'} />
                                <button
                                    onClick={() => copyToClipboard(guide.fullIntegration, 'full')}
                                    className="absolute top-2 right-2 p-2 bg-neutral-800 hover:bg-neutral-700 transition-colors"
                                >
                                    {copied === 'full' ? <Check size={14} className="text-primary" /> : <Copy size={14} className="text-neutral-400" />}
                                </button>
                            </div>
                        </div>

                        {/* Environment Variables */}
                        <div className="space-y-3">
                            <span className="font-black uppercase text-sm">Environment Variables</span>
                            <div className="bg-neutral-50 border-2 border-black p-4 font-mono text-xs space-y-1">
                                {guide.envVars.map((env, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <span className="text-primary">#</span>
                                        <span>{env}=your_value_here</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Framework-specific tips */}
                        {stack.frameworks.length > 0 && (
                            <div className="p-4 bg-neutral-900 text-white border-2 border-black space-y-3">
                                <div className="flex items-center gap-2">
                                    <Code size={16} className="text-primary" />
                                    <span className="font-black uppercase text-sm">
                                        {stack.frameworks[0]} Integration Notes
                                    </span>
                                </div>
                                <p className="text-sm text-neutral-300">
                                    {getFrameworkTip(stack.frameworks[0] || 'default', isPython)}
                                </p>
                            </div>
                        )}
                    </>
                )}

                {/* Documentation Links */}
                <div className="flex flex-wrap gap-3 pt-4 border-t-2 border-dashed border-neutral-200">
                    <a
                        href="/docs/api"
                        className="flex items-center gap-2 px-4 py-2 bg-neutral-100 border-2 border-black text-xs font-bold uppercase hover:bg-neutral-200 transition-colors"
                    >
                        <ExternalLink size={14} />
                        API Reference
                    </a>
                    <a
                        href="/docs/mcp"
                        className="flex items-center gap-2 px-4 py-2 bg-neutral-100 border-2 border-black text-xs font-bold uppercase hover:bg-neutral-200 transition-colors"
                    >
                        <ExternalLink size={14} />
                        MCP Integration
                    </a>
                    <a
                        href="https://github.com/p402/examples"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-neutral-100 border-2 border-black text-xs font-bold uppercase hover:bg-neutral-200 transition-colors"
                    >
                        <ExternalLink size={14} />
                        Examples
                    </a>
                </div>
            </div>
        </div>
    );
}

function getFrameworkTip(framework: string, isPython: boolean): string {
    const tips: Record<string, string> = {
        'LangChain': isPython
            ? 'Replace ChatOpenAI with P402Chat for automatic cost optimization. All LangChain chains work seamlessly.'
            : 'Use P402Chat as a drop-in replacement for ChatOpenAI in your LangChain.js chains.',
        'LlamaIndex': 'P402 integrates with LlamaIndex\'s LLM interface. Set P402Client as your default LLM for all queries.',
        'AutoGen': 'Configure P402 as the model_client in your agents for automatic cost routing across all agent interactions.',
        'CrewAI': 'Set the P402 LLM in your Agent definitions. CrewAI\'s multi-agent loops benefit hugely from P402\'s caching.',
        'Vercel AI SDK': 'Use @p402/ai-sdk for drop-in compatibility with the Vercel AI SDK streaming interface.',
    };
    return tips[framework] || 'P402 provides a standard OpenAI-compatible interface that works with most frameworks.';
}
