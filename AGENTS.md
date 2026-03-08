# ScriptsXO — Agentic Company Definition

## Mission
Deliver safe, legal, same-day telehealth prescriptions for common conditions through a fully autonomous intake-to-pharmacy pipeline.

---

## Org Chart

### CEO (ConductorAgent)
- Reports to: Board (human)
- Manages: All department heads
- Goal: Ensure all patient cases move through the pipeline without stalling
- Heartbeat: Every 15 minutes — audit all in-flight tickets, escalate stalled ones

---

### Clinical Department

**IntakeAgent** — Clinical Intake Specialist
- Goal: Process every new patient submission within 5 minutes
- Triggers: New intake form submitted
- Outputs: Structured intake record, triage request ticket

**TriageAgent** — Clinical Triage Officer
- Goal: Assess every intake for urgency and eligibility within 2 minutes
- Triggers: IntakeAgent closes ticket
- Outputs: Urgency score (1-5), eligibility verdict, video review request

**VideoReviewAgent** — Async Consultation Analyst
- Goal: Analyze every patient video within 10 minutes of upload
- Triggers: Video uploaded to storage
- Outputs: Clinical summary, red flags, recommendation (approve/reject/more_info)

**ComplianceAgent** — HIPAA & Licensing Officer
- Goal: Validate provider credentials and state licensing for every prescription
- Triggers: Provider decision made
- Outputs: Compliance clearance or block

---

### Prescription Department

**PrescriptionAgent** — Rx Drafter
- Goal: Draft prescription within 2 minutes of provider approval
- Triggers: Provider approves video review
- Outputs: Structured prescription ready for pharmacy routing

**PharmacyAgent** — Fulfillment Coordinator
- Goal: Route prescription to optimal pharmacy and track to delivery
- Triggers: PrescriptionAgent closes ticket
- Outputs: Pharmacy assignment, fulfillment status updates

---

### Patient Experience Department

**NotificationAgent** — Patient Communications
- Goal: Notify patient at every status change within 60 seconds
- Triggers: Any status change on intake, consultation, prescription, fulfillment
- Outputs: Email sent confirmation

**FollowUpAgent** — Care Continuity Specialist
- Goal: Check in with every patient 48 hours post-prescription
- Triggers: Scheduled 48h after prescription ready
- Outputs: Patient satisfaction data, side effect flags, refill needs

**BillingAgent** — Revenue Operations
- Goal: Process and reconcile all payments, flag failed charges
- Triggers: New consultation, prescription, or follow-up
- Outputs: Billing record, insurance claim if applicable

---

### Marketing Department

**MarketingAgent** — Content & SEO Strategist
- Goal: Publish 3 SEO articles/week, generate ad copy for active campaigns
- Heartbeat: Daily at 9am UTC
- Outputs: Blog posts (draft status), ad copy variants stored in marketingContent

---

## Budget Allocation (Monthly Token Budget)

| Agent | Monthly Token Budget | Alert At |
|-------|---------------------|----------|
| ConductorAgent | 5,000,000 | 80% |
| IntakeAgent | 2,000,000 | 80% |
| TriageAgent | 3,000,000 | 80% |
| VideoReviewAgent | 8,000,000 | 80% |
| ComplianceAgent | 2,000,000 | 80% |
| PrescriptionAgent | 3,000,000 | 80% |
| PharmacyAgent | 1,000,000 | 80% |
| NotificationAgent | 500,000 | 80% |
| FollowUpAgent | 2,000,000 | 80% |
| BillingAgent | 1,000,000 | 80% |
| MarketingAgent | 10,000,000 | 80% |

---

## Escalation Rules

- Urgency 5 (emergency): Immediate human notification via email
- Stalled ticket (>30 min no activity): ConductorAgent escalates
- Budget alert (>80%): Admin notified, agent continues
- Budget exhausted (100%): Agent pauses, admin notified
- Compliance block: Halt pipeline, notify admin immediately

---

## Pipeline Flow (Self-Driving)

```
Patient submits intake form
  → IntakeAgent creates intake ticket
    → TriageAgent creates triage ticket
      → VideoReviewAgent creates videoReview ticket
        → Provider approves
          → PrescriptionAgent creates prescription ticket
          → NotificationAgent creates notification ticket (approved)
            → PharmacyAgent creates pharmacy ticket
              → NotificationAgent creates notification ticket (ready for pickup)
                → FollowUpAgent ticket (48h later)
```

---

## Ticket States

```
queued → in_progress → complete
                    → failed → (retry or escalate)
                    → escalated → (human intervention)
```

---

## Agent Memory

Each agent is stateless between heartbeats. State lives in:
- `agentTickets` — current work queue
- `agentLogs` — immutable action history
- `agentBudgets` — token consumption tracking
- Domain tables — `intakes`, `consultations`, `prescriptions`, etc.
