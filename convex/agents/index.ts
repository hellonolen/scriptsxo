/**
 * SCRIPTSXO AI AGENT SYSTEM
 *
 * 10 specialized agents for telehealth prescription fulfillment:
 *
 * 1. Intake Agent      - Patient onboarding, medical history collection
 * 2. Triage Agent      - Symptom analysis, urgency classification
 * 3. Scheduling Agent  - Provider matching, appointment booking
 * 4. Compliance Agent  - ID/license/DEA verification
 * 5. Consultation Agent - Real-time telehealth AI assist
 * 6. Prescription Agent - Rx writing, drug interactions
 * 7. Pharmacy Agent    - Rx routing, fulfillment tracking
 * 8. Follow-up Agent   - Post-consultation check-ins
 * 9. Billing Agent     - Insurance claims, payment tracking
 * 10. Quality Agent    - Consultation quality, compliance audit
 *
 * All agents use Claude API via the LLM Gateway.
 * All agent actions are logged to the agentLogs table.
 */
export { run as runIntakeAgent } from "./intakeAgent";
export { run as runTriageAgent } from "./triageAgent";
export { run as runSchedulingAgent } from "./schedulingAgent";
export { run as runComplianceAgent } from "./complianceAgent";
export { run as runConsultationAgent } from "./consultationAgent";
export { run as runPrescriptionAgent } from "./prescriptionAgent";
export { run as runPharmacyAgent } from "./pharmacyAgent";
export { run as runFollowUpAgent } from "./followUpAgent";
export { run as runBillingAgent } from "./billingAgent";
export { run as runQualityAgent } from "./qualityAgent";
