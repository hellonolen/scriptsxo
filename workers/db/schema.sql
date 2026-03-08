-- ScriptsXO D1 Schema
-- Migrated from Convex schema.ts
-- 2026-03-08

-- ─── AUTH ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS passkeys (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  device_type TEXT,
  backed_up INTEGER DEFAULT 0,
  transports TEXT, -- JSON array
  login_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER,
  recovery_pin_hash TEXT,
  recovery_setup_at INTEGER,
  payment_status TEXT,
  paid_at INTEGER,
  stripe_customer_id TEXT,
  stripe_session_id TEXT,
  discord_user_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_passkeys_email ON passkeys(email);
CREATE INDEX IF NOT EXISTS idx_passkeys_credential_id ON passkeys(credential_id);

CREATE TABLE IF NOT EXISTS auth_challenges (
  id TEXT PRIMARY KEY,
  challenge TEXT NOT NULL UNIQUE,
  email TEXT,
  type TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER,
  rate_limit_key TEXT
);
CREATE INDEX IF NOT EXISTS idx_auth_challenges_challenge ON auth_challenges(challenge);

CREATE TABLE IF NOT EXISTS magic_links (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_magic_links_email ON magic_links(email);
CREATE INDEX IF NOT EXISTS idx_magic_links_email_code ON magic_links(email, code);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  session_token TEXT NOT NULL UNIQUE,
  member_id TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_used_at INTEGER,
  user_agent TEXT,
  ip_address TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_member_id ON sessions(member_id);
CREATE INDEX IF NOT EXISTS idx_sessions_email ON sessions(email);

-- ─── ORGANIZATIONS ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  subscription_tier TEXT,
  whop_membership_id TEXT,
  max_providers INTEGER,
  max_patients INTEGER,
  terminology_mode TEXT DEFAULT 'client',
  cap_allow TEXT, -- JSON array
  cap_deny TEXT,  -- JSON array
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(type);

-- ─── MEMBERS ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  org_id TEXT REFERENCES organizations(id),
  email TEXT NOT NULL,
  phone TEXT,
  name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  dob TEXT,
  role TEXT NOT NULL,
  org_role TEXT,
  permissions TEXT NOT NULL DEFAULT '[]', -- JSON array
  is_platform_owner INTEGER DEFAULT 0,
  cap_allow TEXT, -- JSON array
  cap_deny TEXT,  -- JSON array
  status TEXT NOT NULL,
  avatar TEXT,
  government_id_url TEXT,
  last_login_at INTEGER,
  joined_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_org_id ON members(org_id);
CREATE INDEX IF NOT EXISTS idx_members_role ON members(role);

-- ─── PATIENTS ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id),
  email TEXT NOT NULL,
  date_of_birth TEXT NOT NULL,
  gender TEXT NOT NULL,
  address_street TEXT NOT NULL,
  address_city TEXT NOT NULL,
  address_state TEXT NOT NULL,
  address_zip TEXT NOT NULL,
  insurance_provider TEXT,
  insurance_policy_number TEXT,
  insurance_group_number TEXT,
  primary_pharmacy_id TEXT,
  allergies TEXT NOT NULL DEFAULT '[]',         -- JSON array
  current_medications TEXT NOT NULL DEFAULT '[]', -- JSON array
  medical_conditions TEXT NOT NULL DEFAULT '[]',  -- JSON array
  emergency_contact TEXT, -- JSON object
  consent_signed_at INTEGER,
  id_verified_at INTEGER,
  id_verification_status TEXT NOT NULL DEFAULT 'pending',
  state TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_patients_member_id ON patients(member_id);
CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email);
CREATE INDEX IF NOT EXISTS idx_patients_state ON patients(state);
CREATE INDEX IF NOT EXISTS idx_patients_created_at ON patients(created_at);

-- ─── PROVIDERS ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS providers (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id),
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  title TEXT NOT NULL,
  npi_number TEXT NOT NULL UNIQUE,
  dea_number TEXT,
  specialties TEXT NOT NULL DEFAULT '[]',       -- JSON array
  licensed_states TEXT NOT NULL DEFAULT '[]',   -- JSON array
  license_numbers TEXT,                         -- JSON object
  accepting_patients INTEGER NOT NULL DEFAULT 1,
  consultation_rate INTEGER NOT NULL,
  availability TEXT,                            -- JSON object
  max_daily_consultations INTEGER NOT NULL,
  current_queue_size INTEGER NOT NULL DEFAULT 0,
  rating REAL,
  total_consultations INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'onboarding',
  credential_verified_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_providers_member_id ON providers(member_id);
CREATE INDEX IF NOT EXISTS idx_providers_email ON providers(email);
CREATE INDEX IF NOT EXISTS idx_providers_status ON providers(status);
CREATE INDEX IF NOT EXISTS idx_providers_npi ON providers(npi_number);

-- ─── PHARMACIES ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pharmacies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ncpdp_id TEXT UNIQUE,
  npi_number TEXT,
  address_street TEXT NOT NULL,
  address_city TEXT NOT NULL,
  address_state TEXT NOT NULL,
  address_zip TEXT NOT NULL,
  phone TEXT NOT NULL,
  fax TEXT,
  email TEXT,
  type TEXT NOT NULL,
  accepts_eprescribe INTEGER NOT NULL DEFAULT 0,
  operating_hours TEXT, -- JSON object
  capabilities TEXT NOT NULL DEFAULT '[]', -- JSON array
  tier INTEGER NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pharmacies_status ON pharmacies(status);
CREATE INDEX IF NOT EXISTS idx_pharmacies_ncpdp ON pharmacies(ncpdp_id);
CREATE INDEX IF NOT EXISTS idx_pharmacies_tier ON pharmacies(tier);

-- ─── INTAKES ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS intakes (
  id TEXT PRIMARY KEY,
  patient_id TEXT REFERENCES patients(id),
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  medical_history TEXT,     -- JSON
  current_symptoms TEXT,    -- JSON
  medications TEXT,         -- JSON array
  allergies TEXT,           -- JSON array
  chief_complaint TEXT,
  symptom_duration TEXT,
  severity_level INTEGER,
  vital_signs TEXT,         -- JSON
  id_verified INTEGER NOT NULL DEFAULT 0,
  consent_given INTEGER NOT NULL DEFAULT 0,
  completed_steps TEXT NOT NULL DEFAULT '[]', -- JSON array
  triage_result TEXT,       -- JSON
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_intakes_email ON intakes(email);
CREATE INDEX IF NOT EXISTS idx_intakes_patient_id ON intakes(patient_id);
CREATE INDEX IF NOT EXISTS idx_intakes_status ON intakes(status);

-- ─── TRIAGE ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS triage_assessments (
  id TEXT PRIMARY KEY,
  intake_id TEXT NOT NULL REFERENCES intakes(id),
  patient_id TEXT REFERENCES patients(id),
  urgency_level TEXT NOT NULL,
  urgency_score INTEGER NOT NULL,
  recommended_action TEXT NOT NULL,
  suggested_specialty TEXT,
  red_flags TEXT NOT NULL DEFAULT '[]',           -- JSON array
  differential_diagnoses TEXT,                    -- JSON array
  drug_interactions TEXT,                         -- JSON array
  ai_confidence_score REAL NOT NULL,
  ai_reasoning TEXT,
  reviewed_by_provider INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_triage_intake_id ON triage_assessments(intake_id);
CREATE INDEX IF NOT EXISTS idx_triage_urgency ON triage_assessments(urgency_level);

-- ─── CONSULTATIONS ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS consultations (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id),
  provider_id TEXT REFERENCES providers(id),
  intake_id TEXT REFERENCES intakes(id),
  triage_id TEXT REFERENCES triage_assessments(id),
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  scheduled_at INTEGER NOT NULL,
  started_at INTEGER,
  ended_at INTEGER,
  duration INTEGER,
  room_url TEXT,
  room_token TEXT,
  notes TEXT,
  diagnosis TEXT,
  diagnosis_codes TEXT,  -- JSON array
  treatment_plan TEXT,
  follow_up_required INTEGER NOT NULL DEFAULT 0,
  follow_up_date INTEGER,
  ai_summary TEXT,
  ai_suggested_questions TEXT, -- JSON array
  recording TEXT,
  patient_state TEXT NOT NULL,
  cost INTEGER NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_consultations_patient_id ON consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_provider_id ON consultations(provider_id);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);
CREATE INDEX IF NOT EXISTS idx_consultations_scheduled_at ON consultations(scheduled_at);

-- ─── PRESCRIPTIONS ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS prescriptions (
  id TEXT PRIMARY KEY,
  consultation_id TEXT NOT NULL REFERENCES consultations(id),
  patient_id TEXT NOT NULL REFERENCES patients(id),
  provider_id TEXT NOT NULL REFERENCES providers(id),
  pharmacy_id TEXT REFERENCES pharmacies(id),
  medication_name TEXT NOT NULL,
  generic_name TEXT,
  ndc TEXT,
  dosage TEXT NOT NULL,
  form TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  days_supply INTEGER NOT NULL,
  refills_authorized INTEGER NOT NULL DEFAULT 0,
  refills_used INTEGER NOT NULL DEFAULT 0,
  directions TEXT NOT NULL,
  dea_schedule TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  eprescribe_id TEXT,
  sent_to_pharmacy_at INTEGER,
  filled_at INTEGER,
  expires_at INTEGER NOT NULL,
  next_refill_date INTEGER,
  drug_interactions TEXT, -- JSON array
  prior_auth_required INTEGER NOT NULL DEFAULT 0,
  prior_auth_status TEXT,
  cost INTEGER,
  insurance_covered INTEGER,
  copay INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_prescriptions_consultation_id ON prescriptions(consultation_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_provider_id ON prescriptions(provider_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_pharmacy_id ON prescriptions(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_status ON prescriptions(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_next_refill ON prescriptions(next_refill_date);

-- ─── REFILL REQUESTS ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS refill_requests (
  id TEXT PRIMARY KEY,
  prescription_id TEXT NOT NULL REFERENCES prescriptions(id),
  patient_id TEXT NOT NULL REFERENCES patients(id),
  pharmacy_id TEXT REFERENCES pharmacies(id),
  status TEXT NOT NULL DEFAULT 'requested',
  requested_at INTEGER NOT NULL,
  processed_at INTEGER,
  processed_by TEXT REFERENCES providers(id),
  denial_reason TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_refill_requests_prescription_id ON refill_requests(prescription_id);
CREATE INDEX IF NOT EXISTS idx_refill_requests_patient_id ON refill_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_refill_requests_status ON refill_requests(status);

-- ─── FOLLOW-UPS ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS follow_ups (
  id TEXT PRIMARY KEY,
  consultation_id TEXT NOT NULL REFERENCES consultations(id),
  patient_id TEXT NOT NULL REFERENCES patients(id),
  provider_id TEXT REFERENCES providers(id),
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  scheduled_for INTEGER NOT NULL,
  sent_at INTEGER,
  responded_at INTEGER,
  patient_response TEXT,
  provider_notes TEXT,
  side_effects TEXT, -- JSON array
  satisfaction_rating INTEGER,
  escalated INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_follow_ups_consultation_id ON follow_ups(consultation_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_patient_id ON follow_ups(patient_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON follow_ups(status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_scheduled_for ON follow_ups(scheduled_for);

-- ─── BILLING ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS billing_records (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id),
  consultation_id TEXT REFERENCES consultations(id),
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  insurance_amount INTEGER,
  copay INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id TEXT,
  insurance_claim_id TEXT,
  cpt_codes TEXT, -- JSON array
  paid_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_billing_patient_id ON billing_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_billing_consultation_id ON billing_records(consultation_id);
CREATE INDEX IF NOT EXISTS idx_billing_status ON billing_records(status);

-- ─── COMPLIANCE ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS compliance_records (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  check_type TEXT NOT NULL,
  status TEXT NOT NULL,
  details TEXT, -- JSON
  checked_at INTEGER NOT NULL,
  expires_at INTEGER,
  checked_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_compliance_entity ON compliance_records(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_compliance_status ON compliance_records(status);
CREATE INDEX IF NOT EXISTS idx_compliance_check_type ON compliance_records(check_type);

-- ─── STATE LICENSING ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS state_licensing (
  id TEXT PRIMARY KEY,
  state TEXT NOT NULL UNIQUE,
  telehealth_allowed INTEGER NOT NULL DEFAULT 1,
  prescribing_rules TEXT,        -- JSON
  controlled_substance_rules TEXT, -- JSON
  required_license_types TEXT NOT NULL DEFAULT '[]', -- JSON array
  cross_state_prescribing INTEGER NOT NULL DEFAULT 0,
  in_person_required_first INTEGER NOT NULL DEFAULT 0,
  consent_requirements TEXT,
  effective_date INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_state_licensing_state ON state_licensing(state);

-- ─── NOTIFICATIONS ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  recipient_email TEXT NOT NULL,
  recipient_id TEXT REFERENCES members(id),
  type TEXT NOT NULL,
  channel TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at INTEGER,
  read_at INTEGER,
  metadata TEXT, -- JSON
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_email ON notifications(recipient_email);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- ─── MESSAGES ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  content TEXT NOT NULL,
  attachments TEXT, -- JSON array
  read_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_email ON messages(recipient_email);

-- ─── FAX LOGS ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fax_logs (
  id TEXT PRIMARY KEY,
  prescription_id TEXT NOT NULL REFERENCES prescriptions(id),
  pharmacy_id TEXT NOT NULL REFERENCES pharmacies(id),
  fax_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  phaxio_fax_id TEXT,
  pdf_r2_key TEXT,
  pages INTEGER,
  error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  sent_at INTEGER,
  confirmed_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fax_logs_prescription_id ON fax_logs(prescription_id);
CREATE INDEX IF NOT EXISTS idx_fax_logs_pharmacy_id ON fax_logs(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_fax_logs_status ON fax_logs(status);
CREATE INDEX IF NOT EXISTS idx_fax_logs_created_at ON fax_logs(created_at);

-- ─── VIDEO REVIEWS ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS video_reviews (
  id TEXT PRIMARY KEY,
  consultation_id TEXT NOT NULL REFERENCES consultations(id),
  patient_id TEXT NOT NULL REFERENCES patients(id),
  transcript TEXT NOT NULL,
  summary TEXT NOT NULL,
  chief_complaint TEXT NOT NULL,
  requested_medications TEXT NOT NULL DEFAULT '[]', -- JSON array
  red_flags TEXT NOT NULL DEFAULT '[]',             -- JSON array
  contraindications TEXT NOT NULL DEFAULT '[]',     -- JSON array
  recommended_action TEXT NOT NULL,
  recommendation_reason TEXT NOT NULL,
  urgency_level INTEGER NOT NULL,
  confidence REAL NOT NULL,
  agent_status TEXT NOT NULL DEFAULT 'pending',
  provider_decision TEXT,
  provider_notes TEXT,
  provider_email TEXT,
  decided_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_video_reviews_consultation_id ON video_reviews(consultation_id);
CREATE INDEX IF NOT EXISTS idx_video_reviews_patient_id ON video_reviews(patient_id);
CREATE INDEX IF NOT EXISTS idx_video_reviews_agent_status ON video_reviews(agent_status);

-- ─── CREDENTIAL VERIFICATIONS ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS credential_verifications (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id),
  email TEXT NOT NULL,
  selected_role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  current_step TEXT NOT NULL,
  completed_steps TEXT NOT NULL DEFAULT '[]', -- JSON array
  provider_npi TEXT,
  provider_npi_result TEXT,       -- JSON
  provider_license_file_id TEXT,
  provider_license_scan_result TEXT, -- JSON
  provider_dea_number TEXT,
  provider_title TEXT,
  provider_specialties TEXT,      -- JSON array
  provider_licensed_states TEXT,  -- JSON array
  patient_stripe_session_id TEXT,
  patient_stripe_status TEXT,
  patient_id_scan_result TEXT,    -- JSON
  pharmacy_ncpdp_id TEXT,
  pharmacy_npi TEXT,
  pharmacy_name TEXT,
  pharmacy_registry_result TEXT,  -- JSON
  compliance_summary TEXT,        -- JSON
  compliance_record_ids TEXT,     -- JSON array
  errors TEXT,                    -- JSON array
  retry_count INTEGER DEFAULT 0,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cred_verifications_member_id ON credential_verifications(member_id);
CREATE INDEX IF NOT EXISTS idx_cred_verifications_email ON credential_verifications(email);
CREATE INDEX IF NOT EXISTS idx_cred_verifications_status ON credential_verifications(status);

-- ─── AGENT INFRASTRUCTURE ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agent_tickets (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  priority INTEGER NOT NULL DEFAULT 3,
  assigned_agent TEXT NOT NULL,
  patient_email TEXT,
  consultation_id TEXT REFERENCES consultations(id),
  intake_id TEXT REFERENCES intakes(id),
  input TEXT NOT NULL,
  output TEXT,
  error TEXT,
  tokens_used INTEGER,
  started_at INTEGER,
  completed_at INTEGER,
  created_at INTEGER NOT NULL,
  parent_ticket_id TEXT,
  child_ticket_ids TEXT -- JSON array
);
CREATE INDEX IF NOT EXISTS idx_agent_tickets_status ON agent_tickets(status);
CREATE INDEX IF NOT EXISTS idx_agent_tickets_agent ON agent_tickets(assigned_agent);
CREATE INDEX IF NOT EXISTS idx_agent_tickets_type ON agent_tickets(type);
CREATE INDEX IF NOT EXISTS idx_agent_tickets_priority ON agent_tickets(priority);

CREATE TABLE IF NOT EXISTS agent_budgets (
  id TEXT PRIMARY KEY,
  agent_name TEXT NOT NULL,
  monthly_token_budget INTEGER NOT NULL,
  tokens_used_this_month INTEGER NOT NULL DEFAULT 0,
  alert_threshold REAL NOT NULL DEFAULT 0.8,
  paused INTEGER NOT NULL DEFAULT 0,
  month TEXT NOT NULL,
  last_reset_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_agent_budgets_agent ON agent_budgets(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_budgets_month ON agent_budgets(month);

CREATE TABLE IF NOT EXISTS agent_roles (
  id TEXT PRIMARY KEY,
  agent_name TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  department TEXT NOT NULL,
  reports_to TEXT,
  manages TEXT,   -- JSON array
  goal TEXT NOT NULL,
  heartbeat_interval_minutes INTEGER,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_agent_roles_agent ON agent_roles(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_roles_department ON agent_roles(department);

CREATE TABLE IF NOT EXISTS company_goals (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  owner_agent TEXT,
  parent_goal_id TEXT REFERENCES company_goals(id),
  status TEXT NOT NULL DEFAULT 'active',
  metrics TEXT -- JSON
);
CREATE INDEX IF NOT EXISTS idx_company_goals_level ON company_goals(level);
CREATE INDEX IF NOT EXISTS idx_company_goals_owner ON company_goals(owner_agent);

-- ─── AUDIT / SECURITY ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  actor_role TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  changes TEXT, -- JSON
  ip_address TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_email ON audit_log(actor_email);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

CREATE TABLE IF NOT EXISTS security_events (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  actor_member_id TEXT,
  actor_org_id TEXT,
  target_id TEXT,
  target_type TEXT,
  diff TEXT,    -- JSON
  success INTEGER NOT NULL,
  reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  timestamp INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_security_events_action ON security_events(action);
CREATE INDEX IF NOT EXISTS idx_security_events_actor ON security_events(actor_member_id);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp);

CREATE TABLE IF NOT EXISTS pending_platform_owner_grants (
  id TEXT PRIMARY KEY,
  requested_by TEXT NOT NULL REFERENCES members(id),
  target_member_id TEXT NOT NULL REFERENCES members(id),
  requested_at INTEGER NOT NULL,
  confirms_after INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
);
CREATE INDEX IF NOT EXISTS idx_ppog_requested_by ON pending_platform_owner_grants(requested_by);
CREATE INDEX IF NOT EXISTS idx_ppog_status ON pending_platform_owner_grants(status);

-- ─── AGENT LOGS ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agent_logs (
  id TEXT PRIMARY KEY,
  agent_name TEXT NOT NULL,
  action TEXT NOT NULL,
  input TEXT,  -- JSON
  output TEXT, -- JSON
  success INTEGER NOT NULL,
  error_message TEXT,
  duration_ms INTEGER,
  metadata TEXT, -- JSON
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_agent_logs_agent_name ON agent_logs(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created_at ON agent_logs(created_at);

-- ─── RATE LIMITS ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rate_limits (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  count INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL,
  window_ms INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key);

-- ─── FILE STORAGE ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS file_storage (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  r2_key TEXT,
  url TEXT,
  purpose TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_file_storage_owner_id ON file_storage(owner_id);
CREATE INDEX IF NOT EXISTS idx_file_storage_purpose ON file_storage(purpose);

-- ─── AI CONVERSATIONS ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_conversations (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  messages TEXT NOT NULL DEFAULT '[]', -- JSON array
  current_page TEXT,
  intake_id TEXT REFERENCES intakes(id),
  patient_type TEXT,
  collected_data TEXT, -- JSON
  org_id TEXT REFERENCES organizations(id),
  user_role TEXT,
  model TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_email ON ai_conversations(email);

-- ─── SETTINGS ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL, -- JSON
  updated_at INTEGER NOT NULL,
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- ─── MARKETING CONTENT ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS marketing_content (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  topic TEXT NOT NULL,
  target_keyword TEXT,
  platform TEXT,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  generated_at INTEGER NOT NULL,
  published_at INTEGER,
  performance TEXT -- JSON
);
CREATE INDEX IF NOT EXISTS idx_marketing_content_type ON marketing_content(type);
CREATE INDEX IF NOT EXISTS idx_marketing_content_status ON marketing_content(status);
