import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, Shield, ShieldCheck, ScrollText } from 'lucide-react';
import ScriptsXOLegalLayout from '@/components/ScriptsXOLegalLayout';

export const metadata: Metadata = {
    title: 'Legal Center — ScriptsXO',
    description: 'ScriptsXO legal documents and policies. Terms, privacy, and HIPAA information in one place.',
};

const POLICY_SECTIONS = [
    {
        category: 'Legal Documents',
        items: [
            {
                icon: FileText,
                title: 'Terms of Service',
                description: 'Rules and conditions governing your use of ScriptsXO, including subscription terms, acceptable use, and limitations of liability.',
                href: '/terms',
                updated: 'March 2026',
            },
            {
                icon: Shield,
                title: 'Privacy Policy',
                description: 'How we collect, use, store, and protect your personal information and health data when you use our platform.',
                href: '/privacy',
                updated: 'March 2026',
            },
            {
                icon: ShieldCheck,
                title: 'HIPAA Notice of Privacy Practices',
                description: 'Your rights regarding protected health information, how we use and disclose your PHI, and how to file a complaint.',
                href: '/hipaa',
                updated: 'March 2026',
            },
        ],
    },
] as const;

export default function LegalCenterPage() {
    return (
        <ScriptsXOLegalLayout title="Legal Center">
            <p
                className="mb-12 text-base md:text-lg leading-relaxed"
                style={{ color: 'var(--muted-foreground)' }}
            >
                All ScriptsXO policies and legal documents in one place.
            </p>

            {POLICY_SECTIONS.map((section) => (
                <div key={section.category} className="mb-16 last:mb-0">
                    <h2
                        className="text-xs font-mono uppercase tracking-[0.15em] mb-6"
                        style={{ color: 'var(--muted-foreground)' }}
                    >
                        {section.category}
                    </h2>

                    <div className="grid grid-cols-1 gap-4">
                        {section.items.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.title}
                                    href={item.href}
                                    className="group block p-6 rounded-xl border transition-all duration-200 hover:-translate-y-0.5"
                                    style={{
                                        border: '1px solid var(--border)',
                                        background: 'var(--card)',
                                    }}
                                >
                                    <div className="flex items-start gap-4">
                                        <div
                                            className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                                            style={{ background: 'rgba(91,33,182,0.08)' }}
                                        >
                                            <Icon className="w-5 h-5" style={{ color: 'var(--primary)' }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3
                                                className="text-base font-semibold transition-colors group-hover:text-[var(--primary)]"
                                                style={{ color: 'var(--foreground)' }}
                                            >
                                                {item.title}
                                            </h3>
                                            <p
                                                className="mt-2 text-sm leading-relaxed"
                                                style={{ color: 'var(--muted-foreground)' }}
                                            >
                                                {item.description}
                                            </p>
                                            <p
                                                className="mt-3 text-xs font-mono"
                                                style={{ color: 'var(--muted-foreground)', opacity: 0.6 }}
                                            >
                                                Effective {item.updated}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            ))}

            {/* Contact */}
            <div
                className="mt-16 p-8 rounded-xl border"
                style={{ border: '1px solid var(--border)', background: 'var(--card)' }}
            >
                <div className="flex items-start gap-4">
                    <ScrollText className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color: 'var(--primary)' }} />
                    <div>
                        <h3
                            className="text-base font-semibold"
                            style={{ color: 'var(--foreground)' }}
                        >
                            Questions about our policies?
                        </h3>
                        <p
                            className="mt-2 text-sm leading-relaxed"
                            style={{ color: 'var(--muted-foreground)' }}
                        >
                            Contact us at{' '}
                            <a
                                href="mailto:legal@scriptsxo.com"
                                className="hover:underline"
                                style={{ color: 'var(--primary)' }}
                            >
                                legal@scriptsxo.com
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </ScriptsXOLegalLayout>
    );
}
