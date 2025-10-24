"use client";
import { useMemo } from "react";
import { useAccount, useReadContract } from "wagmi";
import type { Address } from "viem";

import { companyRegistryAbi } from "@/lib/abi/companyRegistry";
import { CONTRACTS } from "@/lib/contracts";

const REGISTRY = process.env.NEXT_PUBLIC_COMPANY_REGISTRY as Address | undefined;

type Result = {
  treasury?: `0x${string}`;
  payroll?: `0x${string}`;
  isLoading: boolean;
};

export default function useCompanyContracts(): Result {
  const { address } = useAccount();
  const enabled = Boolean(REGISTRY && address);

  const { data, isPending } = useReadContract({
    address: REGISTRY,
    abi: companyRegistryAbi,
    functionName: "getCompany",
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled, refetchInterval: 30_000, refetchOnReconnect: true, refetchOnWindowFocus: true },
  });

  const out = useMemo<Result>(() => {
    const tuple = (data ?? []) as unknown as [`0x${string}` | undefined, `0x${string}` | undefined];
    const [treasury, payroll] = tuple || [];

    const isNonZero = (a?: `0x${string}`) => !!a && a !== "0x0000000000000000000000000000000000000000";

    if (isNonZero(treasury) || isNonZero(payroll)) {
      return { treasury, payroll, isLoading: isPending };
    }

    // Fallback to env-based single-tenant addresses for demo/backwards-compat
    const fallbackTreasury = (CONTRACTS.treasuryUsdc ?? CONTRACTS.treasury) as `0x${string}` | undefined;
    const fallbackPayroll = (CONTRACTS.payrollUsdc ?? CONTRACTS.payroll) as `0x${string}` | undefined;
    return { treasury: fallbackTreasury, payroll: fallbackPayroll, isLoading: isPending };
  }, [data, isPending]);

  return out;
}
