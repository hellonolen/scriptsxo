import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, ArrowLeft, Receipt, Download } from "lucide-react";
import { Nav } from "@/components/nav";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/config";

export const metadata: Metadata = {
  title: "Billing",
  description: "View your payment history, receipts, and manage payment methods.",
};

const PAYMENT_HISTORY = [
  { date: "Feb 7, 2026", description: "Telehealth Consultation", amount: 7500, status: "paid" },
  { date: "Jan 20, 2026", description: "Telehealth Consultation", amount: 7500, status: "paid" },
  { date: "Dec 15, 2025", description: "Telehealth Consultation", amount: 7500, status: "paid" },
];

export default function BillingPage() {
  return (
    <>
      <Nav />
      <main className="min-h-screen pt-24 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Link href="/portal" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft size={20} aria-hidden="true" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tighter text-foreground">
                Billing
              </h1>
              <p className="text-sm text-muted-foreground">
                Payment history and payment methods.
              </p>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-card border border-border rounded-lg p-6 mb-8">
            <h2 className="text-sm font-semibold text-foreground mb-4">Payment Method</h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <CreditCard size={18} className="text-muted-foreground" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Visa ending in 4242</p>
                  <p className="text-xs text-muted-foreground">Expires 12/27</p>
                </div>
              </div>
              <button className="text-xs text-primary hover:underline">Update</button>
            </div>
          </div>

          {/* Payment History */}
          <h2 className="text-sm font-semibold text-foreground mb-4">Payment History</h2>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="divide-y divide-border">
              {PAYMENT_HISTORY.map((payment, i) => (
                <div key={i} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-green-500/10 flex items-center justify-center">
                      <Receipt size={14} className="text-green-600" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{payment.description}</p>
                      <p className="text-xs text-muted-foreground">{payment.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-foreground">
                      {formatPrice(payment.amount)}
                    </span>
                    <Badge variant="success">Paid</Badge>
                    <button className="text-muted-foreground hover:text-foreground" aria-label="Download receipt">
                      <Download size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
