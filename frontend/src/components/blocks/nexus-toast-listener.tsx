"use client";

import { useEffect, useRef } from "react";

import { useNexus } from "@/providers/NexusProvider";
import { toast } from "@/components/ui/use-toast";

const TOAST_COPY: Record<string, { title: string; description: string; variant?: "default" | "success" | "destructive" }> = {
  init: {
    title: "Nexus connected",
    description: "Cross-chain automation is ready to orchestrate intents.",
    variant: "success",
  },
  intent: {
    title: "Intent ready",
    description: "Review the proposed execution path and confirm when ready.",
    variant: "default",
  },
  allowance: {
    title: "Allowance required",
    description: "Approve token spending so Nexus can finalize the flow.",
    variant: "default",
  },
  deinit: {
    title: "Nexus disconnected",
    description: "Reconnect to resume real-time automation updates.",
    variant: "destructive",
  },
};

const NexusToastListener = () => {
  const { eventLog } = useNexus();
  const seenEvents = useRef(new Set<string>());

  useEffect(() => {
    eventLog.forEach((event) => {
      if (seenEvents.current.has(event.id)) {
        return;
      }

      const copy = TOAST_COPY[event.type] ?? TOAST_COPY.intent;
      toast({
        title: copy.title,
        description: copy.description,
        variant: copy.variant,
      });

      seenEvents.current.add(event.id);
    });
  }, [eventLog]);

  return null;
};

export default NexusToastListener;
