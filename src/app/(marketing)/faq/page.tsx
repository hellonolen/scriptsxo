'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ArrowRight } from 'lucide-react';

const FAQ_SECTIONS = [
    {
        category: 'Getting Started',
        questions: [
            {
                q: 'What is ScriptsXO?',
                a: 'ScriptsXO is a membership-based telehealth service for people who need common chronic-condition prescriptions — blood pressure, cholesterol, thyroid, diabetes management, and others. You complete a short intake form, record a brief video, and a licensed provider reviews it. No appointment, no waiting room.',
            },
            {
                q: 'Do I need to see a provider in person first?',
                a: 'No. ScriptsXO is designed for patients who already have an established condition and know what they need. You complete your intake online and record a short video — no in-person visit required. The provider reviews everything asynchronously.',
            },
            {
                q: 'What states do you operate in?',
                a: 'ScriptsXO operates in 50+ states. During signup we confirm that we have licensed providers in your state.',
            },
            {
                q: 'How do I get started?',
                a: 'Sign up for a membership, complete your health intake form, record a short video, and submit. A licensed provider in your state will review your request. If approved, your prescription is sent electronically to your preferred pharmacy.',
            },
        ],
    },
    {
        category: 'Providers & Prescriptions',
        questions: [
            {
                q: 'Who reviews my prescription request?',
                a: 'A licensed provider — physician or nurse practitioner — licensed in your state reviews every request. No automated approvals, no unlicensed shortcuts. A real provider makes every clinical decision.',
            },
            {
                q: 'How long does a review take?',
                a: 'Most requests are reviewed the same day, often within a few hours of submission. You will receive a notification the moment a decision is made.',
            },
            {
                q: 'What medications are available?',
                a: 'ScriptsXO handles common chronic-condition medications: blood pressure (lisinopril, amlodipine, metoprolol), cholesterol (atorvastatin, rosuvastatin), thyroid (levothyroxine), diabetes management (metformin), and others. We do not prescribe controlled substances (Schedule II-V) or medications requiring in-person physical examination.',
            },
            {
                q: 'What if my request is not approved?',
                a: 'If the provider declines your request, you will not be charged for that review. The provider will explain their reasoning and may suggest an alternative course of action. Denials are not always final — the provider may recommend re-submitting with additional information.',
            },
            {
                q: 'Where is my prescription sent?',
                a: 'Approved prescriptions are sent electronically to any pharmacy you choose — your local pharmacy, a chain, or a mail-order service. You specify your preferred pharmacy during intake.',
            },
            {
                q: 'Can I request refills?',
                a: 'Yes. Your membership covers unlimited consultation requests, including refill requests. When you need a refill, submit a new intake — the process is the same.',
            },
        ],
    },
    {
        category: 'Privacy & Security',
        questions: [
            {
                q: 'Is ScriptsXO HIPAA-compliant?',
                a: 'Yes. All records are encrypted in transit and at rest. ScriptsXO is fully HIPAA-compliant. Your health information is never sold, never shared with advertisers, and only accessed by the provider reviewing your request.',
            },
            {
                q: 'What do you do with my health data?',
                a: 'Your health data is used solely to facilitate your provider review and to maintain your medical records on the platform. We do not sell your data, share it with third parties, or use it for advertising.',
            },
            {
                q: 'Is my video stored? Who sees it?',
                a: 'Yes, your video is stored securely and encrypted. Only the licensed provider assigned to your review can view it. It is retained as part of your medical record.',
            },
            {
                q: 'What is identity verification?',
                a: 'Before your first prescription request, we verify your identity using government-issued ID. This ensures care is accurate, prevents fraud, and is required by law for telehealth prescribing in most states.',
            },
        ],
    },
    {
        category: 'Membership & Billing',
        questions: [
            {
                q: 'How much does ScriptsXO cost?',
                a: '$97 per month. That covers unlimited consultation requests, licensed provider review for each request, and e-prescription delivery. No per-visit fees, no hidden charges.',
            },
            {
                q: 'What does the membership include?',
                a: 'Everything: unlimited consultation requests, licensed provider review, e-prescription delivery to your preferred pharmacy, secure health records dashboard, HIPAA-compliant records, and identity verification.',
            },
            {
                q: 'How do I cancel?',
                a: 'Cancel anytime from your account settings — no phone call required, no cancellation fee. Your access continues through the end of your current billing period.',
            },
            {
                q: 'Is this covered by insurance?',
                a: 'The $97 membership fee is not typically covered by insurance, but it may be FSA/HSA eligible. The prescription medication itself — once sent to your pharmacy — is usually covered under your normal pharmacy benefit.',
            },
            {
                q: 'Will I be charged if my request is denied?',
                a: 'No. If a provider declines your request, you will not be charged for that review cycle.',
            },
        ],
    },
] as const;

function FaqItem({ q, a, open, onClick }: { q: string; a: string; open: boolean; onClick: () => void }) {
    return (
        <div className="border-b border-[var(--border)] last:border-b-0">
            <button
                type="button"
                onClick={onClick}
                className="w-full flex items-start justify-between gap-4 py-5 text-left"
            >
                <span className="text-base font-bold text-[var(--foreground)] leading-snug">{q}</span>
                <ChevronDown
                    className="w-5 h-5 text-[var(--muted-foreground)] flex-shrink-0 mt-0.5 transition-transform duration-300"
                    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
            </button>
            {open && <p className="pb-5 text-sm leading-relaxed text-[var(--muted-foreground)]">{a}</p>}
        </div>
    );
}

export default function FAQPage() {
    const [openItem, setOpenItem] = useState<string | null>(null);
    const toggle = (key: string) => setOpenItem(openItem === key ? null : key);

    return (
        <main>
            {/* HERO */}
            <section className="relative bg-[var(--sidebar-background)] overflow-hidden">
                <div className="absolute inset-0 opacity-[0.04]" aria-hidden="true">
                    <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.06]" style={{ background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)' }} aria-hidden="true" />
                <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-24 md:py-32">
                    <div className="flex items-center gap-3 mb-8">
                        <span className="accent-line w-12" />
                        <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">FAQ</span>
                    </div>
                    <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-[0.92] tracking-tight text-white max-w-4xl">
                        Common questions<span style={{ color: 'var(--sidebar-primary)' }}>.</span>
                    </h1>
                    <p className="mt-8 text-base md:text-lg text-white/50 max-w-xl leading-relaxed">
                        Everything you want to know about ScriptsXO — how it works, what it costs, and how we protect your information.
                    </p>
                    <div className="mt-16 border-t border-white/[0.06]" />
                </div>
            </section>

            {/* FAQ CONTENT */}
            <section className="bg-[var(--background)]">
                <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 md:py-28">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">

                        {/* Sticky sidebar */}
                        <aside className="lg:col-span-3">
                            <div className="sticky top-[88px]">
                                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--muted-foreground)] mb-4">Categories</p>
                                <ul className="space-y-1">
                                    {FAQ_SECTIONS.map((section) => (
                                        <li key={section.category}>
                                            <a
                                                href={`#${section.category.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and')}`}
                                                className="block px-3 py-2 rounded-lg text-sm text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--secondary)] transition-colors"
                                            >
                                                {section.category}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                                <div className="mt-10 pt-8 border-t border-[var(--border)]">
                                    <p className="text-sm text-[var(--muted-foreground)] mb-3">Still have questions?</p>
                                    <a href="mailto:hello@scriptsxo.com" className="text-sm font-bold text-[var(--primary)] hover:underline">
                                        hello@scriptsxo.com
                                    </a>
                                </div>
                            </div>
                        </aside>

                        {/* Main content */}
                        <div className="lg:col-span-9 space-y-16">
                            {FAQ_SECTIONS.map((section) => {
                                const anchorId = section.category.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');
                                return (
                                    <div key={section.category} id={anchorId}>
                                        <div className="flex items-center gap-3 mb-6">
                                            <span className="accent-line w-8" />
                                            <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                                                {section.category}
                                            </h2>
                                        </div>
                                        <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
                                            <div className="px-6 md:px-8 divide-y divide-[var(--border)]">
                                                {section.questions.map((item, i) => {
                                                    const key = `${section.category}-${i}`;
                                                    return (
                                                        <FaqItem
                                                            key={key}
                                                            q={item.q}
                                                            a={item.a}
                                                            open={openItem === key}
                                                            onClick={() => toggle(key)}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="relative bg-[var(--sidebar-background)] overflow-hidden">
                <div className="absolute inset-0 opacity-[0.03]" aria-hidden="true">
                    <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '120px 120px' }} />
                </div>
                <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full opacity-[0.08]" style={{ background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)' }} aria-hidden="true" />
                <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-24 md:py-32 text-center">
                    <div className="flex items-center justify-center gap-3 mb-8">
                        <span className="accent-line w-12" />
                        <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">Get Started</span>
                        <span className="accent-line w-12" />
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-[1.05]">
                        Get your prescription<span style={{ color: 'var(--sidebar-primary)' }}>.</span>
                    </h2>
                    <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
                        <Link href="/login" className="group inline-flex items-center gap-4 px-8 py-4 text-white font-medium text-sm rounded-full transition-all duration-300 hover:scale-[1.03] btn-gradient shadow-[0_8px_30px_rgba(124,58,237,0.3)]">
                            Join ScriptsXO
                            <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                                <ArrowRight className="w-4 h-4" />
                            </span>
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
