import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './lib/auth';
import { ApiError, err } from './lib/auth';

import authRoutes from './routes/auth';
import memberRoutes from './routes/members';
import patientRoutes from './routes/patients';
import providerRoutes from './routes/providers';
import consultationRoutes from './routes/consultations';
import prescriptionRoutes from './routes/prescriptions';
import pharmacyRoutes from './routes/pharmacies';
import faxRoutes from './routes/fax';
import storageRoutes from './routes/storage';
import intakeRoutes from './routes/intakes';
import billingRoutes from './routes/billing';
import notificationRoutes from './routes/notifications';
import messageRoutes from './routes/messages';
import videoReviewRoutes from './routes/video-reviews';
import aiRoutes from './routes/ai';
import snsRoutes from './routes/sns';
import casesRoutes from './routes/cases';
import erxRoutes from './routes/erx';
import agentsRoutes from './routes/agents';

const app = new Hono<{ Bindings: Env }>();

// ─── CORS ────────────────────────────────────────────────────────────
app.use('*', cors({
  origin: (origin) => {
    const allowed = [
      'https://www.scriptsxo.com',
      'https://scriptsxo.com',
      'http://localhost:3000',
      'http://localhost:3001',
    ];
    return allowed.includes(origin) ? origin : allowed[0];
  },
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  credentials: true,
}));

// ─── Health ──────────────────────────────────────────────────────────
app.get('/health', (c) => c.json({ ok: true, ts: Date.now() }));

// ─── Routes ──────────────────────────────────────────────────────────
app.route('/auth', authRoutes);
app.route('/members', memberRoutes);
app.route('/patients', patientRoutes);
app.route('/providers', providerRoutes);
app.route('/consultations', consultationRoutes);
app.route('/prescriptions', prescriptionRoutes);
app.route('/pharmacies', pharmacyRoutes);
app.route('/fax', faxRoutes);
app.route('/storage', storageRoutes);
app.route('/intakes', intakeRoutes);
app.route('/billing', billingRoutes);
app.route('/notifications', notificationRoutes);
app.route('/messages', messageRoutes);
app.route('/video-reviews', videoReviewRoutes);
app.route('/ai', aiRoutes);
app.route('/sns', snsRoutes);
app.route('/cases', casesRoutes);
app.route('/erx', erxRoutes);
app.route('/agents', agentsRoutes);

// ─── 404 ─────────────────────────────────────────────────────────────
app.notFound((c) => c.json({ success: false, error: 'Not found' }, 404));

// ─── Error Handler ───────────────────────────────────────────────────
app.onError((error, c) => {
  if (error instanceof ApiError) {
    return c.json({ success: false, error: error.message }, error.status as never);
  }
  console.error('[scriptsxo-api]', error);
  return c.json({ success: false, error: 'Internal server error' }, 500);
});

export default app;
