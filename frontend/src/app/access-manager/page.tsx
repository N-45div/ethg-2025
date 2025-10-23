'use client';

import Link from "next/link";
import { useAccount } from "wagmi";
import { CheckCircle2, Loader2, RefreshCcw, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAccessTicket } from "@/hooks/useAccessTicket";

const DEFAULT_ROLE: "DEFAULT_ADMIN_ROLE" = "DEFAULT_ADMIN_ROLE";

const statusMeta = {
  granted: {
    icon: CheckCircle2,
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    label: "Access granted",
  },
  processing: {
    icon: Loader2,
    badge: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    label: "Grant in progress",
  },
  pending: {
    icon: Loader2,
    badge: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    label: "Waiting to process",
  },
  failed: {
    icon: AlertCircle,
    badge: "bg-destructive/10 text-destructive",
    label: "Grant failed",
  },
} as const;

const steps = [
  {
    title: "Connect wallet",
    description: "Connect the wallet that should administer payroll profiles.",
  },
  {
    title: "Request access",
    description: "Submit a role grant request. A privileged signer will grant the role automatically.",
  },
  {
    title: "Wait for confirmation",
    description: "Once the transaction confirms, the dashboard will unlock worker management.",
  },
];

export default function AccessManagerPage() {
  const { isConnected } = useAccount();
  const {
    address,
    ticket,
    isLoading,
    isRefetching,
    error,
    refresh,
    requestAccess,
    requesting,
  } = useAccessTicket(DEFAULT_ROLE);

  const status = ticket?.status ?? "pending";
  const config = statusMeta[status as keyof typeof statusMeta];

  const Icon = config.icon;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <header>
        <Card>
          <CardHeader>
            <CardTitle>Payroll Access Manager</CardTitle>
            <CardDescription>
              Track and request the roles required to manage payroll worker profiles. Requests are
              processed by a backend signer and cached in Redis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 rounded-md border border-border/60 bg-muted/40 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="secondary">Wallet</Badge>
                <span className="text-sm font-medium">
                  {address ?? "Connect your wallet to view role status."}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="secondary">Role</Badge>
                <span className="text-sm font-medium">DEFAULT_ADMIN_ROLE</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge className={config.badge}>{config.label}</Badge>
                {(isLoading || isRefetching) && <Loader2 className="h-4 w-4 animate-spin" />}
                {ticket?.ensureStatus === "already_granted" && (
                  <span className="text-xs text-muted-foreground">
                    Role already granted on-chain. State refreshed from Redis.
                  </span>
                )}
              </div>
              {ticket?.txHash && (
                <p className="text-xs text-muted-foreground">
                  Tx: {" "}
                  <Link
                    className="underline"
                    href={`https://sepolia.etherscan.io/tx/${ticket.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {ticket.txHash.slice(0, 10)}…{ticket.txHash.slice(-6)}
                  </Link>
                </p>
              )}
              {error && <p className="text-sm text-destructive">{error.message}</p>}
              {ticket?.error && <p className="text-sm text-destructive">{ticket.error}</p>}
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => requestAccess()} disabled={!isConnected || requesting}>
                  {requesting ? "Submitting…" : "Request admin role"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => refresh()}
                  disabled={!isConnected || isRefetching}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Refresh status
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </header>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>How it works</CardTitle>
            <CardDescription>
              Follow these steps to unlock worker management. Access grants are finalized on-chain and
              cached for quick verification.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {steps.map((step, index) => {
              const StepIcon = index === 0 ? CheckCircle2 : Icon;
              const isComplete =
                (index === 0 && isConnected) ||
                (index === 1 && ticket) ||
                (index === 2 && ticket?.status === "granted");
              return (
                <div
                  key={step.title}
                  className={`flex items-start gap-3 rounded-md border border-border/60 bg-background/40 p-4 ${
                    isComplete ? "border-emerald-500/40" : ""
                  }`}
                >
                  <StepIcon
                    className={`mt-1 h-5 w-5 ${isComplete ? "text-emerald-500" : "text-muted-foreground"}`}
                  />
                  <div>
                    <p className="font-medium">{step.title}</p>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Next steps</CardTitle>
            <CardDescription>
              Once access is granted, return to the payroll dashboard to manage workers.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/">View landing page</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
