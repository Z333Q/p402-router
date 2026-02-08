/**
 * Security Monitoring Hook
 * Provides real-time security status and monitoring capabilities for admin dashboards
 */

import { useState, useEffect } from 'react';

export interface SecurityStatus {
  overall_status: 'healthy' | 'warning' | 'error';
  environment_validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
  multisig_treasury: {
    status: string;
    required_signatures: number;
    authorized_signers: number;
    pending_transactions: number;
  };
  rate_limiting: {
    status: string;
    violations_last_hour: number;
    banned_clients: number;
    active_limits: number;
  };
  monitoring: {
    error_tracking: boolean;
    health_checks: boolean;
    alerting: string;
  };
}

export interface RateLimitStats {
  endpoint: string;
  requests: number;
  violations: number;
  banned_count: number;
  avg_response_time: number;
}

export function useSecurityMonitoring(refreshInterval: number = 30000) {
  const [status, setStatus] = useState<SecurityStatus | null>(null);
  const [rateLimitStats, setRateLimitStats] = useState<RateLimitStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSecurityStatus = async () => {
    try {
      const response = await fetch('/api/v1/admin/security?action=health');
      if (!response.ok) {
        throw new Error('Failed to fetch security status');
      }
      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Security status fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRateLimitStats = async () => {
    try {
      const response = await fetch('/api/v1/admin/security?action=rate_limits');
      if (!response.ok) return;

      const data = await response.json();

      // Mock rate limit stats - in production, this would come from the API
      const mockStats: RateLimitStats[] = [
        {
          endpoint: '/api/v1/router/verify',
          requests: 1250,
          violations: 23,
          banned_count: 0,
          avg_response_time: 45
        },
        {
          endpoint: '/api/v1/router/settle',
          requests: 89,
          violations: 2,
          banned_count: 0,
          avg_response_time: 1200
        },
        {
          endpoint: '/api/v1/sessions',
          requests: 445,
          violations: 5,
          banned_count: 1,
          avg_response_time: 120
        }
      ];

      setRateLimitStats(mockStats);
    } catch (err) {
      console.warn('Rate limit stats fetch failed:', err);
    }
  };

  useEffect(() => {
    fetchSecurityStatus();
    fetchRateLimitStats();

    const interval = setInterval(() => {
      fetchSecurityStatus();
      fetchRateLimitStats();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const initiateEmergencyPause = async (reason: string): Promise<{ success: boolean; pauseId?: string; error?: string }> => {
    try {
      const response = await fetch('/api/v1/admin/security', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAdminToken()}`
        },
        body: JSON.stringify({
          action: 'emergency_pause',
          reason,
          requested_by: 'admin_dashboard'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      return { success: true, pauseId: data.pause_id };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const banClient = async (clientId: string, reason: string, durationHours: number = 24): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/v1/admin/security', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAdminToken()}`
        },
        body: JSON.stringify({
          action: 'ban_client',
          client_id: clientId,
          reason,
          duration_hours: durationHours
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const createMultisigProposal = async (
    operation: string,
    to: string,
    value: string,
    data: string = '0x'
  ): Promise<{ success: boolean; proposalId?: string; txHash?: string; error?: string }> => {
    try {
      const response = await fetch('/api/v1/admin/security', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAdminToken()}`
        },
        body: JSON.stringify({
          action: 'create_multisig_proposal',
          operation,
          to,
          value,
          data,
          proposer: 'admin_dashboard'
        })
      });

      const responseData = await response.json();

      if (!response.ok) {
        return { success: false, error: responseData.error };
      }

      return {
        success: true,
        proposalId: responseData.proposal_id,
        txHash: responseData.transaction_hash
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return {
    status,
    rateLimitStats,
    isLoading,
    error,
    refresh: () => {
      fetchSecurityStatus();
      fetchRateLimitStats();
    },
    initiateEmergencyPause,
    banClient,
    createMultisigProposal
  };
}

/**
 * Get admin authentication token
 * In production, this would retrieve from secure session storage
 */
function getAdminToken(): string {
  // Mock admin token - in production, get from secure authentication
  return 'admin_demo_token_' + Math.random().toString(36).substring(2, 15);
}

/**
 * Security alerts hook for real-time notifications
 */
export function useSecurityAlerts() {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);

  interface SecurityAlert {
    id: string;
    type: 'error' | 'warning' | 'info';
    title: string;
    message: string;
    timestamp: Date;
    acknowledged: boolean;
  }

  const addAlert = (type: SecurityAlert['type'], title: string, message: string) => {
    const alert: SecurityAlert = {
      id: crypto.randomUUID(),
      type,
      title,
      message,
      timestamp: new Date(),
      acknowledged: false
    };

    setAlerts(prev => [alert, ...prev].slice(0, 50)); // Keep last 50 alerts
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
  };

  const clearAcknowledged = () => {
    setAlerts(prev => prev.filter(alert => !alert.acknowledged));
  };

  useEffect(() => {
    // Mock security alerts - in production, these would come from monitoring systems
    const mockAlerts = [
      {
        type: 'warning' as const,
        title: 'High Rate Limit Violations',
        message: '23 rate limit violations detected in the last hour on verification endpoint'
      },
      {
        type: 'info' as const,
        title: 'Environment Validation',
        message: 'Production environment validation completed successfully'
      }
    ];

    mockAlerts.forEach(alert => {
      addAlert(alert.type, alert.title, alert.message);
    });
  }, []);

  return {
    alerts,
    addAlert,
    acknowledgeAlert,
    clearAcknowledged,
    unacknowledgedCount: alerts.filter(a => !a.acknowledged).length
  };
}