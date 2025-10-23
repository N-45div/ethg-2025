"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const benefits = [
  {
    title: "Multi-chain payments",
    description:
      "Pay workers in USDC or PYUSD on Sepolia, then automatically bridge to Base, Arbitrum, or Optimism via Avail Nexus SDK.",
    icon: Sparkles,
  },
  {
    title: "Time-locked automation",
    description:
      "Schedule payments in advance with time-locks. Funds are secured in treasury until release time, then auto-executed on-chain.",
    icon: ShieldCheck,
  },
  {
    title: "Complete transparency",
    description:
      "Blockscout integration provides real-time transaction tracking, verified contracts, and complete audit trails for compliance.",
    icon: Wallet,
  },
];

const stats = [
  { label: "Automated payroll volume", value: "$42M+" },
  { label: "Cross-chain intents processed", value: "18,400" },
  { label: "Average time-to-release", value: "< 3 min" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-muted/60 to-background text-foreground">
      <header className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-x-0 top-0 h-[320px] bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.16),_transparent_60%)]" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-16 px-6 pb-20 pt-16 lg:px-12">
          <div className="flex items-center justify-between gap-4">
            <div className="text-xl font-semibold tracking-tight">Synced Streams</div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="hidden border-dashed uppercase tracking-wide sm:inline-flex">
                Powered by Avail Nexus SDK
              </Badge>
              <Button asChild variant="outline">
                <Link href="/dashboard">View dashboard</Link>
              </Button>
            </div>
          </div>

          <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_1fr]">
            <div className="space-y-8">
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide">
                Cross-chain payroll automation
              </Badge>
              <div className="space-y-6">
                <h1 className="text-balance text-4xl font-semibold leading-tight sm:text-5xl">
                  Pay your global team on any chain with automated multi-chain bridging.
                </h1>
                <p className="text-balance text-lg text-muted-foreground">
                  Schedule USDC and PYUSD payroll intents, execute on-chain, and automatically bridge to workers' preferred chains. No manual transfers, no complexity.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="lg" className="shadow-lg shadow-primary/30" asChild>
                  <Link href="/dashboard">
                    Launch dashboard
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a
                    href="https://docs.availproject.org"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Explore documentation
                  </a>
                </Button>
              </div>
              <div className="flex flex-wrap gap-8 text-sm text-muted-foreground">
                {stats.map((stat) => (
                  <div key={stat.label} className="space-y-1">
                    <div className="text-2xl font-semibold text-foreground">{stat.value}</div>
                    <div className="max-w-[12rem] text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="rounded-3xl border border-border/70 bg-background/80 p-6 shadow-[0_30px_120px_-60px_rgba(15,118,110,0.45)] backdrop-blur">
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Cross-chain route preview</span>
                    <Badge variant="outline" className="border-dashed">Interactive</Badge>
                  </div>

                  {/* Route chips */}
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/30 p-4">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Source</div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1.5 text-sm">
                        <span className="size-2 rounded-full bg-emerald-500" />
                        Sepolia · USDC
                      </div>
                    </div>
                    <div className="relative mx-2 hidden h-1 flex-1 rounded-full bg-gradient-to-r from-emerald-500/30 via-cyan-500/30 to-indigo-500/30 sm:block">
                      <span className="absolute -top-1 size-3 rounded-full bg-emerald-400 shadow animate-pulse" style={{ left: 0 }} />
                      <span className="route-dot absolute -top-1 size-3 rounded-full bg-cyan-400 shadow" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Destination</div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1.5 text-sm">
                        <span className="size-2 rounded-full bg-indigo-500" />
                        Base Sepolia · USDC
                      </div>
                    </div>
                  </div>

                  {/* Steps */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-border/60 bg-background/70 p-3">
                      <div className="text-xs font-semibold">Allowance</div>
                      <div className="mt-1 text-xs text-muted-foreground">Approve min via SDK</div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/70 p-3">
                      <div className="text-xs font-semibold">Intent</div>
                      <div className="mt-1 text-xs text-muted-foreground">Review and confirm route</div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/70 p-3">
                      <div className="text-xs font-semibold">Settlement</div>
                      <div className="mt-1 text-xs text-muted-foreground">Bridge & execute transfer</div>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/40 px-4 py-3 text-sm">
                    <span className="text-muted-foreground">See it live on the dashboard with your wallet.</span>
                    <Button asChild size="sm">
                      <Link href="/dashboard">Open dashboard</Link>
                    </Button>
                  </div>
                </div>
              </div>
              <div className="pointer-events-none absolute -inset-10 -z-10 rounded-[48px] bg-[radial-gradient(circle,_rgba(34,211,238,0.28),_transparent_70%)] blur-3xl" />

              {/* Lightweight animation for the moving dot */}
              <style jsx>{`
                @keyframes route-move {
                  0% { left: 0%; opacity: .9; }
                  50% { left: 50%; opacity: 1; }
                  100% { left: 100%; opacity: .9; }
                }
                .route-dot {
                  animation: route-move 3.6s ease-in-out infinite alternate;
                }
              `}</style>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:px-12">
        <div className="space-y-4 text-center">
          <Badge variant="outline" className="mx-auto border-dashed uppercase tracking-wide">
            Why teams switch to Nexus payroll
          </Badge>
          <h2 className="text-3xl font-semibold sm:text-4xl">Operational peace of mind for treasury leaders</h2>
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            Give outpost engineers, finance controllers, and compliance reviewers the same live view of intent status,
            from scheduling to settlement, without spreadsheets or late-night bridge monitoring.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {benefits.map((benefit) => (
            <Card key={benefit.title} className="h-full border-border/70 bg-background/80 backdrop-blur">
              <CardHeader className="space-y-4">
                <div className="flex size-12 items-center justify-center rounded-full border border-border/60 bg-muted/40">
                  <benefit.icon className="size-5 text-primary" />
                </div>
                <CardTitle className="text-xl">{benefit.title}</CardTitle>
                <CardDescription className="text-base leading-relaxed text-muted-foreground">
                  {benefit.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-border/60 bg-background/70 py-20">
        <div className="mx-auto flex max-w-5xl flex-col gap-12 px-6 text-left lg:flex-row lg:items-center lg:justify-between lg:px-12">
          <div className="space-y-4">
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs uppercase tracking-wide">
              Built for ops & compliance
            </Badge>
            <h3 className="text-3xl font-semibold sm:text-4xl">Launch cross-chain payroll with confidence.</h3>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Connect your wallet, import workforce data, and let Nexus automation coordinate release windows across
              chains. You decide the governance; we ensure every intent is tracked, audited, and executed on schedule.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" asChild>
                <Link href="/dashboard">
                  Get started now
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="ghost" asChild>
                <a href="mailto:hello@availproject.org">Talk to sales</a>
              </Button>
            </div>
          </div>

          <div className="grid w-full gap-4 rounded-3xl border border-border/70 bg-muted/30 p-6 text-sm text-muted-foreground lg:max-w-sm">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                Compliance ready
              </span>
              <p className="mt-2 text-base text-foreground">
                Exportable audit logs, SOC2-friendly architecture, and multi-approver intent approvals keep risk teams
                aligned.
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                Ops automation
              </span>
              <p className="mt-2 text-base text-foreground">
                Nexus monitors intents, retries failed executions, and alerts stakeholders over Slack & email.
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                Flexible treasury
              </span>
              <p className="mt-2 text-base text-foreground">
                Pay in PYUSD today, expand to additional stablecoins or rollups with the same dashboard workflow.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 bg-background/80 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 text-sm text-muted-foreground lg:flex-row lg:px-12">
          <span>© {new Date().getFullYear()} Avail Nexus. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <a className="hover:text-primary" href="https://x.com/godlovesu_n" target="_blank" rel="noreferrer">
              X/Twitter
            </a>
            <a className="hover:text-primary" href="https://github.com/N-45div" target="_blank" rel="noreferrer">
              GitHub
            </a>
            <Link className="hover:text-primary" href="/dashboard">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
