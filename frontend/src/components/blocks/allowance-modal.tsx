import { useNexus } from "@/providers/NexusProvider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { CHAIN_METADATA } from "@avail-project/nexus-core";
import { useEffect, useMemo, useState } from "react";
import { BadgeCheck } from "lucide-react";
import Image from "next/image";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";

const AllowanceModal = () => {
  const { currentAllowance, clearAllowance } = useNexus();
  const [open, setOpen] = useState(false);
  const [allowing, setAllowing] = useState(false);

  const allowanceSources = useMemo(
    () => currentAllowance?.sources ?? [],
    [currentAllowance],
  );

  const normalizedSources = useMemo(() => {
    return allowanceSources.map((source) => {
      const record = source as Record<string, unknown>;
      const chainRecord = record.chain as Record<string, unknown> | undefined;

      const chainId = (record.chainID ?? record.chainId ?? chainRecord?.chainID ?? chainRecord?.id) as
        | number
        | undefined;
      const chainName = (record.chainName ?? chainRecord?.chainName ?? chainRecord?.name) as
        | string
        | undefined;
      const tokenRecord = record.token as Record<string, unknown> | undefined;
      const tokenSymbol = (record.tokenSymbol ?? record.symbol ?? tokenRecord?.symbol) as
        | string
        | undefined;
      const tokenAddress = (record.tokenAddress ?? tokenRecord?.address) as string | undefined;
      const owner = (record.owner ?? record.wallet ?? record.address) as string | undefined;
      const minAllowanceRaw = record.minAllowance ?? record.allowance ?? record.min;
      let minAllowance: string | undefined;
      if (typeof minAllowanceRaw === "bigint") {
        minAllowance = minAllowanceRaw.toString();
      } else if (typeof minAllowanceRaw === "number") {
        minAllowance = minAllowanceRaw.toString();
      } else if (typeof minAllowanceRaw === "string") {
        minAllowance = minAllowanceRaw;
      }

      return {
        raw: source,
        chainId,
        chainName,
        tokenSymbol,
        tokenAddress,
        owner,
        minAllowance,
      };
    });
  }, [allowanceSources]);

  useEffect(() => {
    if (currentAllowance) {
      setOpen(true);
    } else {
      setOpen(false);
      setAllowing(false);
    }
  }, [currentAllowance]);

  if (!currentAllowance || allowanceSources.length === 0) {
    return null;
  }

  const handleAllow = async () => {
    if (!currentAllowance) return;
    setAllowing(true);
    try {
      const allowances = allowanceSources.map(() => "min");
      await currentAllowance.allow(allowances);
      console.info("Nexus allowance approved", allowanceSources);
    } catch (error) {
      console.error("Error approving allowance", error);
    } finally {
      setAllowing(false);
      clearAllowance();
      setOpen(false);
    }
  };

  const handleDeny = () => {
    if (!currentAllowance) return;
    currentAllowance.deny();
    clearAllowance();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleDeny()}>
      <DialogContent className="gap-y-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BadgeCheck className="h-5 w-5" />
            Review Allowance Requirements
          </DialogTitle>
          <DialogDescription>
            Grant the minimum approvals required for this Nexus intent to
            proceed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {normalizedSources.map((source, index) => (
            <div
              key={`${source.chainId ?? index}-${source.tokenAddress ?? index}`}
              className="rounded-md border border-border p-3 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Image
                    src={CHAIN_METADATA[source.chainId ?? 0]?.logo ?? "/chain-placeholder.svg"}
                    alt={source.tokenSymbol ?? "Token"}
                    width={24}
                    height={24}
                    className="rounded-full object-contain"
                    unoptimized
                  />
                  <div>
                    <Label className="text-sm font-semibold">
                      {source.tokenSymbol ?? "Unknown token"}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Chain ID: {source.chainId ?? "n/a"}
                    </p>
                    {source.chainName && (
                      <p className="text-2xs text-muted-foreground">
                        Network: {source.chainName}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">Min allowance</p>
                  <p className="text-sm text-primary">
                    {source.minAllowance?.toUpperCase?.() ?? source.minAllowance ?? "min"}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 text-xs gap-y-1 text-muted-foreground">
                <span>Spend token:</span>
                <span className="text-right break-all">
                  {source.tokenAddress ?? "Unknown"}
                </span>
                <span>Customer wallet:</span>
                <span className="text-right break-all">{source.owner ?? "Unknown"}</span>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-4">
          <Button
            variant="secondary"
            onClick={handleDeny}
            className="w-full sm:w-1/2"
          >
            Deny
          </Button>
          <Button
            onClick={handleAllow}
            disabled={allowing}
            className="w-full sm:w-1/2"
          >
            {allowing ? "Confirming..." : "Approve minimum"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AllowanceModal;
