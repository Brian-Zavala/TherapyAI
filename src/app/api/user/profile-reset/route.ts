import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma-optimized";
import { createAuditLog } from "@/lib/audit";
import { profileCache, cacheKeys } from "@/lib/cache/profile-cache";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { options } = await req.json();

    // Validate options
    if (!options || typeof options !== 'object') {
      return NextResponse.json(
        { error: "Invalid options provided" },
        { status: 400 }
      );
    }

    // Start transaction for atomic reset
    const result = await prisma.$transaction(async (tx) => {
      // Get current profile for audit purposes
      const currentProfile = await tx.userProfile.findUnique({
        where: { userId: session.user.id },
        include: {
          user: {
            include: {
              familyMembers: true
            }
          }
        }
      });

      if (!currentProfile) {
        // Create profile if it doesn't exist
        currentProfile = await tx.userProfile.create({
          data: {
            userId: session.user.id,
            // Set default values
          }
        });
      }

      // Prepare update data based on options
      const updateData: any = {};

      if (options.clearPersonalInfo) {
        Object.assign(updateData, {
          pronouns: null,
          age: null,
          phone: null,
          emergencyContact: null,
          smsConsent: false,
          smsConsentDate: null,
          phoneValidated: false,
        });
      }

      if (options.clearTherapyPreferences) {
        Object.assign(updateData, {
          sessionPreference: null,
          communicationStyle: null,
          currentConcerns: null,
          additionalNotes: null,
          sessionFrequency: null,
          preferredDays: null,
          recurringSession: null,
          reminderTiming: null,
        });
      }

      // Always keep essential fields
      if (!options.keepAssistantConfig) {
        updateData.assistantId = null;
      }

      // Update the profile
      const updatedProfile = await tx.userProfile.update({
        where: { userId: session.user.id },
        data: updateData
      });

      // Handle partner info separately
      if (options.clearPartnerInfo) {
        await tx.userProfile.update({
          where: { userId: session.user.id },
          data: {
            partnerName: null,
            partnerAge: null,
            relationshipStatus: "Married", // Reset to default
          }
        });
      }

      // Handle family members separately
      if (options.clearFamilyMembers) {
        // Delete all family members from the FamilyMember table
        await tx.familyMember.deleteMany({
          where: { userId: session.user.id }
        });
      }

      // Create audit log entry
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'PROFILE_RESET',
          entityType: 'UserProfile',
          entityId: currentProfile.id,
          oldValues: currentProfile as any,
          newValues: updatedProfile as any,
          changedFields: Object.keys(updateData),
          metadata: {
            options,
            timestamp: new Date().toISOString(),
            cleared: {
              personalInfo: options.clearPersonalInfo || false,
              partnerInfo: options.clearPartnerInfo || false,
              familyMembers: options.clearFamilyMembers || false,
              therapyPreferences: options.clearTherapyPreferences || false,
            },
            kept: {
              therapyHistory: options.keepTherapyHistory || false,
              assistantConfig: options.keepAssistantConfig || false,
            }
          },
          reason: 'User initiated profile reset'
        }
      });

      // If not keeping therapy history, we might want to handle sessions
      if (!options.keepTherapyHistory) {
        // Cancel all scheduled sessions
        await tx.session.updateMany({
          where: {
            userId: session.user.id,
            status: 'SCHEDULED'
          },
          data: {
            status: 'CANCELLED',
            terminationReason: 'profile_reset'
          }
        });
      }

      return updatedProfile;
    });

    // Clear cache for the user
    await profileCache.invalidate(cacheKeys.userProfile(session.user.id));

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Profile reset successfully",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error resetting profile:", error);
    
    // Log full error details for debugging
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    
    // Create error audit log
    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.id) {
        await createAuditLog({
          userId: session.user.id,
          action: 'PROFILE_RESET_FAILED',
          entityType: 'UserProfile',
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
            errorStack: error instanceof Error ? error.stack : undefined,
            options: req.json ? await req.json().catch(() => null) : null,
            timestamp: new Date().toISOString()
          }
        });
      }
    } catch (auditError) {
      console.error("Failed to create audit log:", auditError);
    }

    return NextResponse.json(
      { 
        error: "Failed to reset profile",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check if profile can be reset
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user has active sessions
    const activeSessions = await prisma.session.count({
      where: {
        userId: session.user.id,
        status: {
          in: ['ACTIVE', 'PAUSED']
        }
      }
    });

    // Get profile summary
    const profile = await prisma.userProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          include: {
            familyMembers: {
              where: { isActive: true }
            }
          }
        }
      }
    });

    const familyMemberCount = profile?.user.familyMembers.length || 0;

    return NextResponse.json({
      canReset: activeSessions === 0,
      hasActiveSessions: activeSessions > 0,
      profileSummary: {
        hasPersonalInfo: !!(profile?.age || profile?.phone || profile?.pronouns),
        hasFamilyMembers: familyMemberCount > 0,
        familyMemberCount,
        hasPartnerInfo: !!(profile?.partnerName),
        hasTherapyPreferences: !!(profile?.sessionPreference),
        hasCustomizations: !!(profile?.assistantId || profile?.additionalNotes)
      }
    });

  } catch (error) {
    console.error("Error checking reset eligibility:", error);
    return NextResponse.json(
      { error: "Failed to check reset eligibility" },
      { status: 500 }
    );
  }
}