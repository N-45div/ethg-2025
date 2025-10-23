import { NextResponse } from "next/server";
import { isAddress } from "viem";

import { readTicket, writeTicket } from "@/lib/accessTickets";
import { hasPayrollRole } from "@/lib/payrollAccess";
import { SUPPORTED_PAYROLL_ROLES, type PayrollRoleKey } from "@/lib/payrollRoles";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const account = searchParams.get("account");
  const roleParam = searchParams.get("role");

  if (!account || !isAddress(account)) {
    return NextResponse.json({ error: "Invalid account address." }, { status: 400 });
  }

  if (!roleParam || !SUPPORTED_PAYROLL_ROLES.includes(roleParam as PayrollRoleKey)) {
    return NextResponse.json({ error: "Unsupported role requested." }, { status: 400 });
  }

  const role = roleParam as PayrollRoleKey;
  const wallet = account.toLowerCase() as `0x${string}`;

  const cached = await readTicket(wallet, role);

  if (cached) {
    if (cached.status === "granted") {
      return NextResponse.json({ ticket: cached });
    }
  }

  try {
    const hasRole = await hasPayrollRole(wallet, role);
    if (hasRole) {
      const ticket = {
        wallet,
        role,
        status: "granted" as const,
        requestedAt: cached?.requestedAt ?? Date.now(),
        updatedAt: Date.now(),
        txHash: cached?.txHash ?? null,
        ensureStatus: cached?.ensureStatus ?? "already_granted",
        error: null,
      };
      await writeTicket(ticket);
      return NextResponse.json({ ticket });
    }
  } catch (error) {
    console.error("Failed to read role from chain", error);
  }

  if (cached) {
    return NextResponse.json({ ticket: cached });
  }

  return NextResponse.json({ ticket: null });
}
