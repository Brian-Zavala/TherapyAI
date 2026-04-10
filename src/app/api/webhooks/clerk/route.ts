import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { prisma } from '@/lib/prisma-optimized'
import { creditManager } from '@/lib/services/credit-manager.service'

// Clerk webhook events
interface ClerkWebhookEvent {
  type: string
  data: {
    id: string
    email_addresses: { email_address: string; id: string }[]
    first_name: string | null
    last_name: string | null
    image_url: string | null
    created_at: number
    deleted?: boolean
  }
}

export async function POST(request: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    console.error('[Clerk Webhook] CLERK_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  // Get the headers
  const svix_id = request.headers.get('svix-id')
  const svix_timestamp = request.headers.get('svix-timestamp')
  const svix_signature = request.headers.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
  }

  const body = await request.text()

  // Verify the webhook
  const wh = new Webhook(WEBHOOK_SECRET)
  let event: ClerkWebhookEvent

  try {
    event = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as ClerkWebhookEvent
  } catch (err) {
    console.error('[Clerk Webhook] Verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const { type, data } = event

  switch (type) {
    case 'user.created': {
      const email = data.email_addresses[0]?.email_address
      if (!email) break

      const name = [data.first_name, data.last_name].filter(Boolean).join(' ') || email.split('@')[0]

      try {
        // Check if user already exists (may have been created via getAuthSession)
        const existing = await prisma.user.findFirst({
          where: { OR: [{ clerkId: data.id }, { email }] }
        })

        if (!existing) {
          const user = await prisma.user.create({
            data: {
              email,
              name,
              clerkId: data.id,
              image: data.image_url,
              emailVerified: new Date(),
            }
          })

          // Initialize free tier credits
          const billingStart = new Date()
          const billingEnd = new Date()
          billingEnd.setMonth(billingEnd.getMonth() + 1)

          await creditManager.initializeBillingPeriod(user.id, 'free', billingStart, billingEnd)
          console.log(`[Clerk Webhook] Created user ${user.email} with free tier credits`)
        } else if (!existing.clerkId) {
          // Link existing user to Clerk
          await prisma.user.update({
            where: { id: existing.id },
            data: { clerkId: data.id }
          })
          console.log(`[Clerk Webhook] Linked existing user ${email} to Clerk`)
        }
      } catch (error) {
        console.error('[Clerk Webhook] Error creating user:', error)
      }
      break
    }

    case 'user.updated': {
      const email = data.email_addresses[0]?.email_address
      if (!email) break

      try {
        const user = await prisma.user.findFirst({
          where: { clerkId: data.id }
        })

        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              name: [data.first_name, data.last_name].filter(Boolean).join(' ') || user.name,
              image: data.image_url || user.image,
              email,
            }
          })
        }
      } catch (error) {
        console.error('[Clerk Webhook] Error updating user:', error)
      }
      break
    }

    case 'user.deleted': {
      try {
        const user = await prisma.user.findFirst({
          where: { clerkId: data.id }
        })

        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              isDeleted: true,
              deletedAt: new Date(),
              deletionReason: 'Account deleted via Clerk',
            }
          })
        }
      } catch (error) {
        console.error('[Clerk Webhook] Error deleting user:', error)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
