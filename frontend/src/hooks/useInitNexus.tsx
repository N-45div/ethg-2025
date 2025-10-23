"use client";
import type {
  EthereumProvider,
  NexusSDK,
  OnAllowanceHookData,
  OnIntentHookData,
} from "@avail-project/nexus-core";
import { useCallback, useRef, useState } from "react";

import { useAccount } from "wagmi";

export type NexusEventType = "init" | "intent" | "allowance" | "deinit";

export interface NexusEvent {
  id: string;
  type: NexusEventType;
  message: string;
  timestamp: number;
}

type TargetChainKey = "sepolia" | "base-sepolia";

interface TargetChainConfig {
  key: TargetChainKey;
  chainId: number;
  chainName: string;
  rpcUrls: string[];
  blockExplorerUrls: string[];
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

const resolveTargetChainConfig = (): TargetChainConfig => {
  const envTarget = (process.env.NEXT_PUBLIC_TARGET_CHAIN ?? "sepolia").toLowerCase() as TargetChainKey;

  const sepoliaRpcUrl =
    process.env.NEXT_PUBLIC_SEPOLIA_RPC ?? "https://rpc.sepolia.org";
  const baseSepoliaRpcUrl =
    process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC ?? "https://sepolia.base.org";

  if (envTarget === "base-sepolia") {
    return {
      key: "base-sepolia",
      chainId: 84532,
      chainName: "Base Sepolia",
      rpcUrls: [baseSepoliaRpcUrl],
      blockExplorerUrls: [
        process.env.NEXT_PUBLIC_BASE_SEPOLIA_EXPLORER ??
          "https://sepolia.basescan.org",
      ],
      nativeCurrency: {
        name: "Sepolia Ether",
        symbol: "ETH",
        decimals: 18,
      },
    };
  }

  return {
    key: "sepolia",
    chainId: 11155111,
    chainName: "Sepolia",
    rpcUrls: [sepoliaRpcUrl],
    blockExplorerUrls: [
      process.env.NEXT_PUBLIC_SEPOLIA_EXPLORER ??
        "https://sepolia.etherscan.io",
    ],
    nativeCurrency: {
      name: "Sepolia Ether",
      symbol: "ETH",
      decimals: 18,
    },
  };
};

const useInitNexus = (sdk: NexusSDK) => {
  const { connector } = useAccount();
  const [nexusSDK, setNexusSDK] = useState<NexusSDK | null>(null);
  const intentRefCallback = useRef<OnIntentHookData | null>(null);
  const allowanceRefCallback = useRef<OnAllowanceHookData | null>(null);
  const [currentIntent, setCurrentIntent] =
    useState<OnIntentHookData | null>(null);
  const [currentAllowance, setCurrentAllowance] =
    useState<OnAllowanceHookData | null>(null);
  const [eventLog, setEventLog] = useState<NexusEvent[]>([]);

  const generateEventId = useCallback(
    () =>
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
    [],
  );

  const appendEvent = useCallback(
    (event: Omit<NexusEvent, "id" | "timestamp"> & { timestamp?: number }) => {
      setEventLog((prev) =>
        [
          {
            id: generateEventId(),
            timestamp: Date.now(),
            ...event,
          },
          ...prev,
        ].slice(0, 6),
      );
    },
    [generateEventId],
  );

  const clearEvents = useCallback(() => {
    setEventLog([]);
  }, []);

  const initializeNexus = async () => {
    try {
      console.log("🚀 Starting Nexus initialization...");
      const chainConfig = resolveTargetChainConfig();
      const targetChainHex = `0x${chainConfig.chainId.toString(16)}`;

      console.log(
        `🎯 Target chain: ${chainConfig.chainName} (${chainConfig.chainId})`,
      );

      // If already initialized, deinit first to allow re-init with correct network
      if (sdk.isInitialized()) {
        console.log("⚠️ SDK already initialized, deinitializing first...");
        try {
          await sdk.deinit();
          setNexusSDK(null);
          console.log("✅ Previous initialization cleared");
        } catch (e) {
          console.error("Failed to deinit:", e);
        }
      }
      
      const provider = (await connector?.getProvider()) as EthereumProvider;
      if (!provider) throw new Error("No provider found");
      
      console.log("✅ Provider obtained");

      // Check current network and switch to Sepolia if needed
      try {
        const chainId = await provider.request({ method: "eth_chainId" });
        const currentChainId = parseInt(chainId as string, 16);

        console.log(`🔍 Current wallet chain: ${currentChainId}`);

        if (currentChainId !== chainConfig.chainId) {
          console.log(
            `🔄 Switching from chain ${currentChainId} to ${chainConfig.chainName} (${chainConfig.chainId})`,
          );
          try {
            await provider.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: targetChainHex }],
            });

            console.log("⏳ Waiting for network switch...");
            // Wait for network switch to complete and verify
            await new Promise(resolve => setTimeout(resolve, 1000));

            const newChainId = await provider.request({ method: "eth_chainId" });
            const verifiedChainId = parseInt(newChainId as string, 16);

            console.log(`🔍 Verified chain after switch: ${verifiedChainId}`);

            if (verifiedChainId !== chainConfig.chainId) {
              throw new Error(
                `Network switch failed. Still on chain ${verifiedChainId}`,
              );
            }

            console.log(
              `✅ Successfully switched to ${chainConfig.chainName}`,
            );
          } catch (switchError: unknown) {
            // Chain not added to wallet, add it
            const err = switchError as { code?: number };
            if (err.code === 4902) {
              await provider.request({
                method: "wallet_addEthereumChain",
                params: [
                  {
                    chainId: targetChainHex,
                    chainName: chainConfig.chainName,
                    nativeCurrency: chainConfig.nativeCurrency,
                    rpcUrls: chainConfig.rpcUrls,
                    blockExplorerUrls: chainConfig.blockExplorerUrls,
                  },
                ],
              });

              // Wait after adding network
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
              throw switchError;
            }
          }
        } else {
          console.log(`Already on ${chainConfig.chainName}`);
        }
      } catch (networkError) {
        console.error("❌ Error switching network:", networkError);
        throw new Error(
          `Failed to switch to ${chainConfig.chainName}. Please manually switch your wallet to the correct testnet.`,
        );
      }
      
      console.log("🔐 Initializing Nexus SDK (signature request will appear)...");

      // Double-check chain before signature - force MetaMask to confirm network
      const finalChainCheck = await provider.request({ method: "eth_chainId" });
      const finalChainId = parseInt(finalChainCheck as string, 16);
      console.log(
        `📍 Final chain ID before signature: ${finalChainId} (${
          finalChainId === chainConfig.chainId
            ? `${chainConfig.chainName} ✅`
            : "ERROR - Incorrect chain ❌"
        })`,
      );
      
      // Get network info from MetaMask
      try {
        const networkVersion = await provider.request({ method: "net_version" });
        console.log(`🌐 Network version: ${networkVersion}`);
      } catch (e) {
        console.warn("Could not get network version:", e);
      }
      
      // Now initialize SDK - wallet should be on Sepolia
      await sdk.initialize(provider);
      console.log("✅ Nexus SDK initialized successfully!");
      setNexusSDK(sdk);
      setCurrentIntent(null);
      setCurrentAllowance(null);
      appendEvent({
        type: "init",
        message: "Nexus SDK initialized",
      });
    } catch (error) {
      console.error("Error initializing Nexus:", error);
    }
  };

  const deinitializeNexus = async () => {
    try {
      if (!sdk.isInitialized()) {
        console.log("Nexus SDK is not initialized, skipping deinitialization");
        return;
      }
      await sdk.deinit();
      setNexusSDK(null);
      intentRefCallback.current = null;
      allowanceRefCallback.current = null;
      setCurrentIntent(null);
      setCurrentAllowance(null);
      appendEvent({
        type: "deinit",
        message: "Nexus SDK disconnected",
      });
    } catch (error) {
      console.error("Error deinitializing Nexus:", error);
    }
  };

  const attachEventHooks = () => {
    sdk.setOnAllowanceHook((data: OnAllowanceHookData) => {
      console.info("Nexus allowance hook invoked", data);
      // const { sources, allow, deny } = data;
      // This is a hook for the dev to show user the allowances that need to be setup for the current tx to happen
      // where,
      // sources: an array of objects with minAllowance, chainID, token symbol, etc.
      // allow(allowances): continues the transaction flow with the specified allowances; `allowances` is an array with the chosen allowance for each of the requirements (allowances.length === sources.length), either 'min', 'max', a bigint or a string
      // deny(): stops the flow
      allowanceRefCallback.current = data;
      setCurrentAllowance(data);
      appendEvent({
        type: "allowance",
        message: `Allowance required for ${data.sources?.length ?? 0} asset${
          (data.sources?.length ?? 0) === 1 ? "" : "s"
        }`,
      });
    });

    sdk.setOnIntentHook((data: OnIntentHookData) => {
      console.info("Nexus intent hook invoked", data);
      // const { intent, allow, deny, refresh } = data;
      // This is a hook for the dev to show user the intent, the sources and associated fees
      // where,
      // intent: Intent data containing sources and fees for display purpose
      // allow(): accept the current intent and continue the flow
      // deny(): deny the intent and stop the flow
      // refresh(): should be on a timer of 5s to refresh the intent (old intents might fail due to fee changes if not refreshed)
      intentRefCallback.current = data;
      setCurrentIntent(data);
      appendEvent({
        type: "intent",
        message: "New Nexus intent ready for review",
      });
    });
  };

  const clearIntent = useCallback(() => {
    intentRefCallback.current = null;
    setCurrentIntent(null);
  }, []);

  const clearAllowance = useCallback(() => {
    allowanceRefCallback.current = null;
    setCurrentAllowance(null);
  }, []);

  return {
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
  };
};

export default useInitNexus;
