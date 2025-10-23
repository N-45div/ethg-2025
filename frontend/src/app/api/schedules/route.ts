import { NextResponse } from 'next/server';
import { createPublicClient, http, parseAbiItem, formatUnits } from 'viem';

import { CONTRACTS } from '@/lib/contracts';

const intentScheduledEvent = parseAbiItem(
  'event IntentScheduled(bytes32 indexed intentId, address indexed worker, uint256 amount, uint64 releaseAt, bytes32 vaultScheduleId)'
);
const intentExecutedEvent = parseAbiItem(
  'event IntentExecuted(bytes32 indexed intentId, address indexed worker, address destination, uint256 amount)'
);

export async function GET() {
  try {
    const rpcCandidates = [
      // Prefer public endpoints first to avoid private provider rate limits
      'https://rpc.sepolia.org',
      'https://ethereum-sepolia.blockpi.network/v1/rpc/public',
      'https://endpoints.omniatech.io/v1/eth/sepolia/public',
      process.env.NEXT_PUBLIC_SEPOLIA_RPC,
    ].filter(Boolean) as string[];

    async function withAnyClient<T>(fn: (c: ReturnType<typeof createPublicClient>) => Promise<T>): Promise<T> {
      let lastErr: unknown;
      for (const url of rpcCandidates) {
        try {
          const c = createPublicClient({ transport: http(url) });
          // quick probe
          await c.getChainId();
          return await fn(c);
        } catch (e) {
          lastErr = e;
          continue;
        }
      }
      throw lastErr ?? new Error('No RPC available');
    }

    const extraPyusd = (process.env.PAYROLL_ADDRESSES_EXTRA || '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => /^0x[a-fA-F0-9]{40}$/.test(s));
    const extraUsdc = (process.env.PAYROLL_USDC_ADDRESSES_EXTRA || '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => /^0x[a-fA-F0-9]{40}$/.test(s));

    const unique = new Set<string>();
    if (CONTRACTS.payroll) unique.add(CONTRACTS.payroll.toLowerCase());
    if (CONTRACTS.payrollUsdc) unique.add(CONTRACTS.payrollUsdc.toLowerCase());
    for (const a of extraPyusd) unique.add(a.toLowerCase());
    for (const a of extraUsdc) unique.add(a.toLowerCase());

    const addresses = Array.from(unique) as `0x${string}`[];
    if (addresses.length === 0) {
      return NextResponse.json({ schedules: [] }, {
        headers: { 'Cache-Control': 's-maxage=15, stale-while-revalidate=60' },
      });
    }

    const envLookback = BigInt(Number(process.env.SCHEDULES_LOOKBACK_BLOCKS || 0) || 0);

    async function collect(windowBlocks: bigint) {
      const { latest, fromBlock } = await withAnyClient(async (client) => {
        const latest = await client.getBlockNumber();
        const zero = BigInt(0);
        const useWindow = envLookback > BigInt(0) ? envLookback : windowBlocks;
        const fromBlock = latest > useWindow ? latest - useWindow : zero;
        return { latest, fromBlock };
      });

      async function getLogsChunkedForAddress(address: `0x${string}`, event: typeof intentScheduledEvent | typeof intentExecutedEvent) {
        const step = BigInt(5_000);
        let cursor = fromBlock;
        const results: any[] = [];
        while (cursor <= latest) {
          const to = cursor + step > latest ? latest : cursor + step;
          try {
            const part = await withAnyClient((client) => client.getLogs({ address, event, fromBlock: cursor, toBlock: to }));
            results.push(...part);
          } catch {
            // fallback to smaller chunks with per-chunk RPC rotation as well
            let inner = cursor;
            const innerStep = BigInt(1_000);
            while (inner <= to) {
              const innerEnd = inner + innerStep;
              const innerTo = innerEnd > to ? to : innerEnd;
              const partSmall = await withAnyClient((client) => client.getLogs({ address, event, fromBlock: inner, toBlock: innerTo }));
              results.push(...partSmall);
              inner = innerTo + BigInt(1);
            }
          }
          cursor = to + BigInt(1);
        }
        return results;
      }

      const perAddress = await Promise.all(addresses.map(async (addr) => {
        const [scheduled, executed] = await Promise.all([
          getLogsChunkedForAddress(addr, intentScheduledEvent),
          getLogsChunkedForAddress(addr, intentExecutedEvent),
        ]);
        return { addr, scheduled, executed };
      }));

      const executedMap = new Map<string, string>();
      for (const { addr, executed } of perAddress) {
        for (const log of executed) {
          const key = `${addr.toLowerCase()}-${(log.args.intentId as string)}`;
          // @ts-ignore
          executedMap.set(key, (log.transactionHash ?? ''));
        }
      }

      const rows: Array<{
        id: string; worker: string; amount: number; releaseAt: number; claimed: boolean; txHash?: string; asset: 'PYUSD' | 'USDC'
      }> = [];
      for (const { addr, scheduled } of perAddress) {
        const isPyusd = addr.toLowerCase() === (CONTRACTS.payroll ?? '').toLowerCase();
        const asset: 'PYUSD' | 'USDC' = isPyusd ? 'PYUSD' : 'USDC';
        for (const log of scheduled) {
          const amountRaw = log.args.amount as bigint;
          const releaseAtSeconds = Number(log.args.releaseAt);
          const key = `${addr.toLowerCase()}-${(log.args.intentId as string)}`;
          rows.push({
            id: log.args.intentId as string,
            worker: log.args.worker as string,
            amount: Number(formatUnits(amountRaw, 6)),
            releaseAt: releaseAtSeconds * 1000,
            claimed: executedMap.has(key),
            txHash: executedMap.get(key),
            asset,
          });
        }
      }
      rows.sort((a, b) => a.releaseAt - b.releaseAt);
      return rows;
    }

    let rows = await collect(BigInt(20_000));
    if (rows.length === 0) {
      // Fallback deeper scan to recover older schedules
      rows = await collect(BigInt(1_000_000));
      if (rows.length === 0) {
        rows = await collect(BigInt(2_500_000));
      }
    }

    return NextResponse.json(
      { schedules: rows },
      { headers: { 'Cache-Control': 's-maxage=15, stale-while-revalidate=60' } },
    );
  } catch (e) {
    console.error('GET /api/schedules failed', e);
    return NextResponse.json(
      { schedules: [], error: 'stale' },
      { status: 200, headers: { 'Cache-Control': 's-maxage=0, stale-while-revalidate=60' } },
    );
  }
}
