import ScriptsXOHeader from './ScriptsXOHeader';
import ScriptsXOFooter from './ScriptsXOFooter';
import ScriptsXOLegalSidebar from './ScriptsXOLegalSidebar';

interface Props {
    children: React.ReactNode;
    title: string;
    breadcrumb?: string;
    effectiveDate?: string;
}

export default function ScriptsXOLegalLayout({ children, title, breadcrumb, effectiveDate }: Props) {
    return (
        <div className="min-h-screen" style={{ background: 'var(--background)' }}>
            <ScriptsXOHeader />

            <main className="pt-[72px]">
                {/* Dark hero header */}
                <section
                    className="py-16 md:py-20"
                    style={{ backgroundColor: 'var(--sidebar-background)' }}
                >
                    <div className="max-w-6xl mx-auto px-6 lg:px-8">
                        <div className="flex items-center gap-3 mb-6">
                            {breadcrumb ? (
                                <>
                                    <a
                                        href="/legal"
                                        className="font-mono text-[10px] uppercase tracking-[0.15em] transition-colors hover:opacity-80"
                                        style={{ color: 'var(--sidebar-primary)' }}
                                    >
                                        Legal Center
                                    </a>
                                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
                                    <span
                                        className="font-mono text-[10px] uppercase tracking-[0.15em]"
                                        style={{ color: 'rgba(255,255,255,0.4)' }}
                                    >
                                        {breadcrumb}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span className="accent-line w-12" />
                                    <span
                                        className="font-mono text-[10px] uppercase tracking-[0.15em]"
                                        style={{ color: 'rgba(255,255,255,0.4)' }}
                                    >
                                        Legal &amp; Policies
                                    </span>
                                </>
                            )}
                        </div>

                        <h1
                            className="text-3xl md:text-5xl font-black tracking-tight text-white leading-[1.1]"
                        >
                            {title}
                            <span style={{ color: 'var(--sidebar-primary)' }}>.</span>
                        </h1>

                        {effectiveDate && (
                            <p
                                className="mt-4 font-mono text-xs uppercase tracking-[0.1em]"
                                style={{ color: 'rgba(255,255,255,0.35)' }}
                            >
                                {effectiveDate}
                            </p>
                        )}
                    </div>
                </section>

                {/* Content + sidebar */}
                <section className="py-16 md:py-20" style={{ background: 'var(--background)' }}>
                    <div className="max-w-6xl mx-auto px-6 lg:px-8">
                        <div className="flex flex-col lg:flex-row gap-12">
                            <ScriptsXOLegalSidebar />
                            <div
                                className="flex-1 min-w-0 max-w-3xl leading-relaxed text-sm"
                                style={{ color: 'var(--muted-foreground)' }}
                            >
                                {children}
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <ScriptsXOFooter />
        </div>
    );
}
