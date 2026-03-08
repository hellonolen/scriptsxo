import { newId } from './id';

export type AuditEventType =
  | 'identity.started' | 'identity.completed' | 'identity.failed'
  | 'consent.captured'
  | 'payment.initiated' | 'payment.completed' | 'payment.failed'
  | 'intake.started' | 'intake.completed'
  | 'case.created' | 'case.state_changed' | 'case.assigned' | 'case.approved' | 'case.denied'
  | 'prescription.created' | 'prescription.signed' | 'prescription.sent'
  | 'record.accessed' | 'record.exported'
  | 'auth.login' | 'auth.logout' | 'auth.failed';

interface AuditEventInput {
  eventType: AuditEventType;
  entityType: string;
  entityId: string;
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  patientEmail?: string;
  patientState?: string;
  ipAddress?: string;
  userAgent?: string;
  payload?: Record<string, unknown>;
  success?: boolean;
  errorMessage?: string;
  db: D1Database;
}

export async function auditLog(input: AuditEventInput): Promise<void> {
  const now = Date.now();
  try {
    await input.db.prepare(`
      INSERT INTO audit_log (id, event_type, entity_type, entity_id, actor_id, actor_email, actor_role,
        patient_email, patient_state, ip_address, user_agent, payload, success, error_message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      newId(),
      input.eventType,
      input.entityType,
      input.entityId,
      input.actorId ?? null,
      input.actorEmail ?? null,
      input.actorRole ?? null,
      input.patientEmail ?? null,
      input.patientState ?? null,
      input.ipAddress ?? null,
      input.userAgent ?? null,
      input.payload ? JSON.stringify(input.payload) : null,
      input.success === false ? 0 : 1,
      input.errorMessage ?? null,
      now,
    ).run();
  } catch (err) {
    // Never let audit logging break the main flow
    console.error('[audit] Failed to write audit log:', err);
  }
}
