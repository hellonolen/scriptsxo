import { Hono } from 'hono';
import { newId } from '../lib/id';
import { requireCap, requireAuth, err, ok, type Env } from '../lib/auth';
import { CAP } from '../lib/caps';

const app = new Hono<{ Bindings: Env }>();

app.post('/', async (c) => {
  const caller = await requireCap(c, CAP.PATIENT_WRITE);
  const body = await c.req.json<Record<string, unknown>>();
  const addr = body.address as Record<string, string>;
  const id = newId();
  const now = Date.now();

  await c.env.DB.prepare(`
    INSERT INTO patients (id, member_id, email, date_of_birth, gender, address_street, address_city, address_state, address_zip,
      insurance_provider, insurance_policy_number, insurance_group_number,
      allergies, current_medications, medical_conditions,
      id_verification_status, state, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
  `).bind(
    id, body.memberId, (body.email as string).toLowerCase(), body.dateOfBirth, body.gender,
    addr.street, addr.city, addr.state, addr.zip,
    body.insuranceProvider ?? null, body.insurancePolicyNumber ?? null, body.insuranceGroupNumber ?? null,
    JSON.stringify(body.allergies ?? []), JSON.stringify(body.currentMedications ?? []), JSON.stringify(body.medicalConditions ?? []),
    body.state, now, now
  ).run();

  return ok({ id });
});

app.get('/by-member/:memberId', async (c) => {
  await requireAuth(c);
  const patient = await c.env.DB.prepare('SELECT * FROM patients WHERE member_id = ?').bind(c.req.param('memberId')).first();
  return ok(patient ?? null);
});

app.get('/by-email', async (c) => {
  await requireCap(c, CAP.PATIENT_READ);
  const email = c.req.query('email');
  if (!email) return err('email required');
  const patient = await c.env.DB.prepare('SELECT * FROM patients WHERE email = ?').bind(email.toLowerCase()).first();
  return ok(patient ?? null);
});

app.get('/:id', async (c) => {
  const caller = await requireCap(c, CAP.PATIENT_READ);
  const patient = await c.env.DB.prepare('SELECT * FROM patients WHERE id = ?').bind(c.req.param('id')).first<Record<string, unknown>>();
  if (!patient) return err('Not found', 404);
  return ok(patient);
});

app.patch('/:id', async (c) => {
  const caller = await requireAuth(c);
  const id = c.req.param('id');
  const patient = await c.env.DB.prepare('SELECT member_id FROM patients WHERE id = ?').bind(id).first<{ member_id: string }>();
  if (!patient) return err('Not found', 404);
  if (patient.member_id !== caller.memberId && !caller.caps.has(CAP.PATIENT_WRITE)) return err('Forbidden', 403);

  const body = await c.req.json<Record<string, unknown>>();
  const sets: string[] = ['updated_at = ?'];
  const vals: unknown[] = [Date.now()];

  const fields: [string, string][] = [
    ['allergies', 'allergies'], ['currentMedications', 'current_medications'],
    ['medicalConditions', 'medical_conditions'], ['primaryPharmacyId', 'primary_pharmacy_id'],
    ['consentSignedAt', 'consent_signed_at'], ['idVerifiedAt', 'id_verified_at'],
    ['idVerificationStatus', 'id_verification_status'],
  ];

  for (const [bodyKey, dbCol] of fields) {
    if (body[bodyKey] !== undefined) {
      sets.push(`${dbCol} = ?`);
      vals.push(Array.isArray(body[bodyKey]) ? JSON.stringify(body[bodyKey]) : body[bodyKey]);
    }
  }

  vals.push(id);
  await c.env.DB.prepare(`UPDATE patients SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
  return ok({ success: true });
});

export default app;
