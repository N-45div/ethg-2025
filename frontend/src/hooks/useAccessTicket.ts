import { useCallback, useMemo } from "react";
import { useAccount } from "wagmi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { AccessTicket } from "@/lib/accessTickets";
import type { PayrollRoleKey } from "@/lib/payrollRoles";

type AccessTicketResponse = { ticket: AccessTicket | null };

type RequestArgs = {
  account: `0x${string}`;
  role: PayrollRoleKey;
};

type UseAccessTicketResult = {
  address: `0x${string}` | undefined;
  ticket: AccessTicket | null;
  isLoading: boolean;
  isRefetching: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  requestAccess: () => Promise<AccessTicket>;
  requesting: boolean;
};

async function getStatus({ account, role }: RequestArgs): Promise<AccessTicket | null> {
  const params = new URLSearchParams({ account, role });
  const response = await fetch(`/api/access/status?${params.toString()}`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error ?? "Unable to load access status");
  }
  const data = (await response.json()) as AccessTicketResponse;
  return data.ticket;
}

async function postRequest({ account, role }: RequestArgs): Promise<AccessTicket> {
  const response = await fetch("/api/access/request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ account, role }),
  });

  const data = (await response.json()) as { ticket: AccessTicket; error?: string };
  if (!response.ok) {
    throw new Error(data?.error ?? "Unable to request access");
  }
  return data.ticket;
}

export function useAccessTicket(role: PayrollRoleKey): UseAccessTicketResult {
  const { address } = useAccount();
  const queryClient = useQueryClient();

  const normalizedAddress = address?.toLowerCase() as `0x${string}` | undefined;

  const queryKey = useMemo(
    () => ["access-ticket", role, normalizedAddress ?? "0x0"] as const,
    [role, normalizedAddress],
  );

  const {
    data,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useQuery<AccessTicket | null, Error>({
    queryKey,
    queryFn: async () => {
      if (!normalizedAddress) return null;
      return getStatus({ account: normalizedAddress, role });
    },
    enabled: Boolean(normalizedAddress),
    refetchInterval: 10_000,
  });

  const { mutateAsync, isPending } = useMutation<AccessTicket, Error, void>({
    mutationFn: async () => {
      if (!normalizedAddress) {
        throw new Error("Connect wallet before requesting access.");
      }
      return postRequest({ account: normalizedAddress, role });
    },
    onSuccess: (ticket) => {
      queryClient.setQueryData(queryKey, ticket);
    },
  });

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    address: normalizedAddress,
    ticket: data ?? null,
    isLoading,
    isRefetching,
    error: error ?? null,
    refresh,
    requestAccess: mutateAsync,
    requesting: isPending,
  };
}
