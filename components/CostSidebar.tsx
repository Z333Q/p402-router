'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, Badge } from '@/app/dashboard/_components/ui';

interface CostSidebarProps {
  sessionId: string;
  className?: string;
}

interface SessionStats {
  balance: number;
  spent: number;
  saved: number;
  requestCount: number;
  avgLatency: number;
  costHistory: Array<{ timestamp: string; cost: number }>;
  lastUpdated: string;
}

function MiniSparkline({ data, className }: { data: number[]; className?: string }) {
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = range > 0 ? ((max - value) / range) * 100 : 50;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg
      className={`w-full h-8 ${className}`}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function CostSidebar({ sessionId, className = '' }: CostSidebarProps) {
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch session stats with real-time updates
  useEffect(() => {
    if (!sessionId) return;

    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/v2/sessions/${sessionId}/stats`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        setStats(data);
        setError(null);
      } catch (err: any) {
        console.error('Failed to fetch session stats:', err);
        setError(err.message || 'Failed to load session statistics');
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchStats();

    // Poll for updates every 5 seconds
    const interval = setInterval(fetchStats, 5000);

    return () => clearInterval(interval);
  }, [sessionId]);

  // Process cost history for sparkline
  const costTrend = useMemo(() => {
    if (!stats?.costHistory) return [];
    return stats.costHistory.map(entry => entry.cost);
  }, [stats?.costHistory]);

  const savingsPercentage = useMemo(() => {
    if (!stats || stats.spent === 0) return 0;
    return ((stats.saved / (stats.spent + stats.saved)) * 100);
  }, [stats]);

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="space-y-4">
          <div className="h-4 bg-neutral-200 rounded animate-pulse"></div>
          <div className="space-y-2">
            <div className="h-8 bg-neutral-200 rounded animate-pulse"></div>
            <div className="h-6 bg-neutral-200 rounded animate-pulse w-3/4"></div>
          </div>
          <div className="space-y-2">
            <div className="h-8 bg-neutral-200 rounded animate-pulse"></div>
            <div className="h-6 bg-neutral-200 rounded animate-pulse w-1/2"></div>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-6 border-red-200 ${className}`}>
        <div className="text-center">
          <div className="text-red-600 font-medium mb-2">Cost Tracking Error</div>
          <div className="text-sm text-neutral-600">{error}</div>
        </div>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center text-neutral-500">
          No session data available
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-neutral-900">Session Costs</h3>
        <Badge variant="default" className="text-xs">
          Live
        </Badge>
      </div>

      {/* Balance */}
      <div>
        <div className="text-sm font-medium text-neutral-600 mb-1">
          Remaining Balance
        </div>
        <div className="text-2xl font-black text-green-600">
          ${stats.balance.toFixed(2)}
        </div>
      </div>

      {/* Total Spent */}
      <div>
        <div className="text-sm font-medium text-neutral-600 mb-1">
          Total Spent
        </div>
        <div className="text-2xl font-black text-neutral-900">
          ${stats.spent.toFixed(4)}
        </div>
        <div className="text-xs text-neutral-500 mt-1">
          {stats.requestCount} requests
        </div>
      </div>

      {/* Savings */}
      <div>
        <div className="text-sm font-medium text-neutral-600 mb-1">
          Saved vs Direct
        </div>
        <div className="text-xl font-black text-blue-600">
          ${stats.saved.toFixed(2)}
        </div>
        <div className="text-xs text-neutral-500 mt-1">
          {savingsPercentage.toFixed(0)}% optimization
        </div>
      </div>

      {/* Cost Trend Sparkline */}
      {costTrend.length > 1 && (
        <div>
          <div className="text-sm font-medium text-neutral-600 mb-2">
            Cost Trend
          </div>
          <div className="bg-neutral-50 border border-neutral-200 rounded p-3">
            <MiniSparkline
              data={costTrend}
              className="text-primary"
            />
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            Last {Math.min(costTrend.length, 10)} requests
          </div>
        </div>
      )}

      {/* Performance */}
      {stats.avgLatency > 0 && (
        <div>
          <div className="text-sm font-medium text-neutral-600 mb-1">
            Avg Latency
          </div>
          <div className="text-lg font-bold text-neutral-700">
            {stats.avgLatency.toFixed(0)}ms
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div className="pt-4 border-t border-neutral-200">
        <div className="text-xs text-neutral-500">
          Updated {new Date(stats.lastUpdated).toLocaleTimeString()}
        </div>
      </div>
    </Card>
  );
}