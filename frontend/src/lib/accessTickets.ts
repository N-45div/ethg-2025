import type { PayrollRoleKey } from "@/lib/payrollRoles";
import { getRedis } from "@/lib/redis";

export type AccessTicketStatus = "pending" | "processing" | "granted" | "failed";

export type AccessTicket = {
  wallet: `0x${string}`;
  role: PayrollRoleKey;
  status: AccessTicketStatus;
  requestedAt: number;
  updatedAt: number;
  txHash: `0x${string}` | null;
  ensureStatus: "granted" | "already_granted" | null;
  error: string | null;
};

export const ACCESS_TICKET_TTL_SECONDS = 60 * 30; // 30 minutes

export function buildTicketKey(wallet: `0x${string}`, role: PayrollRoleKey) {
  return `payroll:access:${wallet}:${role}`;
}

export async function writeTicket(ticket: AccessTicket) {
  const redis = getRedis();
  await redis.set(buildTicketKey(ticket.wallet, ticket.role), JSON.stringify(ticket), {
    ex: ACCESS_TICKET_TTL_SECONDS,
  });
}

export async function readTicket(wallet: `0x${string}`, role: PayrollRoleKey): Promise<AccessTicket | null> {
  const redis = getRedis();
  const data = await redis.get<string | null>(buildTicketKey(wallet, role));
  if (!data) return null;
  try {
    const parsed = JSON.parse(data) as AccessTicket;
    return parsed;
  } catch {
    return null;
  }
}
