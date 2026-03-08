import type { Metadata } from 'next';
import ScriptsXOLegalLayout from '@/components/ScriptsXOLegalLayout';

export const metadata: Metadata = {
    title: 'HIPAA Notice of Privacy Practices — ScriptsXO',
    description: 'ScriptsXO HIPAA Notice of Privacy Practices. Your rights regarding your protected health information.',
};

export default function HipaaPage() {
    return (
        <ScriptsXOLegalLayout title="HIPAA Notice of Privacy Practices" breadcrumb="HIPAA Notice" effectiveDate="Effective date: March 2026">
            <div style={{ background: 'rgba(91,33,182,0.06)', borderRadius: 10, padding: '20px 24px', marginBottom: 40, border: '1px solid rgba(91,33,182,0.18)' }}>
                <p style={{ fontSize: 13, color: 'var(--primary)', margin: 0, fontWeight: 500 }}>
                    <strong>Covered Entity:</strong> ScriptsXO — telehealth prescription platform.
                </p>
                <p style={{ fontSize: 13, color: 'var(--primary)', marginTop: 8, marginBottom: 0 }}>
                    This notice describes how medical information about you may be used and disclosed, and how you can access this information. <strong>Please review it carefully.</strong>
                </p>
            </div>

            <Section title="What Is Protected Health Information (PHI)?">
                <p>Protected Health Information (PHI) is any information that relates to your past, present, or future physical or mental health, the healthcare services provided to you, or the payment for those services — and that can reasonably be used to identify you. This includes your name, health conditions, video recordings, and prescription history on our platform.</p>
            </Section>

            <Section title="How We Use and Disclose Your PHI">
                <p>We may use and disclose your PHI in the following ways:</p>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', marginTop: 20, marginBottom: 8 }}>Treatment</h3>
                <p>We share your PHI with providers who review your intake and video to conduct consultations and determine whether to issue a prescription. We also transmit prescription details to your designated pharmacy for fulfillment.</p>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', marginTop: 20, marginBottom: 8 }}>Payment</h3>
                <p>We may use your PHI to process payments for services rendered, including submitting information to payment processors.</p>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', marginTop: 20, marginBottom: 8 }}>Healthcare Operations</h3>
                <p>We may use your PHI for internal operations such as quality assessment, provider credentialing, compliance audits, training, and platform improvement. These uses are limited and do not permit sale of your data.</p>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', marginTop: 20, marginBottom: 8 }}>As Required by Law</h3>
                <p>We will disclose your PHI when required by federal or state law, court order, or to respond to a subpoena. We will disclose the minimum necessary information in such cases.</p>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', marginTop: 20, marginBottom: 8 }}>Public Health and Safety</h3>
                <p>We may disclose PHI to public health authorities, law enforcement, or to avert a serious and imminent threat to health or safety, as permitted by HIPAA.</p>
            </Section>

            <Section title="Your Rights Regarding Your PHI">
                <p>You have the following rights with respect to your Protected Health Information:</p>
                <ul>
                    <li><strong>Right to Access:</strong> You may request a copy of your medical records and other PHI we hold. We will provide access within 30 days of your request.</li>
                    <li><strong>Right to Amend:</strong> If you believe your PHI is inaccurate or incomplete, you may request that we amend it.</li>
                    <li><strong>Right to Restrict:</strong> You may request that we restrict how we use or disclose your PHI. We are not always required to agree to restrictions.</li>
                    <li><strong>Right to an Accounting:</strong> You may request a list of disclosures we have made of your PHI, subject to certain exceptions.</li>
                    <li><strong>Right to Portable Copy:</strong> You may request your PHI in a structured, machine-readable format.</li>
                    <li><strong>Right to Complain:</strong> You may file a complaint with us or with the U.S. Department of Health and Human Services. We will not retaliate against you for filing a complaint.</li>
                    <li><strong>Right to a Paper Copy:</strong> You may request a paper copy of this Notice at any time.</li>
                </ul>
            </Section>

            <Section title="Uses Requiring Your Authorization">
                <p>The following uses and disclosures require your written authorization:</p>
                <ul>
                    <li>Marketing communications (other than treatment reminders)</li>
                    <li>Sale of your PHI to third parties</li>
                    <li>Psychotherapy notes</li>
                    <li>Most uses of PHI not described in this Notice</li>
                </ul>
                <p>You may revoke any authorization in writing at any time.</p>
            </Section>

            <Section title="Our Duties">
                <p>We are required by law to:</p>
                <ul>
                    <li>Maintain the privacy and security of your PHI</li>
                    <li>Provide you with this Notice of Privacy Practices</li>
                    <li>Notify you in the event of a breach of your unsecured PHI</li>
                    <li>Abide by the terms of the Notice currently in effect</li>
                </ul>
            </Section>

            <Section title="Contact Our Privacy Officer">
                <p>To exercise your rights, submit a complaint, or ask questions about this Notice, contact our Privacy Officer:</p>
                <p><strong>Email:</strong> <a href="mailto:hipaa@scriptsxo.com" style={{ color: 'var(--primary)' }}>hipaa@scriptsxo.com</a></p>
                <p>To file a complaint with the federal government:<br /><strong>U.S. Department of Health and Human Services</strong><br />Office for Civil Rights<br /><a href="https://www.hhs.gov/hipaa/filing-a-complaint" style={{ color: 'var(--primary)' }} target="_blank" rel="noopener noreferrer">hhs.gov/hipaa/filing-a-complaint</a></p>
            </Section>
        </ScriptsXOLegalLayout>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--foreground)', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>{title}</h2>
            <div style={{ fontSize: 14, lineHeight: 1.75 }}>{children}</div>
        </div>
    );
}
