'use client'
import { useState } from 'react'
import { SUPPORTED_TOKENS, TokenConfig } from '@/lib/tokens'

interface TokenSelectorProps {
    acceptedTokens: { token: string; symbol: string; amount: string }[]
    onSelect: (token: TokenConfig, amount: string) => void
}

export function TokenSelector({ acceptedTokens, onSelect }: TokenSelectorProps) {
    const [selected, setSelected] = useState(acceptedTokens[0]?.symbol || 'USDC')

    const handleSelect = (symbol: string) => {
        setSelected(symbol)
        const token = SUPPORTED_TOKENS[symbol]
        const accepted = acceptedTokens.find(t => t.symbol === symbol)
        if (token && accepted) {
            onSelect(token, accepted.amount)
        }
    }

    return (
        <div className="flex gap-2">
            {acceptedTokens.map(({ symbol, amount }) => {
                const token = SUPPORTED_TOKENS[symbol]
                if (!token) return null

                // Display amount (e.g. 10000 / 10^6 = 0.01)
                const displayAmount = (parseInt(amount) / Math.pow(10, token.decimals)).toFixed(2)

                return (
                    <button
                        key={symbol}
                        onClick={() => handleSelect(symbol)}
                        className={`
              flex items-center gap-2 px-4 py-2 rounded-lg border transition-all
              ${selected === symbol
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                : 'border-zinc-200 hover:border-zinc-300 bg-white text-zinc-600'}
            `}
                    >
                        {/* Simple colored circle placeholder if logo missing */}
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${symbol === 'USDC' ? 'bg-blue-500' : 'bg-green-500'}`}>
                            {symbol[0]}
                        </div>
                        <div className="text-left">
                            <div className="font-medium text-sm leading-none">{symbol}</div>
                            <div className="text-xs opacity-70 mt-0.5">${displayAmount}</div>
                        </div>
                    </button>
                )
            })}
        </div>
    )
}
