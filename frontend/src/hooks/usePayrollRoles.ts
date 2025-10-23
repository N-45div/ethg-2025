import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount, useBlockNumber, useReadContract } from 'wagmi';
import { keccak256, stringToHex, isAddress } from 'viem';

import { CONTRACTS } from '@/lib/contracts';
import { payrollIntentManagerAbi } from '@/lib/abi/payroll';

type RoleKey = 'DEFAULT_ADMIN_ROLE' | 'AUTOMATION_ROLE';

type UsePayrollRolesResult = {
  isAdmin: boolean;
  isAutomation: boolean;
  isLoading: boolean;
  granting: RoleKey | null;
  requestGrant: (role: RoleKey) => Promise<{ txHash: string; status: 'granted' | 'already_granted' }>;
  refreshRoles: () => Promise<void>;
};

const DEFAULT_ADMIN_ROLE = `0x${'0'.repeat(64)}` as `0x${string}`;
const AUTOMATION_ROLE = keccak256(stringToHex('AUTOMATION_ROLE'));

export const usePayrollRoles = (payrollAddressOverride?: `0x${string}`): UsePayrollRolesResult => {
  const { address } = useAccount();

  const contractAddress = payrollAddressOverride && isAddress(payrollAddressOverride)
    ? payrollAddressOverride
    : CONTRACTS.payroll;

  const {
    data: adminResult,
    isPending: adminLoading,
    refetch: refetchAdmin,
  } = useReadContract({
    address: contractAddress,
    abi: payrollIntentManagerAbi,
    functionName: 'hasRole',
    args: [DEFAULT_ADMIN_ROLE, address ?? '0x0000000000000000000000000000000000000000'],
    query: {
      enabled: Boolean(contractAddress && address),
      refetchInterval: 15000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  });

  const {
    data: automationResult,
    isPending: automationLoading,
    refetch: refetchAutomation,
  } = useReadContract({
    address: contractAddress,
    abi: payrollIntentManagerAbi,
    functionName: 'hasRole',
    args: [AUTOMATION_ROLE, address ?? '0x0000000000000000000000000000000000000000'],
    query: {
      enabled: Boolean(contractAddress && address),
      refetchInterval: 15000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  });

  const { data: blockNumber } = useBlockNumber({
    watch: Boolean(address && contractAddress),
    query: {
      enabled: Boolean(address && contractAddress),
    },
  });

  const [granting, setGranting] = useState<RoleKey | null>(null);
  const [optimisticAdmin, setOptimisticAdmin] = useState(false);
  const [optimisticAutomation, setOptimisticAutomation] = useState(false);

  const refreshRoles = useCallback(async () => {
    await Promise.allSettled([refetchAdmin(), refetchAutomation()]);
  }, [refetchAdmin, refetchAutomation]);

  const requestGrant = useCallback(
    async (role: RoleKey) => {
      if (!address) {
        throw new Error('Connect wallet before requesting permissions.');
      }

      const token = process.env.NEXT_PUBLIC_GRANT_ROLE_TOKEN;
      if (!token) {
        throw new Error('Grant role API is not configured.');
      }

      setGranting(role);
      try {
        const response = await fetch('/api/grant-role', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ account: address, role, payrollAddress: contractAddress }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data?.error ?? 'Unable to grant role.');
        }

        const payload = (await response.json()) as { txHash: string; status?: 'granted' | 'already_granted' };

        if (role === 'DEFAULT_ADMIN_ROLE') {
          setOptimisticAdmin(true);
        }
        if (role === 'AUTOMATION_ROLE') {
          setOptimisticAutomation(true);
        }

        await refreshRoles();

        return {
          txHash: payload.txHash,
          status: payload.status ?? 'granted',
        };
      } finally {
        setGranting(null);
      }
    },
    [address, refreshRoles],
  );

  useEffect(() => {
    if (!address || !contractAddress) return;
    if (blockNumber === undefined) return;
    refreshRoles();
  }, [address, contractAddress, blockNumber, refreshRoles]);

  useEffect(() => {
    if (adminResult === false) {
      setOptimisticAdmin(false);
    }
  }, [adminResult]);

  useEffect(() => {
    if (automationResult === false) {
      setOptimisticAutomation(false);
    }
  }, [automationResult]);

  return useMemo<UsePayrollRolesResult>(() => {
    if (!contractAddress || !address) {
      return {
        isAdmin: false,
        isAutomation: false,
        isLoading: false,
        granting: null,
        requestGrant,
        refreshRoles,
      };
    }

    return {
      isAdmin: optimisticAdmin || Boolean(adminResult),
      isAutomation: optimisticAutomation || Boolean(automationResult),
      isLoading: adminLoading || automationLoading,
      granting,
      requestGrant,
      refreshRoles,
    };
  }, [
    address,
    adminResult,
    automationResult,
    adminLoading,
    automationLoading,
    contractAddress,
    granting,
    requestGrant,
    optimisticAdmin,
    optimisticAutomation,
    refreshRoles,
  ]);
};
