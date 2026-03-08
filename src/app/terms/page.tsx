import type { Metadata } from 'next';
import ScriptsXOLegalLayout from '@/components/ScriptsXOLegalLayout';

export const metadata: Metadata = {
    title: 'Terms of Service — ScriptsXO',
    description: 'ScriptsXO Terms of Service. Read the terms governing your use of our telehealth prescription platform.',
};

export default function TermsPage() {
    return (
        <ScriptsXOLegalLayout title="Terms of Service" breadcrumb="Terms of Service" effectiveDate="Last updated: March 2026">
            <Section title="Acceptance of Terms">
                <p>By accessing or using ScriptsXO (&quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree, do not use the Service.</p>
            </Section>
            <Section title="Eligibility">
                <ul>
                    <li>You must be <strong>18 years of age or older</strong> to use ScriptsXO.</li>
                    <li>The Service is available to individuals in supported states at the time of consultation.</li>
                    <li>You must provide accurate identity and health information. Providing false information may result in account termination and is potentially unlawful.</li>
                </ul>
            </Section>
            <Section title="The Service">
                <p>ScriptsXO connects patients with licensed providers for telehealth consultations. You will complete an intake form and record a brief video. A licensed provider will review your submission and determine whether to approve or decline a prescription request.</p>
                <ul>
                    <li><strong>No guarantee of approval:</strong> Providers may decline prescription requests at their sole professional discretion, without obligation to provide an explanation. A membership fee does not guarantee a prescription.</li>
                    <li><strong>Provider independence:</strong> Providers on our platform are independent licensed professionals. Their clinical decisions are not directed by ScriptsXO.</li>
                    <li><strong>Scope limitations:</strong> We do not prescribe controlled substances, psychiatric medications, or handle conditions requiring in-person physical examination.</li>
                </ul>
            </Section>
            <Section title="Subscription and Billing">
                <ul>
                    <li>ScriptsXO offers a <strong>$97/month membership</strong> that provides access to the platform and provider consultations.</li>
                    <li>Subscriptions renew automatically each month until cancelled.</li>
                    <li>You may <strong>cancel at any time</strong> through your account settings or by contacting support. Cancellation takes effect at the end of the current billing period.</li>
                    <li>Refunds are not provided for partial billing periods, except where required by law.</li>
                </ul>
            </Section>
            <Section title="User Obligations">
                <p>You agree to:</p>
                <ul>
                    <li>Provide truthful and complete health information during intake and consultations</li>
                    <li>Use the Service solely for lawful, personal healthcare purposes</li>
                    <li>Not attempt to obtain prescriptions for others or for non-personal use</li>
                    <li>Maintain the security of your account credentials</li>
                    <li>Not interfere with or disrupt the Service or its infrastructure</li>
                </ul>
            </Section>
            <Section title="Intellectual Property">
                <p>All content, software, and materials on ScriptsXO are the property of ScriptsXO or its licensors and are protected by applicable intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written permission.</p>
            </Section>
            <Section title="Disclaimers and Limitation of Liability">
                <p>THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. SCRIPTSXO DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT ANY PARTICULAR TREATMENT OUTCOME WILL RESULT.</p>
                <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, SCRIPTSXO SHALL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE.</p>
            </Section>
            <Section title="Governing Law">
                <p>These Terms are governed by applicable law. Any disputes shall be resolved in the appropriate jurisdiction.</p>
            </Section>
            <Section title="Changes to Terms">
                <p>We may update these Terms from time to time. We will notify you of material changes via email or a notice on the platform. Continued use of the Service after changes constitutes acceptance of the updated Terms.</p>
            </Section>
            <Section title="Contact">
                <p>For questions about these Terms, contact us at <a href="mailto:legal@scriptsxo.com" style={{ color: 'var(--primary)' }}>legal@scriptsxo.com</a></p>
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
