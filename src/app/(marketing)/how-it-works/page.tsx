'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronDown, ClipboardList, Video, UserCheck, CheckCircle, CreditCard, Package } from 'lucide-react';

const STEPS = [
    {
        number: '01',
        headline: 'Complete your intake.',
        copy: 'Tell us what medication you need and why. Answer a short health questionnaire — takes about 5 minutes. No appointment, no waiting on hold.',
        visual: 'intake' as const,
    },
    {
        number: '02',
        headline: 'Record a short video.',
        copy: 'Record a brief video describing your symptoms or what you\'re looking for. The provider watches this as part of their review — no live call required.',
        visual: 'video' as const,
    },
    {
        number: '03',
        headline: 'Your provider reviews and decides.',
        copy: 'A licensed provider in your state reviews your intake and video. If appropriate, they send the prescription directly to your preferred pharmacy. You get notified either way.',
        visual: 'review' as const,
    },
] as const;

const TIMELINE = [
    { step: 'You submit', desc: 'Health form, video, and ID', icon: ClipboardList },
    { step: 'Confirm payment', desc: 'Membership charge confirmed', icon: CreditCard },
    { step: 'Decision made', desc: 'Provider approves or declines', icon: CheckCircle },
    { step: 'Rx sent', desc: 'E-prescription to your pharmacy', icon: ArrowRight },
    { step: 'Confirm delivery', desc: 'You\'re notified when it\'s ready', icon: Package },
] as const;

const FAQS = [
    { q: 'What states do you operate in?', a: 'ScriptsXO operates in 50+ states. During signup, we confirm that we have licensed providers in your state.' },
    { q: 'How long does a review take?', a: 'Most requests are reviewed the same day, often within a few hours. You\'ll receive a notification as soon as a decision is made.' },
    { q: 'What medications can I request?', a: 'ScriptsXO handles common chronic-condition medications — blood pressure, cholesterol, thyroid, diabetes management, and others. We do not prescribe controlled substances or medications requiring in-person evaluation.' },
    { q: 'Does my insurance cover this?', a: 'The $97/month membership covers the consultation and provider review. Most insurance plans cover the cost of the medication at your pharmacy once the prescription is sent.' },
    { q: 'What if the provider doesn\'t approve my request?', a: 'If your request isn\'t approved, you won\'t be charged for that review. The provider will explain why and may suggest an alternative path forward.' },
    { q: 'Can I request refills?', a: 'Yes. Your membership covers unlimited consultation requests, including refill requests. Just submit a new intake when you need it.' },
] as const;

function IntakeVisual() {
    return (
        <div className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-[0_2px_16px_rgba(0,0,0,0.08)]">
            <div className="font-mono text-xs uppercase tracking-[0.15em] text-[var(--muted-foreground)] mb-5">Intake Form</div>
            <div className="space-y-4 mb-5">
                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--background)]">
                    <span className="text-xs text-[var(--muted-foreground)]">Medication</span>
                    <p className="text-sm font-bold text-[var(--foreground)]">Lisinopril 10mg</p>
                </div>
                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--background)]">
                    <span className="text-xs text-[var(--muted-foreground)]">Condition</span>
                    <p className="text-sm font-bold text-[var(--foreground)]">Hypertension</p>
                </div>
                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--background)]">
                    <span className="text-xs text-[var(--muted-foreground)]">Last reading</span>
                    <p className="text-sm font-bold text-[var(--foreground)]">128 / 84 mmHg</p>
                </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--primary)]/[0.06]">
                <div className="w-2 h-2 rounded-full bg-[var(--primary)]" />
                <span className="text-sm font-bold text-[var(--primary)]">Ready to submit</span>
            </div>
        </div>
    );
}

function VideoVisual() {
    return (
        <div className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-[0_2px_16px_rgba(0,0,0,0.08)]">
            <div className="font-mono text-xs uppercase tracking-[0.15em] text-[var(--muted-foreground)] mb-5">Video Review</div>
            <div className="w-full aspect-video rounded-xl bg-[var(--sidebar-background)] flex items-center justify-center mb-5">
                <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                        <Video className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xs text-white/50 font-mono">1:24</span>
                </div>
            </div>
            <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                <span>Recorded just now</span>
                <span className="font-bold text-green-600">Ready</span>
            </div>
        </div>
    );
}

function ReviewVisual() {
    return (
        <div className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-[0_2px_16px_rgba(0,0,0,0.08)]">
            <div className="font-mono text-xs uppercase tracking-[0.15em] text-[var(--muted-foreground)] mb-5">Provider Decision</div>
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-[var(--border)]">
                <div className="w-10 h-10 rounded-full bg-[var(--secondary)] flex items-center justify-center">
                    <span className="text-sm font-bold text-[var(--muted-foreground)]">Dr</span>
                </div>
                <div>
                    <p className="text-sm font-bold text-[var(--foreground)]">Dr. Marcus Lee, MD</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Internal Medicine · Florida</p>
                </div>
            </div>
            <div className="space-y-3">
                {['Intake reviewed', 'Video reviewed', 'Prescription approved', 'Sent to pharmacy'].map((item) => (
                    <div key={item} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--secondary)]">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-sm text-[var(--foreground)]">{item}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

const VISUAL_MAP = { intake: IntakeVisual, video: VideoVisual, review: ReviewVisual } as const;

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

export default function HowItWorksPage() {
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
                        <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">How It Works</span>
                    </div>
                    <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[0.92] tracking-tight text-white max-w-4xl">
                        Three steps to your prescription<span style={{ color: 'var(--sidebar-primary)' }}>.</span>
                    </h1>
                    <p className="mt-8 text-base md:text-lg text-white/50 max-w-2xl leading-relaxed">
                        No appointment. No waiting room. Complete your intake, record a short video, and a licensed provider takes it from there.
                    </p>
                    <div className="mt-20 md:mt-28 border-t border-white/[0.06]" />
                </div>
            </section>

            {/* STEPS */}
            {STEPS.map((step, idx) => {
                const isReversed = idx % 2 !== 0;
                const VisualComponent = VISUAL_MAP[step.visual];
                return (
                    <section key={step.number} className={`relative overflow-hidden ${idx % 2 !== 0 ? 'bg-[var(--secondary)]' : 'bg-[var(--background)]'}`}>
                        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 md:py-28 lg:py-32">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                                <div className={isReversed ? 'lg:order-2' : 'lg:order-1'}>
                                    <div className="text-7xl font-black text-[var(--foreground)] opacity-[0.08] leading-none mb-6 select-none">{step.number}</div>
                                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-[var(--foreground)] leading-[1.05] max-w-lg">{step.headline}</h2>
                                    <p className="mt-6 text-base text-[var(--muted-foreground)] leading-relaxed max-w-md">{step.copy}</p>
                                </div>
                                <div className={isReversed ? 'lg:order-1' : 'lg:order-2'}>
                                    <VisualComponent />
                                </div>
                            </div>
                        </div>
                    </section>
                );
            })}

            {/* BEHIND THE SCENES */}
            <section className="bg-[var(--sidebar-background)] border-y border-white/[0.06]">
                <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 md:py-28">
                    <div className="mb-16">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="accent-line w-12" />
                            <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">Behind the Scenes</span>
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-[1.1]">
                            What happens after you submit<span style={{ color: 'var(--sidebar-primary)' }}>.</span>
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
                        {TIMELINE.map((item, idx) => {
                            const Icon = item.icon;
                            return (
                                <div key={item.step} className="relative">
                                    {idx < TIMELINE.length - 1 && (
                                        <div className="hidden lg:block absolute top-6 left-[calc(50%+2rem)] right-0 h-px bg-white/10" />
                                    )}
                                    <div className="flex flex-col items-center text-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-white/[0.06] border border-white/[0.12] flex items-center justify-center flex-shrink-0">
                                            <Icon className="w-5 h-5 text-white/60" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">{item.step}</p>
                                            <p className="text-xs text-white/40 mt-1">{item.desc}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="bg-[var(--background)]">
                <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 md:py-28">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
                        <div className="lg:col-span-4">
                            <div className="sticky top-[88px]">
                                <div className="flex items-center gap-3 mb-6">
                                    <span className="accent-line w-12" />
                                    <span className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">FAQ</span>
                                </div>
                                <h2 className="text-3xl md:text-4xl font-black tracking-tight text-[var(--foreground)] leading-[1.1]">
                                    Common questions<span className="text-[var(--primary)]">.</span>
                                </h2>
                                <p className="mt-4 text-sm text-[var(--muted-foreground)] leading-relaxed">
                                    Still have questions? Email us at{' '}
                                    <a href="mailto:hello@scriptsxo.com" className="text-[var(--primary)] hover:underline">hello@scriptsxo.com</a>
                                </p>
                            </div>
                        </div>
                        <div className="lg:col-span-8">
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
                        <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">Ready?</span>
                        <span className="accent-line w-12" />
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-[1.05]">
                        Skip the waiting room<span style={{ color: 'var(--sidebar-primary)' }}>.</span>
                    </h2>
                    <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
                        <Link href="/pricing" className="group inline-flex items-center gap-4 px-8 py-4 text-white font-medium text-sm rounded-full transition-all duration-300 hover:scale-[1.03] btn-gradient shadow-[0_8px_30px_rgba(124,58,237,0.3)]">
                            Get Started
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
