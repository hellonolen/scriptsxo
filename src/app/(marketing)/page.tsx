'use client';

import { ArrowRight, ChevronRight } from 'lucide-react';
import Link from 'next/link';

/* ---------------------------------------------------------------------------
   Data constants
   --------------------------------------------------------------------------- */

const HOW_STEPS = [
    {
        number: '01',
        title: 'Complete your intake',
        description:
            'Answer a short health questionnaire. Tell us your symptoms, medications, and medical history — no appointment needed.',
    },
    {
        number: '02',
        title: 'Record your video',
        description:
            'Record a brief video responding to a provider\'s questions. Takes about five minutes. No live scheduling required.',
    },
    {
        number: '03',
        title: 'Provider reviews',
        description:
            'A provider reviews your intake and video, then approves or declines your prescription request.',
    },
] as const;


const WHY_ITEMS = [
    {
        title: 'No waiting rooms',
        description:
            'Submit your intake from anywhere. No commute, no sitting in a waiting room, no scheduling friction.',
    },
    {
        title: 'Async provider review',
        description:
            'Our providers work on your timeline. Submit when it suits you — review happens without a live appointment.',
    },
    {
        title: 'Privacy first',
        description:
            'Your health data is encrypted, stored securely, and never shared or sold without your consent.',
    },
] as const;

/* ---------------------------------------------------------------------------
   Section: Hero
   --------------------------------------------------------------------------- */

function Hero() {
    return (
        <section
            className="relative overflow-hidden"
            style={{ backgroundColor: 'var(--sidebar-background)' }}
        >
            {/* Geometric grid background */}
            <div
                className="absolute inset-0 opacity-[0.04]"
                aria-hidden="true"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(167,139,250,0.12) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(167,139,250,0.12) 1px, transparent 1px)
                    `,
                    backgroundSize: '80px 80px',
                }}
            />

            {/* Radial glow */}
            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
                aria-hidden="true"
                style={{
                    background: 'radial-gradient(circle, rgba(124,58,237,0.10) 0%, transparent 70%)',
                }}
            />

            <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-24 md:py-32 lg:py-40">
                {/* Accent label */}
                <div className="flex items-center gap-3 mb-8">
                    <span className="accent-line w-12" />
                    <span
                        className="font-mono text-xs uppercase tracking-[0.2em]"
                        style={{ color: 'rgba(167,139,250,0.7)' }}
                    >
                        Bro, my mom used this to get her blood pressure meds!
                    </span>
                </div>

                {/* Headline */}
                <h1
                    className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[1.0] tracking-tight text-white max-w-4xl"
                >
                    Skip the waiting room
                    <span style={{ color: 'var(--sidebar-primary)' }}>.</span>
                    <br />
                    <span style={{ color: 'var(--sidebar-primary)' }}>Get your prescription</span>
                    <span style={{ color: 'var(--sidebar-primary)' }}>.</span>
                </h1>

                {/* Subhead */}
                <p
                    className="mt-8 text-base md:text-lg max-w-xl leading-relaxed"
                    style={{ color: 'rgba(255,255,255,0.5)' }}
                >
                    Video consult with a provider. Prescriptions for
                    common conditions — no waiting room, no scheduling.
                </p>

                <div className="mt-12">
                    <Link
                        href="/login"
                        className="group inline-flex items-center gap-4 px-8 py-4 text-white text-sm font-medium rounded-full transition-all duration-300 hover:scale-[1.03] btn-gradient"
                    >
                        Start for Free
                        <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                            <ArrowRight className="w-4 h-4" />
                        </span>
                    </Link>
                </div>

                <div className="mt-20 md:mt-28 border-t border-white/[0.06]" />
            </div>
        </section>
    );
}


/* ---------------------------------------------------------------------------
   Section: How It Works
   --------------------------------------------------------------------------- */

function HowItWorks() {
    return (
        <section
            className="py-20 md:py-28 border-y border-[var(--border)]"
            style={{ backgroundColor: 'var(--secondary)' }}
        >
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                {/* Section header */}
                <div className="mb-16 md:mb-20">
                    <div className="flex items-center gap-3 mb-6">
                        <span className="accent-line w-12" />
                        <span
                            className="font-mono text-xs uppercase tracking-[0.2em]"
                            style={{ color: 'var(--muted-foreground)' }}
                        >
                            The Process
                        </span>
                    </div>
                    <h2
                        className="text-3xl md:text-5xl font-black tracking-tight max-w-2xl leading-[1.1]"
                        style={{ color: 'var(--foreground)' }}
                    >
                        Three steps to your prescription
                        <span style={{ color: 'var(--primary)' }}>.</span>
                    </h2>
                </div>

                {/* Steps */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
                    {HOW_STEPS.map((step, idx) => (
                        <div key={step.number} className="relative flex flex-col md:flex-row">
                            <div className="flex-1 p-8 md:p-10">
                                {/* Large ghost number */}
                                <span
                                    className="font-mono text-6xl md:text-7xl font-black leading-none block mb-4"
                                    style={{ color: 'var(--primary)', opacity: 0.10 }}
                                >
                                    {step.number}
                                </span>
                                <h3
                                    className="text-xl font-bold mb-3"
                                    style={{ color: 'var(--foreground)' }}
                                >
                                    {step.title}
                                </h3>
                                <p
                                    className="text-sm leading-relaxed max-w-xs"
                                    style={{ color: 'var(--muted-foreground)' }}
                                >
                                    {step.description}
                                </p>
                            </div>

                            {/* Desktop connector */}
                            {idx < HOW_STEPS.length - 1 && (
                                <div
                                    className="hidden md:flex items-center justify-center w-12"
                                    aria-hidden="true"
                                >
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="w-[3px] h-2 rounded-full" style={{ background: 'rgba(91,33,182,0.3)' }} />
                                        <div className="w-[3px] h-3 rounded-full" style={{ background: 'rgba(91,33,182,0.5)' }} />
                                        <div className="w-[3px] h-2 rounded-full" style={{ background: 'rgba(91,33,182,0.3)' }} />
                                        <ArrowRight className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                                        <div className="w-[3px] h-2 rounded-full" style={{ background: 'rgba(91,33,182,0.3)' }} />
                                        <div className="w-[3px] h-3 rounded-full" style={{ background: 'rgba(91,33,182,0.5)' }} />
                                        <div className="w-[3px] h-2 rounded-full" style={{ background: 'rgba(91,33,182,0.3)' }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="mt-12 flex justify-center">
                    <Link
                        href="/how-it-works"
                        className="inline-flex items-center gap-2 text-sm font-mono transition-colors"
                        style={{ color: 'var(--primary)' }}
                    >
                        Learn more about how it works
                        <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </section>
    );
}

/* ---------------------------------------------------------------------------
   Section: Why ScriptsXO
   --------------------------------------------------------------------------- */

function WhyScriptsXO() {
    return (
        <section
            className="py-20 md:py-28"
            style={{ backgroundColor: 'var(--background)' }}
        >
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                {/* Section header */}
                <div className="mb-16 md:mb-20">
                    <div className="flex items-center gap-3 mb-6">
                        <span className="accent-line w-12" />
                        <span
                            className="font-mono text-xs uppercase tracking-[0.2em]"
                            style={{ color: 'var(--muted-foreground)' }}
                        >
                            Why ScriptsXO
                        </span>
                    </div>
                    <h2
                        className="text-3xl md:text-5xl font-black tracking-tight max-w-2xl leading-[1.1]"
                        style={{ color: 'var(--foreground)' }}
                    >
                        Built for trust
                        <span style={{ color: 'var(--primary)' }}>.</span>
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-px" style={{ background: 'var(--border)' }}>
                    {WHY_ITEMS.map((item) => (
                        <div
                            key={item.title}
                            className="group p-8 md:p-10 transition-colors duration-300"
                            style={{ background: 'var(--background)' }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--secondary)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--background)')}
                        >
                            <div
                                className="w-10 h-[3px] mb-8 transition-all duration-300 group-hover:w-16"
                                style={{ background: 'var(--primary)' }}
                            />
                            <h3
                                className="text-lg font-bold mb-3"
                                style={{ color: 'var(--foreground)' }}
                            >
                                {item.title}
                            </h3>
                            <p
                                className="text-sm leading-relaxed"
                                style={{ color: 'var(--muted-foreground)' }}
                            >
                                {item.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ---------------------------------------------------------------------------
   Section: CTA Banner
   --------------------------------------------------------------------------- */

function CTABanner() {
    return (
        <section
            className="relative overflow-hidden"
            style={{ backgroundColor: 'var(--sidebar-background)' }}
        >
            {/* Geometric grid background */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                aria-hidden="true"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: '120px 120px',
                }}
            />

            {/* Radial glow bottom-right */}
            <div
                className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full pointer-events-none"
                aria-hidden="true"
                style={{
                    background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)',
                }}
            />

            <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-24 md:py-32">
                <div className="max-w-2xl">
                    <h2
                        className="text-4xl md:text-6xl font-black tracking-tight text-white leading-[1.05]"
                    >
                        Skip the waiting room
                        <span style={{ color: 'var(--sidebar-primary)' }}>.</span>
                        <br />
                        Get your prescription
                        <span style={{ color: 'var(--sidebar-primary)' }}>.</span>
                    </h2>

                    <p
                        className="mt-6 text-base max-w-md leading-relaxed"
                        style={{ color: 'rgba(255,255,255,0.5)' }}
                    >
                        Licensed providers. Fast review. One flat monthly rate.
                    </p>

                    <div className="mt-10">
                        <Link
                            href="/login"
                            className="group inline-flex items-center gap-4 px-8 py-4 text-white text-sm font-medium rounded-full transition-all duration-300 hover:scale-[1.03] btn-gradient"
                        >
                            Get Started Free
                            <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                                <ArrowRight className="w-4 h-4" />
                            </span>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ---------------------------------------------------------------------------
   Marketing page
   --------------------------------------------------------------------------- */

export default function MarketingPage() {
    return (
        <main className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
            <Hero />
            <HowItWorks />
            <WhyScriptsXO />
            <CTABanner />
        </main>
    );
}
