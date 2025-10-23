"use client";

import { useEffect, useState } from "react";
import { Info, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Badge } from "../ui/badge";

interface BlockscoutSummary {
  total: number;
  successful: number;
  failed: number;
  totalValue: number;
  latest: Array<{
    hash: string;
    method: string;
    timestamp: string;
    success: boolean;
  }>;
}

interface BlockscoutInsightsProps {
  address: string;
  triggerLabel?: string;
}

const BlockscoutInsights = ({ address, triggerLabel }: BlockscoutInsightsProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<BlockscoutSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();

    async function fetchSummary() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/blockscout-insights?address=${address}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        const data = (await response.json()) as { summary: BlockscoutSummary };
        setSummary(data.summary ?? null);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError((err as Error).message ?? "Unable to load insights");
          setSummary(null);
        }
      } finally {
        setLoading(false);
      }
    }

    void fetchSummary();
    return () => controller.abort();
  }, [open, address]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2"
      >
        <Info className="h-4 w-4" />
        {triggerLabel ?? "Insights"}
      </Button>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Blockscout Insights</DialogTitle>
          <DialogDescription>
            Snapshot generated from the Autoscout explorer for address {address}.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : summary ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant="secondary">Tx: {summary.total}</Badge>
              <Badge variant="outline">Success: {summary.successful}</Badge>
              <Badge variant="outline">Failed: {summary.failed}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Total raw value moved: {summary.totalValue.toLocaleString()} wei
            </p>
            <div className="max-h-60 overflow-y-auto rounded-md border border-border/60">
              <div className="divide-y divide-border/50">
                {summary.latest.map((tx) => (
                  <div key={tx.hash} className="p-3 text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">{tx.hash}</span>
                      <Badge variant={tx.success ? "secondary" : "destructive"}>
                        {tx.success ? "Success" : "Failed"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Method: {tx.method} · {new Date(tx.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No recent transactions found.</p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BlockscoutInsights;
