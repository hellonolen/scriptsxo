'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronDown, Check, Shield } from 'lucide-react';

const PLAN_FEATURES = [
    'Unlimited consultation requests',
    'Licensed provider review — every request',
    'E-prescription sent to any pharmacy',
    'Secure health records dashboard',
    'HIPAA-compliant messaging',
    'Identity verification included',
    'Available in 50+ states',
    'Cancel anytime — no contracts',
] as const;

const FEATURE_CATEGORIES = [
    {
        category: 'Provider & Clinical',
        items: [
            { label: 'Licensed provider review', included: true },
            { label: 'Async video consultation', included: true },
            { label: 'Unlimited consultation requests', included: true },
            { label: 'In-person visit required', included: false },
        ],
    },
    {
        category: 'Prescriptions',
        items: [
            { label: 'E-prescription delivery', included: true },
            { label: 'Send to any pharmacy', included: true },
            { label: 'Mail-order pharmacy support', included: true },
            { label: 'Controlled substances', included: false },
        ],
    },
    {
        category: 'Privacy & Security',
        items: [
            { label: 'HIPAA-compliant records', included: true },
            { label: 'Encrypted in transit & at rest', included: true },
            { label: 'Identity verification', included: true },
            { label: 'Data never sold', included: true },
        ],
    },
    {
        category: 'Membership',
        items: [
            { label: 'Month-to-month billing', included: true },
            { label: 'Cancel anytime', included: true },
            { label: 'No cancellation fees', included: true },
            { label: 'Annual commitment required', included: false },
        ],
    },
] as const;

const FAQS = [
    { q: 'What is included in the $97/month membership?', a: 'Everything — unlimited consultation requests, licensed provider review for each request, e-prescription delivery to your pharmacy, secure health records, and HIPAA-compliant messaging. No per-visit fees, no hidden charges.' },
    { q: 'How do I cancel?', a: 'Cancel anytime directly from your account settings. No phone call required, no cancellation fee. Your membership ends at the close of your current billing period.' },
    { q: 'Is this covered by insurance?', a: 'The membership fee is not typically covered by insurance, but it is FSA/HSA eligible. The prescription itself — once approved and sent to your pharmacy — is usually covered by your insurance under your normal pharmacy benefit.' },
    { q: 'What medications are available?', a: 'ScriptsXO handles common chronic-condition medications: blood pressure, cholesterol, thyroid, diabetes, and others. We do not prescribe controlled substances or medications that require in-person physical examination.' },
    { q: 'What if my request is not approved?', a: 'If the provider declines your request, you are not charged for that consultation. The provider will explain the reason and may recommend next steps.' },
    { q: 'Do I need to see a provider in person first?', a: 'No. ScriptsXO is designed for patients who already know what they need and have an established condition. You complete an intake form and record a short video — no in-person visit required.' },
] as const;

function FaqItem({ q, a, open, onClick }: { q: string; a: string; open: boolean; onClick: () => void }) {
    return (
        <div className="border-b border-[var(--border)] last:border-b-0">
            <button type="button" onClick={onClick} className="w-full flex items-start justify-between gap-4 py-6 text-left">
                <span className="text-base font-bold text-[var(--foreground)] leading-snug">{q}</span>
                <ChevronDown className="w-5 h-5 text-[var(--muted-foreground)] flex-shrink-0 mt-0.5 transition-transform duration-300" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </button>
            {open && <p className="pb-6 text-sm leading-relaxed text-[var(--muted-foreground)]">{a}</p>}
        </div>
    );
}

export default function PricingPage() {
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    return (
        <main>
            {/* HERO */}
            <section className="relative bg-[var(--sidebar-background)] overflow-hidden">
                <div className="absolute inset-0 opacity-[0.04]" aria-hidden="true">
                    <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.06]" style={{ background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)' }} aria-hidden="true" />
                <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-24 md:py-32 lg:py-40">
                    <div className="flex items-center gap-3 mb-8">
                        <span className="accent-line w-12" />
                        <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">Membership</span>
                    </div>
                    <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[0.92] tracking-tight text-white max-w-4xl">
                        One flat rate. Everything included<span style={{ color: 'var(--sidebar-primary)' }}>.</span>
                    </h1>
                    <p className="mt-8 text-base md:text-lg text-white/50 max-w-2xl leading-relaxed">
                        No per-visit fees. No hidden charges. One monthly membership covers unlimited consultation requests and provider review.
                    </p>
                    <div className="mt-20 md:mt-28 border-t border-white/[0.06]" />
                </div>
            </section>

            {/* PLAN CARD */}
            <section className="bg-[var(--background)]">
                <div className="max-w-3xl mx-auto px-6 lg:px-8 py-20 md:py-28">
                    <div className="relative rounded-2xl border-2 border-[var(--primary)] bg-white shadow-[0_8px_40px_rgba(91,33,182,0.12)] overflow-hidden">
                        {/* Badge */}
                        <div className="absolute top-6 right-6">
                            <div className="px-3 py-1 rounded-full bg-[var(--primary)] text-white text-xs font-bold uppercase tracking-wider">
                                Most Popular
                            </div>
                        </div>

                        <div className="p-8 md:p-12">
                            {/* Accent line + name */}
                            <span className="accent-line w-8 mb-4" />
                            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)] mb-2">ScriptsXO</p>
                            <h2 className="text-2xl font-black text-[var(--foreground)] mb-6">Membership</h2>

                            {/* Price */}
                            <div className="flex items-end gap-2 mb-2">
                                <span className="text-6xl font-black text-[var(--foreground)] leading-none">$97</span>
                                <span className="text-sm text-[var(--muted-foreground)] mb-2">/ month</span>
                            </div>
                            <p className="text-xs text-[var(--muted-foreground)] mb-8">Billed monthly. Cancel anytime.</p>

                            {/* Features */}
                            <ul className="space-y-4 mb-10">
                                {PLAN_FEATURES.map((f) => (
                                    <li key={f} className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-full bg-[var(--primary)]/[0.08] flex items-center justify-center flex-shrink-0">
                                            <Check className="w-3 h-3 text-[var(--primary)]" />
                                        </div>
                                        <span className="text-sm text-[var(--foreground)]">{f}</span>
                                    </li>
                                ))}
                            </ul>

                            <Link
                                href="/login"
                                className="group w-full inline-flex items-center justify-center gap-4 px-8 py-4 text-white font-medium text-sm rounded-full transition-all duration-300 hover:scale-[1.02] btn-gradient shadow-[0_8px_30px_rgba(124,58,237,0.3)]"
                            >
                                Get Started
                                <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </span>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* FEATURE GRID */}
            <section className="bg-[var(--secondary)]">
                <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 md:py-28">
                    <div className="text-center mb-16">
                        <div className="flex items-center justify-center gap-3 mb-6">
                            <span className="accent-line w-12" />
                            <span className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Everything Included</span>
                            <span className="accent-line w-12" />
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black tracking-tight text-[var(--foreground)] leading-[1.1]">
                            What your membership covers<span className="text-[var(--primary)]">.</span>
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {FEATURE_CATEGORIES.map((cat) => (
                            <div key={cat.category} className="bg-white rounded-2xl border border-[var(--border)] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                                <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-[var(--muted-foreground)] mb-5">{cat.category}</h3>
                                <ul className="space-y-4">
                                    {cat.items.map((item) => (
                                        <li key={item.label} className="flex items-center gap-3">
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${item.included ? 'bg-green-50' : 'bg-[var(--border)]/50'}`}>
                                                {item.included
                                                    ? <Check className="w-3 h-3 text-green-600" />
                                                    : <span className="w-2.5 h-0.5 rounded-full bg-[var(--muted-foreground)]/30 block" />
                                                }
                                            </div>
                                            <span className={`text-sm ${item.included ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)] line-through opacity-50'}`}>
                                                {item.label}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* TRUST */}
            <section className="bg-[var(--background)]">
                <div className="max-w-3xl mx-auto px-6 lg:px-8 py-20 md:py-28 text-center">
                    <div className="w-14 h-14 rounded-full bg-[var(--primary)]/[0.08] flex items-center justify-center mx-auto mb-6">
                        <Shield className="w-7 h-7 text-[var(--primary)]" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--foreground)] mb-4">
                        No commitment. Cancel when you want<span className="text-[var(--primary)]">.</span>
                    </h2>
                    <p className="text-base text-[var(--muted-foreground)] leading-relaxed max-w-xl mx-auto">
                        ScriptsXO runs month to month. Cancel from your account settings in 30 seconds — no phone call, no waiting period, no fees. Your access continues until the end of your current billing period.
                    </p>
                </div>
            </section>

            {/* FAQ */}
            <section className="bg-[var(--secondary)]">
                <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 md:py-28">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
                        <div className="lg:col-span-4">
                            <div className="sticky top-[88px]">
                                <div className="flex items-center gap-3 mb-6">
                                    <span className="accent-line w-12" />
                                    <span className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">FAQ</span>
                                </div>
                                <h2 className="text-3xl md:text-4xl font-black tracking-tight text-[var(--foreground)] leading-[1.1]">
                                    Pricing questions<span className="text-[var(--primary)]">.</span>
                                </h2>
                                <p className="mt-4 text-sm text-[var(--muted-foreground)] leading-relaxed">
                                    Something else?{' '}
                                    <a href="mailto:hello@scriptsxo.com" className="text-[var(--primary)] hover:underline">hello@scriptsxo.com</a>
                                </p>
                            </div>
                        </div>
                        <div className="lg:col-span-8 bg-white rounded-2xl border border-[var(--border)] p-6 md:p-8 self-start">
                            {FAQS.map((faq, i) => (
                                <FaqItem key={faq.q} q={faq.q} a={faq.a} open={openFaq === i} onClick={() => setOpenFaq(openFaq === i ? null : i)} />
                            ))}
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
                        <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">Join Today</span>
                        <span className="accent-line w-12" />
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-[1.05]">
                        Get your prescription<span style={{ color: 'var(--sidebar-primary)' }}>.</span>
                    </h2>
                    <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
                        <Link href="/login" className="group inline-flex items-center gap-4 px-8 py-4 text-white font-medium text-sm rounded-full transition-all duration-300 hover:scale-[1.03] btn-gradient shadow-[0_8px_30px_rgba(124,58,237,0.3)]">
                            Start for $97/mo
                            <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                                <ArrowRight className="w-4 h-4" />
                            </span>
                        </Link>
                    </div>
                    <p className="mt-4 text-xs text-white/30 font-mono">Cancel anytime. No commitment.</p>
                </div>
            </section>
        </main>
    );
}
