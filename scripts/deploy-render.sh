#!/bin/bash

# Render Quick Deployment Script
# For immediate testing deployment

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Render Quick Deploy for Testing${NC}"
echo ""

# Check if git is clean
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}⚠️  You have uncommitted changes${NC}"
    read -p "Commit and push them first? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add .
        read -p "Enter commit message: " commit_msg
        git commit -m "$commit_msg"
        git push origin main
    else
        echo -e "${RED}Please commit your changes before deploying${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Repository is ready${NC}"
echo ""

echo -e "${BLUE}📋 Render Deployment Checklist:${NC}"
echo ""
echo "1. Go to https://dashboard.render.com"
echo "2. Click 'New +' → 'Web Service'"
echo "3. Connect your GitHub repo: Brian-Zavala/couple-therapy-website"
echo "4. Use these settings:"
echo "   - Name: couple-therapy-test"
echo "   - Environment: Node"
echo "   - Build Command: npm ci && npx prisma generate && npm run build"
echo "   - Start Command: npm start"
echo "   - Plan: Free (for testing)"
echo ""
echo "5. Add Environment Variables (click 'Advanced'):"
echo ""

# Generate environment variables for Render
echo -e "${YELLOW}Copy these environment variables to Render:${NC}"
echo ""
echo "# Core Configuration"
echo "NODE_ENV=production"
echo "NEXTAUTH_URL=https://couple-therapy-test.onrender.com"
echo "NEXTAUTH_SECRET=etp3FFB52jmqZvXZlkkXUU9sKOTmlWgiFdCx8NfXcAY"
echo ""
echo "# Database (Supabase)"
echo "DATABASE_URL=postgresql://postgres.pjmdlinrffawvhoktopd:KHKoNTkyMGjzyLa1@aws-0-us-east-1.pooler.supabase.com:5432/postgres?pgbouncer=true&connection_limit=20&pool_timeout=30"
echo "DIRECT_URL=postgresql://postgres:KHKoNTkyMGjzyLa1@db.pjmdlinrffawvhoktopd.supabase.co:5432/postgres"
echo ""
echo "# VAPI"
echo "VAPI_API_KEY=pk_2ffdcbf6-7b0b-4f5b-9d88-a1f2c0afcb7d"
echo "VAPI_PRIVATE_KEY=0a5768a2-ddc1-499a-9215-7ab32540da7c"
echo "VAPI_ORG_ID=d2e70152-de52-4ba7-9ae2-a4cb587d1b07"
echo ""
echo "# Stripe (Test Mode)"
echo "STRIPE_SECRET_KEY=sk_test_51RuRSMAc4d9YDJXZZBx3MxC0JyGXooK39DgkHqVbVYKEUxTcTIWYL9fiks6taMqDInElHvJIVoZDmP0qRLfSSneB00ENIn5jM1"
echo "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51RuRSMAc4d9YDJXZKs3H0sVXTvkUW4zL5gL8bIPsZnVrfke1MlKVv0l0oBJ0uFvI8hTZA9g73WJwoaoWbiQND2YT0002eWr6U2"
echo "STRIPE_WEBHOOK_SECRET=whsec_fa2a55b8edf6e2a167adfdcf6ef47c3e91c46befc438f70ad6c5704672f13ab4"
echo ""
echo "# Stripe Price IDs (Test)"
echo "STRIPE_PRICE_ESSENTIAL_MONTHLY=price_1RuRWNAc4d9YDJXZlgZSzXuY"
echo "STRIPE_PRICE_ESSENTIAL_ANNUAL=price_1RuRWNAc4d9YDJXZhJM2bxvp"
echo "STRIPE_PRICE_GROWTH_MONTHLY=price_1RuRWOAc4d9YDJXZQC1MCmFW"
echo "STRIPE_PRICE_GROWTH_ANNUAL=price_1RuRWOAc4d9YDJXZLzS6ggkT"
echo "STRIPE_PRICE_UNLIMITED_MONTHLY=price_1RuRWPAc4d9YDJXZxJ1MlNmb"
echo "STRIPE_PRICE_UNLIMITED_ANNUAL=price_1RuRWPAc4d9YDJXZXQAmj46j"
echo ""
echo "# Supabase"
echo "NEXT_PUBLIC_SUPABASE_URL=https://pjmdlinrffawvhoktopd.supabase.co"
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbWRsaW5yZmZhd3Zob2t0b3BkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5NjE1MDgsImV4cCI6MjA1ODUzNzUwOH0.NvoJ7KlWncmCmRGtcpvZ_6-AaFDVp30ACGUG_B-GLcs"
echo "SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbWRsaW5yZmZhd3Zob2t0b3BkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Mjk2MTUwOCwiZXhwIjoyMDU4NTM3NTA4fQ.Zq7BkROKuQXpeP6owh3_aGYeahvjOgl_KTnlwO7BwQ8"
echo ""
echo "# Email"
echo "RESEND_API_KEY=re_5oeCuuR2_Gof8Fvi86xoWGsVXnd2iYimS"
echo "EMAIL_FROM=support@therapyai.us"
echo ""
echo "# Redis"
echo "UPSTASH_REDIS_REST_URL=https://sharing-phoenix-13155.upstash.io"
echo "UPSTASH_REDIS_REST_TOKEN=ATNjAAIjcDE1NzVjODlhNTNiNDU0OTQ3YmUzNjVhZDE5Yjc0YTljOHAxMA"
echo ""
echo "# SMS"
echo "TWILIO_ACCOUNT_SID=AC9372ea60143b1a5b0e65702e3acbfde1"
echo "TWILIO_AUTH_TOKEN=7bc41aee2c35b8c3f55ec383b57b6fca"
echo "TWILIO_PHONE_NUMBER=+18772839213"
echo ""
echo "# Analytics"
echo "NEXT_PUBLIC_POSTHOG_KEY=phc_CoDF2F4naTdCfWbTTDOlPUeXfAUIDHoo74QWdGaadzL"
echo "NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com"
echo ""
echo "# Sentry"
echo "SENTRY_DSN=https://58df046f1a0d9aef3d127fcc60f1335b@o4509676065456128.ingest.us.sentry.io/4509676071813120"
echo "NEXT_PUBLIC_SENTRY_DSN=https://58df046f1a0d9aef3d127fcc60f1335b@o4509676065456128.ingest.us.sentry.io/4509676071813120"
echo ""
echo "# Security"
echo "PHI_MASTER_KEY=fa9c4b0ca772c8bc694a2c4a1969a16bdd6c334bcc985bf890c2804af13ccb8f9899c3851a67d5aa1f3a07763d6c66bc24ebdc9a1904ac9d0ee859f3833d99eb"
echo "SECURE_COOKIES=false"
echo "FORCE_HTTPS=false"
echo "CSP_ENABLED=true"
echo ""
echo "# Other required variables"
echo "DEEPGRAM_API_KEY=8925101577680a6e9255c2b7615dc7ffdad8ba97"
echo "GOOGLE_CLIENT_ID=921101912157-bgis37eem6h345nib2t6iacmnmvec9dn.apps.googleusercontent.com"
echo "GOOGLE_CLIENT_SECRET=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"
echo "CRON_SECRET=xNg1gjoP0AOyCIrtH0zogpMmiAaHbTc1pRsRJLoK6Wk="
echo "NEXT_PUBLIC_USE_INLINE_ASSISTANT=true"
echo "NEXT_PUBLIC_USE_WEBHOOK_TRANSCRIPTS=true"
echo ""
echo "# VAPI Assistant IDs"
echo "NEXT_PUBLIC_VAPI_COUPLE_ASSISTANT_ID=f6844388-f547-40af-994e-4edf076f7e9c"
echo "NEXT_PUBLIC_VAPI_INDIVIDUAL_ASSISTANT_ID=49d06215-674f-460f-b4d5-26cd40e8d23e"
echo "NEXT_PUBLIC_VAPI_FAMILY_ASSISTANT_ID=afedf0d0-8141-4f77-aab9-850d8e3276bd"
echo ""
echo "# VAPI Voice IDs"
echo "NEXT_PUBLIC_VAPI_MAYA_VOICE_ID=b5RPB35vTODb3BEmR3Fc"
echo "NEXT_PUBLIC_VAPI_ELLIOT_VOICE_ID=zSSB5ODlBiskDz2GIM5l"
echo "NEXT_PUBLIC_VAPI_JADA_VOICE_ID=oWAxZDx7w5VEj9dCyTzz"
echo ""
echo -e "${GREEN}✅ Environment variables ready to copy${NC}"
echo ""
echo -e "${YELLOW}6. Click 'Create Web Service'${NC}"
echo -e "${YELLOW}7. Wait for deployment (5-10 minutes)${NC}"
echo -e "${YELLOW}8. Your app will be live at: https://couple-therapy-test.onrender.com${NC}"
echo ""
echo -e "${BLUE}📝 Notes:${NC}"
echo "- Free tier sleeps after 15 minutes of inactivity"
echo "- First request after sleep takes 30+ seconds"
echo "- Upgrade to Starter ($7/month) for always-on"
echo ""
echo -e "${GREEN}🎉 Ready to deploy to Render!${NC}"