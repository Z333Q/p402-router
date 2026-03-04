'use client';

import React from 'react';
import { motion } from 'motion/react';
import { REQUEST_DATA, RESPONSE_402, RESPONSE_200, RECEIPT_DATA, LOGS_DATA, AUDIT_FINDINGS, AUDIT_DETAILS } from '@/lib/demo-data';
import { Check, ShieldCheck, Download } from 'lucide-react';
import Image from 'next/image';

interface DemoScreenProps {
    state: 'request' | '402' | 'success' | 'receipt' | 'logs' | 'audit_fail' | 'audit_pass' | 'audit_export';
}

const CodeBlock = ({ content, className = '' }: { content: string; className?: string }) => (
    <div className={`bg-[#141414] text-[#F5F5F5] p-4 font-mono text-sm overflow-hidden ${className}`}>
        <pre>{content}</pre>
    </div>
);

const HeaderRow = ({ k, v }: { k: string; v: string }) => (
    <div className="flex font-mono text-xs border-b border-black/10 py-1">
        <span className="w-1/3 font-bold opacity-70">{k}</span>
        <span className="w-2/3 truncate">{v}</span>
    </div>
);

const P402Logo = () => (
    <div className="relative w-10 h-10 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mr-3 bg-[#B6FF2E] flex items-center justify-center shrink-0">
        <Image
            src="/demo/logo.png"
            alt="P402 Logo"
            width={40}
            height={40}
            className="object-contain"
        />
    </div>
);

export const DemoScreen = ({ state }: DemoScreenProps) => {
    const isLogs = state === 'logs';
    const isReceipt = state === 'receipt';
    const isAudit = state.startsWith('audit');
    const isAuditFail = state === 'audit_fail';
    const isAuditPass = state === 'audit_pass';
    const isAuditExport = state === 'audit_export';
    const isSuccess = state === 'success' || isReceipt || isLogs;

    return (
        <div className="w-full h-full flex flex-col bg-white">
            {/* Top Bar */}
            <div className="h-24 border-b-2 border-black flex items-center px-8 justify-between bg-white shrink-0">
                <div className="flex items-center gap-6">
                    <div className="flex items-center">
                        <P402Logo />
                        <div className="flex flex-col leading-none">
                            <span className="font-bold uppercase tracking-wider text-xl">P402</span>
                            <span className="font-mono text-[10px] uppercase opacity-60">Protocol Demo</span>
                        </div>
                    </div>

                    <div className={`px-3 py-1 border-2 border-black text-xs font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${state === '402' ? 'bg-[#EF4444] text-white' :
                            isAuditFail ? 'bg-[#EF4444] text-white' :
                                'bg-[#B6FF2E]'
                        }`}>
                        {state === 'request' ? 'Building' :
                            state === '402' ? 'Payment Required' :
                                isAudit ? 'Auditing' :
                                    'Verified'}
                    </div>
                </div>

                <div className="w-1/2"></div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Pane */}
                <div className="w-1/2 border-r-2 border-black flex flex-col">
                    {isAudit ? (
                        <div className="flex-1 bg-gray-50 flex flex-col">
                            <div className="p-6 border-b-2 border-black bg-white">
                                <h2 className="font-bold text-lg uppercase flex items-center gap-2">
                                    <ShieldCheck className="w-5 h-5" /> Audit Context
                                </h2>
                            </div>
                            <div className="p-6">
                                <div className="mb-6">
                                    <h3 className="font-bold text-xs uppercase mb-2 opacity-50">Transaction</h3>
                                    <div className="font-mono text-sm border-2 border-black bg-white p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                        {AUDIT_DETAILS.tx_hash}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-bold text-xs uppercase mb-2 opacity-50">Request ID</h3>
                                    <div className="font-mono text-sm border-2 border-black bg-white p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                        {AUDIT_DETAILS.request_id}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="p-6 border-b-2 border-black bg-gray-50">
                                <div className="flex gap-2 mb-4">
                                    <span className="px-2 py-1 bg-black text-white font-mono font-bold text-sm">POST</span>
                                    <span className="font-mono text-sm py-1 border-b border-black flex-1 truncate">{REQUEST_DATA.url}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button className="px-4 py-1 bg-[#B6FF2E] border-2 border-black font-bold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none transition-all">
                                        SEND
                                    </button>
                                    {isSuccess && (
                                        <div className="px-4 py-1 bg-[#22D3EE] border-2 border-black font-bold text-sm flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                            <Check size={14} /> AUTH ADDED
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 p-6 overflow-hidden pb-24">
                                <h3 className="font-bold text-xs uppercase mb-2 opacity-50">Headers</h3>
                                {REQUEST_DATA.headers.map((h, i) => (
                                    <HeaderRow key={i} k={h.key} v={h.value} />
                                ))}
                                {isSuccess && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="bg-[#B6FF2E]/20"
                                    >
                                        <HeaderRow k="Authorization" v="P402 base:0x123:sig..." />
                                    </motion.div>
                                )}

                                <h3 className="font-bold text-xs uppercase mt-6 mb-2 opacity-50">Body</h3>
                                <CodeBlock content={REQUEST_DATA.body} className="border-2 border-black" />
                            </div>
                        </>
                    )}
                </div>

                {/* Right Pane */}
                <div className="w-1/2 flex flex-col bg-gray-100">
                    {state === 'request' ? (
                        <div className="flex-1 flex items-center justify-center opacity-30">
                            <div className="text-center">
                                <div className="w-16 h-16 border-2 border-dashed border-black mx-auto mb-4 rounded-full animate-[spin_3s_linear_infinite]" />
                                <p className="font-mono text-sm">Negotiating...</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col">
                            <div className="flex border-b-2 border-black bg-white">
                                {!isAudit ? (
                                    <>
                                        <div className={`px-4 py-3 border-r-2 border-black font-bold text-xs uppercase ${!isReceipt && !isLogs ? 'bg-black text-white' : 'text-gray-500'}`}>Response</div>
                                        <div className={`px-4 py-3 border-r-2 border-black font-bold text-xs uppercase ${isReceipt ? 'bg-black text-white' : 'text-gray-500'}`}>Receipt</div>
                                        <div className={`px-4 py-3 border-r-2 border-black font-bold text-xs uppercase ${isLogs ? 'bg-black text-white' : 'text-gray-500'}`}>Logs</div>
                                    </>
                                ) : (
                                    <div className="px-4 py-3 border-r-2 border-black font-bold text-xs uppercase bg-black text-white">Audit Report</div>
                                )}
                            </div>

                            <div className="flex-1 flex flex-col overflow-hidden relative pb-24">
                                {isAudit && (
                                    <div className="flex-1 p-6 bg-white overflow-y-auto">
                                        {isAuditExport ? (
                                            <div className="border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
                                                <div className="flex justify-between items-center mb-4 border-b border-black/10 pb-2">
                                                    <span className="font-bold uppercase text-xs flex items-center gap-2">
                                                        <Download size={14} /> Export Evidence
                                                    </span>
                                                </div>
                                                <CodeBlock content={JSON.stringify(AUDIT_FINDINGS, null, 2)} className="!bg-transparent !text-black !p-0" />
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {AUDIT_FINDINGS.map((finding, i) => {
                                                    const status = isAuditFail && i === 0 ? 'FAIL' : 'PASS';
                                                    const color = status === 'FAIL' ? 'bg-[#EF4444] text-white' : 'bg-[#22C55E] text-black';

                                                    return (
                                                        <motion.div
                                                            key={i}
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: i * 0.1 }}
                                                            className="border-2 border-black p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between bg-white"
                                                        >
                                                            <div>
                                                                <div className="font-mono text-xs font-bold">{finding.rule}</div>
                                                                <div className="text-xs opacity-70">{finding.evidence}</div>
                                                            </div>
                                                            <div className={`px-2 py-1 text-xs font-bold border-2 border-black ${color}`}>
                                                                {status}
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {isLogs && (
                                    <div className="flex-1 bg-[#141414] text-[#F5F5F5] p-6 font-mono text-sm overflow-y-auto">
                                        {LOGS_DATA.map((log, i) => {
                                            const isReusedLine = log.includes('Receipt reused') || log.includes('Success');
                                            return (
                                                <motion.div
                                                    key={i}
                                                    initial={isReusedLine ? { backgroundColor: '#B6FF2E', color: '#000' } : {}}
                                                    animate={isReusedLine ? { backgroundColor: 'transparent', color: '#F5F5F5' } : {}}
                                                    transition={{ duration: 0.08, delay: 0.2 }}
                                                    className="py-1 px-2 -mx-2 mb-1 rounded-sm"
                                                >
                                                    <span className="opacity-50 mr-2">{`>`}</span>
                                                    {log}
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}

                                {isReceipt && (
                                    <div className="flex-1 p-6 bg-white overflow-y-auto">
                                        <div className="border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white mb-4">
                                            <div className="flex justify-between items-center mb-4 border-b border-black/10 pb-2">
                                                <span className="font-bold uppercase text-xs">P402 Receipt</span>
                                                <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
                                            </div>
                                            <CodeBlock content={JSON.stringify(RECEIPT_DATA, null, 2)} className="!bg-transparent !text-black !p-0" />
                                        </div>
                                    </div>
                                )}

                                {!isReceipt && !isLogs && !isAudit && (
                                    <>
                                        <div className={`p-6 border-b-2 border-black ${state === '402' ? 'bg-[#EF4444]/10' : 'bg-[#22C55E]/10'}`}>
                                            <div className="relative inline-block">
                                                <h2 className={`font-mono text-lg font-bold ${state === '402' ? 'text-red-600' : 'text-green-600'}`}>
                                                    {state === '402' ? RESPONSE_402.status : RESPONSE_200.status}
                                                </h2>

                                                {state === '402' && (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 1.1 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        transition={{ duration: 0.08 }}
                                                        className="absolute -inset-2 border-2 border-[#22D3EE] pointer-events-none"
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex-1 p-6 overflow-hidden">
                                            <h3 className="font-bold text-xs uppercase mb-2 opacity-50">Response Headers</h3>
                                            {(state === '402' ? RESPONSE_402.headers : RESPONSE_200.headers).map((h, i) => (
                                                <HeaderRow key={i} k={h.key} v={h.value} />
                                            ))}

                                            <h3 className="font-bold text-xs uppercase mt-6 mb-2 opacity-50">Response Body</h3>
                                            <CodeBlock
                                                content={state === '402' ? RESPONSE_402.body : RESPONSE_200.body}
                                                className="border-2 border-black h-full"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
