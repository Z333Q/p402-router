'use client'

import { Card, Button } from './ui'
import Link from 'next/link'

export function ZeroStateTraffic() {
  return (
    <div className="max-w-2xl mx-auto py-16">
      <Card className="text-center p-12">
        <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-neutral-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
        </div>

        <h2 className="text-2xl font-bold mb-3">No Traffic Data Yet</h2>

        <p className="text-neutral-600 font-medium mb-6 max-w-md mx-auto">
          Start making API requests through P402 to see real-time analytics,
          payment settlements, and traffic patterns here.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/docs/api">
            <Button variant="primary" className="w-full sm:w-auto">
              View API Docs
            </Button>
          </Link>

          <Link href="/docs/quickstart">
            <Button variant="secondary" className="w-full sm:w-auto">
              Quick Start Guide
            </Button>
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-neutral-200">
          <p className="text-sm text-neutral-500">
            Once you start routing requests through P402, you'll see:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-xs">
            <div className="bg-neutral-50 p-3 rounded border">
              <div className="font-bold text-neutral-700 mb-1">Request Traces</div>
              <div className="text-neutral-500">Full audit trail</div>
            </div>
            <div className="bg-neutral-50 p-3 rounded border">
              <div className="font-bold text-neutral-700 mb-1">Payment History</div>
              <div className="text-neutral-500">USDC settlements</div>
            </div>
            <div className="bg-neutral-50 p-3 rounded border">
              <div className="font-bold text-neutral-700 mb-1">Cost Analytics</div>
              <div className="text-neutral-500">Real-time insights</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}