import { Hono } from 'hono';
import { newId } from '../lib/id';
import { requireAnyCap, err, ok, type Env } from '../lib/auth';
import { CAP } from '../lib/caps';

const app = new Hono<{ Bindings: Env }>();

// NPI Registry pharmacy lookup
app.get('/npi-lookup', async (c) => {
  await requireAnyCap(c, [CAP.RX_WRITE, CAP.FAX_SEND]);
  const name = c.req.query('name');
  const zip = c.req.query('zip');
  const state = c.req.query('state');
  const npi = c.req.query('npi');

  const params = new URLSearchParams({
    version: '2.1',
    enumeration_type: 'NPI-2',
    taxonomy_description: 'pharmacy',
    limit: '10',
  });
  if (name) params.set('organization_name', name);
  if (zip)  params.set('postal_code', zip);
  if (state) params.set('state', state);
  if (npi)  params.set('number', npi);

  const res = await fetch(`https://npiregistry.cms.hhs.gov/api/?${params}`);
  if (!res.ok) return err('NPI Registry lookup failed', 502);
  const data = await res.json() as { results?: Record<string, unknown>[] };

  const pharmacies = (data.results ?? []).map((r: Record<string, unknown>) => {
    const addresses = r.addresses as Record<string, unknown>[] ?? [];
    const loc = addresses.find((a: Record<string, unknown>) => a.address_purpose === 'LOCATION') ?? addresses[0] ?? {};
    const basic = r.basic as Record<string, unknown> ?? {};
    return {
      npi: r.number,
      name: basic.organization_name ?? basic.name,
      address: `${loc.address_1}, ${loc.city}, ${loc.state} ${loc.postal_code}`,
      phone: loc.telephone_number,
      fax: loc.fax_number,
    };
  });

  return ok(pharmacies);
});

app.get('/', async (c) => {
  await requireAnyCap(c, [CAP.PHARMACY_READ, CAP.RX_WRITE]);
  const status = c.req.query('status') ?? 'active';
  const { results } = await c.env.DB.prepare('SELECT * FROM pharmacies WHERE status = ? ORDER BY tier ASC, name ASC LIMIT 100').bind(status).all();
  return ok(results ?? []);
});

app.get('/:id', async (c) => {
  await requireAnyCap(c, [CAP.PHARMACY_READ, CAP.RX_WRITE]);
  const pharmacy = await c.env.DB.prepare('SELECT * FROM pharmacies WHERE id = ?').bind(c.req.param('id')).first();
  if (!pharmacy) return err('Not found', 404);
  return ok(pharmacy);
});

app.post('/', async (c) => {
  await requireAnyCap(c, [CAP.PHARMACY_WRITE, CAP.ADMIN_WRITE]);
  const body = await c.req.json<Record<string, unknown>>();
  const id = newId();
  const now = Date.now();

  await c.env.DB.prepare(`
    INSERT INTO pharmacies (id, name, ncpdp_id, npi_number, address_street, address_city, address_state, address_zip, phone, fax, email, type, accepts_eprescribe, capabilities, tier, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `).bind(
    id, body.name, body.ncpdpId ?? null, body.npiNumber ?? null,
    (body.address as Record<string, string>).street, (body.address as Record<string, string>).city,
    (body.address as Record<string, string>).state, (body.address as Record<string, string>).zip,
    body.phone, body.fax ?? null, body.email ?? null, body.type,
    body.acceptsEPrescribe ? 1 : 0,
    JSON.stringify(body.capabilities ?? []),
    body.tier ?? 3, now, now
  ).run();

  return ok({ id });
});

export default app;
