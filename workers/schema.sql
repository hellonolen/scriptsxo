-- ScriptsXO D1 Schema
-- Converted from Convex schema.ts (36 tables)
-- All IDs are nanoid TEXT. JSON columns store arrays and objects.
-- Booleans stored as INTEGER (0=false, 1=true).
-- Timestamps are Unix milliseconds (INTEGER).

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ============================================================
-- MIGRATIONS TRACKER
-- ============================================================
CREATE TABLE IF NOT EXISTS _migrations (
  id          TEXT PRIMARY KEY NOT NULL,
  name        TEXT NOT NULL,
  applied_at  INTEGER NOT NULL
);

-- ============================================================
-- AUTH TABLES (priority: apply first)
-- ============================================================

-- sessions (server-issued session tokens — identity anchor)
CREATE TABLE IF NOT EXISTS sessions (
  id            TEXT PRIMARY KEY NOT NULL,
  session_token TEXT NOT NULL,
  member_id     TEXT NOT NULL,
  email         TEXT NOT NULL,
  created_at    INTEGER NOT NULL,
  expires_at    INTEGER NOT NULL,
  last_used_at  INTEGER,
  user_agent    TEXT,
  ip_address    TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_token       ON sessions (session_token);
CREATE        INDEX IF NOT EXISTS idx_sessions_member_id   ON sessions (member_id);
CREATE        INDEX IF NOT EXISTS idx_sessions_email       ON sessions (email);
CREATE        INDEX IF NOT EXISTS idx_sessions_expires_at  ON sessions (expires_at);

-- passkeys (WebAuthn credentials)
CREATE TABLE IF NOT EXISTS passkeys (
  id                  TEXT PRIMARY KEY NOT NULL,
  email               TEXT NOT NULL,
  credential_id       TEXT NOT NULL,
  public_key          TEXT NOT NULL,
  counter             INTEGER NOT NULL,
  device_type         TEXT,
  backed_up           INTEGER,
  transports          TEXT,           -- JSON array
  login_count         INTEGER,
  created_at          INTEGER,
  last_used_at        INTEGER,
  recovery_pin_hash   TEXT,
  recovery_setup_at   INTEGER,
  payment_status      TEXT,
  paid_at             INTEGER,
  stripe_customer_id  TEXT,
  stripe_session_id   TEXT,
  discord_user_id     TEXT
);
CREATE        INDEX IF NOT EXISTS idx_passkeys_email         ON passkeys (email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_passkeys_credential_id ON passkeys (credential_id);

-- auth_challenges (WebAuthn ceremony challenges)
CREATE TABLE IF NOT EXISTS auth_challenges (
  id              TEXT PRIMARY KEY NOT NULL,
  challenge       TEXT NOT NULL,
  email           TEXT,
  type            TEXT NOT NULL,
  expires_at      INTEGER NOT NULL,
  created_at      INTEGER,
  rate_limit_key  TEXT
);
CREATE        INDEX IF NOT EXISTS idx_auth_challenges_challenge  ON auth_challenges (challenge);
CREATE        INDEX IF NOT EXISTS idx_auth_challenges_expires_at ON auth_challenges (expires_at);

-- magic_links (email-based auth fallback)
CREATE TABLE IF NOT EXISTS magic_links (
  id          TEXT PRIMARY KEY NOT NULL,
  email       TEXT NOT NULL,
  code        TEXT NOT NULL,
  expires_at  INTEGER NOT NULL,
  consumed    INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_magic_links_email      ON magic_links (email);
CREATE INDEX IF NOT EXISTS idx_magic_links_email_code ON magic_links (email, code);

-- rate_limits (KV-style abuse prevention — also mirrored to Cloudflare KV)
CREATE TABLE IF NOT EXISTS rate_limits (
  id           TEXT PRIMARY KEY NOT NULL,
  key          TEXT NOT NULL,
  count        INTEGER NOT NULL,
  window_start INTEGER NOT NULL,
  window_ms    INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits (key);

-- ============================================================
-- ORGANIZATIONS + MEMBERS
-- ============================================================

-- organizations
CREATE TABLE IF NOT EXISTS organizations (
  id                TEXT PRIMARY KEY NOT NULL,
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL,
  type              TEXT NOT NULL,   -- "clinic" | "pharmacy" | "admin" | "hospital"
  status            TEXT NOT NULL,
  subscription_tier TEXT,            -- "consumer" | "clinic" | "enterprise"
  whop_membership_id TEXT,
  max_providers     INTEGER,
  max_patients      INTEGER,
  terminology_mode  TEXT,            -- "client" | "patient"
  cap_allow         TEXT,            -- JSON array
  cap_deny          TEXT,            -- JSON array
  created_at        INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_slug ON organizations (slug);
CREATE        INDEX IF NOT EXISTS idx_organizations_type ON organizations (type);

-- members (one row per user-per-org membership)
CREATE TABLE IF NOT EXISTS members (
  id                TEXT PRIMARY KEY NOT NULL,
  org_id            TEXT,            -- FK → organizations.id (nullable for standalone users)
  email             TEXT NOT NULL,
  phone             TEXT,
  name              TEXT NOT NULL,
  first_name        TEXT,
  last_name         TEXT,
  dob               TEXT,
  role              TEXT NOT NULL,   -- "patient" | "provider" | "pharmacist" | "admin" | "staff"
  org_role          TEXT,            -- "owner" | "admin" | "member"
  permissions       TEXT NOT NULL,   -- JSON array
  is_platform_owner INTEGER,
  cap_allow         TEXT,            -- JSON array
  cap_deny          TEXT,            -- JSON array
  status            TEXT NOT NULL,
  avatar            TEXT,
  government_id_url TEXT,
  last_login_at     INTEGER,
  joined_at         INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_members_email  ON members (email);
CREATE INDEX IF NOT EXISTS idx_members_org_id ON members (org_id);
CREATE INDEX IF NOT EXISTS idx_members_role   ON members (role);

-- pending_platform_owner_grants (two-step cooldown)
CREATE TABLE IF NOT EXISTS pending_platform_owner_grants (
  id               TEXT PRIMARY KEY NOT NULL,
  requested_by     TEXT NOT NULL,   -- FK → members.id
  target_member_id TEXT NOT NULL,   -- FK → members.id
  requested_at     INTEGER NOT NULL,
  confirms_after   INTEGER NOT NULL,
  expires_at       INTEGER NOT NULL,
  status           TEXT NOT NULL    -- "pending" | "confirmed" | "cancelled" | "expired"
);
CREATE INDEX IF NOT EXISTS idx_ppog_requested_by ON pending_platform_owner_grants (requested_by);
CREATE INDEX IF NOT EXISTS idx_ppog_status       ON pending_platform_owner_grants (status);

-- ============================================================
-- CLINICAL DOMAIN
-- ============================================================

-- pharmacies
CREATE TABLE IF NOT EXISTS pharmacies (
  id               TEXT PRIMARY KEY NOT NULL,
  name             TEXT NOT NULL,
  ncpdp_id         TEXT,
  npi_number       TEXT,
  address          TEXT NOT NULL,   -- JSON object {street, city, state, zip}
  phone            TEXT NOT NULL,
  fax              TEXT,
  email            TEXT,
  type             TEXT NOT NULL,   -- "retail" | "compounding" | "mail_order" | "specialty"
  accepts_eprescribe INTEGER NOT NULL DEFAULT 0,
  operating_hours  TEXT,            -- JSON object
  capabilities     TEXT NOT NULL,   -- JSON array
  tier             INTEGER NOT NULL,
  status           TEXT NOT NULL,
  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL
);
CREATE        INDEX IF NOT EXISTS idx_pharmacies_status   ON pharmacies (status);
CREATE        INDEX IF NOT EXISTS idx_pharmacies_ncpdp_id ON pharmacies (ncpdp_id);
CREATE        INDEX IF NOT EXISTS idx_pharmacies_tier     ON pharmacies (tier);

-- patients
CREATE TABLE IF NOT EXISTS patients (
  id                      TEXT PRIMARY KEY NOT NULL,
  member_id               TEXT NOT NULL,   -- FK → members.id
  email                   TEXT NOT NULL,
  date_of_birth           TEXT NOT NULL,
  gender                  TEXT NOT NULL,
  address                 TEXT NOT NULL,   -- JSON object
  insurance_provider      TEXT,
  insurance_policy_number TEXT,
  insurance_group_number  TEXT,
  primary_pharmacy        TEXT,            -- FK → pharmacies.id
  allergies               TEXT NOT NULL,   -- JSON array
  current_medications     TEXT NOT NULL,   -- JSON array
  medical_conditions      TEXT NOT NULL,   -- JSON array
  emergency_contact       TEXT,            -- JSON object
  consent_signed_at       INTEGER,
  id_verified_at          INTEGER,
  id_verification_status  TEXT NOT NULL,   -- "pending" | "verified" | "rejected"
  state                   TEXT NOT NULL,
  created_at              INTEGER NOT NULL,
  updated_at              INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_patients_member_id  ON patients (member_id);
CREATE INDEX IF NOT EXISTS idx_patients_email      ON patients (email);
CREATE INDEX IF NOT EXISTS idx_patients_state      ON patients (state);
CREATE INDEX IF NOT EXISTS idx_patients_created_at ON patients (created_at);

-- providers
CREATE TABLE IF NOT EXISTS providers (
  id                       TEXT PRIMARY KEY NOT NULL,
  member_id                TEXT NOT NULL,   -- FK → members.id
  email                    TEXT NOT NULL,
  first_name               TEXT NOT NULL,
  last_name                TEXT NOT NULL,
  title                    TEXT NOT NULL,   -- "MD" | "DO" | "PA" | "NP" | "APRN"
  npi_number               TEXT NOT NULL,
  dea_number               TEXT,
  specialties              TEXT NOT NULL,   -- JSON array
  licensed_states          TEXT NOT NULL,   -- JSON array
  license_numbers          TEXT,            -- JSON object {state: licenseNumber}
  accepting_patients       INTEGER NOT NULL DEFAULT 0,
  consultation_rate        INTEGER NOT NULL, -- cents
  availability             TEXT,            -- JSON object
  max_daily_consultations  INTEGER NOT NULL,
  current_queue_size       INTEGER NOT NULL,
  rating                   INTEGER,
  total_consultations      INTEGER NOT NULL,
  status                   TEXT NOT NULL,   -- "active" | "inactive" | "suspended" | "onboarding"
  credential_verified_at   INTEGER,
  created_at               INTEGER NOT NULL,
  updated_at               INTEGER NOT NULL
);
CREATE        INDEX IF NOT EXISTS idx_providers_member_id  ON providers (member_id);
CREATE        INDEX IF NOT EXISTS idx_providers_email      ON providers (email);
CREATE        INDEX IF NOT EXISTS idx_providers_status     ON providers (status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_providers_npi_number ON providers (npi_number);

-- credential_verifications
CREATE TABLE IF NOT EXISTS credential_verifications (
  id                        TEXT PRIMARY KEY NOT NULL,
  member_id                 TEXT NOT NULL,   -- FK → members.id
  email                     TEXT NOT NULL,
  selected_role             TEXT NOT NULL,
  status                    TEXT NOT NULL,
  current_step              TEXT NOT NULL,
  completed_steps           TEXT NOT NULL,   -- JSON array
  -- provider
  provider_npi              TEXT,
  provider_npi_result       TEXT,            -- JSON object
  provider_license_file_id  TEXT,
  provider_license_scan_result TEXT,         -- JSON object
  provider_dea_number       TEXT,
  provider_title            TEXT,
  provider_specialties      TEXT,            -- JSON array
  provider_licensed_states  TEXT,            -- JSON array
  -- patient
  patient_stripe_session_id TEXT,
  patient_stripe_status     TEXT,
  patient_id_scan_result    TEXT,            -- JSON object
  -- pharmacy
  pharmacy_ncpdp_id         TEXT,
  pharmacy_npi              TEXT,
  pharmacy_name             TEXT,
  pharmacy_registry_result  TEXT,            -- JSON object
  -- compliance
  compliance_summary        TEXT,            -- JSON object
  compliance_record_ids     TEXT,            -- JSON array
  -- errors
  errors                    TEXT,            -- JSON array [{step, message, timestamp}]
  retry_count               INTEGER,
  -- timestamps
  started_at                INTEGER NOT NULL,
  completed_at              INTEGER,
  updated_at                INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cred_ver_member_id     ON credential_verifications (member_id);
CREATE INDEX IF NOT EXISTS idx_cred_ver_email         ON credential_verifications (email);
CREATE INDEX IF NOT EXISTS idx_cred_ver_status        ON credential_verifications (status);
CREATE INDEX IF NOT EXISTS idx_cred_ver_selected_role ON credential_verifications (selected_role);

-- intakes
CREATE TABLE IF NOT EXISTS intakes (
  id               TEXT PRIMARY KEY NOT NULL,
  patient_id       TEXT,            -- FK → patients.id
  email            TEXT NOT NULL,
  status           TEXT NOT NULL,   -- "draft" | "in_progress" | "completed" | "expired"
  medical_history  TEXT,            -- JSON object
  current_symptoms TEXT,            -- JSON object
  medications      TEXT,            -- JSON array
  allergies        TEXT,            -- JSON array
  chief_complaint  TEXT,
  symptom_duration TEXT,
  severity_level   INTEGER,
  vital_signs      TEXT,            -- JSON object
  id_verified      INTEGER NOT NULL DEFAULT 0,
  consent_given    INTEGER NOT NULL DEFAULT 0,
  completed_steps  TEXT NOT NULL,   -- JSON array
  triage_result    TEXT,            -- JSON object
  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_intakes_email      ON intakes (email);
CREATE INDEX IF NOT EXISTS idx_intakes_patient_id ON intakes (patient_id);
CREATE INDEX IF NOT EXISTS idx_intakes_status     ON intakes (status);

-- triage_assessments
CREATE TABLE IF NOT EXISTS triage_assessments (
  id                    TEXT PRIMARY KEY NOT NULL,
  intake_id             TEXT NOT NULL,   -- FK → intakes.id
  patient_id            TEXT,            -- FK → patients.id
  urgency_level         TEXT NOT NULL,   -- "emergency" | "urgent" | "standard" | "routine"
  urgency_score         INTEGER NOT NULL,
  recommended_action    TEXT NOT NULL,
  suggested_specialty   TEXT,
  red_flags             TEXT NOT NULL,   -- JSON array
  differential_diagnoses TEXT,           -- JSON array
  drug_interactions     TEXT,            -- JSON array of objects
  ai_confidence_score   INTEGER NOT NULL,
  ai_reasoning          TEXT,
  reviewed_by_provider  INTEGER NOT NULL DEFAULT 0,
  created_at            INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_triage_intake_id      ON triage_assessments (intake_id);
CREATE INDEX IF NOT EXISTS idx_triage_urgency_level  ON triage_assessments (urgency_level);

-- consultations
CREATE TABLE IF NOT EXISTS consultations (
  id                     TEXT PRIMARY KEY NOT NULL,
  patient_id             TEXT NOT NULL,   -- FK → patients.id
  provider_id            TEXT,            -- FK → providers.id
  intake_id              TEXT,            -- FK → intakes.id
  triage_id              TEXT,            -- FK → triage_assessments.id
  type                   TEXT NOT NULL,   -- "video" | "phone" | "chat"
  status                 TEXT NOT NULL,   -- "scheduled" | "waiting" | "in_progress" | "completed" | "cancelled" | "no_show"
  scheduled_at           INTEGER NOT NULL,
  started_at             INTEGER,
  ended_at               INTEGER,
  duration               INTEGER,
  room_url               TEXT,
  room_token             TEXT,
  notes                  TEXT,
  diagnosis              TEXT,
  diagnosis_codes        TEXT,            -- JSON array
  treatment_plan         TEXT,
  follow_up_required     INTEGER NOT NULL DEFAULT 0,
  follow_up_date         INTEGER,
  ai_summary             TEXT,
  ai_suggested_questions TEXT,            -- JSON array
  recording              TEXT,
  patient_state          TEXT NOT NULL,
  cost                   INTEGER NOT NULL, -- cents
  payment_status         TEXT NOT NULL,
  created_at             INTEGER NOT NULL,
  updated_at             INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_consultations_patient_id   ON consultations (patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_provider_id  ON consultations (provider_id);
CREATE INDEX IF NOT EXISTS idx_consultations_status       ON consultations (status);
CREATE INDEX IF NOT EXISTS idx_consultations_scheduled_at ON consultations (scheduled_at);

-- prescriptions
CREATE TABLE IF NOT EXISTS prescriptions (
  id                   TEXT PRIMARY KEY NOT NULL,
  consultation_id      TEXT NOT NULL,   -- FK → consultations.id
  patient_id           TEXT NOT NULL,   -- FK → patients.id
  provider_id          TEXT NOT NULL,   -- FK → providers.id
  pharmacy_id          TEXT,            -- FK → pharmacies.id
  medication_name      TEXT NOT NULL,
  generic_name         TEXT,
  ndc                  TEXT,
  dosage               TEXT NOT NULL,
  form                 TEXT NOT NULL,
  quantity             INTEGER NOT NULL,
  days_supply          INTEGER NOT NULL,
  refills_authorized   INTEGER NOT NULL,
  refills_used         INTEGER NOT NULL,
  directions           TEXT NOT NULL,
  dea_schedule         TEXT,
  status               TEXT NOT NULL,
  eprescribe_id        TEXT,
  sent_to_pharmacy_at  INTEGER,
  filled_at            INTEGER,
  expires_at           INTEGER NOT NULL,
  next_refill_date     INTEGER,
  drug_interactions    TEXT,            -- JSON array
  prior_auth_required  INTEGER NOT NULL DEFAULT 0,
  prior_auth_status    TEXT,
  cost                 INTEGER,
  insurance_covered    INTEGER,
  copay                INTEGER,
  created_at           INTEGER NOT NULL,
  updated_at           INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_prescriptions_consultation_id  ON prescriptions (consultation_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id       ON prescriptions (patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_provider_id      ON prescriptions (provider_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_pharmacy_id      ON prescriptions (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status           ON prescriptions (status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_status   ON prescriptions (patient_id, status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_next_refill      ON prescriptions (next_refill_date);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status_created   ON prescriptions (status, created_at);

-- refill_requests
CREATE TABLE IF NOT EXISTS refill_requests (
  id              TEXT PRIMARY KEY NOT NULL,
  prescription_id TEXT NOT NULL,   -- FK → prescriptions.id
  patient_id      TEXT NOT NULL,   -- FK → patients.id
  pharmacy_id     TEXT,            -- FK → pharmacies.id
  status          TEXT NOT NULL,   -- "requested" | "approved" | "denied" | "filling" | "ready"
  requested_at    INTEGER NOT NULL,
  processed_at    INTEGER,
  processed_by    TEXT,            -- FK → providers.id
  denial_reason   TEXT,
  created_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_refill_requests_prescription_id  ON refill_requests (prescription_id);
CREATE INDEX IF NOT EXISTS idx_refill_requests_patient_id       ON refill_requests (patient_id);
CREATE INDEX IF NOT EXISTS idx_refill_requests_status           ON refill_requests (status);
CREATE INDEX IF NOT EXISTS idx_refill_requests_status_requested ON refill_requests (status, requested_at);

-- follow_ups
CREATE TABLE IF NOT EXISTS follow_ups (
  id                  TEXT PRIMARY KEY NOT NULL,
  consultation_id     TEXT NOT NULL,   -- FK → consultations.id
  patient_id          TEXT NOT NULL,   -- FK → patients.id
  provider_id         TEXT,            -- FK → providers.id
  type                TEXT NOT NULL,
  status              TEXT NOT NULL,
  scheduled_for       INTEGER NOT NULL,
  sent_at             INTEGER,
  responded_at        INTEGER,
  patient_response    TEXT,
  provider_notes      TEXT,
  side_effects        TEXT,            -- JSON array
  satisfaction_rating INTEGER,
  escalated           INTEGER NOT NULL DEFAULT 0,
  created_at          INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_follow_ups_consultation_id ON follow_ups (consultation_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_patient_id      ON follow_ups (patient_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status          ON follow_ups (status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_scheduled_for   ON follow_ups (scheduled_for);

-- video_reviews
CREATE TABLE IF NOT EXISTS video_reviews (
  id                     TEXT PRIMARY KEY NOT NULL,
  consultation_id        TEXT NOT NULL,   -- FK → consultations.id
  patient_id             TEXT NOT NULL,   -- FK → patients.id
  transcript             TEXT NOT NULL,
  summary                TEXT NOT NULL,
  chief_complaint        TEXT NOT NULL,
  requested_medications  TEXT NOT NULL,   -- JSON array
  red_flags              TEXT NOT NULL,   -- JSON array
  contraindications      TEXT NOT NULL,   -- JSON array
  recommended_action     TEXT NOT NULL,
  recommendation_reason  TEXT NOT NULL,
  urgency_level          INTEGER NOT NULL,
  confidence             INTEGER NOT NULL,
  agent_status           TEXT NOT NULL,
  provider_decision      TEXT,
  provider_notes         TEXT,
  provider_email         TEXT,
  decided_at             INTEGER
);
CREATE INDEX IF NOT EXISTS idx_video_reviews_consultation_id ON video_reviews (consultation_id);
CREATE INDEX IF NOT EXISTS idx_video_reviews_patient_id      ON video_reviews (patient_id);
CREATE INDEX IF NOT EXISTS idx_video_reviews_agent_status    ON video_reviews (agent_status);

-- ============================================================
-- BILLING + COMPLIANCE
-- ============================================================

-- billing_records
CREATE TABLE IF NOT EXISTS billing_records (
  id                        TEXT PRIMARY KEY NOT NULL,
  patient_id                TEXT NOT NULL,   -- FK → patients.id
  consultation_id           TEXT,            -- FK → consultations.id
  type                      TEXT NOT NULL,
  amount                    INTEGER NOT NULL, -- cents
  insurance_amount          INTEGER,
  copay                     INTEGER,
  status                    TEXT NOT NULL,
  stripe_payment_intent_id  TEXT,
  insurance_claim_id        TEXT,
  cpt_codes                 TEXT,            -- JSON array
  paid_at                   INTEGER,
  created_at                INTEGER NOT NULL,
  updated_at                INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_billing_patient_id      ON billing_records (patient_id);
CREATE INDEX IF NOT EXISTS idx_billing_consultation_id ON billing_records (consultation_id);
CREATE INDEX IF NOT EXISTS idx_billing_status          ON billing_records (status);
CREATE INDEX IF NOT EXISTS idx_billing_patient_type    ON billing_records (patient_id, type);

-- compliance_records
CREATE TABLE IF NOT EXISTS compliance_records (
  id           TEXT PRIMARY KEY NOT NULL,
  entity_type  TEXT NOT NULL,
  entity_id    TEXT NOT NULL,
  check_type   TEXT NOT NULL,
  status       TEXT NOT NULL,
  details      TEXT,            -- JSON object
  checked_at   INTEGER NOT NULL,
  expires_at   INTEGER,
  checked_by   TEXT
);
CREATE INDEX IF NOT EXISTS idx_compliance_entity    ON compliance_records (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_compliance_status    ON compliance_records (status);
CREATE INDEX IF NOT EXISTS idx_compliance_check_type ON compliance_records (check_type);

-- state_licensing
CREATE TABLE IF NOT EXISTS state_licensing (
  id                        TEXT PRIMARY KEY NOT NULL,
  state                     TEXT NOT NULL,
  telehealth_allowed        INTEGER NOT NULL DEFAULT 0,
  prescribing_rules         TEXT,            -- JSON object
  controlled_substance_rules TEXT,           -- JSON object
  required_license_types    TEXT NOT NULL,   -- JSON array
  cross_state_prescribing   INTEGER NOT NULL DEFAULT 0,
  in_person_required_first  INTEGER NOT NULL DEFAULT 0,
  consent_requirements      TEXT,
  effective_date            INTEGER NOT NULL,
  updated_at                INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_state_licensing_state ON state_licensing (state);

-- ============================================================
-- COMMUNICATION
-- ============================================================

-- notifications
CREATE TABLE IF NOT EXISTS notifications (
  id              TEXT PRIMARY KEY NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_id    TEXT,            -- FK → members.id
  type            TEXT NOT NULL,
  channel         TEXT NOT NULL,
  subject         TEXT NOT NULL,
  body            TEXT NOT NULL,
  status          TEXT NOT NULL,
  sent_at         INTEGER,
  read_at         INTEGER,
  metadata        TEXT,            -- JSON object
  created_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_email ON notifications (recipient_email);
CREATE INDEX IF NOT EXISTS idx_notifications_status          ON notifications (status);
CREATE INDEX IF NOT EXISTS idx_notifications_type            ON notifications (type);

-- messages (patient-provider threaded chat)
CREATE TABLE IF NOT EXISTS messages (
  id              TEXT PRIMARY KEY NOT NULL,
  conversation_id TEXT NOT NULL,
  sender_email    TEXT NOT NULL,
  sender_role     TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  content         TEXT NOT NULL,
  attachments     TEXT,            -- JSON array
  read_at         INTEGER,
  created_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id  ON messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_email  ON messages (recipient_email);

-- fax_logs
CREATE TABLE IF NOT EXISTS fax_logs (
  id              TEXT PRIMARY KEY NOT NULL,
  prescription_id TEXT NOT NULL,   -- FK → prescriptions.id
  pharmacy_id     TEXT NOT NULL,   -- FK → pharmacies.id
  fax_number      TEXT NOT NULL,
  status          TEXT NOT NULL,
  phaxio_fax_id   TEXT,
  pdf_storage_id  TEXT,
  pages           INTEGER,
  error_message   TEXT,
  attempts        INTEGER NOT NULL,
  sent_at         INTEGER,
  confirmed_at    INTEGER,
  created_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fax_logs_prescription_id ON fax_logs (prescription_id);
CREATE INDEX IF NOT EXISTS idx_fax_logs_pharmacy_id     ON fax_logs (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_fax_logs_status          ON fax_logs (status);
CREATE INDEX IF NOT EXISTS idx_fax_logs_created_at      ON fax_logs (created_at);

-- ============================================================
-- AI + SETTINGS
-- ============================================================

-- ai_conversations
CREATE TABLE IF NOT EXISTS ai_conversations (
  id           TEXT PRIMARY KEY NOT NULL,
  email        TEXT NOT NULL,
  messages     TEXT NOT NULL,   -- JSON array [{role, content, page, timestamp}]
  current_page TEXT,
  intake_id    TEXT,            -- FK → intakes.id
  patient_type TEXT,
  collected_data TEXT,          -- JSON object
  org_id       TEXT,            -- FK → organizations.id
  user_role    TEXT,
  model        TEXT,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_email ON ai_conversations (email);

-- settings
CREATE TABLE IF NOT EXISTS settings (
  id          TEXT PRIMARY KEY NOT NULL,
  key         TEXT NOT NULL,
  value       TEXT NOT NULL,   -- JSON any
  updated_at  INTEGER NOT NULL,
  updated_by  TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_key ON settings (key);

-- file_storage
CREATE TABLE IF NOT EXISTS file_storage (
  id          TEXT PRIMARY KEY NOT NULL,
  owner_id    TEXT NOT NULL,
  file_name   TEXT NOT NULL,
  file_type   TEXT NOT NULL,
  file_size   INTEGER NOT NULL,
  storage_id  TEXT,
  url         TEXT,
  purpose     TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_file_storage_owner_id ON file_storage (owner_id);
CREATE INDEX IF NOT EXISTS idx_file_storage_purpose  ON file_storage (purpose);

-- ============================================================
-- AUDIT + SECURITY
-- ============================================================

-- audit_log (immutable append-only)
CREATE TABLE IF NOT EXISTS audit_log (
  id           TEXT PRIMARY KEY NOT NULL,
  action       TEXT NOT NULL,
  actor_email  TEXT NOT NULL,
  actor_role   TEXT,
  entity_type  TEXT NOT NULL,
  entity_id    TEXT NOT NULL,
  changes      TEXT,            -- JSON object
  ip_address   TEXT,
  created_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_email ON audit_log (actor_email);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity      ON audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at  ON audit_log (created_at);

-- security_events (immutable privileged-action trail — NO UPDATE/DELETE ever)
CREATE TABLE IF NOT EXISTS security_events (
  id               TEXT PRIMARY KEY NOT NULL,
  action           TEXT NOT NULL,
  actor_member_id  TEXT,
  actor_org_id     TEXT,
  target_id        TEXT,
  target_type      TEXT,
  diff             TEXT,            -- JSON object {from, to}
  success          INTEGER NOT NULL DEFAULT 0,
  reason           TEXT,
  ip_address       TEXT,
  user_agent       TEXT,
  timestamp        INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_security_events_action          ON security_events (action);
CREATE INDEX IF NOT EXISTS idx_security_events_actor_member_id ON security_events (actor_member_id);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp       ON security_events (timestamp);

-- agent_logs
CREATE TABLE IF NOT EXISTS agent_logs (
  id            TEXT PRIMARY KEY NOT NULL,
  agent_name    TEXT NOT NULL,
  action        TEXT NOT NULL,
  input         TEXT,            -- JSON any
  output        TEXT,            -- JSON any
  success       INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  duration_ms   INTEGER,
  metadata      TEXT,            -- JSON object
  created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_agent_logs_agent_name ON agent_logs (agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created_at ON agent_logs (created_at);

-- ============================================================
-- AGENT INFRASTRUCTURE (Paperclip-style)
-- ============================================================

-- agent_tickets
CREATE TABLE IF NOT EXISTS agent_tickets (
  id               TEXT PRIMARY KEY NOT NULL,
  ticket_id        TEXT NOT NULL,   -- human-readable "TKT-20240101-AB12CD"
  type             TEXT NOT NULL,
  status           TEXT NOT NULL,
  priority         INTEGER NOT NULL,
  assigned_agent   TEXT NOT NULL,
  patient_email    TEXT,
  consultation_id  TEXT,            -- FK → consultations.id
  intake_id        TEXT,            -- FK → intakes.id
  input            TEXT NOT NULL,   -- JSON serialized
  output           TEXT,            -- JSON serialized
  error            TEXT,
  tokens_used      INTEGER,
  started_at       INTEGER,
  completed_at     INTEGER,
  created_at       INTEGER NOT NULL,
  parent_ticket_id TEXT,
  child_ticket_ids TEXT            -- JSON array
);
CREATE INDEX IF NOT EXISTS idx_agent_tickets_status        ON agent_tickets (status);
CREATE INDEX IF NOT EXISTS idx_agent_tickets_agent         ON agent_tickets (assigned_agent);
CREATE INDEX IF NOT EXISTS idx_agent_tickets_type          ON agent_tickets (type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_tickets_ticket_id ON agent_tickets (ticket_id);
CREATE INDEX IF NOT EXISTS idx_agent_tickets_priority      ON agent_tickets (priority);

-- agent_budgets
CREATE TABLE IF NOT EXISTS agent_budgets (
  id                     TEXT PRIMARY KEY NOT NULL,
  agent_name             TEXT NOT NULL,
  monthly_token_budget   INTEGER NOT NULL,
  tokens_used_this_month INTEGER NOT NULL,
  alert_threshold        INTEGER NOT NULL, -- stored as fraction * 1000 (e.g. 800 = 0.8)
  paused                 INTEGER NOT NULL DEFAULT 0,
  month                  TEXT NOT NULL,    -- "2026-03"
  last_reset_at          INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_agent_budgets_agent ON agent_budgets (agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_budgets_month ON agent_budgets (month);

-- agent_roles
CREATE TABLE IF NOT EXISTS agent_roles (
  id                         TEXT PRIMARY KEY NOT NULL,
  agent_name                 TEXT NOT NULL,
  title                      TEXT NOT NULL,
  department                 TEXT NOT NULL,
  reports_to                 TEXT,
  manages                    TEXT,            -- JSON array
  goal                       TEXT NOT NULL,
  heartbeat_interval_minutes INTEGER,
  active                     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_agent_roles_agent      ON agent_roles (agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_roles_department ON agent_roles (department);

-- company_goals
CREATE TABLE IF NOT EXISTS company_goals (
  id             TEXT PRIMARY KEY NOT NULL,
  level          TEXT NOT NULL,   -- "mission" | "project" | "task"
  title          TEXT NOT NULL,
  description    TEXT NOT NULL,
  owner_agent    TEXT,
  parent_goal_id TEXT,            -- FK → company_goals.id (self-referential)
  status         TEXT NOT NULL,
  metrics        TEXT            -- JSON string {target, current, unit}
);
CREATE INDEX IF NOT EXISTS idx_company_goals_level ON company_goals (level);
CREATE INDEX IF NOT EXISTS idx_company_goals_owner ON company_goals (owner_agent);

-- ============================================================
-- MARKETING
-- ============================================================

-- marketing_content
CREATE TABLE IF NOT EXISTS marketing_content (
  id              TEXT PRIMARY KEY NOT NULL,
  type            TEXT NOT NULL,
  topic           TEXT NOT NULL,
  target_keyword  TEXT,
  platform        TEXT,
  content         TEXT NOT NULL,
  status          TEXT NOT NULL,
  generated_at    INTEGER NOT NULL,
  published_at    INTEGER,
  performance     TEXT            -- JSON string {clicks, impressions, conversions}
);
CREATE INDEX IF NOT EXISTS idx_marketing_content_type   ON marketing_content (type);
CREATE INDEX IF NOT EXISTS idx_marketing_content_status ON marketing_content (status);
