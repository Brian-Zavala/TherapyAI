# Pricing Components

Comprehensive pricing component system with subscription status integration.

## Components

### PricingCards.tsx
- **Features**: Real-time subscription status, responsive design, glassmorphism effects
- **Authentication**: Shows different states for authenticated vs non-authenticated users
- **Subscription Integration**: Fetches current tier via React Query from `/api/user/subscription`
- **CTAs**: Dynamic buttons (Current Plan, Upgrade, Downgrade, Sign Up)

## API Integration

### `/api/user/subscription`
- **Purpose**: Fetch user's current subscription tier and all available tiers
- **Response**: Current tier info + all tier definitions based on PRICING-STRATEGY-ANALYSIS.md
- **Authentication**: Requires valid session

## Pricing Tiers (from PRICING-STRATEGY-ANALYSIS.md)

| Tier | Price | Sessions | Minutes/Session | Total Minutes |
|------|-------|----------|-----------------|---------------|
| **Free** | $0 | 3/month | 15 min | 45 min |
| **Essential** | $12.99 | 8/month | 20 min | 160 min |
| **Growth** | $24.99 | 16/month | 25 min | 400 min |
| **Unlimited** | $44.99 | 40/month | 30 min | 1200 min |

## Responsive Design Features

✅ **Mobile-First**: Uses responsive text sizing (`text-sm sm:text-base lg:text-lg`)
✅ **Glassmorphism**: `bg-white/10 backdrop-blur-lg border border-white/20 shadow-xl`
✅ **Flexible Grid**: `grid-cols-1 md:grid-cols-2 xl:grid-cols-4`
✅ **Progressive Spacing**: `gap-4 sm:gap-5 md:gap-6 lg:gap-8 xl:gap-10`
✅ **Max-Width Control**: `max-w-7xl xl:max-w-[1440px] 2xl:max-w-[1920px]`
✅ **Touch Targets**: Minimum 44px button heights
✅ **Text Centering**: All card content centered for consistency

## Usage

```tsx
import PricingCards from '@/components/pricing/PricingCards'

// In PlansSection or any other component
<PricingCards />
```

## Features

- **Loading States**: Skeleton components while fetching data
- **Error Boundaries**: Graceful error handling
- **Authentication States**: Different display for logged in vs guest users
- **Real-time Updates**: React Query with 5-minute stale time
- **Visual Hierarchy**: Current plan highlighted with purple theme
- **Accessibility**: Proper ARIA labels and keyboard navigation