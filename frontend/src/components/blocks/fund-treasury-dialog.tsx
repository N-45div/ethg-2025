"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { usePublicClient, useWriteContract } from "wagmi";
import { parseUnits } from "viem";
import { CONTRACTS } from "@/lib/contracts";
import { erc20Abi } from "@/lib/abi/erc20";
import { treasuryAbi } from "@/lib/abi/treasury";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FundTreasuryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function FundTreasuryDialog({
  open,
  onOpenChange,
  onSuccess,
}: FundTreasuryDialogProps) {
  const { toast } = useToast();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();
  const [amount, setAmount] = useState<string>("");
  const [asset, setAsset] = useState<"PYUSD" | "USDC">("PYUSD");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    if (submitting || isPending) return false;
    const tokenOk = asset === "USDC" ? Boolean(CONTRACTS.usdcSepolia) : Boolean(CONTRACTS.pyusd);
    const vaultOk = asset === "USDC" ? Boolean(CONTRACTS.treasuryUsdc) : Boolean(CONTRACTS.treasury);
    if (!tokenOk || !vaultOk) return false;
    const n = Number.parseFloat(amount);
    return Number.isFinite(n) && n > 0;
  }, [amount, isPending, asset, submitting]);

  const handleClose = () => onOpenChange(false);

  const handleFund = async () => {
    setSubmitting(true);
    try {
      const tokenAddress = asset === "USDC" ? CONTRACTS.usdcSepolia : CONTRACTS.pyusd;
      const vaultAddress = asset === "USDC" ? CONTRACTS.treasuryUsdc : CONTRACTS.treasury;
      if (!tokenAddress || !vaultAddress) throw new Error("Selected token or Treasury not configured.");
      const value = Number.parseFloat(amount);
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error("Enter a valid amount.");
      }
      const amt = parseUnits(amount, 6);

      // 1) Approve Treasury to pull selected token
      const approveTx = await writeContractAsync({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [vaultAddress, amt],
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: approveTx });
      }

      // 2) Deposit into Treasury
      const depositTx = await writeContractAsync({
        address: vaultAddress,
        abi: treasuryAbi,
        functionName: "deposit",
        args: [amt],
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: depositTx });
      }

      toast({ title: "Treasury funded", description: `${amount} ${asset} deposited.` });
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error("Fund treasury failed", error);
      toast({
        variant: "destructive",
        title: "Unable to fund treasury",
        description: error instanceof Error ? error.message : "Check roles and balance, then try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Fund Treasury</DialogTitle>
          <DialogDescription>
            Approve token and deposit into the TreasuryVault. Requires TREASURER_ROLE.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="fund-asset">Asset</Label>
            <Select value={asset} onValueChange={(v) => setAsset(v as "PYUSD" | "USDC")}>
              <SelectTrigger id="fund-asset" className="w-full">
                <SelectValue placeholder="Select asset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PYUSD">PYUSD</SelectItem>
                <SelectItem value="USDC">USDC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fund-amount">Amount ({asset})</Label>
            <Input
              id="fund-amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={submitting || isPending}>
            Cancel
          </Button>
          <Button onClick={handleFund} disabled={!canSubmit}>
            {submitting || isPending ? "Processing…" : "Approve & deposit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
