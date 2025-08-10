#!/bin/bash

# Railway Production Deployment Script
# Next.js 15 Therapy Platform with Bunny CDN

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Railway Production Deployment${NC}"
echo -e "${BLUE}Next.js 15 Therapy Platform${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}📋 Checking Prerequisites...${NC}"

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI not found${NC}"
    echo "Install Railway CLI:"
    echo "npm install -g @railway/cli"
    echo "Or: curl -fsSL https://railway.app/install.sh | sh"
    exit 1
else
    echo -e "${GREEN}✅ Railway CLI installed${NC}"
fi

# Check if logged in to Railway
if ! railway status &> /dev/null; then
    echo -e "${YELLOW}🔑 Not logged in to Railway${NC}"
    echo "Please login first:"
    echo "railway login"
    exit 1
else
    echo -e "${GREEN}✅ Logged in to Railway${NC}"
fi

# Check git status
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}⚠️  Uncommitted changes detected${NC}"
    read -p "Commit and push changes first? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add .
        read -p "Enter commit message: " commit_msg
        git commit -m "$commit_msg"
        git push origin main
        echo -e "${GREEN}✅ Changes committed and pushed${NC}"
    else
        echo -e "${YELLOW}⚠️  Deploying with uncommitted changes${NC}"
    fi
else
    echo -e "${GREEN}✅ Git working directory clean${NC}"
fi

echo ""
echo -e "${BLUE}🔧 Pre-deployment Setup${NC}"

# Run type checking
echo -e "${YELLOW}🔍 Running TypeScript check...${NC}"
if npm run typecheck; then
    echo -e "${GREEN}✅ TypeScript check passed${NC}"
else
    echo -e "${RED}❌ TypeScript errors found${NC}"
    read -p "Continue deployment anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Run linting
echo -e "${YELLOW}🧹 Running ESLint...${NC}"
if npm run lint; then
    echo -e "${GREEN}✅ Linting passed${NC}"
else
    echo -e "${YELLOW}⚠️  Linting issues found${NC}"
fi

# Test build locally
echo -e "${YELLOW}🏗️  Testing local build...${NC}"
if npm run build; then
    echo -e "${GREEN}✅ Local build successful${NC}"
else
    echo -e "${RED}❌ Local build failed${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🚂 Railway Deployment${NC}"

# Deploy to Railway
echo -e "${YELLOW}📤 Deploying to Railway...${NC}"
railway deploy

echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"

# Get deployment URL
echo -e "${YELLOW}🔗 Getting deployment URL...${NC}"
RAILWAY_URL=$(railway domain || echo "No custom domain configured")

echo ""
echo -e "${BLUE}📋 Deployment Summary${NC}"
echo -e "Platform: ${GREEN}Railway${NC}"
echo -e "Environment: ${GREEN}Production${NC}"
echo -e "URL: ${GREEN}$RAILWAY_URL${NC}"
echo ""

echo -e "${BLUE}✅ Post-Deployment Checklist:${NC}"
echo "1. Verify health endpoint: $RAILWAY_URL/api/health"
echo "2. Test user authentication flow"
echo "3. Verify VAPI voice sessions work"
echo "4. Check Stripe payment processing"
echo "5. Test email notifications"
echo "6. Monitor performance metrics"
echo "7. Configure Bunny CDN (see setup guide below)"
echo ""

echo -e "${PURPLE}📚 Bunny CDN Setup Guide:${NC}"
echo ""
echo -e "${BLUE}1. Create Storage Zone:${NC}"
echo "   - Go to https://dash.bunny.net"
echo "   - Navigate to Storage → Add Storage Zone"
echo "   - Name: therapy-storage-prod"
echo "   - Region: New York (closest to Railway US-East)"
echo ""
echo -e "${BLUE}2. Create Pull Zone:${NC}"
echo "   - Navigate to CDN → Add Pull Zone"
echo "   - Name: therapy-cdn-prod"
echo "   - Origin URL: $RAILWAY_URL"
echo "   - Origin Type: Custom URL"
echo ""
echo -e "${BLUE}3. Configure Caching Rules:${NC}"
echo "   - Static Assets: /_next/static/* → Cache 1 year"
echo "   - Images: /images/* → Cache 1 month"
echo "   - API Routes: /api/* → No cache"
echo ""
echo -e "${BLUE}4. Enable Bunny Optimizer (Optional):${NC}"
echo "   - Image optimization with WebP conversion"
echo "   - CSS/JS minification"
echo "   - Smart image resizing"
echo ""
echo -e "${BLUE}5. Update Railway Environment Variables:${NC}"
echo "   - CDN_ENABLED=true"
echo "   - BUNNY_CDN_URL=https://your-pullzone.b-cdn.net"
echo "   - BUNNY_API_KEY=your-api-key"
echo "   - BUNNY_PULL_ZONE_ID=your-pull-zone-id"
echo "   - BUNNY_OPTIMIZER_ENABLED=true (if using optimizer)"
echo ""

echo -e "${BLUE}6. Test CDN Integration:${NC}"
echo "   - Verify assets load from CDN URLs"
echo "   - Check image optimization is working"
echo "   - Test cache purging functionality"
echo ""

echo -e "${GREEN}🚀 Your therapy platform is now live on Railway!${NC}"
echo -e "${YELLOW}📊 Monitor your deployment:${NC}"
echo "   - Railway Dashboard: https://railway.app/dashboard"
echo "   - Health Check: $RAILWAY_URL/api/health"
echo "   - Logs: railway logs --follow"
echo ""
echo -e "${BLUE}💡 Performance Tips:${NC}"
echo "   - Set up Bunny CDN for 95%+ cache hit ratio"
echo "   - Monitor response times with Sentry"
echo "   - Use Railway metrics for scaling decisions"
echo "   - Enable Redis for better session management"
echo ""