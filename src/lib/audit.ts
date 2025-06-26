import { prisma } from "./prisma-optimized";

interface CreateAuditLogParams {
  userId: string | null;
  sessionId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: any;
  newValues?: any;
  changedFields?: string[];
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  metadata?: any;
  reason?: string | null;
  complianceFlags?: string[];
}

export async function createAuditLog(params: CreateAuditLogParams) {
  try {
    const auditLog = await prisma.auditLog.create({
      data: {
        userId: params.userId,
        sessionId: params.sessionId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValues: params.oldValues || undefined,
        newValues: params.newValues || undefined,
        changedFields: params.changedFields || [],
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        requestId: params.requestId,
        metadata: params.metadata || undefined,
        reason: params.reason,
        complianceFlags: params.complianceFlags || [],
      }
    });

    return auditLog;
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Don't throw - audit logging should not break the main flow
    return null;
  }
}