"use client";

/**
 * Nexus control: connect/disconnect + settings dialog.
 */

import { useAccount } from "wagmi";
import { Button } from "./ui/button";
import { useNexus } from "@/providers/NexusProvider";
import { ClockFading, Settings2, Check } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

const flag = {
  get: (k: string, def = false) => {
    try {
      return (typeof window !== "undefined" && localStorage.getItem(k)) === "true" || def;
    } catch {
      return def;
    }
  },
  set: (k: string, v: boolean) => {
    try {
      if (typeof window !== "undefined") localStorage.setItem(k, String(v));
    } catch {}
  },
};

const NexusInitButton = () => {
  const { status } = useAccount();
  const { handleInit, disconnectNexus, nexusSDK } = useNexus();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [autoInit, setAutoInit] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [autoApproveMin, setAutoApproveMin] = useState(false);

  useEffect(() => {
    setAutoInit(flag.get("nx:autoInit"));
    setAutoRefresh(flag.get("nx:autoRefreshIntent"));
    setAutoApproveMin(flag.get("nx:autoApproveMin"));
  }, []);

  const connected = status === "connected";
  const initialized = Boolean(nexusSDK?.isInitialized());

  const handleInitWithLoading = async () => {
    setLoading(true);
    await handleInit();
    setLoading(false);
  };

  const statusLabel = useMemo(() => {
    if (!connected) return "Connect wallet";
    return initialized ? "Nexus ready" : "Connect Nexus";
  }, [connected, initialized]);

  return (
    <div className="flex items-center gap-2">
      {connected && !initialized ? (
        <Button onClick={handleInitWithLoading}>
          {loading ? (
            <ClockFading className="animate-spin size-5 text-primary-foreground" />
          ) : (
            "Connect Nexus"
          )}
        </Button>
      ) : initialized ? (
        <span className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <Check className="size-3.5" />
          {statusLabel}
        </span>
      ) : null}

      {/* Settings */}
      {connected && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" size="icon" aria-label="Nexus settings">
              <Settings2 className="size-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Nexus settings</DialogTitle>
              <DialogDescription>Automation and session controls</DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <label className="flex items-center justify-between text-sm">
                <span className="flex flex-col">
                  <span className="font-medium">Auto-init on wallet connect</span>
                  <span className="text-xs text-muted-foreground">Initialize SDK automatically after wallet connects</span>
                </span>
                <input
                  type="checkbox"
                  checked={autoInit}
                  onChange={(e) => {
                    setAutoInit(e.target.checked);
                    flag.set("nx:autoInit", e.target.checked);
                  }}
                />
              </label>

              <label className="flex items-center justify-between text-sm">
                <span className="flex flex-col">
                  <span className="font-medium">Auto-refresh intent routes</span>
                  <span className="text-xs text-muted-foreground">Refresh route every 5s while pending</span>
                </span>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => {
                    setAutoRefresh(e.target.checked);
                    flag.set("nx:autoRefreshIntent", e.target.checked);
                  }}
                />
              </label>

              <label className="flex items-center justify-between text-sm">
                <span className="flex flex-col">
                  <span className="font-medium">Auto-approve min allowances</span>
                  <span className="text-xs text-muted-foreground">Approve minimum amounts automatically</span>
                </span>
                <input
                  type="checkbox"
                  checked={autoApproveMin}
                  onChange={(e) => {
                    setAutoApproveMin(e.target.checked);
                    flag.set("nx:autoApproveMin", e.target.checked);
                  }}
                />
              </label>

              {initialized ? (
                <div className="pt-2">
                  <Button variant="outline" onClick={disconnectNexus} className="w-full text-sm">
                    Disconnect Nexus
                  </Button>
                </div>
              ) : (
                <div className="pt-2">
                  <Button onClick={handleInitWithLoading} className="w-full text-sm">Connect Nexus</Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default NexusInitButton;
