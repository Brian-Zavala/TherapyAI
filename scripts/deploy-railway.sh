#!/bin/bash

# Railway Deployment Script with Bunny CDN Preparation
# Usage: ./scripts/deploy-railway.sh [environment]

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
DEPLOY_BRANCH="main"

echo -e "${BLUE}🚀 Railway Deployment Script${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo ""

# Function to check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}📋 Checking prerequisites...${NC}"
    
    # Check if Railway CLI is installed
    if ! command -v railway &> /dev/null; then
        echo -e "${RED}❌ Railway CLI not installed${NC}"
        echo "Install with: npm install -g @railway/cli"
        exit 1
    fi
    
    # Check if logged in to Railway
    if ! railway whoami &> /dev/null; then
        echo -e "${RED}❌ Not logged in to Railway${NC}"
        echo "Login with: railway login"
        exit 1
    fi
    
    # Check if on correct branch
    CURRENT_BRANCH=$(git branch --show-current)
    if [ "$CURRENT_BRANCH" != "$DEPLOY_BRANCH" ]; then
        echo -e "${YELLOW}⚠️  Not on ${DEPLOY_BRANCH} branch (current: ${CURRENT_BRANCH})${NC}"
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

# Function to run tests
run_tests() {
    echo -e "${YELLOW}🧪 Running tests...${NC}"
    
    # Type checking
    echo "Running type check..."
    npm run typecheck || {
        echo -e "${RED}❌ Type check failed${NC}"
        exit 1
    }
    
    # Linting
    echo "Running lint..."
    npm run lint || {
        echo -e "${RED}❌ Linting failed${NC}"
        exit 1
    }
    
    # Build test
    echo "Running build test..."
    npm run build || {
        echo -e "${RED}❌ Build failed${NC}"
        exit 1
    }
    
    echo -e "${GREEN}✅ All tests passed${NC}"
}

# Function to check environment variables
check_env_vars() {
    echo -e "${YELLOW}🔐 Checking environment variables...${NC}"
    
    REQUIRED_VARS=(
        "DATABASE_URL"
        "NEXTAUTH_SECRET"
        "VAPI_API_KEY"
        "STRIPE_SECRET_KEY"
        "RESEND_API_KEY"
        "UPSTASH_REDIS_REST_URL"
    )
    
    MISSING_VARS=()
    
    for VAR in "${REQUIRED_VARS[@]}"; do
        if ! railway variables get "$VAR" &> /dev/null; then
            MISSING_VARS+=("$VAR")
        fi
    done
    
    if [ ${#MISSING_VARS[@]} -gt 0 ]; then
        echo -e "${RED}❌ Missing environment variables:${NC}"
        printf '%s\n' "${MISSING_VARS[@]}"
        echo -e "${YELLOW}Add them with: railway variables set VAR=value${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All required environment variables set${NC}"
}

# Function to prepare CDN assets (for later)
prepare_cdn_assets() {
    echo -e "${YELLOW}📦 Preparing assets for CDN...${NC}"
    
    # Create CDN manifest
    cat > cdn-manifest.json << EOF
{
  "version": "1.0.0",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "bunnyConfig": {
    "enabled": false,
    "pullZone": "",
    "storageZone": "",
    "cdnUrl": ""
  },
  "assets": {
    "static": "/.next/static",
    "public": "/public",
    "images": "/public/images",
    "fonts": "/public/fonts"
  }
}
EOF
    
    echo -e "${GREEN}✅ CDN manifest created (configure Bunny CDN later)${NC}"
}

# Function to deploy to Railway
deploy_to_railway() {
    echo -e "${YELLOW}🚂 Deploying to Railway...${NC}"
    
    # Set deployment environment
    railway environment "$ENVIRONMENT"
    
    # Deploy
    railway up --detach || {
        echo -e "${RED}❌ Deployment failed${NC}"
        exit 1
    }
    
    echo -e "${GREEN}✅ Deployment initiated${NC}"
}

# Function to wait for deployment
wait_for_deployment() {
    echo -e "${YELLOW}⏳ Waiting for deployment to complete...${NC}"
    
    # Get deployment URL
    DEPLOYMENT_URL=$(railway status --json | jq -r '.url')
    
    if [ -z "$DEPLOYMENT_URL" ]; then
        echo -e "${YELLOW}⚠️  Could not get deployment URL${NC}"
        return
    fi
    
    # Wait for health check
    MAX_ATTEMPTS=30
    ATTEMPT=0
    
    while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
        if curl -s -o /dev/null -w "%{http_code}" "$DEPLOYMENT_URL/api/health" | grep -q "200"; then
            echo -e "${GREEN}✅ Deployment is healthy${NC}"
            echo -e "${GREEN}🎉 Deployment URL: $DEPLOYMENT_URL${NC}"
            return
        fi
        
        ATTEMPT=$((ATTEMPT + 1))
        echo -n "."
        sleep 10
    done
    
    echo -e "${RED}❌ Health check timed out${NC}"
}

# Function to show post-deployment steps
show_post_deployment() {
    echo ""
    echo -e "${BLUE}📋 Post-Deployment Steps:${NC}"
    echo ""
    echo "1. Configure Bunny CDN:"
    echo "   - Create pull zone at bunny.net"
    echo "   - Set origin URL to your Railway URL"
    echo "   - Update BUNNY_CDN_URL in Railway variables"
    echo "   - Set CDN_ENABLED=true"
    echo ""
    echo "2. Update DNS records:"
    echo "   - Point your domain to Railway"
    echo "   - Update NEXTAUTH_URL"
    echo ""
    echo "3. Configure Stripe webhook:"
    echo "   - Add Railway URL to Stripe dashboard"
    echo "   - Update STRIPE_WEBHOOK_SECRET"
    echo ""
    echo "4. Test critical flows:"
    echo "   - Authentication"
    echo "   - VAPI sessions"
    echo "   - Payment processing"
    echo ""
    echo -e "${GREEN}🎉 Deployment complete!${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}Starting deployment process...${NC}"
    echo ""
    
    check_prerequisites
    run_tests
    check_env_vars
    prepare_cdn_assets
    deploy_to_railway
    wait_for_deployment
    show_post_deployment
}

# Run main function
main