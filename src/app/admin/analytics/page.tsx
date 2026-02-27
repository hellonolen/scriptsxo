"use client";

import { useState } from "react";
import { BarChart3, Users, Activity, DollarSign, Clock, ArrowUpRight, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

// --- High Fidelity Mock Data ---
const revenueData = [
  { name: "Feb 1", revenue: 4200 },
  { name: "Feb 5", revenue: 5100 },
  { name: "Feb 10", revenue: 4800 },
  { name: "Feb 15", revenue: 6300 },
  { name: "Feb 20", revenue: 7200 },
  { name: "Feb 25", revenue: 8500 },
  { name: "Feb 28", revenue: 9100 },
];

const specialtyData = [
  { name: "Primary Care", value: 450 },
  { name: "TRT/Hormones", value: 320 },
  { name: "Weight Loss", value: 280 },
  { name: "Dermatology", value: 150 },
  { name: "Mental Health", value: 120 },
];

const topProviders = [
  { name: "Dr. Sarah Jenkins", specialty: "Primary Care", consults: 142, rating: 4.9, earnings: "$12,450" },
  { name: "Dr. Michael Chen", specialty: "TRT/Hormones", consults: 98, rating: 4.8, earnings: "$9,800" },
  { name: "Dr. Emily Russo", specialty: "Weight Loss", consults: 85, rating: 5.0, earnings: "$8,500" },
];

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState("30d");

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1400px]">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <PageHeader
            eyebrow="ANALYTICS"
            title="Platform Reporting"
            description="Real-time performance and financial metrics."
            backHref="/admin"
          />
          <div className="flex bg-muted/30 p-1 rounded-lg border border-border self-start">
            {["7d", "30d", "90d", "1y"].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${dateRange === range
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Clients"
            value="1,492"
            icon={Users}
            hint="+12% this month"
            trend="up"
          />
          <StatCard
            label="Active Providers"
            value="48"
            icon={Activity}
            hint="+3 this month"
            trend="up"
          />
          <StatCard
            label="Consultations"
            value="8,234"
            icon={Activity}
            hint="98% completion rate"
          />
          <StatCard
            label="MRR"
            value="$142.5k"
            icon={DollarSign}
            hint="+18% vs last month"
            trend="up"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          {/* Revenue Chart */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-medium text-foreground">Revenue Growth</h2>
                <p className="text-xs text-muted-foreground">Rolling 30-day calculation</p>
              </div>
              <div className="flex items-center gap-1 text-success text-sm font-medium bg-success/10 px-2.5 py-1 rounded-full">
                <TrendingUp size={14} />
                +18.2%
              </div>
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                    tickFormatter={(value) => `$${value / 1000}k`}
                    dx={-10}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--foreground)' }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#7C3AED"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Specialty Breakdown */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-base font-medium text-foreground mb-1">Consults by Specialty</h2>
            <p className="text-xs text-muted-foreground mb-6">Distribution across departments</p>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={specialtyData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" opacity={0.5} />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 13 }}
                    width={95}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--muted)', opacity: 0.2 }}
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                    formatter={(value: number) => [value, 'Consultations']}
                  />
                  <Bar dataKey="value" fill="#2DD4BF" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          {/* Leaderboard Table */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="text-base font-medium text-foreground">Top Performing Providers</h2>
              <button className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                View all <ArrowUpRight size={14} />
              </button>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/30">
                  <th className="py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Provider</th>
                  <th className="py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Specialty</th>
                  <th className="py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Consults</th>
                  <th className="py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">Earnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {topProviders.map((provider, i) => (
                  <tr key={i} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                          {provider.name.split(' ').map(n => n[0]).join('').replace('D', '')}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{provider.name}</p>
                          <p className="text-xs text-warning">★ {provider.rating}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-5 text-sm text-foreground">{provider.specialty}</td>
                    <td className="py-3 px-5 text-sm text-foreground">{provider.consults}</td>
                    <td className="py-3 px-5 text-sm text-foreground font-medium text-right">{provider.earnings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Operational Metrics */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-base font-medium text-foreground mb-1">Operational Metrics</h2>
            <p className="text-xs text-muted-foreground mb-6">System health indicators</p>

            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Clock size={20} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Average Wait Time</p>
                  <p className="text-xl font-medium text-foreground mt-0.5">3m 42s</p>
                  <p className="text-xs text-success mt-1">↓ 15s from yesterday</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                  <Activity size={20} className="text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Platform Uptime</p>
                  <p className="text-xl font-medium text-foreground mt-0.5">99.99%</p>
                  <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                  <Users size={20} className="text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Patient Retention</p>
                  <p className="text-xl font-medium text-foreground mt-0.5">84.2%</p>
                  <p className="text-xs text-success mt-1">↑ 2.1% this quarter</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
