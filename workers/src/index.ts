import { Env } from './types';
import { handleAuth } from './routes/auth';
import { handlePatients } from './routes/patients';
import { handleProviders } from './routes/providers';
import { handleConsultations } from './routes/consultations';
import { handlePrescriptions } from './routes/prescriptions';
import { handleVideoReviews } from './routes/videoReviews';
import { handleFiles } from './routes/files';
import { handleAgents } from './routes/agents';
import { handleWebhooks } from './routes/webhooks';
import { handleCron } from './crons';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://scriptsxo.com',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Upload-Token',
  'Access-Control-Allow-Credentials': 'true',
};

function addCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    headers.set(k, v);
  }
  return new Response(response.body, { status: response.status, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (path === '/health') {
      return addCors(Response.json({ status: 'ok', timestamp: Date.now() }));
    }

    if (!path.startsWith('/api/v1/') && path !== '/health') {
      return addCors(Response.json({ error: 'Not found' }, { status: 404 }));
    }

    try {
      let response: Response;

      if (path.startsWith('/api/v1/auth/')) {
        response = await handleAuth(request, env);
      } else if (path.startsWith('/api/v1/patients')) {
        response = await handlePatients(request, env);
      } else if (path.startsWith('/api/v1/providers')) {
        response = await handleProviders(request, env);
      } else if (path.startsWith('/api/v1/consultations')) {
        response = await handleConsultations(request, env);
      } else if (path.startsWith('/api/v1/prescriptions')) {
        response = await handlePrescriptions(request, env);
      } else if (path.startsWith('/api/v1/video-reviews')) {
        response = await handleVideoReviews(request, env);
      } else if (path.startsWith('/api/v1/files')) {
        response = await handleFiles(request, env);
      } else if (path.startsWith('/api/v1/agents')) {
        response = await handleAgents(request, env);
      } else if (path.startsWith('/api/v1/webhooks')) {
        response = await handleWebhooks(request, env);
      } else {
        response = Response.json({ error: 'Not found' }, { status: 404 });
      }

      return addCors(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      return addCors(Response.json({ error: message }, { status: 500 }));
    }
  },

  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    await handleCron(event.cron, env);
  },
};
