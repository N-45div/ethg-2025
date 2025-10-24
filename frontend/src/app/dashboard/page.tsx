"use client";

import { useMemo, useState, useCallback } from "react";
import { format } from "date-fns";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import ConnectWallet from "@/components/blocks/connect-wallet";
import NexusInitButton from "@/components/nexus-init";
import { CreateWorkerProfileDialog } from "@/components/blocks/create-worker-profile-dialog";
import { CreatePayrollIntentDialog } from "@/components/blocks/create-payroll-intent-dialog";
import FundTreasuryDialog from "@/components/blocks/fund-treasury-dialog";
import dynamic from "next/dynamic";
// import Link from "next/link"; // removed Explorer button
import { useNotification, useTransactionPopup } from "@blockscout/app-sdk";
import { CONTRACTS } from "@/lib/contracts";
import { erc20Abi } from "@/lib/abi/erc20";
import { payrollIntentManagerAbi } from "@/lib/abi/payroll";
import { useNexus } from "@/providers/NexusProvider";
import { getChainIdByKey } from "@/lib/chains";
// Nexus events temporarily not used; relying on bridgeAndExecute result for tx hash
import type { SUPPORTED_TOKENS, SUPPORTED_CHAINS_IDS } from "@avail-project/nexus-core";

const NexusActivityFeed = dynamic(
  () => import("@/components/blocks/nexus-activity"),
  {
    loading: () => (
      <div className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm text-sm text-muted-foreground">
        Loading activity…
      </div>
    ),
    ssr: false,
  },
);

type Schedule = {
  id: string;
  worker: string;
  amount: number;
  releaseAt: Date;
  claimed: boolean;
  txHash?: string;
  asset: 'PYUSD' | 'USDC';
};

// No mock data: we show empty state if no live logs are found.

const formatPyusd = (value: number | bigint) => {
  const numeric =
    typeof value === "bigint" ? Number(formatUnits(value, 6)) : value;
  return numeric.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export default function DashboardPage() {
  const { nexusSDK } = useNexus();
  const { address, isConnected } = useAccount();
  const { openTxToast } = useNotification();
  const { openPopup } = useTransactionPopup();
  const queryClient = useQueryClient();
  const [workerDialogOpen, setWorkerDialogOpen] = useState(false);
  const [intentDialogOpen, setIntentDialogOpen] = useState(false);
  const [fundDialogOpen, setFundDialogOpen] = useState(false);
  const [assetCard, setAssetCard] = useState<'ALL' | 'PYUSD' | 'USDC'>('ALL');
  const [bridges, setBridges] = useState<Record<string, { hash: string; url?: string }>>({});

  const onBridgeTx = useCallback((id: string, data: { hash: string; url?: string }) => {
    if (!data?.hash) return;
    setBridges((prev) => ({ ...prev, [id]: data }));
  }, []);

  const { data: pyusdBalance, isPending: pyusdLoading } = useReadContract({
    address: CONTRACTS.pyusd,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: CONTRACTS.treasury ? [CONTRACTS.treasury] : undefined,
    query: {
      enabled: Boolean(CONTRACTS.pyusd && CONTRACTS.treasury),
    },
  });

  const { data: usdcBalance, isPending: usdcLoading } = useReadContract({
    address: CONTRACTS.usdcSepolia,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: CONTRACTS.treasuryUsdc ? [CONTRACTS.treasuryUsdc] : undefined,
    query: {
      enabled: Boolean(CONTRACTS.usdcSepolia && CONTRACTS.treasuryUsdc),
    },
  });

  const { data: liveSchedules = [] as Schedule[], isFetching: schedulesFetching } =
    useQuery<Schedule[]>({
      queryKey: ["payroll-intents", "sepolia", CONTRACTS.payroll, CONTRACTS.payrollUsdc],
      enabled: Boolean(CONTRACTS.payroll || CONTRACTS.payrollUsdc),
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchInterval: 15_000,
      refetchOnWindowFocus: false,
      placeholderData: (prev) => (prev ? prev : ([] as Schedule[])),
      queryFn: async () => {
        const res = await fetch('/api/schedules');
        if (!res.ok) return [] as Schedule[];
        const json = await res.json();
        const rows = (json?.schedules ?? []) as Array<{ id: string; worker: string; amount: number; releaseAt: number; claimed: boolean; txHash?: string; asset: 'PYUSD' | 'USDC'; }>;
        return rows
          .map((r) => ({ ...r, releaseAt: new Date(r.releaseAt) }))
          .sort((a, b) => a.releaseAt.getTime() - b.releaseAt.getTime());
      },
    });

  const schedules = useMemo<Schedule[]>(() => (liveSchedules ?? []) as Schedule[], [liveSchedules]);
  const upcomingByAsset = useMemo<Schedule[]>(
    () =>
      schedules.filter((s) => !s.claimed && (assetCard === 'ALL' || s.asset === assetCard)),
    [schedules, assetCard],
  );

  const nextRelease = useMemo<Schedule | undefined>(() => {
    if (upcomingByAsset.length === 0) return undefined;
    return upcomingByAsset.reduce<Schedule>(
      (earliest, current) =>
        current.releaseAt < earliest.releaseAt ? current : earliest,
      upcomingByAsset[0],
    );
  }, [upcomingByAsset]);

  const totalPending = useMemo<number>(
    () => upcomingByAsset.reduce<number>((total, s) => total + s.amount, 0),
    [upcomingByAsset],
  );

  const sepoliaChainId = "11155111"; // pin to Sepolia for explorer popups
  const baseSepoliaChainId = "84532";

  const formattedBalance = useMemo(() => {
    const py = pyusdBalance ? Number(formatUnits(pyusdBalance, 6)) : 0;
    const us = usdcBalance ? Number(formatUnits(usdcBalance, 6)) : 0;
    const val = assetCard === 'ALL' ? py + us : assetCard === 'USDC' ? us : py;
    return Number(val).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, [pyusdBalance, usdcBalance, assetCard]);

  const balanceLoading = assetCard === 'ALL' ? (pyusdLoading || usdcLoading) : assetCard === 'USDC' ? usdcLoading : pyusdLoading;
  const filteredSchedules = useMemo<Schedule[]>(
    () => schedules.filter((s: Schedule) => assetCard === 'ALL' || s.asset === assetCard),
    [schedules, assetCard],
  );

  const assetLabelText = assetCard === 'ALL' ? 'PYUSD + USDC' : assetCard;

  return (
    <main className="grid min-h-screen grid-cols-1 gap-6 bg-gradient-to-br from-muted/40 via-background to-muted/20 p-6 text-foreground lg:grid-cols-[280px_1fr]">
      {/* Sidebar - Keep it clean with essentials only */}
      <aside className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-background/90 p-5 shadow-xl backdrop-blur">
        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold">Synced Streams</h1>
          <p className="text-xs text-muted-foreground">
            Cross-chain payroll automation
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <ConnectWallet />
          <NexusInitButton />
          {nexusSDK?.isInitialized() && (
            <Badge variant="secondary" className="w-fit text-xs">
              Nexus ready
            </Badge>
          )}
        </div>

        <div className="space-y-2.5 pt-2 border-t border-border/40">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Explorer
          </h3>
          {/* Explorer button removed as requested */}
          <Button
            variant="secondary"
            size="sm"
            className="w-full text-xs"
            onClick={() =>
              openPopup({ chainId: sepoliaChainId, address: CONTRACTS.treasury })
            }
            disabled={!CONTRACTS.treasury}
          >
            Treasury Activity
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => openPopup({ chainId: sepoliaChainId })}
          >
            Chain Overview
          </Button>
        </div>

        {/* Ask Blockscout panel removed */}
      </aside>

      {/* Main Content Area - Now has more space */}
      <section className="flex flex-col gap-6">
        <header className="flex flex-col justify-between gap-6 rounded-3xl border border-border/60 bg-background/90 p-6 shadow-xl backdrop-blur sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-semibold">Treasury Overview</h2>
            <p className="text-sm text-muted-foreground">
              Track balances and upcoming releases for worker schedules on Sepolia
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              className="border-dashed"
              onClick={() => setWorkerDialogOpen(true)}
            >
              Create worker profile
            </Button>
            <Button onClick={() => setIntentDialogOpen(true)}>
              New payroll intent
            </Button>
            <Select value={assetCard} onValueChange={(v) => setAssetCard(v as 'ALL' | 'PYUSD' | 'USDC')}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Asset" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="PYUSD">PYUSD</SelectItem>
                <SelectItem value="USDC">USDC</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="secondary"
              onClick={() => setFundDialogOpen(true)}
              disabled={
                assetCard === 'ALL'
                  ? true
                  : assetCard === 'USDC'
                    ? !CONTRACTS.treasuryUsdc || !CONTRACTS.usdcSepolia
                    : !CONTRACTS.treasury || !CONTRACTS.pyusd
              }
            >
              Fund Treasury
            </Button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader>
              <CardDescription>Treasury balance</CardDescription>
              <CardTitle className="text-3xl font-bold">
                {balanceLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-7 w-28 animate-pulse rounded bg-muted/50" />
                    {assetLabelText}
                  </span>
                ) : (
                  <>
                    {formattedBalance} {assetLabelText}
                  </>
                )}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">{schedulesFetching ? 'Updating' : 'Real-time'}</Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="text-sm text-muted-foreground">
              Balance held by `TreasuryVault` contract.
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Connected wallet</CardDescription>
              <CardTitle className="text-3xl font-bold">
                {isConnected && address
                  ? `${address.slice(0, 6)}…${address.slice(-4)}`
                  : "Not connected"}
              </CardTitle>
              <CardAction>
                <Badge variant={isConnected ? "secondary" : "outline"}>
                  {isConnected ? "Ready" : "Connect to manage"}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="text-sm text-muted-foreground">
              Admin must hold required roles
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Next release ({assetLabelText})</CardDescription>
              <CardTitle className="text-3xl font-bold">
                {nextRelease ? `${formatPyusd(nextRelease.amount)} ${assetLabelText}` : "No pending"}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">Upcoming intent</Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex flex-col gap-1 text-sm text-muted-foreground">
              <span>
                Release: {nextRelease ? format(nextRelease.releaseAt, "MMM d, h:mm a") : "N/A"}
              </span>
              <span className="font-mono text-xs">
                {nextRelease ? `${nextRelease.worker.slice(0, 8)}...` : "—"}
              </span>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Total pending ({assetLabelText})</CardDescription>
              <CardTitle className="text-3xl font-bold">
                {formatPyusd(totalPending)} {assetLabelText}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">Upcoming intents</Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="text-sm text-muted-foreground">
              Total pending for all workers
            </CardFooter>
          </Card>
        </div>

        {/* Scheduled Intents Table - Now in main area with more space */}
        <Card className="rounded-3xl border border-border/60 bg-background/90 shadow-xl backdrop-blur">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Scheduled Intents</CardTitle>
                <CardDescription className="mt-1">
                  Payroll schedules and execution history
                </CardDescription>
              </div>
              {CONTRACTS.treasury && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      queryClient.invalidateQueries({ queryKey: ["payroll-intents", "sepolia", CONTRACTS.payroll, CONTRACTS.payrollUsdc] })
                    }
                  >
                    Refresh
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {schedules.length === 0 ? (
              <div className="rounded-xl border border-border/60 bg-muted/20 p-6 text-sm text-muted-foreground">
                No live intents found. Create one from &quot;New payroll intent&quot; and ensure the Treasury is funded.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Worker</TableHead>
                      <TableHead>Asset</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Release Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSchedules.map((schedule: Schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {schedule.worker}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{schedule.asset}</TableCell>
                        <TableCell className="font-semibold">
                          {formatPyusd(schedule.amount)} {schedule.asset}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(schedule.releaseAt, "MMM d, yyyy h:mm a")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={schedule.claimed ? "secondary" : "outline"}
                          >
                            {schedule.claimed ? "Claimed" : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {schedule.claimed && schedule.txHash ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openTxToast(sepoliaChainId, schedule.txHash ?? "")}
                              >
                                View Tx
                              </Button>
                              {schedule.asset === 'USDC' && bridges[schedule.id] ? (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => {
                                    const b = bridges[schedule.id]!;
                                    if (b.url) window.open(b.url, "_blank");
                                    else openTxToast(baseSepoliaChainId, b.hash);
                                  }}
                                >
                                  View Bridge Tx
                                </Button>
                              ) : schedule.asset === 'USDC' ? (
                                <BridgeButton
                                  scheduleId={schedule.id}
                                  worker={schedule.worker}
                                  amount={schedule.amount}
                                  onBridgeTx={onBridgeTx}
                                />
                              ) : null}
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  openPopup({ chainId: sepoliaChainId, address: schedule.worker })
                                }
                              >
                                View Activity
                              </Button>
                              {schedule.releaseAt.getTime() <= Date.now() && (
                                <ExecuteIntentButton 
                                  intentId={schedule.id} 
                                  asset={schedule.asset}
                                  worker={schedule.worker}
                                  amount={schedule.amount}
                                />
                              )}
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredSchedules.length === 0 && schedulesFetching && (
                      <>
                        {Array.from({ length: 4 }).map((_, i) => (
                          <TableRow key={`sk-${i}`}>
                            <TableCell colSpan={6}>
                              <div className="h-6 w-full animate-pulse rounded bg-muted/40" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Nexus Activity - Now in main area */}
        <Card className="rounded-3xl border border-border/60 bg-background/90 shadow-xl backdrop-blur">
          <CardHeader>
            <CardTitle>Cross-Chain Activity</CardTitle>
            <CardDescription>
              Real-time monitoring of Nexus SDK operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NexusActivityFeed />
          </CardContent>
        </Card>

        <CreateWorkerProfileDialog
          open={workerDialogOpen}
          onOpenChange={setWorkerDialogOpen}
        />
        <CreatePayrollIntentDialog
          open={intentDialogOpen}
          onOpenChange={setIntentDialogOpen}
          onSuccess={() =>
            queryClient.invalidateQueries({
              queryKey: ["payroll-intents", "sepolia", CONTRACTS.payroll, CONTRACTS.payrollUsdc],
            })
          }
        />
        <FundTreasuryDialog open={fundDialogOpen} onOpenChange={setFundDialogOpen} />
      </section>
    </main>
  );
}

function ExecuteIntentButton({ intentId, asset, worker, amount }: { intentId: string; asset: 'PYUSD' | 'USDC'; worker: string; amount: number }) {
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const { nexusSDK } = useNexus();
  const { toast } = useToast();
  const [bridging, setBridging] = useState(false);
  const zeroAddress = "0x0000000000000000000000000000000000000000" as const;
  const queryClient = useQueryClient();

  const handleExecute = async () => {
    try {
      const payrollAddr = asset === 'USDC' ? CONTRACTS.payrollUsdc : CONTRACTS.payroll;
      if (!payrollAddr) throw new Error("Payroll contract address not set.");
      
      // For USDC: send to company wallet so we can bridge it
      // For PYUSD: send to worker wallet (no bridge needed)
      const destination = asset === 'USDC' && address ? address : zeroAddress;
      
      const tx = await writeContractAsync({
        address: payrollAddr,
        abi: payrollIntentManagerAbi,
        functionName: "executeIntent",
        args: [intentId as `0x${string}`, destination],
      });
      
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: tx });
      }
      
      // If USDC, immediately bridge to worker on Base
      if (asset === 'USDC' && nexusSDK && nexusSDK.isInitialized()) {
        setBridging(true);
        toast({ 
          title: "Intent executed", 
          description: "USDC received. Starting bridge to Base..."
        });
        
        try {
          // Read worker prefs for destination
          let destinationChain = "base-sepolia";
          if (publicClient && CONTRACTS.payrollUsdc) {
            try {
              const prefs = await publicClient.readContract({
                address: CONTRACTS.payrollUsdc,
                abi: payrollIntentManagerAbi,
                functionName: "workerPrefs",
                args: [worker as `0x${string}`],
              });
              if (prefs && prefs[1]) {
                destinationChain = prefs[1] as string;
              }
            } catch (e) {
              console.warn("Could not read worker prefs", e);
            }
          }
          
          const toChainId = getChainIdByKey(destinationChain) as SUPPORTED_CHAINS_IDS;
          
          // Bridge and execute: Company wallet → Worker on Base
          const result = await nexusSDK.bridgeAndExecute({
            token: "USDC" as SUPPORTED_TOKENS,
            amount: String(amount),
            toChainId,
            recipient: worker as `0x${string}`,
            sourceChains: [11155111],
            execute: {
              contractAddress: CONTRACTS.usdcBaseSepolia!,
              contractAbi: [
                {
                  inputs: [
                    { internalType: "address", name: "to", type: "address" },
                    { internalType: "uint256", name: "value", type: "uint256" },
                  ],
                  name: "transfer",
                  outputs: [{ internalType: "bool", name: "", type: "bool" }],
                  stateMutability: "nonpayable",
                  type: "function",
                },
              ],
              functionName: "transfer",
              buildFunctionParams: (
                token: SUPPORTED_TOKENS,
                amt: string,
                chainId: SUPPORTED_CHAINS_IDS,
                userAddress: `0x${string}`,
              ) => {
                void token; void chainId; void userAddress;
                const value = parseUnits(amt, 6);
                return { functionParams: [worker as `0x${string}`, value] };
              },
            },
            waitForReceipt: true,
          });
          
          if (result.success) {
            toast({
              title: "Payroll complete!",
              description: `Worker received ${amount} USDC on Base Sepolia`,
            });
          } else {
            throw new Error(result.error || "Bridge failed");
          }
        } catch (bridgeError) {
          console.error("Bridge failed", bridgeError);
          toast({
            variant: "destructive",
            title: "Bridge failed",
            description: bridgeError instanceof Error ? bridgeError.message : "USDC is in your wallet, use Bridge button manually",
          });
        } finally {
          setBridging(false);
        }
      } else {
        toast({ 
          title: "Intent executed", 
          description: `Tx ${tx.slice(0, 6)}…${tx.slice(-4)}`
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["payroll-intents", publicClient?.chain?.id, CONTRACTS.payroll, CONTRACTS.payrollUsdc] });
    } catch (error) {
      console.error("Execute intent failed", error);
      toast({
        variant: "destructive",
        title: "Unable to execute",
        description: error instanceof Error ? error.message : "Check release time, roles, and treasury funding.",
      });
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleExecute} disabled={isPending || bridging}>
      {isPending ? "Executing…" : bridging ? "Bridging…" : "Execute & Bridge"}
    </Button>
  );
}

function BridgeButton({ scheduleId, worker, amount, onBridgeTx }: { scheduleId: string; worker: string; amount: number; onBridgeTx?: (id: string, data: { hash: string; url?: string }) => void }) {
  const { nexusSDK } = useNexus();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleBridge = async () => {
    try {
      setLoading(true);

      // Company admin initiates the bridge, worker receives funds
      if (!address) {
        throw new Error("Connect wallet to initiate bridge transaction.");
      }

      if (!nexusSDK || !nexusSDK.isInitialized()) {
        throw new Error("Initialize Nexus SDK first (Connect Nexus).");
      }

      if (!CONTRACTS.usdcBaseSepolia) {
        throw new Error("USDC Base Sepolia address not configured.");
      }

      // Read worker preferences to get destination chain
      let destinationChain = "base-sepolia"; // default
      if (publicClient && CONTRACTS.payrollUsdc) {
        try {
          const prefs = await publicClient.readContract({
            address: CONTRACTS.payrollUsdc,
            abi: payrollIntentManagerAbi,
            functionName: "workerPrefs",
            args: [worker as `0x${string}`],
          });
          if (prefs && prefs[1]) {
            destinationChain = prefs[1] as string;
          }
        } catch (e) {
          console.warn("Could not read worker prefs, using default destination", e);
        }
      }

      // Convert destination chain key to chain ID
      const toChainId = getChainIdByKey(destinationChain) as SUPPORTED_CHAINS_IDS;

      // Company wallet bridges USDC from Sepolia to Base Sepolia for the worker
      // The worker receives the funds on the destination chain

      const result = await nexusSDK.bridgeAndExecute({
        token: "USDC" as SUPPORTED_TOKENS,
        amount: String(amount), // amount in human-readable format (e.g., "100" for 100 USDC)
        toChainId,
        recipient: worker as `0x${string}`, // Worker receives funds on destination chain
        sourceChains: [11155111], // Only use Sepolia as source
        execute: {
          contractAddress: CONTRACTS.usdcBaseSepolia,
          contractAbi: [
            {
              inputs: [
                { internalType: "address", name: "to", type: "address" },
                { internalType: "uint256", name: "value", type: "uint256" },
              ],
              name: "transfer",
              outputs: [{ internalType: "bool", name: "", type: "bool" }],
              stateMutability: "nonpayable",
              type: "function",
            },
          ],
          functionName: "transfer",
          buildFunctionParams: (
            token: SUPPORTED_TOKENS,
            amt: string,
            chainId: SUPPORTED_CHAINS_IDS,
            userAddress: `0x${string}`
          ) => {
            void token; void chainId; void userAddress;
            // Send to worker address, not the connected admin wallet
            const value = parseUnits(amt, 6);
            return { functionParams: [worker as `0x${string}`, value] };
          },
        },
        waitForReceipt: true,
      });

      if (result.success) {
        try {
          const txLike = result as Partial<{ transactionHash: string; explorerUrl: string }>;
          const txHash = txLike.transactionHash;
          const url = txLike.explorerUrl;
          if (txHash) onBridgeTx?.(scheduleId, { hash: txHash, url });
        } catch {}
        toast({
          title: "Bridge initiated",
          description: `Bridging ${amount} USDC to ${destinationChain} for worker ${worker.slice(0, 6)}…${worker.slice(-4)}`,
        });
      } else {
        throw new Error(result.error || "Bridge failed");
      }
    } catch (error) {
      console.error("Bridge failed", error);
      toast({
        variant: "destructive",
        title: "Unable to bridge",
        description: error instanceof Error ? error.message : "Check wallet connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button type="button" variant="default" size="sm" onClick={handleBridge} disabled={loading}>
      {loading ? "Bridging…" : "Bridge to Base"}
    </Button>
  );
}
