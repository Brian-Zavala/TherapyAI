#!/bin/bash

# Script to start Stripe webhook listener for local development

echo "🔔 Starting Stripe Webhook Listener..."
echo "====================================="
echo ""

# Check if the app is running
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "⚠️  WARNING: Your app doesn't appear to be running on localhost:3000"
    echo "   Please run 'npm run dev' in another terminal first!"
    echo ""
fi

# Get the correct port from NEXTAUTH_URL or default to 3000
PORT=$(grep NEXTAUTH_URL .env | cut -d':' -f3 | cut -d'/' -f1 || echo "3000")
if [ -z "$PORT" ]; then
    PORT="3000"
fi

echo "📡 Forwarding Stripe events to: http://localhost:${PORT}/api/stripe/webhook"
echo ""
echo "Test cards you can use:"
echo "  ✅ Success: 4242 4242 4242 4242"
echo "  ❌ Decline: 4000 0000 0000 0002"
echo "  🔒 3D Secure: 4000 0025 0000 3155"
echo ""
echo "To test:"
echo "  1. Open http://localhost:${PORT}/pricing"
echo "  2. Click any subscription plan"
echo "  3. Complete checkout with test card"
echo "  4. Watch webhook events appear below"
echo ""
echo "Press Ctrl+C to stop the listener"
echo "====================================="
echo ""

# Start the webhook listener
stripe listen --forward-to localhost:${PORT}/api/stripe/webhook \
  --events checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.payment_succeeded,invoice.payment_failed