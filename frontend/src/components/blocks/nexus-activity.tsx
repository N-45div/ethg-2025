import { useMemo, type ComponentType } from "react";
import { Activity, CheckCircle2, Loader2, PlugZap, ShieldX } from "lucide-react";

import { useNexus } from "@/providers/NexusProvider";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

const TYPE_META: Record<
  string,
  { icon: ComponentType<{ className?: string }>; label: string; tone: string }
> = {
  init: { icon: PlugZap, label: "Connected", tone: "text-emerald-500" },
  intent: { icon: Activity, label: "Intent", tone: "text-sky-500" },
  allowance: { icon: ShieldX, label: "Allowance", tone: "text-amber-500" },
  deinit: { icon: CheckCircle2, label: "Disconnected", tone: "text-muted-foreground" },
};

const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const NexusActivityFeed = () => {
  const { 
    eventLog, 
    clearEvents, 
    currentIntent, 
    currentAllowance,
    approveIntent,
    denyIntent,
    refreshIntent,
    approveMinAllowances,
    denyAllowances,
  } = useNexus();

  const statusBadge = useMemo(() => {
    if (currentIntent) {
      return <Badge variant="secondary">Intent awaiting approval</Badge>;
    }
    if (currentAllowance) {
      return <Badge variant="secondary">Allowance required</Badge>;
    }
    return <Badge variant="outline">Idle</Badge>;
  }, [currentIntent, currentAllowance]);

  return (
    <div className="space-y-3 rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase">
            Nexus Activity
          </h3>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {statusBadge}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={clearEvents}
          disabled={eventLog.length === 0}
        >
          Clear
        </Button>
      </div>

      {currentIntent && (
        <div className="rounded-xl border border-sky-500/40 bg-sky-500/5 p-3">
          <div className="mb-2 text-xs text-muted-foreground">
            Intent ready. Review route and fees, then confirm or refresh.
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={approveIntent}>Confirm route</Button>
            <Button size="sm" variant="secondary" onClick={refreshIntent}>Refresh route</Button>
            <Button size="sm" variant="ghost" onClick={denyIntent}>Deny</Button>
          </div>
        </div>
      )}

      {currentAllowance && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3">
          <div className="mb-2 text-xs text-muted-foreground">
            Allowance required. Approve minimum allowances to proceed, or deny.
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={approveMinAllowances}>Approve min allowances</Button>
            <Button size="sm" variant="ghost" onClick={denyAllowances}>Deny</Button>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {eventLog.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No recent activity yet. Engage the Nexus bridge to see intents and allowance prompts here.
          </p>
        )}
        {eventLog.map((event) => {
          const meta = TYPE_META[event.type] ?? TYPE_META.intent;
          const Icon = meta.icon;
          return (
            <div
              key={event.id}
              className="flex items-start gap-3 rounded-xl border border-border/40 bg-background/80 p-3"
            >
              <span className={`mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-muted/60 ${meta.tone}`}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span>{meta.label}</span>
                  <span className="text-muted-foreground">
                    {formatTimestamp(event.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-snug">
                  {event.message}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NexusActivityFeed;
