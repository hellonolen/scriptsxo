import type { Metadata } from 'next';
import ScriptsXOLegalLayout from '@/components/ScriptsXOLegalLayout';

export const metadata: Metadata = {
    title: 'Privacy Policy — ScriptsXO',
    description: 'ScriptsXO Privacy Policy. Learn how we collect, use, and protect your personal and health information.',
};

export default function PrivacyPage() {
    return (
        <ScriptsXOLegalLayout title="Privacy Policy" breadcrumb="Privacy Policy" effectiveDate="Last updated: March 2026">
            <Section title="Introduction">
                <p>ScriptsXO operates the ScriptsXO platform. This Privacy Policy describes how we collect, use, disclose, and protect your information when you use our platform at scriptsxo.com. By using ScriptsXO, you agree to the practices described in this policy.</p>
            </Section>
            <Section title="Information We Collect">
                <p>We collect the following categories of information:</p>
                <ul>
                    <li><strong>Identity information:</strong> Full name, date of birth, and government-issued ID for identity verification.</li>
                    <li><strong>Contact information:</strong> Email address and, if provided, phone number.</li>
                    <li><strong>Health information:</strong> Symptoms, medical history, current medications, allergies, and other information you provide during intake.</li>
                    <li><strong>Video recordings:</strong> Async video responses you record in response to provider questions during a consultation.</li>
                    <li><strong>Payment information:</strong> Billing details processed securely through our payment processor. We do not store full card numbers.</li>
                    <li><strong>Device and usage data:</strong> Browser type, IP address, pages visited, and access timestamps, collected automatically.</li>
                </ul>
            </Section>
            <Section title="How We Use Your Information">
                <p>We use your information to:</p>
                <ul>
                    <li>Facilitate medical consultations with licensed providers</li>
                    <li>Process and transmit prescription requests to pharmacies</li>
                    <li>Verify your identity and maintain account security</li>
                    <li>Process payments for our subscription service</li>
                    <li>Communicate service updates and notifications</li>
                    <li>Comply with applicable legal and regulatory requirements</li>
                    <li>Improve our platform and detect fraudulent activity</li>
                </ul>
            </Section>
            <Section title="HIPAA Compliance">
                <p>ScriptsXO is a Covered Entity under the Health Insurance Portability and Accountability Act (HIPAA). Your Protected Health Information (PHI) is handled in accordance with HIPAA Privacy and Security Rules.</p>
                <p>For a complete description of your HIPAA rights, see our <a href="/hipaa" style={{ color: 'var(--primary)' }}>HIPAA Notice of Privacy Practices</a>.</p>
            </Section>
            <Section title="Data Retention">
                <ul>
                    <li><strong>Video recordings:</strong> Deleted 90 days after your consultation is completed, unless retention is required by law.</li>
                    <li><strong>Medical records:</strong> Retained for the period required by applicable law (minimum 5 years for adult patients).</li>
                    <li><strong>Account data:</strong> Retained while your account is active and for up to 3 years after closure.</li>
                    <li><strong>Payment records:</strong> Retained as required for tax and legal compliance purposes.</li>
                </ul>
            </Section>
            <Section title="Sharing Your Information">
                <p>We share your information only as described below:</p>
                <ul>
                    <li><strong>Licensed providers:</strong> Providers on our platform receive your intake information and video to conduct consultations.</li>
                    <li><strong>Pharmacies:</strong> Prescription details are transmitted to your chosen pharmacy for fulfillment.</li>
                    <li><strong>Service providers:</strong> We use third-party vendors for payment processing, cloud infrastructure, and communications, all bound by confidentiality agreements.</li>
                    <li><strong>Legal requirements:</strong> We may disclose information when required by law, court order, or to protect safety.</li>
                </ul>
                <p>We do not sell your personal or health information.</p>
            </Section>
            <Section title="Your Rights">
                <p>You have the right to:</p>
                <ul>
                    <li>Access the personal information we hold about you</li>
                    <li>Request correction of inaccurate information</li>
                    <li>Request deletion of your account and associated data</li>
                    <li>Opt out of non-essential communications</li>
                    <li>Lodge a complaint with the applicable regulatory authority</li>
                </ul>
            </Section>
            <Section title="Security">
                <p>We implement industry-standard security measures including encryption in transit (TLS) and at rest, access controls, and regular security reviews.</p>
            </Section>
            <Section title="Contact">
                <p>For privacy-related questions, contact us at <a href="mailto:privacy@scriptsxo.com" style={{ color: 'var(--primary)' }}>privacy@scriptsxo.com</a></p>
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
