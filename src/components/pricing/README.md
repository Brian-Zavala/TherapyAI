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

## Pricing Tiers

| Tier | Price | Sessions | Minutes/Session | Total Minutes |
|------|-------|----------|-----------------|---------------|
| **Free** | $0 | 3/month | 15 min | 45 min |
| **Pro** | $5/mo or $48/yr | Unlimited | 30 min | Unlimited |

## Responsive Design Features

✅ **Mobile-First**: Uses responsive text sizing (`text-sm sm:text-base lg:text-lg`)
✅ **Glassmorphism**: `bg-white/10 backdrop-blur-lg border border-white/20 shadow-xl`
✅ **Flexible Grid**: `grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto`
✅ **Progressive Spacing**: `gap-4 sm:gap-6`
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