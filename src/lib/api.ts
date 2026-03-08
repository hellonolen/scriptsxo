/**
 * ScriptsXO API Client
 * Replaces all Convex calls. Points to the scriptsxo-api Cloudflare Worker.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  'https://scriptsxo-api.hellonolen.workers.dev';

const SESSION_COOKIE = 'scriptsxo_session';

function getSessionToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)scriptsxo_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getSessionToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' });
  const json = await res.json() as { success: boolean; data?: T; error?: string };

  if (!json.success) throw new Error(json.error ?? 'API error');
  return json.data as T;
}

// ─── Auth ────────────────────────────────────────────────────────────

export const auth = {
  createChallenge: (email?: string, type = 'auth') =>
    apiFetch<{ challenge: string }>('/auth/challenge/create', {
      method: 'POST', body: JSON.stringify({ email, type }),
    }),

  storeCredential: (data: { email: string; credentialId: string; publicKey: string; counter: number; deviceType?: string; transports?: string[] }) =>
    apiFetch<{ success: boolean; id?: string; error?: string }>('/auth/passkeys/store', {
      method: 'POST', body: JSON.stringify(data),
    }),

  verifyCredential: (data: { credentialId: string; counter?: number; signature?: string; challenge?: string }) =>
    apiFetch<{ success: boolean; email?: string; error?: string }>('/auth/passkeys/verify', {
      method: 'POST', body: JSON.stringify(data),
    }),

  getCredentials: (email: string) =>
    apiFetch<{ credentialId: string; transports?: string[] }[]>(`/auth/passkeys/list?email=${encodeURIComponent(email)}`),

  checkEligibility: (email: string) =>
    apiFetch<{ eligible: boolean; reason: string }>(`/auth/passkeys/eligible?email=${encodeURIComponent(email)}`),

  createSession: (memberId: string, email: string, userAgent?: string) =>
    apiFetch<{ sessionToken: string }>('/auth/sessions/create', {
      method: 'POST', body: JSON.stringify({ memberId, email, userAgent }),
    }),

  validateSession: (sessionToken: string) =>
    apiFetch<{ valid: boolean; email?: string }>('/auth/sessions/validate', {
      method: 'POST', body: JSON.stringify({ sessionToken }),
    }),

  revokeSession: (sessionToken: string) =>
    apiFetch<{ success: boolean }>('/auth/sessions/revoke', {
      method: 'POST', body: JSON.stringify({ sessionToken }),
    }),

  generateRecoveryPin: (email: string) =>
    apiFetch<{ success: boolean; pin?: string; error?: string }>('/auth/passkeys/recovery/generate', {
      method: 'POST', body: JSON.stringify({ email }),
    }),

  verifyRecoveryPin: (email: string, pin: string) =>
    apiFetch<{ success: boolean; challenge?: string; error?: string }>('/auth/passkeys/recovery/verify', {
      method: 'POST', body: JSON.stringify({ email, pin }),
    }),

  sendMagicLink: (email: string) =>
    apiFetch<{ success: boolean; code?: string }>('/auth/magic-links/create', {
      method: 'POST', body: JSON.stringify({ email }),
    }),

  verifyMagicLink: (email: string, code: string) =>
    apiFetch<{ valid: boolean; email?: string; error?: string }>('/auth/magic-links/verify', {
      method: 'POST', body: JSON.stringify({ email, code }),
    }),
};

// ─── Members ─────────────────────────────────────────────────────────

export const members = {
  getOrCreate: (email: string, name?: string, firstName?: string, lastName?: string) =>
    apiFetch<{ memberId: string; created: boolean }>('/members/get-or-create', {
      method: 'POST', body: JSON.stringify({ email, name, firstName, lastName }),
    }),

  getByEmail: (email: string) =>
    apiFetch<Record<string, unknown> | null>(`/members/by-email?email=${encodeURIComponent(email)}`),

  getById: (id: string) => apiFetch<Record<string, unknown>>(`/members/${id}`),

  getAll: () => apiFetch<Record<string, unknown>[]>('/members/'),

  countByRole: () => apiFetch<Record<string, number>>('/members/count-by-role'),

  updateRole: (id: string, role: string) =>
    apiFetch<{ success: boolean }>(`/members/${id}/role`, {
      method: 'PATCH', body: JSON.stringify({ role }),
    }),

  updateProfile: (id: string, data: { name?: string; firstName?: string; lastName?: string; phone?: string; dob?: string }) =>
    apiFetch<{ success: boolean }>(`/members/${id}/profile`, {
      method: 'PATCH', body: JSON.stringify(data),
    }),
};

// ─── Patients ────────────────────────────────────────────────────────

export const patients = {
  create: (data: Record<string, unknown>) =>
    apiFetch<{ id: string }>('/patients/', { method: 'POST', body: JSON.stringify(data) }),

  getByMemberId: (memberId: string) =>
    apiFetch<Record<string, unknown> | null>(`/patients/by-member/${memberId}`),

  getByEmail: (email: string) =>
    apiFetch<Record<string, unknown> | null>(`/patients/by-email?email=${encodeURIComponent(email)}`),

  getById: (id: string) => apiFetch<Record<string, unknown>>(`/patients/${id}`),

  update: (id: string, data: Record<string, unknown>) =>
    apiFetch<{ success: boolean }>(`/patients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// ─── Providers ───────────────────────────────────────────────────────

export const providers = {
  create: (data: Record<string, unknown>) =>
    apiFetch<{ id: string }>('/providers/', { method: 'POST', body: JSON.stringify(data) }),

  getActive: (state?: string) =>
    apiFetch<Record<string, unknown>[]>(`/providers/active${state ? `?state=${state}` : ''}`),

  getByEmail: (email: string) =>
    apiFetch<Record<string, unknown> | null>(`/providers/by-email?email=${encodeURIComponent(email)}`),

  getById: (id: string) => apiFetch<Record<string, unknown>>(`/providers/${id}`),
};

// ─── Consultations ───────────────────────────────────────────────────

export const consultations = {
  create: (data: Record<string, unknown>) =>
    apiFetch<{ id: string }>('/consultations/', { method: 'POST', body: JSON.stringify(data) }),

  getQueue: () => apiFetch<Record<string, unknown>[]>('/consultations/queue'),

  getByPatient: (patientId: string) =>
    apiFetch<Record<string, unknown>[]>(`/consultations/by-patient/${patientId}`),

  getById: (id: string) => apiFetch<Record<string, unknown>>(`/consultations/${id}`),

  start: (id: string) =>
    apiFetch<{ success: boolean }>(`/consultations/${id}/start`, { method: 'POST', body: '{}' }),

  complete: (id: string, data: Record<string, unknown>) =>
    apiFetch<{ success: boolean }>(`/consultations/${id}/complete`, { method: 'POST', body: JSON.stringify(data) }),

  enqueue: (id: string) =>
    apiFetch<{ success: boolean }>(`/consultations/${id}/enqueue`, { method: 'POST', body: '{}' }),

  claim: (id: string, providerId: string) =>
    apiFetch<{ success: boolean }>(`/consultations/${id}/claim`, { method: 'POST', body: JSON.stringify({ providerId }) }),
};

// ─── Prescriptions ───────────────────────────────────────────────────

export const prescriptions = {
  create: (data: Record<string, unknown>) =>
    apiFetch<{ id: string }>('/prescriptions/', { method: 'POST', body: JSON.stringify(data) }),

  getByProvider: (email: string) =>
    apiFetch<Record<string, unknown>[]>(`/prescriptions/by-provider?email=${encodeURIComponent(email)}`),

  getByPatient: (patientId: string) =>
    apiFetch<Record<string, unknown>[]>(`/prescriptions/by-patient?patientId=${patientId}`),

  getById: (id: string) => apiFetch<Record<string, unknown>>(`/prescriptions/${id}`),

  sign: (id: string, providerId: string) =>
    apiFetch<{ success: boolean }>(`/prescriptions/${id}/sign`, { method: 'POST', body: JSON.stringify({ providerId }) }),

  sendToPharmacy: (id: string, pharmacyId: string, ePrescribeId?: string) =>
    apiFetch<{ success: boolean }>(`/prescriptions/${id}/send-to-pharmacy`, {
      method: 'POST', body: JSON.stringify({ pharmacyId, ePrescribeId }),
    }),

  updateStatus: (id: string, status: string) =>
    apiFetch<{ success: boolean }>(`/prescriptions/${id}/status`, {
      method: 'PATCH', body: JSON.stringify({ status }),
    }),
};

// ─── Pharmacies ──────────────────────────────────────────────────────

export const pharmacies = {
  list: () => apiFetch<Record<string, unknown>[]>('/pharmacies/'),

  getById: (id: string) => apiFetch<Record<string, unknown>>(`/pharmacies/${id}`),

  npiLookup: (params: { name?: string; zip?: string; state?: string; npi?: string }) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]);
    return apiFetch<{ npi: string; name: string; address: string; phone: string; fax?: string }[]>(`/pharmacies/npi-lookup?${qs}`);
  },
};

// ─── Fax ─────────────────────────────────────────────────────────────

export const fax = {
  send: (prescriptionId: string, pharmacyId: string, faxNumber: string, pdfR2Key: string) =>
    apiFetch<{ success: boolean; faxLogId: string; jobId?: string; error?: string }>('/fax/send', {
      method: 'POST', body: JSON.stringify({ prescriptionId, pharmacyId, faxNumber, pdfR2Key }),
    }),

  getByPrescription: (prescriptionId: string) =>
    apiFetch<Record<string, unknown>[]>(`/fax/by-prescription/${prescriptionId}`),

  getById: (id: string) => apiFetch<Record<string, unknown>>(`/fax/${id}`),
};

// ─── Storage ─────────────────────────────────────────────────────────

export const storage = {
  upload: async (file: File, purpose: string): Promise<{ fileId: string; r2Key: string }> => {
    const token = getSessionToken();
    const form = new FormData();
    form.append('file', file);
    form.append('purpose', purpose);
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/storage/upload`, { method: 'POST', headers, body: form, credentials: 'include' });
    const json = await res.json() as { success: boolean; data?: { fileId: string; r2Key: string }; error?: string };
    if (!json.success) throw new Error(json.error ?? 'Upload failed');
    return json.data!;
  },

  getFileUrl: (fileId: string) => `${API_BASE}/storage/file/${fileId}`,
};
