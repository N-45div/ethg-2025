"use client";
import useInitNexus, { type NexusEvent } from "@/hooks/useInitNexus";
import { NexusSDK, type NexusNetwork } from "@avail-project/nexus-core";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { useAccount } from "wagmi";

interface NexusContextType {
  nexusSDK: NexusSDK | null;
  handleInit: () => Promise<void>;
  disconnectNexus: () => Promise<void>;
  currentIntent: ReturnType<typeof useInitNexus>["currentIntent"];
  currentAllowance: ReturnType<typeof useInitNexus>["currentAllowance"];
  clearIntent: () => void;
  clearAllowance: () => void;
  eventLog: NexusEvent[];
  clearEvents: () => void;
  approveIntent: () => Promise<void>;
  denyIntent: () => Promise<void>;
  refreshIntent: () => Promise<void>;
  approveMinAllowances: () => Promise<void>;
  denyAllowances: () => Promise<void>;
}

const NexusContext = createContext<NexusContextType | null>(null);

const NexusProvider = ({ children }: { children: React.ReactNode }) => {
  const sdk = useMemo(() => {
    const envNetwork = process.env.NEXT_PUBLIC_NEXUS_NETWORK;
    const network: NexusNetwork =
      envNetwork === "mainnet" || envNetwork === "testnet"
        ? envNetwork
        : "testnet";

    return new NexusSDK({
      network,
      debug: true,
    });
  }, []);
  const { status } = useAccount();
  const {
    nexusSDK,
    initializeNexus,
    deinitializeNexus,
    attachEventHooks,
    intentRefCallback,
    allowanceRefCallback,
    currentIntent,
    currentAllowance,
    clearIntent,
    clearAllowance,
    eventLog,
    clearEvents,
  } = useInitNexus(sdk);

  const handleInit = useCallback(async () => {
    if (sdk.isInitialized()) {
      console.log("Nexus already initialized");
      return;
    }
    await initializeNexus();
    attachEventHooks();
  }, [sdk, attachEventHooks, initializeNexus]);

  const disconnectNexus = useCallback(async () => {
    await deinitializeNexus();
  }, [deinitializeNexus]);

  useEffect(() => {
    const autoInit = typeof window !== 'undefined' && localStorage.getItem('nx:autoInit') === 'true';
    if (status === 'connected' && autoInit && !sdk.isInitialized()) {
      handleInit();
    }
    if (status === 'disconnected') {
      deinitializeNexus();
    }
  }, [status, deinitializeNexus, handleInit, sdk]);

  const approveIntent = useCallback(async () => {
    const ref = intentRefCallback.current;
    if (!ref) return;
    await ref.allow();
    // keep current intent visible until SDK proceeds; caller may clear if desired
  }, [intentRefCallback]);


  const denyIntent = useCallback(async () => {
    const ref = intentRefCallback.current;
    if (!ref) return;
    await ref.deny();
    clearIntent();
  }, [intentRefCallback, clearIntent]);

  const refreshIntent = useCallback(async () => {
    const ref = intentRefCallback.current;
    if (!ref) return;
    await ref.refresh();
  }, [intentRefCallback]);

  // Auto-refresh an open intent every 5s if enabled
  useEffect(() => {
    const auto = typeof window !== 'undefined' && localStorage.getItem('nx:autoRefreshIntent') === 'true';
    if (!auto || !currentIntent) return;
    const id = setInterval(() => {
      refreshIntent();
    }, 5000);
    return () => clearInterval(id);
  }, [currentIntent, refreshIntent]);

  const approveMinAllowances = useCallback(async () => {
    const ref = allowanceRefCallback.current as unknown as { allow?: (a: any) => Promise<void> } | null;
    if (!ref || !ref.allow) return;
    const count = currentAllowance?.sources?.length ?? 0;
    const allowances = Array.from({ length: count }, () => "min");
    await ref.allow(allowances);
  }, [allowanceRefCallback, currentAllowance]);

  // Auto-approve min allowances if enabled
  useEffect(() => {
    const auto = typeof window !== 'undefined' && localStorage.getItem('nx:autoApproveMin') === 'true';
    if (!auto || !currentAllowance) return;
    approveMinAllowances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAllowance]);

  const denyAllowances = useCallback(async () => {
    const ref = allowanceRefCallback.current as unknown as { deny?: () => Promise<void> } | null;
    if (!ref || !ref.deny) return;
    await ref.deny();
    clearAllowance();
  }, [allowanceRefCallback, clearAllowance]);

  const value = useMemo(
    () => ({
      nexusSDK,
      handleInit,
      disconnectNexus,
      currentIntent,
      currentAllowance,
      clearIntent,
      clearAllowance,
      eventLog,
      clearEvents,
      approveIntent,
      denyIntent,
      refreshIntent,
      approveMinAllowances,
      denyAllowances,
    }),
    [
      nexusSDK,
      handleInit,
      disconnectNexus,
      currentIntent,
      currentAllowance,
      clearIntent,
      clearAllowance,
      eventLog,
      clearEvents,
      approveIntent,
      denyIntent,
      refreshIntent,
      approveMinAllowances,
      denyAllowances,
    ],
  );

  return (
    <NexusContext.Provider value={value}>{children}</NexusContext.Provider>
  );
};

export function useNexus() {
  const context = useContext(NexusContext);
  if (!context) {
    throw new Error("useNexus must be used within a NexusProvider");
  }
  return context;
}

export default NexusProvider;
