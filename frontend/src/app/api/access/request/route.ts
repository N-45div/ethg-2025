import { NextResponse } from "next/server";
import { isAddress } from "viem";

import { SUPPORTED_PAYROLL_ROLES, type PayrollRoleKey } from "@/lib/payrollRoles";
import { ensurePayrollRole } from "@/lib/payrollAccess";
import { writeTicket } from "@/lib/accessTickets";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const { account, role } = (payload ?? {}) as { account?: string; role?: string };

  if (!account || !isAddress(account)) {
    return NextResponse.json({ error: "Invalid account address." }, { status: 400 });
  }

  if (!role || !SUPPORTED_PAYROLL_ROLES.includes(role as PayrollRoleKey)) {
    return NextResponse.json({ error: "Unsupported role requested." }, { status: 400 });
  }

  const normalizedRole = role as PayrollRoleKey;
  const wallet = account.toLowerCase() as `0x${string}`;

  const now = Date.now();
  let ticket = {
    wallet,
    role: normalizedRole,
    status: "processing",
    requestedAt: now,
    updatedAt: now,
    txHash: null,
    error: null,
    ensureStatus: null,
  };

  await writeTicket(ticket);

  try {
    const result = await ensurePayrollRole(wallet, normalizedRole);
    ticket = {
      ...ticket,
      status: "granted",
      updatedAt: Date.now(),
      txHash: result.txHash,
      ensureStatus: result.status,
      error: null,
    };
    await writeTicket(ticket);
    return NextResponse.json({ ticket });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to grant role.";
    ticket = {
      ...ticket,
      status: "failed",
      updatedAt: Date.now(),
      error: message,
      ensureStatus: null,
    };
    await writeTicket(ticket);
    return NextResponse.json({ ticket }, { status: 500 });
  }
}
