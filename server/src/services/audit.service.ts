import { prisma } from '../lib/prisma.js';

export interface CreateAuditLogParams {
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, any>;
}

export async function logAudit(params: CreateAuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId || null,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId || null,
        metadata: params.metadata || {},
      },
    });
  } catch (err) {
    // Audit logging should never crash the main transaction
    console.error('Audit log failure:', err);
  }
}
