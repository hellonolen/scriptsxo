'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, Shield, ShieldCheck, LayoutGrid } from 'lucide-react';

const LEGAL_NAV = [
    { label: 'Legal Center', href: '/legal', icon: LayoutGrid },
    { divider: true, label: 'Documents' },
    { label: 'Terms of Service', href: '/terms', icon: FileText },
    { label: 'Privacy Policy', href: '/privacy', icon: Shield },
    { label: 'HIPAA Notice', href: '/hipaa', icon: ShieldCheck },
] as const;

export default function ScriptsXOLegalSidebar() {
    const pathname = usePathname();

    return (
        <nav className="w-full lg:w-56 flex-shrink-0">
            <div className="sticky top-[88px]">
                <ul className="space-y-1">
                    {LEGAL_NAV.map((item, i) => {
                        if ('divider' in item && item.divider) {
                            return (
                                <li key={`d-${i}`} className="pt-4 pb-1 first:pt-0">
                                    <span
                                        className="font-mono text-[10px] uppercase tracking-[0.15em] px-3"
                                        style={{ color: 'var(--muted-foreground)' }}
                                    >
                                        {item.label}
                                    </span>
                                </li>
                            );
                        }

                        if (!('href' in item)) return null;

                        const Icon = item.icon;
                        const isActive = pathname === item.href;

                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
                                    style={{
                                        background: isActive ? 'rgba(91,33,182,0.08)' : 'transparent',
                                        color: isActive ? 'var(--primary)' : 'var(--muted-foreground)',
                                        fontWeight: isActive ? 500 : 400,
                                    }}
                                >
                                    <Icon className="w-4 h-4 flex-shrink-0" />
                                    {item.label}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </nav>
    );
}
