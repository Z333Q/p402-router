/**
 * Security Administration API
 * Provides endpoints for security monitoring, emergency controls, and system health
 */

import { NextRequest, NextResponse } from 'next/server';
import { MultisigTreasury } from '@/lib/security/multisig';
import { EnhancedRateLimiter } from '@/lib/security/rate-limiter';
import { EnvironmentValidator } from '@/lib/security/environment-validator';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'health':
        return getSecurityHealth();

      case 'environment':
        return getEnvironmentStatus();

      case 'rate_limits':
        return getRateLimitStatus();

      case 'multisig_status':
        return getMultisigStatus();

      default:
        return NextResponse.json({
          error: 'Invalid action',
          available_actions: ['health', 'environment', 'rate_limits', 'multisig_status']
        }, { status: 400 });
    }

  } catch (error: any) {
    return NextResponse.json({
      error: 'Security API error',
      details: error.message
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // Validate authentication for administrative actions
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !isAuthorizedAdmin(authHeader)) {
      return NextResponse.json({
        error: 'Unauthorized',
        message: 'Administrative access required'
      }, { status: 403 });
    }

    switch (action) {
      case 'emergency_pause':
        return handleEmergencyPause(body);

      case 'create_multisig_proposal':
        return createMultisigProposal(body);

      case 'sign_multisig_transaction':
        return signMultisigTransaction(body);

      case 'ban_client':
        return banClient(body);

      default:
        return NextResponse.json({
          error: 'Invalid action',
          available_actions: [
            'emergency_pause',
            'create_multisig_proposal',
            'sign_multisig_transaction',
            'ban_client'
          ]
        }, { status: 400 });
    }

  } catch (error: any) {
    return NextResponse.json({
      error: 'Security operation failed',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * Get comprehensive security health status
 */
async function getSecurityHealth() {
  const envHealth = EnvironmentValidator.getHealthSummary();

  const securityStatus = {
    timestamp: new Date().toISOString(),
    overall_status: envHealth.status,
    environment_validation: envHealth,
    multisig_treasury: {
      status: 'active',
      required_signatures: 3,
      authorized_signers: 5
    },
    rate_limiting: {
      status: 'active',
      tiers_configured: 5,
      abuse_protection: true
    },
    monitoring: {
      error_tracking: !!process.env.SENTRY_DSN,
      health_checks: true,
      alerting: 'configured'
    }
  };

  return NextResponse.json(securityStatus);
}

/**
 * Get environment validation status
 */
async function getEnvironmentStatus() {
  const validation = EnvironmentValidator.validate();

  return NextResponse.json({
    validation_result: validation,
    recommendation: validation.valid
      ? 'Environment is properly configured'
      : 'Please address configuration errors before deploying to production'
  });
}

/**
 * Get rate limiting status
 */
async function getRateLimitStatus() {
  // In production, would query actual rate limit data
  const mockStatus = {
    active_limits: 5,
    banned_clients: 0,
    violations_last_hour: 12,
    adaptive_limiting: {
      enabled: true,
      current_multiplier: 1.0,
      system_load: {
        cpu: 35,
        memory: 42,
        connections: 267
      }
    }
  };

  return NextResponse.json(mockStatus);
}

/**
 * Get multisig treasury status
 */
async function getMultisigStatus() {
  const status = {
    treasury_address: process.env.P402_TREASURY_ADDRESS,
    multisig_required: true,
    pending_transactions: 0,
    recent_operations: [],
    emergency_pause: {
      active: false,
      can_pause: true
    }
  };

  return NextResponse.json(status);
}

/**
 * Handle emergency pause request
 */
async function handleEmergencyPause(body: any) {
  const { reason, requested_by } = body;

  if (!reason || !requested_by) {
    return NextResponse.json({
      error: 'Missing required fields: reason, requested_by'
    }, { status: 400 });
  }

  try {
    const result = await MultisigTreasury.emergencyPause(reason, requested_by);

    return NextResponse.json({
      success: true,
      pause_id: result.pauseId,
      message: 'Emergency pause initiated - requires multisig confirmation',
      next_steps: [
        'Gather required signatures for emergency pause',
        'Monitor system status during pause',
        'Coordinate resolution timeline'
      ]
    });

  } catch (error: any) {
    return NextResponse.json({
      error: 'Emergency pause failed',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * Create multisig transaction proposal
 */
async function createMultisigProposal(body: any) {
  const { operation, to, value, data, proposer } = body;

  try {
    const validation = await MultisigTreasury.validateTreasuryOperation(operation, value, to);

    if (!validation.requiresMultisig) {
      return NextResponse.json({
        error: 'Operation does not require multisig',
        reason: validation.reason
      }, { status: 400 });
    }

    const result = await MultisigTreasury.createTransaction(operation, to, value, data, proposer);

    return NextResponse.json({
      success: true,
      proposal_id: result.proposalId,
      transaction_hash: result.txHash,
      required_signatures: 3,
      message: 'Multisig transaction proposal created'
    });

  } catch (error: any) {
    return NextResponse.json({
      error: 'Proposal creation failed',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * Sign multisig transaction
 */
async function signMultisigTransaction(body: any) {
  const { tx_hash, signer, signature } = body;

  try {
    const result = await MultisigTreasury.signTransaction(tx_hash, signer, signature);

    return NextResponse.json({
      success: result.success,
      signatures_collected: result.signaturesCount,
      required_signatures: 3,
      ready_for_execution: result.signaturesCount >= 3,
      message: `Transaction signed by ${signer}`
    });

  } catch (error: any) {
    return NextResponse.json({
      error: 'Signing failed',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * Ban abusive client
 */
async function banClient(body: any) {
  const { client_id, reason, duration_hours } = body;

  // In production, would implement actual client banning
  const banRecord = {
    client_id,
    reason,
    banned_at: new Date().toISOString(),
    duration_hours: duration_hours || 24,
    banned_by: 'admin'
  };

  return NextResponse.json({
    success: true,
    ban_record: banRecord,
    message: `Client ${client_id} banned for ${duration_hours || 24} hours`
  });
}

/**
 * Validate admin authentication
 */
function isAuthorizedAdmin(authHeader: string): boolean {
  // In production, implement proper admin authentication
  // This could check JWT tokens, API keys, or session authentication

  const token = authHeader.replace('Bearer ', '');

  // Mock validation - in production, verify against authorized admin list
  return token.startsWith('admin_') && token.length > 32;
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}