import { NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http, isAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import { CONTRACTS } from '@/lib/contracts';
import { payrollIntentManagerAbi } from '@/lib/abi/payroll';
import { DEFAULT_ADMIN_ROLE, SUPPORTED_PAYROLL_ROLES, resolvePayrollRoleHash } from '@/lib/payrollRoles';

const ADMIN_PRIVATE_KEY = process.env.PAYROLL_ADMIN_KEY;
const RPC_URL = process.env.RPC_URL ?? process.env.NEXT_PUBLIC_SEPOLIA_RPC;
const AUTH_TOKEN = process.env.GRANT_ROLE_TOKEN;

export async function POST(request: Request) {
  if (!ADMIN_PRIVATE_KEY) {
    return NextResponse.json({ error: 'PAYROLL_ADMIN_KEY missing on server.' }, { status: 500 });
  }

  if (!RPC_URL) {
    return NextResponse.json({ error: 'RPC_URL not configured.' }, { status: 500 });
  }

  if (!AUTH_TOKEN) {
    return NextResponse.json({ error: 'GRANT_ROLE_TOKEN missing on server.' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${AUTH_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payrollAddress = CONTRACTS.payroll;
  if (!payrollAddress) {
    return NextResponse.json({ error: 'Payroll contract address missing.' }, { status: 500 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const { account, role, payrollAddress: overrideAddr } = (payload ?? {}) as { account?: string; role?: string; payrollAddress?: string };

  if (overrideAddr && isAddress(overrideAddr)) {
    payrollAddress = overrideAddr as `0x${string}`;
  }

  if (!account || !isAddress(account)) {
    return NextResponse.json({ error: 'Invalid account address.' }, { status: 400 });
  }

  if (!role || !SUPPORTED_PAYROLL_ROLES.includes(role as typeof SUPPORTED_PAYROLL_ROLES[number])) {
    return NextResponse.json({ error: 'Unsupported role requested.' }, { status: 400 });
  }
  const normalizedRole = role as typeof SUPPORTED_PAYROLL_ROLES[number];

  try {
    const adminAccount = privateKeyToAccount(
      ADMIN_PRIVATE_KEY.startsWith('0x') ? (ADMIN_PRIVATE_KEY as `0x${string}`) : (`0x${ADMIN_PRIVATE_KEY}` as `0x${string}`),
    );

    const walletClient = createWalletClient({
      account: adminAccount,
      transport: http(RPC_URL),
    });

    const publicClient = createPublicClient({
      transport: http(RPC_URL),
    });

    const roleHash = resolvePayrollRoleHash(normalizedRole);

    const alreadyHasRole = await publicClient.readContract({
      address: payrollAddress,
      abi: payrollIntentManagerAbi,
      functionName: 'hasRole',
      args: [roleHash, account as `0x${string}`],
    });

    if (alreadyHasRole) {
      return NextResponse.json({ txHash: null, status: 'already_granted' });
    }

    const txHash = await walletClient.writeContract({
      address: payrollAddress,
      abi: payrollIntentManagerAbi,
      functionName: 'grantRole',
      args: [roleHash, account as `0x${string}`],
      chain: walletClient.chain ?? null,
    });

    return NextResponse.json({ txHash, status: 'granted' });
  } catch (error) {
    console.error('grantRole failed', error);
    return NextResponse.json({ error: 'Transaction failed.' }, { status: 500 });
  }
}
