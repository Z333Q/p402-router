#!/bin/bash

# P402 Router - Stripe Local Webhook Listener Helper
# This script forwards Stripe webhooks to your local development server.

# 1. Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null
then
    echo "❌ Stripe CLI not found."
    echo "Please install it first: brew install stripe/stripe-cli/stripe"
    exit 1
fi

# 2. Start listening and forward to the local API endpoint
echo "🚀 Starting Stripe Webhook listener..."
echo "🔗 Forwarding to: http://localhost:3000/api/v2/billing/webhook"
echo "------------------------------------------------"
echo "NOTE: Copy the 'webhook signing secret' from the output below"
echo "and set it as STRIPE_WEBHOOK_SECRET in your .env.local file."
echo "------------------------------------------------"

stripe listen --forward-to localhost:3000/api/v2/billing/webhook
