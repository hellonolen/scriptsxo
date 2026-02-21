"use client";

import { useState, useEffect } from "react";
import { Video, Calendar, Clock, CheckCircle, Phone, AlertTriangle, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { getSessionCookie } from "@/lib/auth";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { SITECONFIG, formatPrice } from "@/lib/config";

/* ---------------------------------------------------------------------------
   PAGE
   --------------------------------------------------------------------------- */

export default function AppointmentsPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [callReason, setCallReason] = useState("");
  const [noRefundChecked, setNoRefundChecked] = useState(false);

  useEffect(() => {
    const session = getSessionCookie();
    if (session?.email) {
      setEmail(session.email);
    }
    setSessionChecked(true);
  }, []);

  // Fetch patient data
  const patient = useQuery(
    api.patients.getByEmail,
    email ? { email } : "skip"
  );

  // Fetch consultations
  const consultations = useQuery(
    api.consultations.getByPatient,
    patient ? { patientId: patient._id } : "skip"
  );

  // Loading state — only show spinner while genuinely loading.
  // When session has been checked and email is null, queries are skipped (undefined) — not loading.
  // When patient is null (not found), consultations will be skipped — treat as empty, not loading.
  const isLoading = !sessionChecked
    || (email !== null && patient === undefined)
    || (patient && consultations === undefined);

  if (isLoading) {
    return (
      <AppShell>
        <div className="p-6 lg:p-10 max-w-[1100px]">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: "#7C3AED", borderTopColor: "transparent" }} />
              <p className="text-sm text-muted-foreground">Loading appointments...</p>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // Split into upcoming and past
  const upcoming = consultations?.filter(
    (c) => c.status === "scheduled" || c.status === "waiting"
  ) || [];

  const past = consultations?.filter(
    (c) => c.status === "completed"
  ) || [];

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1100px]">

        {/* ---- HEADER ---- */}
        <header className="mb-10">
          <p className="eyebrow mb-2">Schedule</p>
          <h1
            className="text-3xl lg:text-4xl font-light text-foreground tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Your <span className="text-[#7C3AED]">Appointments</span>
          </h1>
        </header>

        {/* ---- BOOK PROVIDER CALL ---- */}
        <section className="mb-10">
          {!showBooking ? (
            <div className="glass-card glow-accent">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: "linear-gradient(135deg, #7C3AED, #2DD4BF)" }}
                  >
                    <Phone size={24} className="text-white" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-[16px] text-foreground font-medium mb-1">
                      Same-Day Provider Call
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                      {formatPrice(SITECONFIG.billing.providerCallFee)} &middot; {SITECONFIG.billing.providerCallDuration}-minute voice call with a licensed provider
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowBooking(true)}
                  className="bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF] text-white text-xs tracking-wide px-6"
                >
                  Book Call
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="glass-card">
              <div className="flex items-center gap-3 mb-5">
                <Phone size={18} className="text-[#7C3AED]" aria-hidden="true" />
                <p className="text-sm font-medium text-foreground">
                  Same-Day Provider Call &mdash; {formatPrice(SITECONFIG.billing.providerCallFee)}
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-3 mb-5">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" aria-hidden="true" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    This is a {SITECONFIG.billing.providerCallDuration}-minute same-day voice call. The provider may end the call at their discretion. Payment is non-refundable. There is no guarantee of a prescription.
                  </p>
                </div>
              </div>

              <div className="mb-5">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  What do you need to discuss with the provider?
                </label>
                <textarea
                  value={callReason}
                  onChange={(e) => setCallReason(e.target.value)}
                  placeholder="Describe your situation and what you need from this call. Be specific so the provider can prepare."
                  rows={4}
                  className="w-full px-4 py-3 rounded-md border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED] resize-none"
                />
              </div>

              <label className="flex items-start gap-3 mb-5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={noRefundChecked}
                  onChange={(e) => setNoRefundChecked(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-border accent-[#7C3AED]"
                />
                <span className="text-xs text-foreground leading-relaxed">
                  I understand this call costs {formatPrice(SITECONFIG.billing.providerCallFee)}, is non-refundable, and there is no guarantee of a prescription. The provider may end the call at their discretion.
                </span>
              </label>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowBooking(false)}
                  variant="outline"
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  disabled={!callReason.trim() || !noRefundChecked}
                  className="flex-1 bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF] text-white text-xs tracking-wide"
                >
                  Confirm &amp; Pay {formatPrice(SITECONFIG.billing.providerCallFee)}
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* ---- UPCOMING ---- */}
        <section className="mb-10">
          <p className="eyebrow mb-4 text-[#7C3AED]">Upcoming</p>

          {upcoming.length > 0 ? (
            <div className="space-y-4">
              {upcoming.map((appt) => (
                <div key={appt._id} className="glass-card">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 flex items-center justify-center shrink-0" style={{ background: "rgba(124, 58, 237, 0.08)" }}>
                        <Video size={20} className="text-[#7C3AED]" aria-hidden="true" />
                      </div>
                      <div>
                        <h3
                          className="text-lg font-light text-foreground mb-1"
                          style={{ fontFamily: "var(--font-heading)" }}
                        >
                          {appt.type === "video" ? "Video Consultation" : appt.type === "phone" ? "Phone Consultation" : "Consultation"}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground font-light">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar size={13} aria-hidden="true" />
                            {new Date(appt.scheduledAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Clock size={13} aria-hidden="true" />
                            {new Date(appt.scheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </span>
                        </div>
                        <span className="text-[9px] tracking-[0.15em] uppercase font-medium px-2.5 py-1 text-[#0D6E8A] bg-[#0D6E8A]/8 inline-block mt-3">
                          {appt.type}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 pt-5 border-t border-border flex gap-3">
                    {appt.roomUrl ? (
                      <a
                        href={appt.roomUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-[11px] tracking-[0.15em] uppercase font-medium hover:opacity-90 transition-opacity"
                        style={{ background: "linear-gradient(135deg, #7C3AED, #2DD4BF)" }}
                      >
                        <Video size={14} aria-hidden="true" />
                        Join Call
                      </a>
                    ) : (
                      <button
                        disabled
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-[11px] tracking-[0.15em] uppercase font-medium opacity-50 cursor-not-allowed"
                        style={{ background: "linear-gradient(135deg, #7C3AED, #2DD4BF)" }}
                      >
                        <Video size={14} aria-hidden="true" />
                        Room Pending
                      </button>
                    )}
                    <button className="inline-flex items-center gap-2 px-5 py-2.5 border border-border text-foreground text-[11px] tracking-[0.15em] uppercase font-medium hover:border-[#7C3AED] hover:text-[#7C3AED] transition-colors">
                      Reschedule
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card text-center py-16">
              <Calendar size={48} className="text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-light text-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                No Upcoming Appointments
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Schedule a consultation with a provider to get started.
              </p>
            </div>
          )}
        </section>

        {/* ---- PAST ---- */}
        <section>
          <p className="eyebrow mb-4">Past</p>

          {past.length > 0 ? (
            <div className="space-y-3">
              {past.map((appt) => (
                <div
                  key={appt._id}
                  className="glass-card flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 bg-muted flex items-center justify-center shrink-0">
                      <CheckCircle size={14} className="text-[#16A34A]" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-foreground">
                        {appt.type === "video" ? "Video Consultation" : appt.type === "phone" ? "Phone Consultation" : "Consultation"}
                      </p>
                      <p className="text-[12px] text-muted-foreground font-light">
                        {new Date(appt.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] tracking-[0.15em] uppercase font-medium px-2.5 py-1 text-[#16A34A] bg-[#16A34A]/8">
                    Completed
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card text-center py-12">
              <p className="text-sm text-muted-foreground">No past appointments</p>
            </div>
          )}
        </section>

      </div>
    </AppShell>
  );
}
