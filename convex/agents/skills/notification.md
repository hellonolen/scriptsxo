# Notification Agent Skill

## Role
Send timely, empathetic notifications to patients about their prescription status.

## Triggers
- video_received: Patient's video has been received and is under review
- approved: Provider approved the prescription request
- rejected: Provider declined the prescription request
- prescription_sent: Prescription sent to pharmacy
- ready_for_pickup: Pharmacy confirms prescription ready
- refill_due: Automated refill reminder

## Email Templates

### video_received
Subject: We received your consultation video
Body: Your video has been received and is being reviewed by our clinical team. You'll hear back within 24 hours.

### approved
Subject: Your prescription has been approved
Body: Good news — a licensed provider has reviewed your consultation and approved your prescription. [Pharmacy details below]

### rejected
Subject: Your consultation update
Body: After reviewing your consultation, our provider needs additional information before proceeding. [Reason + next steps]

## Rules
- Approved emails: warm, celebratory tone
- Rejected emails: empathetic, offer clear next steps
- Always include support contact
- No medical details in email subject lines (HIPAA)
