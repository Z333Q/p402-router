'use client';

import { useState } from 'react';
import { CostSidebar } from '@/components/CostSidebar';
import { Card, Button, Input } from '../_components/ui';

export default function CostDemoPage() {
  const [sessionId, setSessionId] = useState('demo_session_123');
  const [customSessionId, setCustomSessionId] = useState('');

  const handleSetCustomSession = () => {
    if (customSessionId.trim()) {
      setSessionId(customSessionId.trim());
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-black uppercase tracking-tighter text-black">
          Real-Time Cost Tracking
        </h1>
        <p className="text-neutral-600 font-medium mt-2">
          Live cost monitoring and savings analytics for P402 sessions
        </p>
      </div>

      {/* Demo Controls */}
      <Card title="Demo Controls" className="p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Current Session ID
            </label>
            <div className="font-mono text-sm bg-neutral-100 p-3 rounded border">
              {sessionId}
            </div>
          </div>

          <div>
            <label htmlFor="customSession" className="block text-sm font-medium text-neutral-700 mb-2">
              Track Different Session
            </label>
            <div className="flex gap-2">
              <Input
                id="customSession"
                type="text"
                placeholder="Enter session ID..."
                value={customSessionId}
                onChange={(e) => setCustomSessionId(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleSetCustomSession} variant="primary">
                Track
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Demo Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Mock Chat Interface */}
        <div className="lg:col-span-3">
          <Card title="Chat Interface (Demo)" className="p-6">
            <div className="space-y-4">
              <div className="bg-neutral-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-neutral-600 mb-2">User</div>
                <div>Analyze this sales data and provide insights...</div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-blue-600 mb-2">P402 Assistant</div>
                <div>
                  Based on the data analysis using GPT-4, here are the key insights:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Revenue increased 23% quarter-over-quarter</li>
                    <li>Customer acquisition cost decreased by 15%</li>
                    <li>Retention rates improved across all segments</li>
                  </ul>
                </div>
                <div className="text-xs text-neutral-500 mt-3 font-mono">
                  Model: gpt-4 • Tokens: 2,150 • Cost: $0.043 • Latency: 1,247ms
                </div>
              </div>

              <div className="bg-neutral-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-neutral-600 mb-2">User</div>
                <div>Create a follow-up report with charts...</div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-green-600 mb-2">P402 Assistant</div>
                <div>
                  I'll generate a comprehensive report with visualizations. Processing through Claude-3...
                </div>
                <div className="text-xs text-neutral-500 mt-3 font-mono">
                  Model: claude-3-opus • Tokens: 3,890 • Cost: $0.078 • Latency: 892ms
                </div>
              </div>

              <div className="border-2 border-dashed border-neutral-300 p-6 text-center">
                <div className="text-neutral-500">
                  Conversation continues... Cost tracking updates in real-time →
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Cost Sidebar */}
        <div className="lg:col-span-1">
          <CostSidebar sessionId={sessionId} />
        </div>
      </div>

      {/* Features Explanation */}
      <Card title="Cost Tracking Features" className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <h4 className="font-bold text-neutral-900 mb-2">Real-Time Updates</h4>
            <p className="text-sm text-neutral-600">
              Costs update every 5 seconds as new requests are processed through P402.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-neutral-900 mb-2">Savings Analytics</h4>
            <p className="text-sm text-neutral-600">
              Compare actual costs vs estimated direct provider costs to show P402's value.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-neutral-900 mb-2">Trend Visualization</h4>
            <p className="text-sm text-neutral-600">
              Mini sparklines show cost patterns and usage trends over time.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-neutral-900 mb-2">Performance Metrics</h4>
            <p className="text-sm text-neutral-600">
              Track average latency, request count, and token usage across sessions.
            </p>
          </div>
        </div>
      </Card>

      {/* Technical Implementation */}
      <Card title="Implementation Guide" className="p-6">
        <div className="space-y-4">
          <div>
            <h4 className="font-bold text-neutral-900 mb-2">Frontend Integration</h4>
            <pre className="bg-neutral-100 p-4 rounded text-sm overflow-x-auto">
{`import { CostSidebar } from '@/components/CostSidebar';

// In your chat/dashboard component:
<CostSidebar sessionId="user_session_123" />`}
            </pre>
          </div>

          <div>
            <h4 className="font-bold text-neutral-900 mb-2">API Endpoint</h4>
            <pre className="bg-neutral-100 p-4 rounded text-sm overflow-x-auto">
{`GET /api/v2/sessions/{sessionId}/stats

Response:
{
  "balance": 10.00,
  "spent": 0.121,
  "saved": 0.045,
  "requestCount": 7,
  "costHistory": [...],
  "lastUpdated": "2024-01-15T10:30:00Z"
}`}
            </pre>
          </div>

          <div>
            <h4 className="font-bold text-neutral-900 mb-2">Database Integration</h4>
            <p className="text-sm text-neutral-600">
              The component pulls real data from the <code className="bg-neutral-200 px-1 rounded">model_usage</code> table,
              aggregating costs, token usage, and performance metrics by session.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}