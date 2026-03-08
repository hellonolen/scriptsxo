'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, ArrowRight } from 'lucide-react';

const NAV_ITEMS = [
    { label: 'About', href: '/features' },
    { label: 'How It Works', href: '/how-it-works' },
    { label: 'FAQ', href: '/faq' },
    { label: 'Pricing', href: '/pricing' },
] as const;

const DASHBOARD_HREF = '/dashboard';
const LOGIN_HREF = '/login';
const GET_STARTED_HREF = '/pricing';

function hasSession(): boolean {
    if (typeof document === 'undefined') return false;
    return document.cookie.split(';').some((c) => c.trim().startsWith('app_session='));
}

export default function ScriptsXOHeader() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [loggedIn, setLoggedIn] = useState(false);

    useEffect(() => {
        setLoggedIn(hasSession());
    }, []);

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--background)]/90 backdrop-blur-md border-b border-[var(--border)]">
            <div className="max-w-6xl mx-auto px-6 lg:px-8">
                <div className="flex items-center justify-between h-[72px]">
                    {/* Logo */}
                    <div className="flex flex-col">
                        <Link href="/" className="text-xl font-black tracking-tight text-[var(--primary)]">
                            ScriptsXO
                        </Link>
                        <span className="mt-1 w-8 h-[2px] rounded-full" style={{ background: 'var(--primary)' }} />
                    </div>

                    {/* Desktop nav + auth */}
                    <div className="hidden md:flex items-center gap-8">
                        <nav className="flex items-center gap-8">
                            {NAV_ITEMS.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="text-sm font-mono uppercase tracking-widest text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors duration-200"
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </nav>

                        <a
                            href={loggedIn ? DASHBOARD_HREF : LOGIN_HREF}
                            className="text-sm font-mono uppercase tracking-widest text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors duration-200"
                        >
                            {loggedIn ? 'Dashboard' : 'Log In'}
                        </a>

                        <a
                            href={loggedIn ? DASHBOARD_HREF : GET_STARTED_HREF}
                            className="inline-flex items-center justify-center px-5 py-2.5 text-white text-sm font-medium rounded-full transition-transform hover:scale-[1.03] btn-gradient"
                        >
                            {loggedIn ? 'Dashboard' : 'Get Started'}
                        </a>
                    </div>

                    {/* Mobile toggle */}
                    <button
                        type="button"
                        className="md:hidden p-2 text-[var(--muted-foreground)]"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                    >
                        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {mobileMenuOpen && (
                <div className="md:hidden border-t border-[var(--border)] bg-[var(--background)]">
                    <nav className="px-6 py-6 flex flex-col gap-4">
                        {NAV_ITEMS.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="text-sm font-mono uppercase tracking-widest text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                {item.label}
                            </Link>
                        ))}

                        <a
                            href={loggedIn ? DASHBOARD_HREF : LOGIN_HREF}
                            className="text-sm font-mono uppercase tracking-widest text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            {loggedIn ? 'Dashboard' : 'Log In'}
                        </a>

                        <a
                            href={loggedIn ? DASHBOARD_HREF : GET_STARTED_HREF}
                            className="mt-2 inline-flex items-center justify-center gap-2 px-6 py-3 text-white font-medium text-sm rounded-full btn-gradient transition-transform hover:scale-[1.03]"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            {loggedIn ? 'Dashboard' : 'Get Started'}
                            <ArrowRight className="w-4 h-4" />
                        </a>
                    </nav>
                </div>
            )}
        </header>
    );
}
