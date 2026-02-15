"use client";

import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { motion } from "framer-motion";
import { Shield, Lock, Fingerprint, Zap, ArrowRight, Clock, Smartphone, CheckCircle } from "lucide-react";

/* ─── Animation ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />

      {/* ══════════════════════════════════════════════════════════════
          HERO
          Big, emotional, conversion-focused.
          No doctor talk. Just the transformation.
          ══════════════════════════════════════════════════════════════ */}
      <section className="relative pt-36 pb-28 sm:pt-48 sm:pb-36 px-4 sm:px-8 overflow-hidden">
        {/* Layered gradient backdrop */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 right-0 w-[900px] h-[900px] bg-[radial-gradient(ellipse_at_top_right,rgba(124,58,237,0.12)_0%,transparent_55%)]" />
          <div className="absolute top-[50%] -left-[15%] w-[700px] h-[700px] bg-[radial-gradient(ellipse,rgba(45,212,191,0.08)_0%,transparent_55%)]" />
          <div className="absolute bottom-0 right-[30%] w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(124,58,237,0.04)_0%,transparent_60%)]" />
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="text-center">
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#7C3AED]/8 border border-[#7C3AED]/12 mb-8"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#2DD4BF] animate-pulse" />
              <span className="text-xs tracking-widest uppercase text-[#7C3AED] font-medium">
                Now Available in Florida
              </span>
            </motion.div>

            <motion.h1
              className="text-5xl sm:text-6xl lg:text-[4.5rem] font-medium tracking-tight leading-[1.06] mb-8"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              Your prescription.
              <br />
              <span className="bg-gradient-to-r from-[#7C3AED] via-[#6D28D9] to-[#2DD4BF] bg-clip-text text-transparent">
                Your terms.
              </span>
            </motion.h1>

            <motion.p
              className="text-lg sm:text-xl text-muted-foreground font-light max-w-2xl mx-auto leading-relaxed mb-6"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              Skip the waiting room. Skip the paperwork. Get your prescription
              handled from anywhere, on any device, in minutes.
            </motion.p>

            <motion.p
              className="text-sm text-muted-foreground mb-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.3 }}
            >
              One flat fee. No insurance required. No hidden charges.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row items-center justify-center gap-5"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
            >
              <Link
                href="/access"
                className="group btn-gradient text-sm px-10 py-4 flex items-center gap-2 relative z-10"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Get Started for $97
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
              <Link
                href="#how-it-works"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors tracking-wide underline underline-offset-4 decoration-border"
              >
                See how it works
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          TRUST RIBBON — compact, authoritative
          ══════════════════════════════════════════════════════════════ */}
      <section className="border-y border-border/50 bg-muted/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
          {["HIPAA COMPLIANT", "END-TO-END ENCRYPTED", "BOARD CERTIFIED", "LICENSED IN FLORIDA", "NO PASSWORDS"].map(
            (badge) => (
              <span key={badge} className="text-[10px] tracking-[0.25em] text-muted-foreground font-medium uppercase">
                {badge}
              </span>
            )
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          THE PROBLEM — emotional, relatable
          ══════════════════════════════════════════════════════════════ */}
      <section className="py-28 sm:py-36 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20">
            <p className="eyebrow mb-4">The Problem</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-medium leading-tight">
              Getting a prescription shouldn&apos;t <br className="hidden sm:block" />
              <span className="text-muted-foreground">feel like a part-time job</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {[
              {
                pain: "Take time off work just to sit in a waiting room",
                icon: Clock,
              },
              {
                pain: "Fill out the same forms every single visit",
                icon: Smartphone,
              },
              {
                pain: "Call the pharmacy, call the clinic, call back again",
                icon: Zap,
              },
              {
                pain: "Pay a copay, then a surprise bill, then another one",
                icon: Shield,
              },
            ].map((item, i) => (
              <motion.div
                key={item.pain}
                className="flex items-start gap-4 p-5 rounded-2xl bg-muted/40 border border-border/60"
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
              >
                <item.icon className="w-5 h-5 text-[#7C3AED]/50 shrink-0 mt-0.5" />
                <p className="text-sm text-foreground/80 font-light leading-relaxed">{item.pain}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="mt-16 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-xl sm:text-2xl font-medium text-foreground">
              We built ScriptsXO to end all of that.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          THE SOLUTION — before/after transformation
          ══════════════════════════════════════════════════════════════ */}
      <section className="py-28 sm:py-36 px-4 sm:px-8 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <p className="eyebrow mb-4">The ScriptsXO Way</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-medium">
              Everything changes when <br className="hidden sm:block" />
              the process{" "}
              <span className="bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF] bg-clip-text text-transparent">
                works for you
              </span>
            </h2>
          </div>

          <div className="space-y-5">
            {[
              {
                old: "Sitting in a waiting room for 45 minutes",
                new: "Start from your couch, your car, wherever you are",
                detail: "Open the app. Answer a few questions. Our AI prepares everything so you're not wasting a single minute.",
              },
              {
                old: "Playing phone tag between your clinic and pharmacy",
                new: "Prescription sent directly, tracked in real time",
                detail: "Your prescription goes straight to the pharmacy you choose. You get notified when it's ready. No calls, no wondering.",
              },
              {
                old: "Filling out the same clipboard for the hundredth time",
                new: "AI-powered intake that remembers you",
                detail: "Our AI concierge handles your intake conversationally. It learns your history so you never repeat yourself.",
              },
              {
                old: "Surprise bills, confusing copays, insurance headaches",
                new: "One price. $97. That's the whole bill.",
                detail: "No insurance needed. No hidden fees. No surprise charges after the fact. You know exactly what you're paying before you start.",
              },
            ].map((row, i) => (
              <motion.div
                key={row.old}
                className="glass-card"
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-20px" }}
                custom={i}
              >
                <div className="flex flex-col lg:flex-row lg:items-start gap-5 lg:gap-10">
                  <div className="lg:w-72 shrink-0 space-y-1.5">
                    <p className="text-xs text-muted-foreground line-through">{row.old}</p>
                    <p className="text-sm font-medium bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF] bg-clip-text text-transparent">
                      {row.new}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground font-light leading-relaxed">{row.detail}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          HOW IT WORKS — clear 3-step with connecting line
          ══════════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-28 sm:py-36 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20">
            <p className="eyebrow mb-4">How It Works</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-medium">
              Three steps. Under 15 minutes.
            </h2>
          </div>

          <div className="relative">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-8 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-[#7C3AED]/20 via-[#7C3AED]/10 to-[#2DD4BF]/20" />

            <div className="grid md:grid-cols-3 gap-14 md:gap-8">
              {[
                {
                  step: "1",
                  title: "Create your account",
                  body: "Sign up with your fingerprint or Face ID. No passwords. No verification emails. Takes about 30 seconds.",
                  icon: Fingerprint,
                },
                {
                  step: "2",
                  title: "Complete your intake",
                  body: "Our AI walks you through a few questions about what you need. It prepares your case before your consultation even begins.",
                  icon: Smartphone,
                },
                {
                  step: "3",
                  title: "Get your prescription",
                  body: "After your secure video consultation, your prescription is sent to the pharmacy of your choice. Track it in real time.",
                  icon: CheckCircle,
                },
              ].map((item, i) => (
                <motion.div
                  key={item.step}
                  className="text-center relative"
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={i}
                >
                  <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#2DD4BF] text-white mb-6 shadow-lg shadow-[#7C3AED]/15">
                    <item.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-medium mb-3">{item.title}</h3>
                  <p className="text-sm text-muted-foreground font-light leading-relaxed max-w-xs mx-auto">
                    {item.body}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          PLATFORM FEATURES — deep, visual, rich
          ══════════════════════════════════════════════════════════════ */}
      <section className="py-28 sm:py-36 px-4 sm:px-8 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <p className="eyebrow mb-4">The Platform</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-medium">
              Built from the ground up for this
            </h2>
            <p className="mt-4 text-muted-foreground font-light max-w-2xl mx-auto">
              ScriptsXO isn&apos;t a skin on top of something else. Every piece was designed
              to make prescriptions faster, safer, and more transparent.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: Zap,
                title: "AI-Powered Triage",
                description:
                  "Our AI agents pre-screen your symptoms and build your chart before you ever connect with a provider. No wasted time.",
              },
              {
                icon: Lock,
                title: "Device-Only Security",
                description:
                  "Your passkey lives on your device. No passwords to steal, no accounts to hack. Biometric authentication only.",
              },
              {
                icon: Shield,
                title: "HIPAA End to End",
                description:
                  "Encrypted at rest, encrypted in transit. BAAs with every vendor in the chain. Your health data is protected at every step.",
              },
              {
                icon: Smartphone,
                title: "Works on Any Device",
                description:
                  "Phone, tablet, laptop — works everywhere. No app to download. Just open your browser and go.",
              },
              {
                icon: Clock,
                title: "Real-Time Tracking",
                description:
                  "Track your prescription from the moment it's written to the moment it's ready for pickup. No black box.",
              },
              {
                icon: CheckCircle,
                title: "Follow-Up Included",
                description:
                  "Your $97 includes 7 days of follow-up messaging. If something needs adjusting, you're covered.",
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                className="glass-card group"
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
              >
                <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/8 flex items-center justify-center mb-4 group-hover:bg-[#7C3AED]/12 transition-colors">
                  <feature.icon className="w-5 h-5 text-[#7C3AED]" />
                </div>
                <h3 className="text-base font-medium mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground font-light leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          TESTIMONIALS — social proof
          ══════════════════════════════════════════════════════════════ */}
      <section className="py-28 sm:py-36 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="eyebrow mb-4">From Our Clients</p>
            <h2 className="text-3xl sm:text-4xl font-medium">
              People are done waiting
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: "I renewed my prescription in 12 minutes from my car during lunch. This is how it should have always worked.",
                name: "Maria T.",
                context: "Prescription renewal",
              },
              {
                quote: "The intake felt like a real conversation, not a form. And I didn't have to repeat my entire history for the hundredth time.",
                name: "James R.",
                context: "New client",
              },
              {
                quote: "I used to take half a day off work just to get a refill. Now I handle it from my phone in the time it takes to make coffee.",
                name: "Keisha W.",
                context: "Returning client",
              },
            ].map((t, i) => (
              <motion.div
                key={t.name}
                className="glass-card flex flex-col justify-between"
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
              >
                <p className="text-sm text-foreground font-light leading-relaxed mb-8">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="border-t border-border/40 pt-4">
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.context}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          PRICING — single, clear, confident
          ══════════════════════════════════════════════════════════════ */}
      <section className="py-28 sm:py-36 px-4 sm:px-8 bg-muted/30">
        <div className="max-w-lg mx-auto text-center">
          <p className="eyebrow mb-4">Pricing</p>
          <h2 className="text-3xl sm:text-4xl font-medium mb-4">
            One price. No games.
          </h2>
          <p className="text-muted-foreground font-light mb-14 max-w-md mx-auto">
            No insurance needed. No copay confusion. No bills showing up
            weeks later. You pay once, up front, and that&apos;s it.
          </p>

          <motion.div
            className="glass-card glow-accent"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-7xl font-medium text-foreground tracking-tight mb-1">$97</p>
            <p className="text-sm text-muted-foreground mb-10">one-time &middot; per consultation</p>

            <div className="space-y-4 text-sm text-left text-muted-foreground font-light">
              {[
                "Secure video consultation",
                "AI-powered intake and pre-screening",
                "Prescription sent to your pharmacy",
                "7 days of follow-up messaging",
                "Real-time prescription tracking",
                "Encrypted medical records",
                "No insurance paperwork",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-[#2DD4BF] shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <Link
              href="/access"
              className="btn-gradient text-sm px-10 py-4 w-full block text-center relative mt-10"
            >
              <span className="relative z-10">Get Started Now</span>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          FAQ — address objections
          ══════════════════════════════════════════════════════════════ */}
      <section className="py-28 sm:py-36 px-4 sm:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <p className="eyebrow mb-4">Questions</p>
            <h2 className="text-3xl sm:text-4xl font-medium">
              Common questions, straight answers
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Do I need insurance?",
                a: "No. ScriptsXO is a flat $97 per consultation, regardless of insurance status. No claims, no copays, no surprise bills.",
              },
              {
                q: "Is this a real prescription?",
                a: "Yes. You're consulting with a licensed, board-certified physician who writes real prescriptions sent to real pharmacies.",
              },
              {
                q: "What states are you available in?",
                a: "ScriptsXO is currently available in Florida. We're expanding to additional states soon.",
              },
              {
                q: "How long does it take?",
                a: "Most consultations are completed in under 15 minutes from the time you start your intake.",
              },
              {
                q: "Is my data safe?",
                a: "ScriptsXO is HIPAA compliant with end-to-end encryption, BAAs with every vendor, and device-only authentication. Your data never leaves the vault.",
              },
              {
                q: "Can I choose my pharmacy?",
                a: "Yes. You pick the pharmacy. Your prescription is sent directly and you can track it in real time.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.q}
                className="glass-card"
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
              >
                <h3 className="text-sm font-medium text-foreground mb-2">{item.q}</h3>
                <p className="text-sm text-muted-foreground font-light leading-relaxed">{item.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          FINAL CTA — urgency, clarity, one action
          ══════════════════════════════════════════════════════════════ */}
      <section className="relative py-32 sm:py-40 px-4 sm:px-8 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[10%] left-[20%] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(124,58,237,0.08)_0%,transparent_55%)]" />
          <div className="absolute bottom-[10%] right-[15%] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(45,212,191,0.06)_0%,transparent_55%)]" />
        </div>

        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-medium leading-[1.1] mb-6">
            Your prescription is{" "}
            <span className="bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF] bg-clip-text text-transparent">
              15 minutes away
            </span>
          </h2>
          <p className="text-muted-foreground font-light mb-4 max-w-md mx-auto">
            No appointment to schedule. No insurance to figure out.
            Just open ScriptsXO, create your account, and go.
          </p>
          <p className="text-sm text-muted-foreground mb-10">$97 flat &middot; Paid up front &middot; That&apos;s it</p>
          <Link
            href="/access"
            className="group btn-gradient text-sm px-14 py-4 relative inline-flex items-center gap-2"
          >
            <span className="relative z-10 flex items-center gap-2">
              Get Started Now
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
