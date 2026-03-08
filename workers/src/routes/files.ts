import { Env } from '../types';
import { requireSession, resolveMember } from '../lib/auth';
import { nanoid } from '../lib/nanoid';

const ALLOWED_CONTENT_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'video/mp4', 'video/webm',
  'audio/mpeg', 'audio/wav', 'audio/webm',
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function handleFiles(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  const session = await requireSession(request, env).catch(() => null);
  if (!session) return Response.json({ error: 'Authentication required' }, { status: 401 });

  const member = await resolveMember(session, env);
  if (!member) return Response.json({ error: 'Member not found' }, { status: 401 });

  // POST /api/v1/files/upload-url — get a presigned-style key + direct upload
  if (method === 'POST' && path === '/api/v1/files/upload-url') {
    let body: { fileName: string; contentType: string; purpose: string; fileSize?: number };
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (!body.fileName || !body.contentType || !body.purpose) {
      return Response.json({ error: 'fileName, contentType, and purpose are required' }, { status: 400 });
    }

    if (!ALLOWED_CONTENT_TYPES.has(body.contentType)) {
      return Response.json({ error: 'Content type not allowed' }, { status: 400 });
    }

    if (body.fileSize && body.fileSize > MAX_FILE_SIZE) {
      return Response.json({ error: 'File too large (max 50MB)' }, { status: 400 });
    }

    const fileId = nanoid();
    const ext = body.fileName.split('.').pop() ?? '';
    const key = `${member.id}/${body.purpose}/${fileId}.${ext}`;

    // Record the upload in D1 (before actual upload so we track intent)
    await env.DB.prepare(
      `INSERT INTO file_storage (id, owner_id, file_name, file_type, file_size, storage_id, purpose, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        fileId,
        member.id,
        body.fileName,
        body.contentType,
        body.fileSize ?? 0,
        key,
        body.purpose,
        Date.now()
      )
      .run();

    // For Cloudflare R2, we use a signed URL via Workers API
    // R2 does not have native presigned URLs from workers; we issue a short-lived token
    // and clients upload via /api/v1/files/:key/put with that token
    const uploadToken = nanoid(32);
    const tokenKey = `upload_token:${uploadToken}`;
    await env.CACHE.put(tokenKey, JSON.stringify({ key, memberId: member.id, contentType: body.contentType }), {
      expirationTtl: 300, // 5 minutes
    });

    return Response.json({
      success: true,
      data: {
        fileId,
        key,
        uploadToken,
        uploadUrl: `/api/v1/files/${encodeURIComponent(key)}/put`,
      },
    });
  }

  // PUT /api/v1/files/:key/put — upload via token
  const putMatch = path.match(/^\/api\/v1\/files\/(.+)\/put$/);
  if (method === 'PUT' && putMatch) {
    const key = decodeURIComponent(putMatch[1]);
    const uploadToken = request.headers.get('X-Upload-Token');

    if (!uploadToken) {
      return Response.json({ error: 'X-Upload-Token header required' }, { status: 401 });
    }

    const tokenData = await env.CACHE.get(`upload_token:${uploadToken}`);
    if (!tokenData) {
      return Response.json({ error: 'Invalid or expired upload token' }, { status: 401 });
    }

    const { key: tokenKey, memberId, contentType } = JSON.parse(tokenData) as {
      key: string; memberId: string; contentType: string;
    };

    if (tokenKey !== key || memberId !== member.id) {
      return Response.json({ error: 'Token mismatch' }, { status: 403 });
    }

    // Delete token immediately (one-time use)
    await env.CACHE.delete(`upload_token:${uploadToken}`);

    const body = request.body;
    if (!body) return Response.json({ error: 'No body' }, { status: 400 });

    await env.FILES.put(key, body, {
      httpMetadata: { contentType },
      customMetadata: { ownerId: member.id },
    });

    // Update file record with confirmed URL
    const url = `/api/v1/files/${encodeURIComponent(key)}`;
    await env.DB.prepare(`UPDATE file_storage SET url = ? WHERE storage_id = ?`)
      .bind(url, key)
      .run();

    return Response.json({ success: true, data: { key, url } });
  }

  // GET /api/v1/files/:key — get download URL (proxy through worker)
  const getMatch = path.match(/^\/api\/v1\/files\/([^/].+)$/);
  if (method === 'GET' && getMatch && !path.endsWith('/put')) {
    const key = decodeURIComponent(getMatch[1]);

    // Verify ownership: either the owner or admin/provider
    const fileRecord = await env.DB.prepare(
      `SELECT owner_id, file_name, file_type FROM file_storage WHERE storage_id = ?`
    )
      .bind(key)
      .first<{ owner_id: string; file_name: string; file_type: string }>();

    if (fileRecord && fileRecord.owner_id !== member.id && member.role !== 'admin' && member.role !== 'provider') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const object = await env.FILES.get(key);
    if (!object) {
      return Response.json({ error: 'File not found' }, { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Cache-Control', 'private, max-age=300');
    if (fileRecord) {
      headers.set('Content-Disposition', `inline; filename="${fileRecord.file_name}"`);
    }

    return new Response(object.body, { headers });
  }

  // DELETE /api/v1/files/:key
  const deleteMatch = path.match(/^\/api\/v1\/files\/(.+)$/);
  if (method === 'DELETE' && deleteMatch) {
    const key = decodeURIComponent(deleteMatch[1]);

    const fileRecord = await env.DB.prepare(
      `SELECT id, owner_id FROM file_storage WHERE storage_id = ?`
    )
      .bind(key)
      .first<{ id: string; owner_id: string }>();

    if (!fileRecord) return Response.json({ error: 'File not found' }, { status: 404 });

    if (fileRecord.owner_id !== member.id && member.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    await env.FILES.delete(key);
    await env.DB.prepare(`DELETE FROM file_storage WHERE id = ?`).bind(fileRecord.id).run();

    return Response.json({ success: true });
  }

  return Response.json({ error: 'Not found' }, { status: 404 });
}
