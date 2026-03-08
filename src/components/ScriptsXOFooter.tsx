import Link from 'next/link';

const NAV_LINKS = [
    { label: 'About', href: '/features' },
    { label: 'How It Works', href: '/how-it-works' },
    { label: 'FAQ', href: '/faq' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Log In', href: '/login' },
] as const;

const LEGAL_LINKS = [
    { label: 'Legal Center', href: '/legal' },
    { label: 'HIPAA', href: '/hipaa' },
] as const;

export default function ScriptsXOFooter() {
    const year = new Date().getFullYear();

    return (
        <footer className="border-t border-white/[0.06]" style={{ backgroundColor: 'var(--sidebar-background)' }}>
            <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 md:py-16">
                <div className="flex flex-wrap items-center gap-6 md:gap-10 mb-10 pb-10 border-b border-white/[0.06]">
                    {NAV_LINKS.map((link) => (
                        <Link key={link.href} href={link.href} className="text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.45)' }}>
                            {link.label}
                        </Link>
                    ))}
                </div>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <p className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                        &copy; {year} ScriptsXO. All rights reserved.
                    </p>
                    <div className="flex flex-wrap items-center gap-4 md:gap-6">
                        {LEGAL_LINKS.map((link) => (
                            <Link key={link.href} href={link.href} className="text-xs transition-colors" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                {link.label}
                            </Link>
                        ))}
                        <a href="mailto:hello@scriptsxo.com" className="text-xs transition-colors" style={{ color: 'rgba(255,255,255,0.35)' }}>
                            hello@scriptsxo.com
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
