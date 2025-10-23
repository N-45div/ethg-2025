import { NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http, isAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import { CONTRACTS } from '@/lib/contracts';
import { treasuryAbi } from '@/lib/abi/treasury';
import { keccak256, stringToHex } from 'viem';

const ADMIN_PRIVATE_KEY = process.env.PAYROLL_ADMIN_KEY;
const RPC_URL = process.env.RPC_URL ?? process.env.NEXT_PUBLIC_SEPOLIA_RPC;
const AUTH_TOKEN = process.env.GRANT_ROLE_TOKEN;

const AUTOMATION_ROLE = keccak256(stringToHex('AUTOMATION_ROLE'));

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

  let treasuryAddress = CONTRACTS.treasury;
  if (!treasuryAddress) {
    return NextResponse.json({ error: 'Treasury contract address missing.' }, { status: 500 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }
  const { account, treasuryAddress: overrideAddr } = (payload ?? {}) as { account?: string; treasuryAddress?: string };
  if (overrideAddr && isAddress(overrideAddr)) {
    treasuryAddress = overrideAddr as `0x${string}`;
  }
  if (!account || !isAddress(account)) {
    return NextResponse.json({ error: 'Invalid account address.' }, { status: 400 });
  }

  try {
    const adminAccount = privateKeyToAccount(
      ADMIN_PRIVATE_KEY.startsWith('0x') ? (ADMIN_PRIVATE_KEY as `0x${string}`) : (`0x${ADMIN_PRIVATE_KEY}` as `0x${string}`),
    );

    const client = createWalletClient({ account: adminAccount, transport: http(RPC_URL) });
    const publicClient = createPublicClient({ transport: http(RPC_URL) });

    const alreadyHas = await publicClient.readContract({
      address: treasuryAddress,
      abi: treasuryAbi,
      functionName: 'hasRole',
      args: [AUTOMATION_ROLE, account as `0x${string}`],
    });

    if (alreadyHas) {
      return NextResponse.json({ txHash: null, status: 'already_granted' });
    }

    const txHash = await client.writeContract({
      address: treasuryAddress,
      abi: treasuryAbi,
      functionName: 'grantRole',
      args: [AUTOMATION_ROLE, account as `0x${string}`],
      chain: client.chain ?? null,
    });

    return NextResponse.json({ txHash, status: 'granted' });
  } catch (error) {
    console.error('grantVaultRole failed', error);
    return NextResponse.json({ error: 'Transaction failed.' }, { status: 500 });
  }
}
