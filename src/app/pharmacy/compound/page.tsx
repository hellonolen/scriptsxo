"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Search, ChevronDown, Loader2, FlaskConical } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { prescriptions as prescriptionsApi } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type RxStatus = "Received" | "In Compounding" | "QC Review" | "Dispensed" | "Shipped";
type PaStatus = "Approved" | "Pending" | "Denied" | "Not Required";

interface CompoundRx {
  rxNum: string;
  formulaName: string;
  strength: string;
  base: string;
  form: string;
  quantity: string;
  bud: string;
  patient: string;
  patientDob: string;
  prescriber: string;
  prescriberNpi: string;
  clinic: string;
  receivedDate: string;
  dueDate: string;
  status: RxStatus;
  paRequired: boolean;
  paStatus: PaStatus;
  insurance: string;
  notes: string;
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_PRESCRIPTIONS: CompoundRx[] = [
  {
    rxNum: "RX-20483",
    formulaName: "Tirzepatide Injection",
    strength: "5mg/mL",
    base: "Bacteriostatic Water",
    form: "Injectable",
    quantity: "2mL vial",
    bud: "Apr 3, 2026",
    patient: "Maria Gonzalez",
    patientDob: "1981-04-12",
    prescriber: "Dr. Rachel Kim",
    prescriberNpi: "1234567890",
    clinic: "Suncoast Wellness",
    receivedDate: "Mar 7, 2026",
    dueDate: "Mar 9, 2026",
    status: "In Compounding",
    paRequired: true,
    paStatus: "Approved",
    insurance: "Blue Cross PPO",
    notes: "Lipodystrophy history noted. Use preservative-free base.",
  },
  {
    rxNum: "RX-20484",
    formulaName: "Semaglutide Injection",
    strength: "1mg/mL",
    base: "Bacteriostatic Water",
    form: "Injectable",
    quantity: "3mL vial",
    bud: "Apr 5, 2026",
    patient: "James Chen",
    patientDob: "1976-09-30",
    prescriber: "Dr. James Ortega",
    prescriberNpi: "9876543210",
    clinic: "Advanced Hormone Institute",
    receivedDate: "Mar 7, 2026",
    dueDate: "Mar 10, 2026",
    status: "Received",
    paRequired: true,
    paStatus: "Pending",
    insurance: "Aetna HMO",
    notes: "PA documentation sent Mar 6. Awaiting Aetna response.",
  },
  {
    rxNum: "RX-20479",
    formulaName: "Testosterone Cypionate",
    strength: "200mg/mL",
    base: "Cottonseed Oil",
    form: "Injectable",
    quantity: "10mL vial",
    bud: "Jun 4, 2026",
    patient: "Michael Davis",
    patientDob: "1968-11-03",
    prescriber: "Dr. Elaine Cross",
    prescriberNpi: "3344556677",
    clinic: "Bayview Anti-Aging",
    receivedDate: "Mar 5, 2026",
    dueDate: "Mar 8, 2026",
    status: "QC Review",
    paRequired: false,
    paStatus: "Not Required",
    insurance: "Tricare",
    notes: "QC batch: TC-0307-002. Endotoxin pending.",
  },
  {
    rxNum: "RX-20471",
    formulaName: "BPC-157 Peptide",
    strength: "500mcg/mL",
    base: "Bacteriostatic Water",
    form: "Injectable",
    quantity: "5mL vial",
    bud: "Apr 6, 2026",
    patient: "Lisa Park",
    patientDob: "1984-06-19",
    prescriber: "Dr. Marcus Webb",
    prescriberNpi: "5544332211",
    clinic: "Pinnacle Medical Group",
    receivedDate: "Mar 4, 2026",
    dueDate: "Mar 7, 2026",
    status: "Dispensed",
    paRequired: false,
    paStatus: "Not Required",
    insurance: "Medicare Part D",
    notes: "Patient picking up same day.",
  },
  {
    rxNum: "RX-20468",
    formulaName: "Progesterone Capsule",
    strength: "200mg",
    base: "Peanut Oil / Gelatin Cap",
    form: "Capsule",
    quantity: "30 caps",
    bud: "Jun 7, 2026",
    patient: "Jennifer Martinez",
    patientDob: "1972-02-28",
    prescriber: "Dr. Rachel Kim",
    prescriberNpi: "1234567890",
    clinic: "Suncoast Wellness",
    receivedDate: "Mar 3, 2026",
    dueDate: "Mar 6, 2026",
    status: "Shipped",
    paRequired: false,
    paStatus: "Not Required",
    insurance: "Blue Cross PPO",
    notes: "Shipped via FedEx overnight. Tracking: 7748201983.",
  },
  {
    rxNum: "RX-20485",
    formulaName: "Glutathione IV",
    strength: "600mg/10mL",
    base: "Sterile 0.9% NaCl",
    form: "IV Infusion",
    quantity: "10mL bag",
    bud: "Mar 14, 2026",
    patient: "Patricia Brown",
    patientDob: "1965-08-17",
    prescriber: "Dr. Priya Anand",
    prescriberNpi: "6677889900",
    clinic: "North Dade Integrative",
    receivedDate: "Mar 7, 2026",
    dueDate: "Mar 9, 2026",
    status: "Received",
    paRequired: false,
    paStatus: "Not Required",
    insurance: "United Healthcare",
    notes: "Urgent — patient infusion scheduled Mar 9.",
  },
  {
    rxNum: "RX-20477",
    formulaName: "Semaglutide Topical",
    strength: "1mg/mL",
    base: "Lipoderm Base",
    form: "Topical",
    quantity: "30mL pump",
    bud: "May 7, 2026",
    patient: "Robert Johnson",
    patientDob: "1979-12-05",
    prescriber: "Dr. Rachel Kim",
    prescriberNpi: "1234567890",
    clinic: "Suncoast Wellness",
    receivedDate: "Mar 4, 2026",
    dueDate: "Mar 10, 2026",
    status: "Received",
    paRequired: true,
    paStatus: "Denied",
    insurance: "Cigna",
    notes: "PA denied. Prescriber notified. Appeal in progress.",
  },
  {
    rxNum: "RX-20462",
    formulaName: "Testosterone / DHEA Cream",
    strength: "T 5% / DHEA 10%",
    base: "VersaBase Cream",
    form: "Topical",
    quantity: "60g jar",
    bud: "May 5, 2026",
    patient: "Amanda Foster",
    patientDob: "1970-07-22",
    prescriber: "Dr. James Ortega",
    prescriberNpi: "9876543210",
    clinic: "Advanced Hormone Institute",
    receivedDate: "Mar 1, 2026",
    dueDate: "Mar 4, 2026",
    status: "Shipped",
    paRequired: false,
    paStatus: "Not Required",
    insurance: "Aetna HMO",
    notes: "Shipped Mar 4. Refrigerated transport.",
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STEPS: RxStatus[] = [
  "Received",
  "In Compounding",
  "QC Review",
  "Dispensed",
  "Shipped",
];

const FORM_CATEGORIES = ["All", "Injectable", "Capsule", "Topical", "IV Infusion"];
const STATUS_FILTERS: (RxStatus | "All")[] = [
  "All",
  "Received",
  "In Compounding",
  "QC Review",
  "Dispensed",
  "Shipped",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusVariant(
  s: RxStatus
): "secondary" | "warning" | "info" | "success" | "default" {
  switch (s) {
    case "Shipped":
      return "success";
    case "Dispensed":
      return "info";
    case "QC Review":
      return "warning";
    case "In Compounding":
      return "info";
    default:
      return "secondary";
  }
}

function paVariant(
  s: PaStatus
): "success" | "warning" | "error" | "secondary" {
  switch (s) {
    case "Approved":
      return "success";
    case "Pending":
      return "warning";
    case "Denied":
      return "error";
    default:
      return "secondary";
  }
}

function isOverdue(dueDate: string): boolean {
  const parts = dueDate.split(" ");
  if (parts.length < 3) return false;
  return new Date(dueDate) < new Date();
}

// ─── Pipeline mini-indicator ─────────────────────────────────────────────────

function PipelineDots({ current }: { current: RxStatus }) {
  const idx = STATUS_STEPS.indexOf(current);
  return (
    <div className="flex items-center gap-0.5">
      {STATUS_STEPS.map((step, i) => (
        <div key={step} className="flex items-center">
          <div
            className="w-2 h-2 rounded-full transition-colors"
            style={{
              background:
                i < idx
                  ? "var(--color-success, #059669)"
                  : i === idx
                  ? "var(--primary)"
                  : "var(--border)",
            }}
            title={step}
          />
          {i < STATUS_STEPS.length - 1 && (
            <div
              className="w-3 h-px"
              style={{
                background:
                  i < idx ? "var(--color-success, #059669)" : "var(--border)",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Expanded Detail Panel ────────────────────────────────────────────────────

function RxDetailPanel({
  rx,
  onClose,
}: {
  rx: CompoundRx;
  onClose: () => void;
}) {
  const detailFields = [
    { label: "Patient", value: rx.patient },
    { label: "DOB", value: rx.patientDob },
    { label: "Insurance", value: rx.insurance },
    { label: "PA Status", value: rx.paRequired ? rx.paStatus : "Not Required" },
    { label: "Prescriber", value: rx.prescriber },
    { label: "NPI", value: rx.prescriberNpi },
    { label: "Clinic", value: rx.clinic },
    { label: "Due Date", value: rx.dueDate },
    { label: "Base / Vehicle", value: rx.base },
    { label: "Quantity", value: rx.quantity },
    { label: "Received", value: rx.receivedDate },
    { label: "Status", value: rx.status },
  ];

  return (
    <div className="bg-card border border-border rounded-lg p-6 mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-xs text-muted-foreground font-mono mb-0.5">
            {rx.rxNum}
          </p>
          <h3
            className="text-xl font-light text-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {rx.formulaName}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {rx.strength} &middot; {rx.form} &middot; BUD: {rx.bud}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
        >
          Close
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {detailFields.map(({ label, value }) => (
          <div
            key={label}
            className="bg-background border border-border rounded-md p-3"
          >
            <p className="eyebrow text-[9px] mb-1">{label}</p>
            <p className="text-sm font-medium text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {rx.notes && (
        <div className="bg-warning/5 border border-warning/20 rounded-md p-3 mb-4">
          <p className="eyebrow text-[9px] mb-1 text-warning">Notes</p>
          <p className="text-sm text-foreground">{rx.notes}</p>
        </div>
      )}

      <div className="mb-5">
        <p className="eyebrow text-[9px] mb-3">Compounding Pipeline</p>
        <div className="flex items-center gap-0">
          {STATUS_STEPS.map((step, i) => {
            const idx = STATUS_STEPS.indexOf(rx.status);
            const done = i < idx;
            const active = i === idx;
            return (
              <div key={step} className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="w-3.5 h-3.5 rounded-full border-2 transition-colors"
                    style={{
                      background: done
                        ? "var(--color-success, #059669)"
                        : active
                        ? "var(--primary)"
                        : "transparent",
                      borderColor: done
                        ? "var(--color-success, #059669)"
                        : active
                        ? "var(--primary)"
                        : "var(--border)",
                    }}
                  />
                  <span
                    className="text-[9px] whitespace-nowrap"
                    style={{
                      color: active
                        ? "var(--primary)"
                        : done
                        ? "var(--color-success, #059669)"
                        : "var(--muted-foreground)",
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {step}
                  </span>
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div
                    className="w-8 h-px mb-3.5"
                    style={{
                      background: done
                        ? "var(--color-success, #059669)"
                        : "var(--border)",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button className="px-4 py-2 bg-foreground text-background text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-foreground/90 transition-colors">
          Advance Status
        </button>
        <button className="px-4 py-2 border border-border text-foreground text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-muted transition-colors">
          Print Label
        </button>
        <button className="px-4 py-2 border border-border text-foreground text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-muted transition-colors">
          Edit Rx
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CompoundRxPage() {
  const [prescriptions, setPrescriptions] = useState<CompoundRx[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formFilter, setFormFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<RxStatus | "All">("All");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    prescriptionsApi
      .getAll()
      .then((data) => {
        const mapped = Array.isArray(data)
          ? (data as unknown as CompoundRx[]).filter((rx) => rx.rxNum)
          : [];
        setPrescriptions(mapped.length > 0 ? mapped : SEED_PRESCRIPTIONS);
      })
      .catch(() => {
        setPrescriptions(SEED_PRESCRIPTIONS);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const today = new Date().toDateString();

  const filtered = prescriptions.filter((rx) => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      rx.rxNum.toLowerCase().includes(q) ||
      rx.formulaName.toLowerCase().includes(q) ||
      rx.patient.toLowerCase().includes(q) ||
      rx.prescriber.toLowerCase().includes(q);
    const matchForm = formFilter === "All" || rx.form === formFilter;
    const matchStatus = statusFilter === "All" || rx.status === statusFilter;
    return matchSearch && matchForm && matchStatus;
  });

  const selectedRx = prescriptions.find((rx) => rx.rxNum === selected) ?? null;

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1400px]">
        <PageHeader
          eyebrow="PHARMACY"
          title="Compound Rx"
          description="Manage compound prescriptions through all stages of the compounding workflow."
          backHref="/pharmacy"
        />

        {/* Pipeline Stage Legend */}
        <div className="flex items-center gap-3 mb-6 px-4 py-3 bg-card border border-border rounded-lg flex-wrap">
          <p className="eyebrow text-[9px]">Pipeline</p>
          {STATUS_STEPS.map((step, i) => (
            <div key={step} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  background:
                    i === 0
                      ? "var(--muted-foreground)"
                      : i === 1
                      ? "var(--primary)"
                      : i === 2
                      ? "var(--warning, #f59e0b)"
                      : i === 3
                      ? "var(--brand, #0ea5e9)"
                      : "var(--color-success, #059669)",
                }}
              />
              <span className="text-xs text-muted-foreground">{step}</span>
              {i < STATUS_STEPS.length - 1 && (
                <span className="text-xs text-muted-foreground">→</span>
              )}
            </div>
          ))}
        </div>

        {/* Search + Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Rx#, formula, patient, prescriber..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-border rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
            />
          </div>

          {FORM_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setFormFilter(cat)}
              className="px-3 py-2 text-xs rounded-md border transition-colors"
              style={{
                borderColor:
                  formFilter === cat ? "var(--primary)" : "var(--border)",
                background:
                  formFilter === cat ? "var(--primary)/10" : "transparent",
                color:
                  formFilter === cat ? "var(--primary)" : "var(--muted-foreground)",
              }}
            >
              {cat}
            </button>
          ))}

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as RxStatus | "All")
              }
              className="pl-3 pr-8 py-2.5 text-xs border border-border rounded-md bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>
                  {s === "All" ? "All Statuses" : s}
                </option>
              ))}
            </select>
            <ChevronDown
              size={12}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16">
              <Loader2 size={18} className="animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading prescriptions...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <FlaskConical size={28} className="text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No prescriptions match your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted/30">
                    {[
                      "Rx #",
                      "Formula",
                      "Strength / Base",
                      "Form",
                      "Patient",
                      "Prescriber",
                      "Received",
                      "Due Date",
                      "PA",
                      "Status",
                      "Pipeline",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[10px] tracking-[0.1em] uppercase font-light text-muted-foreground border-b border-border whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((rx) => {
                    const overdue = isOverdue(rx.dueDate);
                    const isSelected = selected === rx.rxNum;

                    return (
                      <>
                        <tr
                          key={rx.rxNum}
                          onClick={() =>
                            setSelected(isSelected ? null : rx.rxNum)
                          }
                          className="hover:bg-muted/40 cursor-pointer transition-colors"
                          style={{
                            background: isSelected
                              ? "var(--primary)/5"
                              : overdue
                              ? "var(--destructive)/3"
                              : undefined,
                          }}
                        >
                          <td className="px-4 py-3">
                            <p className="text-xs font-mono font-medium text-primary">
                              {rx.rxNum}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {rx.receivedDate}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-foreground whitespace-nowrap">
                              {rx.formulaName}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs font-medium text-foreground">
                              {rx.strength}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {rx.base}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {rx.form}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs font-medium text-foreground whitespace-nowrap">
                              {rx.patient}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {rx.insurance}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs text-muted-foreground whitespace-nowrap">
                              {rx.prescriber}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {rx.clinic}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {rx.receivedDate}
                          </td>
                          <td className="px-4 py-3">
                            <p
                              className="text-xs font-medium whitespace-nowrap"
                              style={{
                                color: overdue
                                  ? "var(--destructive)"
                                  : "var(--foreground)",
                              }}
                            >
                              {rx.dueDate}
                              {overdue && (
                                <span className="ml-1 text-[9px]">!</span>
                              )}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            {rx.paRequired ? (
                              <Badge variant={paVariant(rx.paStatus)}>
                                {rx.paStatus}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={statusVariant(rx.status)}>
                              {rx.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <PipelineDots current={rx.status} />
                          </td>
                        </tr>

                        {/* Inline expanded detail */}
                        {isSelected && selectedRx && (
                          <tr key={`${rx.rxNum}-detail`}>
                            <td colSpan={11} className="px-4 pb-4">
                              <RxDetailPanel
                                rx={selectedRx}
                                onClose={() => setSelected(null)}
                              />
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-4 py-3 flex items-center justify-between border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {filtered.length} of {prescriptions.length} prescriptions
            </p>
            <p className="text-[10px] text-muted-foreground bg-muted px-3 py-1 rounded-full">
              Connect PioneerRx / Rx30 / McKesson for live dispense data
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
