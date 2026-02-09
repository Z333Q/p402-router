/**
 * Payment Receipts API
 * Handles creation and retrieval of reusable payment receipts
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const CreateReceiptSchema = z.object({
  txHash: z.string().min(1, 'Transaction hash is required'),
  sessionId: z.string().min(1, 'Session ID is required'),
  amount: z.number().positive('Amount must be positive'),
  metadata: z.object({
    payer: z.string().optional(),
    network: z.string().default('base'),
    token: z.string().default('USDC')
  }).optional()
});

const GetReceiptSchema = z.object({
  receipt_id: z.string().min(1, 'Receipt ID is required')
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = CreateReceiptSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.format()
      }, { status: 400 });
    }

    const { txHash, sessionId, amount, metadata } = validation.data;

    // Generate unique receipt ID
    const receiptId = `rcpt_${crypto.randomUUID()}`;

    // Create receipt record
    const receipt = {
      id: receiptId,
      txHash,
      sessionId,
      amount,
      network: metadata?.network || 'base',
      token: metadata?.token || 'USDC',
      payer: metadata?.payer,
      createdAt: new Date().toISOString(),
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      used: false,
      usageCount: 0
    };

    // Store in database (using demo storage for now)
    console.log('Receipt created:', receipt);

    // Log receipt creation for demo
    await logReceiptCreation(receipt);

    return NextResponse.json({
      success: true,
      receiptId,
      validUntil: receipt.validUntil,
      amount: amount,
      network: receipt.network,
      token: receipt.token,
      message: 'Receipt created successfully'
    });

  } catch (error: any) {
    console.error('Receipt creation error:', error);
    return NextResponse.json({
      success: false,
      error: 'Receipt creation failed',
      details: error.message
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const receiptId = searchParams.get('receipt_id');

    if (!receiptId) {
      return NextResponse.json({
        success: false,
        error: 'Missing receipt_id parameter'
      }, { status: 400 });
    }

    // Retrieve receipt from storage
    const receipt = await getReceiptFromStorage(receiptId);

    if (!receipt) {
      return NextResponse.json({
        success: false,
        error: 'Receipt not found or expired'
      }, { status: 404 });
    }

    // Check if receipt is still valid
    if (new Date() > new Date(receipt.validUntil)) {
      return NextResponse.json({
        success: false,
        error: 'Receipt has expired'
      }, { status: 400 });
    }

    // Return receipt details (without sensitive info)
    return NextResponse.json({
      success: true,
      receipt: {
        id: receipt.id,
        amount: receipt.amount,
        network: receipt.network,
        token: receipt.token,
        createdAt: receipt.createdAt,
        validUntil: receipt.validUntil,
        usageCount: receipt.usageCount,
        txHash: receipt.txHash // Include for verification
      }
    });

  } catch (error: any) {
    console.error('Receipt retrieval error:', error);
    return NextResponse.json({
      success: false,
      error: 'Receipt retrieval failed',
      details: error.message
    }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { receipt_id, action } = body;

    if (!receipt_id || !action) {
      return NextResponse.json({
        success: false,
        error: 'Missing receipt_id or action'
      }, { status: 400 });
    }

    const receipt = await getReceiptFromStorage(receipt_id);

    if (!receipt) {
      return NextResponse.json({
        success: false,
        error: 'Receipt not found'
      }, { status: 404 });
    }

    switch (action) {
      case 'mark_used':
        // Mark receipt as used for a session
        receipt.used = true;
        receipt.usageCount += 1;
        await updateReceiptInStorage(receipt);

        return NextResponse.json({
          success: true,
          message: 'Receipt marked as used',
          usageCount: receipt.usageCount
        });

      case 'extend_validity':
        // Extend receipt validity (admin only)
        const authHeader = req.headers.get('Authorization');
        if (!isAuthorizedAdmin(authHeader)) {
          return NextResponse.json({
            success: false,
            error: 'Unauthorized'
          }, { status: 403 });
        }

        receipt.validUntil = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // Extend 48 hours
        await updateReceiptInStorage(receipt);

        return NextResponse.json({
          success: true,
          message: 'Receipt validity extended',
          validUntil: receipt.validUntil
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Receipt update error:', error);
    return NextResponse.json({
      success: false,
      error: 'Receipt update failed',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * Mock storage functions - in production, use proper database
 */
let receiptStorage: Map<string, any> = new Map();

async function logReceiptCreation(receipt: any): Promise<void> {
  // Store in mock storage
  receiptStorage.set(receipt.id, receipt);

  // In production, would store in database:
  // const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
  // await supabase.from('receipts').insert(receipt);

  console.log('Receipt stored:', receipt.id);
}

async function getReceiptFromStorage(receiptId: string): Promise<any> {
  // Get from mock storage
  return receiptStorage.get(receiptId);

  // In production:
  // const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
  // const { data, error } = await supabase
  //   .from('receipts')
  //   .select('*')
  //   .eq('id', receiptId)
  //   .single();
  // return data;
}

async function updateReceiptInStorage(receipt: any): Promise<void> {
  // Update mock storage
  receiptStorage.set(receipt.id, receipt);

  // In production:
  // const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
  // await supabase
  //   .from('receipts')
  //   .update(receipt)
  //   .eq('id', receipt.id);
}

function isAuthorizedAdmin(authHeader: string | null): boolean {
  if (!authHeader) return false;
  const token = authHeader.replace('Bearer ', '');
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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}