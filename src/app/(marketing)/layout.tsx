import type { Metadata } from 'next';
import ScriptsXOHeader from '@/components/ScriptsXOHeader';
import ScriptsXOFooter from '@/components/ScriptsXOFooter';

export const metadata: Metadata = {
    title: 'ScriptsXO — Telehealth Prescriptions, Simplified',
    description:
        'Connect with a provider via video. Prescriptions for common conditions — no waiting room, no scheduling.',
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <ScriptsXOHeader />
            <div className="pt-[72px]">{children}</div>
            <ScriptsXOFooter />
        </>
    );
}
