import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, UserCheck, Video, Send, Lock, FileText, RefreshCw } from 'lucide-react';

export const metadata: Metadata = {
    title: 'About — ScriptsXO',
    description: 'Everything included in your ScriptsXO membership.',
};

const FEATURE_SECTIONS = [
    {
        index: '01',
        headline: 'A real provider reviews every request.',
        copy: 'Every prescription request goes to a licensed provider in your state. No bots making clinical decisions — a real provider evaluates your intake and makes every call.',
        cta: { label: 'See how it works', href: '/how-it-works' },
        icon: UserCheck,
        visual: 'review' as const,
    },
    {
        index: '02',
        headline: 'No appointment. No waiting room.',
        copy: 'Complete your intake on your schedule. Answer a few questions, record a short video, and submit. The provider reviews it async — usually within the same day.',
        cta: { label: 'Learn how it works', href: '/how-it-works' },
        icon: Video,
        visual: 'intake' as const,
    },
    {
        index: '03',
        headline: 'Track your prescription from review to pharmacy.',
        copy: 'See the full status of every request: submitted, under review, approved, or sent to your pharmacy. You always know where things stand.',
        cta: { label: 'View pricing', href: '/pricing' },
        icon: FileText,
        visual: 'track' as const,
    },
    {
        index: '04',
        headline: 'Sent to any pharmacy you choose.',
        copy: 'Approved prescriptions are sent electronically to your preferred pharmacy — local or mail-order. Pick the one that works for you.',
        cta: { label: 'Get started', href: '/login' },
        icon: Send,
        visual: 'pharmacy' as const,
    },
    {
        index: '05',
        headline: 'Your health data stays private.',
        copy: 'All records are encrypted in transit and at rest. We are HIPAA-compliant and never sell your data. Your information is yours.',
        cta: { label: 'Read our privacy policy', href: '/privacy' },
        icon: Lock,
        visual: 'security' as const,
    },
    {
        index: '06',
        headline: 'Cancel anytime. No contracts.',
        copy: 'Your membership runs month to month. No annual commitment, no cancellation fees. Cancel directly from your account whenever you want.',
        cta: { label: 'View membership', href: '/pricing' },
        icon: RefreshCw,
        visual: 'membership' as const,
    },
] as const;

/* ============================================
   Visual Mock Components
   ============================================ */
function ReviewVisual() {
    return (
        <div className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-[0_2px_16px_rgba(0,0,0,0.08)]">
            <div className="font-mono text-xs uppercase tracking-[0.15em] text-[var(--muted-foreground)] mb-5">
                Request Review
            </div>
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-[var(--border)]">
                <div className="w-10 h-10 rounded-full bg-[var(--secondary)] flex items-center justify-center">
                    <span className="text-sm font-bold text-[var(--muted-foreground)]">Dr</span>
                </div>
                <div>
                    <p className="text-sm font-bold text-[var(--foreground)]">Dr. Sarah Chen, MD</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Licensed in your state</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="flex-1">
                    <p className="text-sm font-bold text-[var(--foreground)]">Atorvastatin 20mg</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Cholesterol management</p>
                </div>
                <div className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold">
                    Approved
                </div>
            </div>
        </div>
    );
}

function IntakeVisual() {
    return (
        <div className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-[0_2px_16px_rgba(0,0,0,0.08)]">
            <div className="font-mono text-xs uppercase tracking-[0.15em] text-[var(--muted-foreground)] mb-5">
                Your Intake
            </div>
            <div className="space-y-4 mb-5">
                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--background)]">
                    <span className="text-xs text-[var(--muted-foreground)]">Medication requested</span>
                    <p className="text-sm font-bold text-[var(--foreground)]">Lisinopril 10mg</p>
                </div>
                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--background)]">
                    <span className="text-xs text-[var(--muted-foreground)]">Video recorded</span>
                    <p className="text-sm font-bold text-[var(--foreground)]">1 min 24 sec</p>
                </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm font-bold text-green-700">Submitted for review</span>
            </div>
        </div>
    );
}

function TrackVisual() {
    return (
        <div className="bg-white border border-[var(--border)] rounded-2xl overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.08)]">
            <div className="px-6 py-3 border-b border-[var(--border)] flex items-center gap-2">
                <span className="font-mono text-xs uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                    Request Status
                </span>
            </div>
            <div className="divide-y divide-[var(--border)]">
                {[
                    { rx: 'Lisinopril 10mg', time: '2h ago', status: 'Approved' },
                    { rx: 'Atorvastatin 20mg', time: '1d ago', status: 'Sent to pharmacy' },
                    { rx: 'Metformin 500mg', time: '3d ago', status: 'Approved' },
                ].map((row) => (
                    <div key={row.rx} className="px-6 py-3 flex items-center justify-between">
                        <div>
                            <span className="text-xs font-bold text-[var(--foreground)]">{row.rx}</span>
                            <p className="text-xs text-[var(--muted-foreground)]">{row.time}</p>
                        </div>
                        <span className="text-xs font-bold text-green-600">{row.status}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function PharmacyVisual() {
    return (
        <div className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-[0_2px_16px_rgba(0,0,0,0.08)]">
            <div className="font-mono text-xs uppercase tracking-[0.15em] text-[var(--muted-foreground)] mb-5">
                E-Prescription
            </div>
            <div className="space-y-4 mb-6">
                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--secondary)]">
                    <span className="text-xs text-[var(--muted-foreground)]">Sent to</span>
                    <p className="text-sm font-bold text-[var(--foreground)]">CVS Pharmacy — Miami, FL</p>
                </div>
                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--secondary)]">
                    <span className="text-xs text-[var(--muted-foreground)]">Prescription</span>
                    <p className="text-sm font-bold text-[var(--foreground)]">Lisinopril 10mg · 30 days</p>
                </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm font-bold text-green-700">Delivered to pharmacy</span>
            </div>
        </div>
    );
}

function SecurityVisual() {
    return (
        <div className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-[0_2px_16px_rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-[var(--primary)]/[0.08] flex items-center justify-center">
                    <Lock className="w-5 h-5 text-[var(--primary)]" />
                </div>
                <div>
                    <p className="text-sm font-bold text-[var(--foreground)]">Privacy Status</p>
                    <p className="text-xs text-[var(--muted-foreground)]">All systems protected</p>
                </div>
            </div>
            <div className="space-y-3">
                {['Encrypted in transit', 'Encrypted at rest', 'HIPAA-compliant', 'Data never sold'].map((badge) => (
                    <div key={badge} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--secondary)]">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-sm text-[var(--foreground)]">{badge}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function MembershipVisual() {
    return (
        <div className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-[0_2px_16px_rgba(0,0,0,0.08)]">
            <div className="font-mono text-xs uppercase tracking-[0.15em] text-[var(--muted-foreground)] mb-5">
                Your Membership
            </div>
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[var(--border)]">
                <div>
                    <p className="text-2xl font-black text-[var(--foreground)]">$97</p>
                    <p className="text-xs text-[var(--muted-foreground)]">per month</p>
                </div>
                <div className="px-3 py-1 rounded-full bg-[var(--primary)]/[0.08] text-[var(--primary)] text-xs font-bold">
                    Active
                </div>
            </div>
            <div className="space-y-3">
                {['Unlimited consultation requests', 'Licensed provider review', 'Cancel anytime'].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-[var(--primary)]" />
                        <span className="text-sm text-[var(--muted-foreground)]">{item}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

const VISUAL_MAP = {
    review: ReviewVisual,
    intake: IntakeVisual,
    track: TrackVisual,
    pharmacy: PharmacyVisual,
    security: SecurityVisual,
    membership: MembershipVisual,
} as const;

export default function FeaturesPage() {
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
                        <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">
                            What&apos;s Included
                        </span>
                    </div>
                    <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[0.92] tracking-tight text-white max-w-4xl">
                        Everything your membership covers
                        <span style={{ color: 'var(--sidebar-primary)' }}>.</span>
                    </h1>
                    <p className="mt-8 text-base md:text-lg text-white/50 max-w-2xl leading-relaxed">
                        One flat monthly fee. Licensed provider review, e-prescription delivery, and secure records — all included.
                    </p>
                    <div className="mt-20 md:mt-28 border-t border-white/[0.06]" />
                </div>
            </section>

            {/* FEATURE SECTIONS */}
            {FEATURE_SECTIONS.map((feature, idx) => {
                const isReversed = idx % 2 !== 0;
                const isAlt = idx % 2 !== 0;
                const VisualComponent = VISUAL_MAP[feature.visual];
                const FeatureIcon = feature.icon;

                return (
                    <section key={feature.index} className={`relative overflow-hidden ${isAlt ? 'bg-[var(--secondary)]' : 'bg-[var(--background)]'}`}>
                        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 md:py-28 lg:py-32">
                            <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center`}>
                                <div className={isReversed ? 'lg:order-2' : 'lg:order-1'}>
                                    <div className="flex items-center gap-3 mb-6">
                                        <span className="font-mono text-xs tracking-[0.2em] text-[var(--muted-foreground)] uppercase">
                                            {feature.index}
                                        </span>
                                        <span className="accent-line w-8" />
                                    </div>
                                    <div className="w-12 h-12 rounded-full bg-[var(--primary)]/[0.08] flex items-center justify-center mb-6">
                                        <FeatureIcon className="w-6 h-6 text-[var(--primary)]" />
                                    </div>
                                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-[var(--foreground)] leading-[1.05] max-w-lg">
                                        {feature.headline}
                                    </h2>
                                    <p className="mt-6 text-base text-[var(--muted-foreground)] leading-relaxed max-w-md">
                                        {feature.copy}
                                    </p>
                                    <Link
                                        href={feature.cta.href}
                                        className="group inline-flex items-center gap-2 mt-8 text-sm font-bold text-[var(--primary)] hover:gap-3 transition-all duration-300"
                                    >
                                        {feature.cta.label}
                                        <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                                    </Link>
                                </div>
                                <div className={isReversed ? 'lg:order-1' : 'lg:order-2'}>
                                    <VisualComponent />
                                </div>
                            </div>
                        </div>
                    </section>
                );
            })}

            {/* FINAL CTA */}
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
                        Get your prescription
                        <span style={{ color: 'var(--sidebar-primary)' }}>.</span>
                    </h2>
                    <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
                        <Link
                            href="/pricing"
                            className="group inline-flex items-center gap-4 px-8 py-4 text-white font-medium text-sm rounded-full transition-all duration-300 hover:scale-[1.03] btn-gradient shadow-[0_8px_30px_rgba(124,58,237,0.3)]"
                        >
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
