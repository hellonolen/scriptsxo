import { Hono } from 'hono';
import { newId } from '../lib/id';
import { requireAuth, err, ok, type Env } from '../lib/auth';

const app = new Hono<{ Bindings: Env }>();

const ALLOWED_PURPOSES = ['government_id', 'insurance_card', 'lab_results', 'consultation_recording', 'prescription_pdf', 'license_scan'];

// Generate a presigned-style upload — client sends file directly to Worker, Worker puts to R2
app.post('/upload', async (c) => {
  const caller = await requireAuth(c);
  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  const purpose = formData.get('purpose') as string | null;

  if (!file) return err('file required');
  if (!purpose || !ALLOWED_PURPOSES.includes(purpose)) return err('invalid purpose');

  const ext = file.name.split('.').pop() ?? 'bin';
  const r2Key = `${purpose}/${caller.memberId}/${newId()}.${ext}`;

  await c.env.R2.put(r2Key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
    customMetadata: {
      ownerId: caller.memberId,
      purpose,
      originalName: file.name,
    },
  });

  const fileId = newId();
  await c.env.DB.prepare(
    'INSERT INTO file_storage (id, owner_id, file_name, file_type, file_size, r2_key, purpose, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(fileId, caller.memberId, file.name, file.type, file.size, r2Key, purpose, Date.now()).run();

  return ok({ fileId, r2Key });
});

// Serve a file from R2 (auth-gated)
app.get('/file/:fileId', async (c) => {
  const caller = await requireAuth(c);
  const record = await c.env.DB.prepare('SELECT * FROM file_storage WHERE id = ?')
    .bind(c.req.param('fileId')).first<Record<string, unknown>>();
  if (!record) return err('Not found', 404);

  // Only owner or admin can download
  if (record.owner_id !== caller.memberId && !caller.isPlatformOwner && !caller.caps.has('admin:read' as never)) {
    return err('Forbidden', 403);
  }

  const obj = await c.env.R2.get(record.r2_key as string);
  if (!obj) return err('File not found in storage', 404);

  const headers = new Headers();
  headers.set('Content-Type', obj.httpMetadata?.contentType ?? 'application/octet-stream');
  headers.set('Content-Disposition', `attachment; filename="${record.file_name}"`);

  return new Response(obj.body, { headers });
});

app.delete('/file/:fileId', async (c) => {
  const caller = await requireAuth(c);
  const record = await c.env.DB.prepare('SELECT * FROM file_storage WHERE id = ?')
    .bind(c.req.param('fileId')).first<Record<string, unknown>>();
  if (!record) return err('Not found', 404);
  if (record.owner_id !== caller.memberId && !caller.isPlatformOwner) return err('Forbidden', 403);

  await c.env.R2.delete(record.r2_key as string);
  await c.env.DB.prepare('DELETE FROM file_storage WHERE id = ?').bind(c.req.param('fileId')).run();
  return ok({ success: true });
});

export default app;
