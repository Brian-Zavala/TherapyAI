import { NextRequest, NextResponse } from "next/server"
import { prisma } from '@/lib/prisma-optimized'
import { Resend } from "resend"
import { verifySignedToken } from "@/lib/security/tokens"
import { checkRateLimit } from "@/lib/security/rateLimiter"

export const dynamic = 'force-dynamic';

const resend = new Resend(process.env.RESEND_API_KEY)

// Helper function to create audit log entry
async function createAuditLog(
  userId: string,
  action: string,
  entityType: string,
  entityId?: string,
  oldValues?: any,
  newValues?: any,
  reason?: string,
  req?: NextRequest
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        oldValues: oldValues || null,
        newValues: newValues || null,
        changedFields: oldValues && newValues ? Object.keys(newValues) : [],
        ipAddress: req?.headers.get('x-forwarded-for')?.split(',')[0] || req?.headers.get('x-real-ip') || null,
        userAgent: req?.headers.get('user-agent') || null,
        reason,
        complianceFlags: action === 'ACCOUNT_RECOVERED' ? ['USER_REQUESTED', 'GDPR'] : []
      }
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
    // Don't fail the main operation if audit logging fails
  }
}

// POST endpoint to recover a deleted account
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting for account recovery
    const rateLimitResult = await checkRateLimit(request, "ACCOUNT_RECOVERY")
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: "Too many recovery attempts. Please try again later.", 
          code: "RATE_LIMITED",
          retryAfter: rateLimitResult.headers["Retry-After"]
        },
        { 
          status: 429,
          headers: rateLimitResult.headers
        }
      )
    }

    const { recoveryToken, confirmEmail } = await request.json()

    if (!recoveryToken || !confirmEmail) {
      return NextResponse.json({ 
        error: "Recovery token and email confirmation are required" 
      }, { status: 400 })
    }

    // Verify the signed recovery token
    const tokenPayload = verifySignedToken(recoveryToken)
    
    if (!tokenPayload || tokenPayload.type !== "account_recovery") {
      return NextResponse.json({ 
        error: "Invalid or expired recovery token",
        code: "INVALID_TOKEN"
      }, { status: 403 })
    }

    // Find the recovery record
    const recovery = await prisma.accountRecovery.findUnique({
      where: { recoveryToken }
    })

    if (!recovery) {
      return NextResponse.json({ 
        error: "Invalid or expired recovery token" 
      }, { status: 404 })
    }

    // Check if recovery has expired
    if (new Date() > recovery.expiresAt) {
      return NextResponse.json({ 
        error: "Recovery window has expired. Please contact support for assistance." 
      }, { status: 410 }) // Gone
    }

    // Check if already recovered
    if (recovery.isRecovered) {
      return NextResponse.json({ 
        error: "This account has already been recovered" 
      }, { status: 409 }) // Conflict
    }

    // Verify email matches
    if (confirmEmail !== recovery.email) {
      // Update attempt count
      await prisma.accountRecovery.update({
        where: { id: recovery.id },
        data: {
          attemptCount: recovery.attemptCount + 1,
          lastAttemptAt: new Date()
        }
      })

      return NextResponse.json({ 
        error: "Email confirmation does not match the account email" 
      }, { status: 400 })
    }

    // Check attempt limit (prevent brute force)
    if (recovery.attemptCount >= 5) {
      return NextResponse.json({ 
        error: "Too many recovery attempts. Please contact support." 
      }, { status: 429 }) // Too Many Requests
    }

    try {
      // Find the soft-deleted user
      const deletedUser = await prisma.user.findFirst({
        where: {
          id: recovery.userId,
          isDeleted: true
        },
        include: {
          profile: true,
          familyMembers: true
        }
      })

      if (!deletedUser) {
        return NextResponse.json({ 
          error: "User account not found or cannot be recovered" 
        }, { status: 404 })
      }

      console.log(`Starting account recovery for user ${deletedUser.id} (${recovery.email})`)

      // Restore the user account
      await prisma.$transaction(async (tx) => {
        // Restore user data from snapshot
        const userSnapshot = recovery.userSnapshot as any
        const profileSnapshot = recovery.profileSnapshot as any

        // Restore user
        await tx.user.update({
          where: { id: deletedUser.id },
          data: {
            email: recovery.email, // Restore original email
            name: userSnapshot.name,
            isDeleted: false,
            deletedAt: null,
            deletionReason: null,
            canRecover: false, // Prevent multiple recoveries
            onboardingCompleted: userSnapshot.onboardingCompleted || false,
            onboardingData: userSnapshot.onboardingData || null,
            hasSeenIntro: userSnapshot.hasSeenIntro || false,
            subscriptionStatus: userSnapshot.subscriptionStatus || 'free',
            subscriptionId: userSnapshot.subscriptionId || null
          }
        })

        // Restore profile if it existed
        if (profileSnapshot && deletedUser.profile) {
          await tx.userProfile.update({
            where: { userId: deletedUser.id },
            data: {
              pronouns: profileSnapshot.pronouns,
              partnerName: profileSnapshot.partnerName,
              emergencyContact: profileSnapshot.emergencyContact,
              phone: profileSnapshot.phone,
              additionalNotes: profileSnapshot.additionalNotes,
              age: profileSnapshot.age,
              sessionPreference: profileSnapshot.sessionPreference,
              communicationStyle: profileSnapshot.communicationStyle,
              notificationPrefs: profileSnapshot.notificationPrefs,
              relationshipStatus: profileSnapshot.relationshipStatus,
              // Keep currentConcerns as null since it was anonymized
              currentConcerns: null as any
            }
          })
        }

        // Restore family members (but keep them inactive for safety)
        await tx.familyMember.updateMany({
          where: { userId: deletedUser.id },
          data: {
            name: "[RECOVERED - PLEASE UPDATE]",
            isActive: false // User will need to re-activate and update
          }
        })

        // Mark recovery as completed
        await tx.accountRecovery.update({
          where: { id: recovery.id },
          data: {
            isRecovered: true,
            recoveredAt: new Date(),
            attemptCount: recovery.attemptCount + 1,
            lastAttemptAt: new Date()
          }
        })
      })

      // Create audit log
      await createAuditLog(
        deletedUser.id,
        'ACCOUNT_RECOVERED',
        'User',
        deletedUser.id,
        { isDeleted: true },
        { isDeleted: false },
        'User recovered deleted account within recovery window',
        request
      )

      // Send recovery confirmation email
      try {
        await resend.emails.send({
          from: "noreply@coupletherapy.app",
          to: recovery.email,
          subject: "Account Recovery Successful - Welcome Back!",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #059669;">🎉 Account Recovery Successful!</h2>
              <p>Hello ${(recovery.userSnapshot as any)?.name || 'User'},</p>
              <p>Great news! Your Couple Therapy account has been successfully recovered.</p>
              
              <div style="margin: 30px 0; padding: 20px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;">
                <h3 style="color: #059669; margin-top: 0;">✅ What's been restored:</h3>
                <ul style="margin: 0; padding-left: 20px;">
                  <li>Your account access and login credentials</li>
                  <li>Profile information and therapy preferences</li>
                  <li>Session history and progress data</li>
                  <li>Subscription status (if applicable)</li>
                </ul>
              </div>

              <div style="margin: 30px 0; padding: 20px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px;">
                <h3 style="color: #ea580c; margin-top: 0;">⚠️ Important Notes:</h3>
                <ul style="margin: 0; padding-left: 20px;">
                  <li>Family members have been marked as inactive for security</li>
                  <li>Please review and update your family member information</li>
                  <li>Some sensitive data may have been permanently anonymized</li>
                  <li>You may need to reschedule any cancelled sessions</li>
                </ul>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXTAUTH_URL}/auth/login" 
                   style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  🔐 Log In to Your Account
                </a>
              </div>

              <p><strong>Next steps:</strong></p>
              <ol>
                <li>Log in to your account using your original credentials</li>
                <li>Review and update your profile information</li>
                <li>Re-add family members if needed</li>
                <li>Contact support if you need to reschedule sessions</li>
              </ol>

              <p>We're glad to have you back! If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
              
              <p>Best regards,<br>The Couple Therapy Team</p>
            </div>
          `
        })
      } catch (emailError) {
        console.error("Failed to send recovery confirmation email:", emailError)
        // Don't fail the recovery if email fails
      }

      console.log(`Account recovery completed for user ${deletedUser.id}`)

      return NextResponse.json({ 
        message: "Account successfully recovered! You can now log in with your original credentials.",
        recovery: {
          email: recovery.email,
          recoveredAt: new Date().toISOString(),
          sessionCount: recovery.sessionCount,
          needsProfileUpdate: true,
          needsFamilyMemberUpdate: recovery.sessionCount > 0
        },
        redirectTo: "/auth/login"
      })

    } catch (dbError) {
      console.error("Database error during account recovery:", dbError)
      
      // Log the error
      try {
        await createAuditLog(
          recovery.userId,
          'ACCOUNT_RECOVERY_FAILED',
          'User',
          recovery.userId,
          null,
          { error: dbError instanceof Error ? dbError.message : 'Unknown error' },
          'Account recovery failed due to database error',
          request
        )
      } catch (auditError) {
        console.error("Failed to log recovery error:", auditError)
      }
      
      return NextResponse.json({ 
        error: "Failed to recover account. Please try again or contact support.",
        technical: process.env.NODE_ENV === 'development' ? dbError : undefined
      }, { status: 500 })
    }

  } catch (error) {
    console.error("Account recovery error:", error)
    return NextResponse.json({ 
      error: "Failed to process account recovery request" 
    }, { status: 500 })
  }
}

// GET endpoint to check recovery token validity and show recovery form
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ 
        error: "Recovery token is required" 
      }, { status: 400 })
    }

    // Find the recovery record
    const recovery = await prisma.accountRecovery.findUnique({
      where: { recoveryToken: token },
      select: {
        id: true,
        email: true,
        expiresAt: true,
        isRecovered: true,
        attemptCount: true,
        userSnapshot: true,
        sessionCount: true,
        createdAt: true
      }
    })

    if (!recovery) {
      return NextResponse.json({ 
        error: "Invalid recovery token",
        valid: false
      }, { status: 404 })
    }

    // Check if recovery has expired
    if (new Date() > recovery.expiresAt) {
      return NextResponse.json({ 
        error: "Recovery window has expired",
        valid: false,
        expiredAt: recovery.expiresAt.toISOString()
      }, { status: 410 })
    }

    // Check if already recovered
    if (recovery.isRecovered) {
      return NextResponse.json({ 
        error: "This account has already been recovered",
        valid: false,
        alreadyRecovered: true
      }, { status: 409 })
    }

    // Check attempt limit
    if (recovery.attemptCount >= 5) {
      return NextResponse.json({ 
        error: "Too many recovery attempts. Please contact support.",
        valid: false,
        attemptsExceeded: true
      }, { status: 429 })
    }

    const userSnapshot = recovery.userSnapshot as any
    const timeLeft = Math.max(0, recovery.expiresAt.getTime() - Date.now())
    const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24))

    return NextResponse.json({ 
      valid: true,
      recovery: {
        email: recovery.email,
        userName: userSnapshot?.name || 'User',
        sessionCount: recovery.sessionCount,
        expiresAt: recovery.expiresAt.toISOString(),
        daysLeft,
        attemptsLeft: 5 - recovery.attemptCount,
        deletedAt: recovery.createdAt.toISOString()
      }
    })

  } catch (error) {
    console.error("Recovery token validation error:", error)
    return NextResponse.json({ 
      error: "Failed to validate recovery token",
      valid: false
    }, { status: 500 })
  }
}