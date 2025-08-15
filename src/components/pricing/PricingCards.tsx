'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'

interface SubscriptionTier {
  name: string
  slug: string
  price: number
  sessionsPerMonth: number
  minutesPerSession: number
  totalMinutes: number
  features: string[]
}

interface SubscriptionData {
  currentTier: SubscriptionTier & {
    isActive: boolean
    hasSubscription: boolean
  }
  allTiers: {
    free: SubscriptionTier
    essential: SubscriptionTier
    growth: SubscriptionTier
    unlimited: SubscriptionTier
  }
}

// Loading skeleton component
const PricingCardSkeleton = () => (
  <Card className="h-full bg-white/10 backdrop-blur-lg border border-white/20 shadow-xl animate-pulse">
    <CardHeader>
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 bg-white/20 rounded w-20"></div>
        <div className="h-5 bg-white/20 rounded w-16"></div>
      </div>
      <div className="mb-4">
        <div className="h-8 bg-white/20 rounded w-16 mb-1"></div>
        <div className="h-4 bg-white/20 rounded w-12"></div>
      </div>
      <div className="h-4 bg-white/20 rounded w-full"></div>
    </CardHeader>
    <CardContent>
      <div className="space-y-3 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-start">
            <div className="h-4 w-4 bg-white/20 rounded mr-2 mt-0.5"></div>
            <div className="h-4 bg-white/20 rounded flex-1"></div>
          </div>
        ))}
      </div>
      <div className="h-10 bg-white/20 rounded w-full"></div>
    </CardContent>
  </Card>
)

async function fetchSubscriptionData(): Promise<SubscriptionData> {
  const response = await fetch('/api/user/subscription')
  if (!response.ok) {
    throw new Error('Failed to fetch subscription data')
  }
  return response.json()
}

export default function PricingCards() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  
  const { data: subscriptionData, isLoading, error } = useQuery({
    queryKey: ['subscription-data'],
    queryFn: fetchSubscriptionData,
    enabled: isAuthenticated, // Only fetch when user is authenticated
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  // Show loading state
  if (authLoading || (isAuthenticated && isLoading)) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 md:gap-6 lg:gap-8 xl:gap-10 max-w-7xl xl:max-w-[1440px] 2xl:max-w-[1920px] mx-auto">
        {[1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          >
            <PricingCardSkeleton />
          </motion.div>
        ))}
      </div>
    )
  }

  // Define tiers in display order
  const tiers = [
    { key: 'free', data: subscriptionData?.allTiers.free, badge: null, recommended: false },
    { key: 'essential', data: subscriptionData?.allTiers.essential, badge: 'Volume Driver', recommended: true },
    { key: 'growth', data: subscriptionData?.allTiers.growth, badge: 'Most Popular', recommended: false },
    { key: 'unlimited', data: subscriptionData?.allTiers.unlimited, badge: 'Premium', recommended: false },
  ]

  // Default tiers for non-authenticated users (from PRICING-STRATEGY-ANALYSIS.md)
  const defaultTiers = [
    {
      key: 'free',
      data: {
        name: 'Free',
        slug: 'free',
        price: 0,
        sessionsPerMonth: 3,
        minutesPerSession: 15,
        totalMinutes: 45,
        features: [
          'Full analytics dashboard',
          'Basic mood tracking',
          'Crisis detection & support', 
          'Email summaries'
        ]
      },
      badge: null,
      recommended: false
    },
    {
      key: 'essential',
      data: {
        name: 'Essential',
        slug: 'essential', 
        price: 12.99,
        sessionsPerMonth: 8,
        minutesPerSession: 20,
        totalMinutes: 160,
        features: [
          '8 therapy sessions per month',
          '20 minutes per session',
          'Advanced analytics dashboard',
          'Progress tracking',
          'Email & SMS notifications',
          'Session recordings'
        ]
      },
      badge: 'Volume Driver',
      recommended: true
    },
    {
      key: 'growth', 
      data: {
        name: 'Growth',
        slug: 'growth',
        price: 24.99,
        sessionsPerMonth: 16,
        minutesPerSession: 25,
        totalMinutes: 400,
        features: [
          '16 therapy sessions per month',
          '25 minutes per session', 
          'All Essential features',
          'Advanced CBT modules',
          'Priority support',
          'Session transcripts',
          'Custom therapy plans'
        ]
      },
      badge: 'Most Popular',
      recommended: false
    },
    {
      key: 'unlimited',
      data: {
        name: 'Unlimited',
        slug: 'unlimited',
        price: 44.99,
        sessionsPerMonth: 40,
        minutesPerSession: 30,
        totalMinutes: 1200,
        features: [
          '40 therapy sessions per month',
          '30 minutes per session',
          'All Growth features',
          'Priority queue (no waiting)',
          'Voice customization', 
          'Downloadable transcripts',
          'Partner/family sub-accounts (2)',
          'Dedicated support'
        ]
      },
      badge: 'Premium',
      recommended: false
    }
  ]

  const currentTier = subscriptionData?.currentTier?.slug || 'free'
  const displayTiers = isAuthenticated ? tiers : defaultTiers

  // Helper function to get CTA text and variant
  const getCTAConfig = (tierSlug: string, isCurrentTier: boolean) => {
    if (!isAuthenticated) {
      return {
        text: tierSlug === 'free' ? 'Get Started Free' : 'Sign Up',
        variant: tierSlug === 'free' ? 'outline' : 'default',
        href: '/auth/signup'
      }
    }

    if (isCurrentTier) {
      return {
        text: 'Current Plan',
        variant: 'outline',
        href: '/dashboard/billing',
        disabled: true
      }
    }

    if (tierSlug === 'free') {
      return {
        text: 'Free',
        variant: 'outline', 
        href: '/dashboard/billing',
        disabled: true
      }
    }

    // Determine if upgrade or downgrade
    const tierOrder = ['free', 'essential', 'growth', 'unlimited']
    const currentIndex = tierOrder.indexOf(currentTier)
    const targetIndex = tierOrder.indexOf(tierSlug)

    if (targetIndex > currentIndex) {
      return {
        text: 'Upgrade',
        variant: 'default',
        href: `/dashboard/billing?upgrade=${tierSlug}`
      }
    } else {
      return {
        text: 'Downgrade', 
        variant: 'outline',
        href: `/dashboard/billing?downgrade=${tierSlug}`
      }
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 md:gap-6 lg:gap-8 xl:gap-10 max-w-7xl xl:max-w-[1440px] 2xl:max-w-[1920px] mx-auto">
      {displayTiers.map((tier, index) => {
        if (!tier.data) return null

        const isCurrentTier = isAuthenticated && tier.key === currentTier
        const ctaConfig = getCTAConfig(tier.key, isCurrentTier)

        return (
          <motion.div
            key={tier.key}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            viewport={{ once: true }}
            className="h-full"
          >
            <Card className={`h-full bg-white/10 backdrop-blur-lg border shadow-xl hover:bg-white/15 hover:border-white/30 transition-all duration-300 ${
              isCurrentTier 
                ? 'border-purple-400/60 bg-purple-500/20' 
                : tier.recommended 
                  ? 'border-purple-500/40' 
                  : 'border-white/20'
            }`}>
              <CardHeader className="text-center">
                <div className="flex items-center justify-center mb-4 sm:mb-6">
                  <CardTitle className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-white">
                    {tier.data.name}
                  </CardTitle>
                  {(tier.badge || isCurrentTier) && (
                    <Badge 
                      variant="default" 
                      className={`ml-2 sm:ml-3 text-xs sm:text-sm ${
                        isCurrentTier 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-purple-500 text-white'
                      }`}
                    >
                      {isCurrentTier ? 'Current' : tier.badge}
                    </Badge>
                  )}
                </div>
                
                <div className="mb-4 sm:mb-6 text-center">
                  <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-bold text-white">
                    {tier.data.price === 0 ? 'Free' : `$${tier.data.price}`}
                  </span>
                  {tier.data.price > 0 && (
                    <span className="text-sm sm:text-base text-gray-400">/month</span>
                  )}
                </div>
                
                <div className="text-center space-y-1 sm:space-y-2">
                  <p className="text-xs sm:text-sm lg:text-base text-purple-300 font-medium">
                    {tier.data.sessionsPerMonth} sessions/month
                  </p>
                  <p className="text-xs sm:text-sm lg:text-base text-gray-400">
                    {tier.data.minutesPerSession} min per session
                  </p>
                  <p className="text-xs sm:text-sm lg:text-base text-gray-500">
                    {tier.data.totalMinutes} total minutes
                  </p>
                </div>
              </CardHeader>
              
              <CardContent className="text-center">
                <ul className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
                  {tier.data.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start text-left">
                      <span className="text-purple-400 mr-2 mt-1 sm:mt-0 text-sm sm:text-base">✓</span>
                      <span className="text-sm sm:text-base lg:text-lg text-gray-300 flex-1 min-w-0">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                
                <Link href={ctaConfig.href} className="block">
                  <Button 
                    className="w-full px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base lg:text-lg font-medium rounded-lg sm:rounded-xl transition-all duration-300"
                    variant={ctaConfig.variant as any}
                    disabled={ctaConfig.disabled}
                  >
                    {ctaConfig.text}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}