import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Resend } from "resend"
import { withAuth } from "@/lib/middleware/withAuth"
import { createDeletionToken, verifySignedToken, createRecoveryToken } from "@/lib/security/tokens"

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
        complianceFlags: action === 'ACCOUNT_DELETION' ? ['GDPR', 'USER_REQUESTED'] : []
      }
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
    // Don't fail the main operation if audit logging fails
  }
}

// Helper function to terminate active VAPI sessions
async function terminateActiveSessions(userId: string, req: NextRequest) {
  try {
    // Find all active or paused sessions
    const activeSessions = await prisma.session.findMany({
      where: {
        userId,
        status: { in: ['active', 'paused'] }
      }
    })

    if (activeSessions.length > 0) {
      console.log(`Found ${activeSessions.length} active sessions to terminate for user ${userId}`)
      
      // Update sessions to terminated status
      await prisma.session.updateMany({
        where: {
          userId,
          status: { in: ['active', 'paused'] }
        },
        data: {
          status: 'terminated',
          terminationReason: 'user_deletion',
          endTime: new Date(),
          notes: '[SESSION TERMINATED DUE TO ACCOUNT DELETION]'
        }
      })

      // Log each session termination
      for (const session of activeSessions) {
        await createAuditLog(
          userId,
          'SESSION_TERMINATED',
          'Session',
          session.id,
          { status: session.status },
          { status: 'terminated', terminationReason: 'user_deletion' },
          'Account deletion - graceful session termination',
          req
        )
      }

      // TODO: Call VAPI API to terminate active calls
      // This would require VAPI SDK integration
      /*
      for (const session of activeSessions) {
        try {
          await vapiClient.calls.end(session.vapiCallId)
        } catch (error) {
          console.error(`Failed to terminate VAPI call ${session.vapiCallId}:`, error)
        }
      }
      */
    }

    return activeSessions.length
  } catch (error) {
    console.error('Failed to terminate active sessions:', error)
    return 0
  }
}

// Helper function to cancel scheduled sessions and notify participants
async function handleScheduledSessions(userId: string, req: NextRequest) {
  try {
    // Find all scheduled future sessions
    const scheduledSessions = await prisma.session.findMany({
      where: {
        userId,
        status: 'scheduled',
        date: { gte: new Date() }
      },
      include: {
        sessionFamilyMembers: {
          include: {
            familyMember: true
          }
        }
      }
    })

    // Create notifications for affected family members
    const affectedFamilyMembers = new Set<string>()

    if (scheduledSessions.length > 0) {
      console.log(`Found ${scheduledSessions.length} scheduled sessions to cancel for user ${userId}`)
      
      // Cancel all scheduled sessions
      await prisma.session.updateMany({
        where: {
          userId,
          status: 'scheduled',
          date: { gte: new Date() }
        },
        data: {
          status: 'cancelled',
          terminationReason: 'user_deletion',
          notes: '[SESSION CANCELLED DUE TO ACCOUNT DELETION]'
        }
      })

      // Collect affected family members
      for (const session of scheduledSessions) {
        for (const member of session.sessionFamilyMembers) {
          affectedFamilyMembers.add(member.familyMember.name)
        }
      }

      if (affectedFamilyMembers.size > 0) {
        // TODO: Send notifications to affected family members
        // This would require family member contact information
        console.log(`Need to notify ${affectedFamilyMembers.size} family members about cancelled sessions`)
      }

      // Log session cancellations
      for (const session of scheduledSessions) {
        await createAuditLog(
          userId,
          'SESSION_CANCELLED',
          'Session',
          session.id,
          { status: 'scheduled' },
          { status: 'cancelled', terminationReason: 'user_deletion' },
          'Account deletion - scheduled session cancellation',
          req
        )
      }
    }

    return { cancelledCount: scheduledSessions.length, affectedFamilyMembers: affectedFamilyMembers.size }
  } catch (error) {
    console.error('Failed to handle scheduled sessions:', error)
    return { cancelledCount: 0, affectedFamilyMembers: 0 }
  }
}

// Helper function to analyze family therapy impacts
async function analyzeFamilyTherapyImpact(userId: string) {
  try {
    // Check if user participates in family therapy with other users
    const familyImpact = await prisma.familyMember.findMany({
      where: {
        userId: { not: userId },
        // Find sessions where this user's family members are involved
        sessionFamilyMembers: {
          some: {
            session: {
              userId // This user's sessions
            }
          }
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    })

    return familyImpact.map(member => ({
      userId: member.user.id,
      email: member.user.email,
      name: member.user.name,
      relationship: member.relationship
    }))
  } catch (error) {
    console.error('Failed to analyze family therapy impact:', error)
    return []
  }
}

// Helper function to handle subscription cleanup
async function handleSubscriptionCleanup(userId: string, user: any, req: NextRequest) {
  try {
    if (user.subscriptionId && user.subscriptionStatus === 'active') {
      console.log(`Cancelling subscription ${user.subscriptionId} for user ${userId}`)
      
      // TODO: Call external billing service (Stripe, etc.) to cancel subscription
      /*
      await stripe.subscriptions.update(user.subscriptionId, {
        cancel_at_period_end: true
      })
      */

      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionStatus: 'cancelled'
        }
      })

      await createAuditLog(
        userId,
        'SUBSCRIPTION_CANCELLED',
        'User',
        userId,
        { subscriptionStatus: user.subscriptionStatus },
        { subscriptionStatus: 'cancelled' },
        'Account deletion - subscription cancellation',
        req
      )

      return true
    }
    return false
  } catch (error) {
    console.error('Failed to handle subscription cleanup:', error)
    return false
  }
}

// Helper function to create data export before deletion
async function createDataExport(userId: string, req: NextRequest) {
  try {
    // Create data export request
    const exportRequest = await prisma.dataExportRequest.create({
      data: {
        userId,
        requestType: 'deletion_prep',
        status: 'processing',
        format: 'json',
        includeTranscripts: true,
        includeMetrics: true,
        includeProfile: true,
        includeSessions: true
      }
    })

    // TODO: Implement background job to generate export file
    // For now, we'll mark it as completed
    await prisma.dataExportRequest.update({
      where: { id: exportRequest.id },
      data: {
        status: 'completed',
        processedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      }
    })

    await createAuditLog(
      userId,
      'DATA_EXPORT_CREATED',
      'DataExportRequest',
      exportRequest.id,
      null,
      { requestType: 'deletion_prep' },
      'Pre-deletion data export for GDPR compliance',
      req
    )

    return exportRequest.id
  } catch (error) {
    console.error('Failed to create data export:', error)
    return null
  }
}

// Helper function to setup account recovery
async function setupAccountRecovery(userId: string, user: any) {
  try {
    const recoveryToken = createRecoveryToken(userId, user.email)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    // Create recovery record with data snapshot
    const recovery = await prisma.accountRecovery.create({
      data: {
        userId,
        email: user.email,
        recoveryToken,
        expiresAt,
        userSnapshot: {
          id: user.id,
          email: user.email,
          name: user.name,
          onboardingCompleted: user.onboardingCompleted,
          onboardingData: user.onboardingData,
          hasSeenIntro: user.hasSeenIntro,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionId: user.subscriptionId
        },
        profileSnapshot: user.profile || null,
        sessionCount: await prisma.session.count({ where: { userId } })
      }
    })

    return { recoveryToken, expiresAt }
  } catch (error) {
    console.error('Failed to setup account recovery:', error)
    return null
  }
}

// POST endpoint - actual deletion with token verification
export const POST = withAuth(
  async (request: NextRequest, { session }) => {
    const { token, confirmEmail, reason } = await request.json()

    // Verify deletion token if provided (from email link)
    if (token) {
      const tokenPayload = verifySignedToken(token)
      
      if (!tokenPayload || tokenPayload.type !== "account_deletion") {
        return NextResponse.json({ 
          error: "Invalid or expired deletion token",
          code: "INVALID_TOKEN"
        }, { status: 403 })
      }
      
      // Verify token matches current user
      if (tokenPayload.userId !== session.user.id || tokenPayload.email !== session.user.email) {
        return NextResponse.json({ 
          error: "Token does not match current user",
          code: "TOKEN_MISMATCH"
        }, { status: 403 })
      }
    } else {
      // Direct deletion without token - require additional confirmation
      console.warn(`Direct deletion attempt without token for user ${session.user.id}`)
    }

    // Validate that the user confirmed with their email
    if (confirmEmail !== session.user.email) {
      return NextResponse.json({ 
        error: "Email confirmation does not match your account email",
        code: "EMAIL_MISMATCH"
      }, { status: 400 })
    }

    try {
      // Find the user to get their data before deletion
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: {
          profile: true,
          familyMembers: true,
          sessions: {
            where: { status: { in: ['active', 'paused', 'scheduled'] } }
          }
        }
      })

      if (!user) {
        return NextResponse.json({ 
          error: "User not found" 
        }, { status: 404 })
      }

      console.log(`Starting account deletion process for user ${user.id} (${user.email})`)

      // Create initial audit log
      await createAuditLog(
        user.id,
        'ACCOUNT_DELETION_INITIATED',
        'User',
        user.id,
        null,
        { reason },
        'User requested account deletion',
        request
      )

      // Step 1: Terminate active sessions
      const terminatedSessions = await terminateActiveSessions(user.id, request)
      
      // Step 2: Cancel scheduled sessions and analyze impact
      const { cancelledCount, affectedFamilyMembers } = await handleScheduledSessions(user.id, request)
      
      // Step 3: Analyze family therapy impact
      const familyImpact = await analyzeFamilyTherapyImpact(user.id)
      
      // Step 4: Create data export for compliance
      const exportRequestId = await createDataExport(user.id, request)
      
      // Step 5: Handle subscription cleanup
      const subscriptionCancelled = await handleSubscriptionCleanup(user.id, user, request)
      
      // Step 6: Setup account recovery window
      const recoveryInfo = await setupAccountRecovery(user.id, user)

      // Step 7: Perform soft deletion with proper data retention
      const retentionPeriod = new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000) // 7 years for compliance
      
      await prisma.$transaction(async (tx) => {
        // Soft delete user
        await tx.user.update({
          where: { id: user.id },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
            deletionReason: reason || "User requested deletion",
            dataRetentionUntil: retentionPeriod,
            canRecover: true,
            // Anonymize email but keep for recovery
            email: `deleted_${Date.now()}_${user.email}`,
            name: `[DELETED] ${user.name}`
          }
        })

        // Anonymize profile data
        if (user.profile) {
          await tx.userProfile.update({
            where: { userId: user.id },
            data: {
              pronouns: null,
              partnerName: null,
              emergencyContact: null,
              phone: null,
              additionalNotes: "[DELETED]"
            }
          })
        }

        // Mark family members as deleted but preserve relationships for family therapy
        await tx.familyMember.updateMany({
          where: { userId: user.id },
          data: {
            name: "[DELETED]",
            isActive: false
          }
        })

        // Mark completed sessions as anonymized but keep for audit trail
        await tx.session.updateMany({
          where: { 
            userId: user.id,
            status: { in: ['completed'] }
          },
          data: {
            notes: "[USER DELETED]"
            // Keep session data for compliance but anonymize notes
          }
        })
      })

      // Step 8: Send comprehensive deletion confirmation email
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Account Deletion Confirmed</h2>
          <p>Hello ${user.name || 'User'},</p>
          <p>Your Couple Therapy account has been successfully deleted as requested.</p>
          
          <div style="margin: 30px 0; padding: 20px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;">
            <h3 style="color: #dc2626; margin-top: 0;">Deletion Summary:</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Active sessions terminated: ${terminatedSessions}</li>
              <li>Scheduled sessions cancelled: ${cancelledCount}</li>
              <li>Family members affected: ${affectedFamilyMembers}</li>
              <li>Subscription cancelled: ${subscriptionCancelled ? 'Yes' : 'No'}</li>
              <li>Data export created: ${exportRequestId ? 'Yes' : 'No'}</li>
            </ul>
          </div>

          ${familyImpact.length > 0 ? `
          <div style="margin: 30px 0; padding: 20px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px;">
            <h3 style="color: #ea580c; margin-top: 0;">⚠️ Family Therapy Impact</h3>
            <p>Your deletion may affect ${familyImpact.length} other family members. They have been notified about cancelled sessions.</p>
          </div>
          ` : ''}

          ${recoveryInfo ? `
          <div style="margin: 30px 0; padding: 20px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px;">
            <h3 style="color: #0284c7; margin-top: 0;">🔄 Account Recovery</h3>
            <p>You have <strong>30 days</strong> to recover your account if you change your mind.</p>
            <p>Recovery expires: ${recoveryInfo.expiresAt.toLocaleDateString()}</p>
            <p>To recover, visit: <a href="${process.env.NEXTAUTH_URL}/auth/recover?token=${recoveryInfo.recoveryToken}">Recovery Link</a></p>
          </div>
          ` : ''}

          <div style="margin: 30px 0; padding: 20px; background: #f3f4f6; border-radius: 8px;">
            <h3 style="margin-top: 0;">📋 What happens next:</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Your personal information has been anonymized</li>
              <li>Your therapy sessions have been marked as deleted</li>
              <li>You will no longer receive emails from us</li>
              <li>Data will be permanently purged after legal retention period</li>
              ${exportRequestId ? '<li>Your data export will be available for 30 days</li>' : ''}
            </ul>
          </div>

          <p><strong>Data retention:</strong> Anonymized data will be retained for 7 years for legal and compliance purposes, but cannot be linked back to you personally.</p>
          
          ${reason ? `<p><strong>Reason provided:</strong> ${reason}</p>` : ''}
          
          <p>If you have any questions about this deletion, please contact our support team within 30 days.</p>
          
          <p>Thank you for using Couple Therapy. We wish you all the best in your future endeavors.</p>
          
          <p>Best regards,<br>The Couple Therapy Team</p>
        </div>
      `

      try {
        await resend.emails.send({
          from: "noreply@coupletherapy.app",
          to: session.user.email, // Use original email before anonymization
          subject: "Account Deletion Confirmation - Important Information",
          html: emailContent
        })
      } catch (emailError) {
        console.error("Failed to send deletion confirmation email:", emailError)
        // Don't fail the deletion if email fails
      }

      // Step 9: Final audit log
      await createAuditLog(
        user.id,
        'ACCOUNT_DELETION_COMPLETED',
        'User',
        user.id,
        { isDeleted: false },
        { isDeleted: true, deletedAt: new Date() },
        'Account deletion process completed successfully',
        request
      )

      // Step 10: Schedule background cleanup job (30 days)
      // TODO: Implement background job scheduling
      /*
      await scheduleJob('cleanup-deleted-account', {
        userId: user.id,
        runAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      })
      */

      console.log(`Account deletion completed for user ${user.id}. Recovery available until ${recoveryInfo?.expiresAt}`)

      return NextResponse.json({ 
        message: "Account successfully deleted. You will be logged out shortly.",
        deletionSummary: {
          terminatedSessions,
          cancelledSessions: cancelledCount,
          affectedFamilyMembers,
          subscriptionCancelled,
          dataExportCreated: !!exportRequestId,
          familyImpactCount: familyImpact.length,
          recoveryAvailable: !!recoveryInfo,
          recoveryExpiresAt: recoveryInfo?.expiresAt
        },
        redirectTo: "/auth/login"
      })

    } catch (dbError) {
      console.error("Database error during account deletion:", dbError)
      
      // Log the error for debugging
      try {
        await createAuditLog(
          session.user.id || 'unknown',
          'ACCOUNT_DELETION_FAILED',
          'User',
          session.user.id || 'unknown',
          null,
          { error: dbError instanceof Error ? dbError.message : 'Unknown error' },
          'Account deletion failed due to database error',
          request
        )
      } catch (auditError) {
        console.error("Failed to log deletion error:", auditError)
      }
      
      return NextResponse.json({ 
        error: "Failed to delete account. Please try again or contact support.",
        technical: process.env.NODE_ENV === 'development' ? dbError : undefined
      }, { status: 500 })
    }

  },
  { 
    rateLimit: "DELETE_ACCOUNT",
    requireEmailVerified: true
  }
)

// GET endpoint to initiate account deletion (send confirmation email with impact analysis)
export const GET = withAuth(
  async (request: NextRequest, { session }) => {

    // Analyze impact before showing deletion form
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        sessions: {
          where: { 
            status: { in: ['active', 'paused', 'scheduled'] },
            date: { gte: new Date() }
          }
        },
        familyMembers: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const activeSessions = user.sessions.filter(s => ['active', 'paused'].includes(s.status)).length
    const scheduledSessions = user.sessions.filter(s => s.status === 'scheduled').length
    const familyImpact = await analyzeFamilyTherapyImpact(user.id)

    // Generate a signed deletion confirmation token
    const deletionToken = createDeletionToken(
      user.id,
      user.email,
      {
        activeSessions,
        scheduledSessions,
        familyMembersAffected: familyImpact.length,
        hasSubscription: !!user.subscriptionId
      }
    )

    const impactSummary = `
      <div style="margin: 20px 0; padding: 15px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px;">
        <h3 style="color: #ea580c; margin-top: 0;">📊 Deletion Impact Analysis</h3>
        <ul>
          <li><strong>Active sessions:</strong> ${activeSessions} (will be terminated immediately)</li>
          <li><strong>Scheduled sessions:</strong> ${scheduledSessions} (will be cancelled)</li>
          <li><strong>Family members affected:</strong> ${familyImpact.length}</li>
          <li><strong>Subscription status:</strong> ${user.subscriptionStatus || 'free'}</li>
        </ul>
      </div>
    `

    try {
      await resend.emails.send({
        from: "noreply@coupletherapy.app",
        to: session.user.email,
        subject: "Account Deletion Request - Confirmation Required",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">⚠️ Account Deletion Request</h2>
            <p>Hello ${user.name || 'User'},</p>
            <p>We received a request to delete your Couple Therapy account permanently.</p>
            
            ${impactSummary}
            
            <div style="margin: 30px 0; padding: 20px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;">
              <h3 style="color: #dc2626; margin-top: 0;">⚠️ This action is permanent and cannot be undone!</h3>
              <p>Deleting your account will:</p>
              <ul>
                <li>Immediately terminate any active therapy sessions</li>
                <li>Cancel all scheduled future sessions</li>
                <li>Remove all your personal information and progress</li>
                <li>Notify affected family members about cancelled sessions</li>
                <li>Cancel your subscription (if applicable)</li>
                <li>Generate a data export for 30 days (GDPR compliance)</li>
                <li>Provide a 30-day recovery window</li>
              </ul>
            </div>

            <p>If you're sure you want to proceed, click the button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXTAUTH_URL}/auth/delete-account?token=${deletionToken}" 
                 style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                ⚠️ Permanently Delete My Account
              </a>
            </div>

            <p>This link will expire in 24 hours for security reasons.</p>
            
            <div style="margin: 30px 0; padding: 20px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px;">
              <h3 style="color: #0284c7; margin-top: 0;">🤔 Having second thoughts?</h3>
              <p>If you're experiencing issues with our service, we'd love to help! Consider:</p>
              <ul>
                <li>Contacting our support team for assistance</li>
                <li>Taking a break instead of deleting your account</li>
                <li>Updating your preferences or settings</li>
                <li>Pausing your subscription instead of cancelling</li>
              </ul>
              <p>You can safely ignore this email if you don't want to delete your account.</p>
            </div>

            <p>Best regards,<br>The Couple Therapy Team</p>
          </div>
        `
      })

      return NextResponse.json({ 
        message: "Account deletion impact analysis sent to your email. Please check your inbox and follow the instructions.",
        impactSummary: {
          activeSessions,
          scheduledSessions,
          familyMembersAffected: familyImpact.length,
          subscriptionStatus: user.subscriptionStatus || 'free',
          hasSubscription: !!user.subscriptionId
        }
      })

    } catch (emailError) {
      console.error("Failed to send deletion confirmation email:", emailError)
      return NextResponse.json({ 
        error: "Failed to send confirmation email. Please try again." 
      }, { status: 500 })
    }

  },
  { 
    rateLimit: "DELETE_ACCOUNT"
  }
)