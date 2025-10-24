import { NextResponse } from 'next/server';
import { createPublicClient, http, parseAbiItem, formatUnits, decodeEventLog, keccak256, stringToHex } from 'viem';
import { getRedis } from '@/lib/redis';

import { CONTRACTS } from '@/lib/contracts';

const intentScheduledEvent = parseAbiItem(
  'event IntentScheduled(bytes32 indexed intentId, address indexed worker, uint256 amount, uint64 releaseAt, bytes32 vaultScheduleId)'
);
const intentExecutedEvent = parseAbiItem(
  'event IntentExecuted(bytes32 indexed intentId, address indexed worker, address destination, uint256 amount)'
);

export async function GET(request: Request) {
  try {
    const BLOCKSCOUT_BASE = process.env.BLOCKSCOUT_API_BASE ?? 'https://eth-sepolia.blockscout.com/api';
    const topic0IntentScheduled = keccak256(stringToHex('IntentScheduled(bytes32,address,uint256,uint64,bytes32)'));
    const topic0IntentExecuted  = keccak256(stringToHex('IntentExecuted(bytes32,address,address,uint256)'));
    const rpcCandidates = [
      // Prefer reliable public endpoints first, then user-provided env
      'https://rpc.sepolia.org',
      'https://ethereum-sepolia.blockpi.network/v1/rpc/public',
      'https://endpoints.omniatech.io/v1/eth/sepolia/public',
      process.env.NEXT_PUBLIC_SEPOLIA_RPC,
    ].filter(Boolean) as string[];

    async function withAnyClient<T>(fn: (c: ReturnType<typeof createPublicClient>) => Promise<T>): Promise<T> {
      let lastErr: unknown;
      for (const url of rpcCandidates) {
        try {
          const c = createPublicClient({ transport: http(url, { timeout: 6000 }) });
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

    async function getHealthyClient(): Promise<ReturnType<typeof createPublicClient>> {
      const attempts = rpcCandidates.map((url) => (async () => {
        const c = createPublicClient({ transport: http(url, { timeout: 5000 }) });
        await c.getChainId();
        return c;
      })());
      try {
        // First client to respond wins
        return await Promise.any(attempts);
      } catch {
        // Fallback to sequential probing
        return await withAnyClient(async (c) => c);
      }
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
    const defaultWindow = envLookback > BigInt(0) ? envLookback : BigInt(100_000);

    // Optional filter: only include intents created by this wallet (tx.from)
    const url = new URL(request.url);
    const creator = (url.searchParams.get('creator') || '').toLowerCase();
    const fresh = (url.searchParams.get('fresh') || '').toLowerCase();
    const forceFresh = fresh === '1' || fresh === 'true';

    // Short TTL cache to prevent hammering RPC and to survive transient outages
    const redis = getRedis();
    const cacheKey = `schedules:sepolia:${defaultWindow}:${addresses.join(',')}:creator:${creator || 'all'}`;
    const cached = forceFresh ? null : await redis.get<string>(cacheKey).catch(() => null);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as { schedules: Array<{ id: string; worker: string; amount: number; releaseAt: number; claimed: boolean; txHash?: string; asset: 'PYUSD' | 'USDC' }>; };
        // Return cached immediately while we refresh in background (ISR-like)
        return NextResponse.json(parsed, { headers: { 'Cache-Control': 's-maxage=10, stale-while-revalidate=60' } });
      } catch {}
    }

    async function fetchLogsFromBlockscout(address: `0x${string}`, topic0: `0x${string}`, fromBlock: bigint, toBlock: bigint): Promise<Array<{ args: Record<string, unknown>; transactionHash?: `0x${string}` }>> {
      const params = new URLSearchParams({
        module: 'logs',
        action: 'getLogs',
        address,
        fromBlock: fromBlock.toString(),
        toBlock: toBlock.toString(),
        topic0,
      });
      const url = `${BLOCKSCOUT_BASE}?${params.toString()}`;
      const res = await fetch(url, { headers: { accept: 'application/json' }, cache: 'no-store' });
      if (!res.ok) throw new Error(`Blockscout getLogs failed (${res.status})`);
      const json = (await res.json()) as { status?: string; result?: Array<{ data: `0x${string}`; topics: `0x${string}`[]; transactionHash?: `0x${string}` }>; };
      const raw = Array.isArray(json.result) ? json.result : [];
      return raw.map((log) => {
        try {
          const topicsTuple = [
            (log.topics?.[0] ?? topic0) as `0x${string}`,
            ...(((log.topics ?? []).slice(1)) as `0x${string}`[]),
          ] as [`0x${string}`, ...`0x${string}`[]];
          const decoded = decodeEventLog({
            abi: [topic0 === topic0IntentScheduled ? intentScheduledEvent : intentExecutedEvent],
            data: log.data,
            topics: topicsTuple,
          });
          // viem returns named args
          return { args: decoded.args as unknown as Record<string, unknown>, transactionHash: log.transactionHash };
        } catch {
          return { args: {}, transactionHash: log.transactionHash };
        }
      });
    }

    async function getTxFrom(txHash: `0x${string}`): Promise<string | null> {
      try {
        // Try proxy RPC via Blockscout (no API key needed)
        const u = `${BLOCKSCOUT_BASE}?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}`;
        const r = await fetch(u, { headers: { accept: 'application/json' }, cache: 'no-store' });
        if (r.ok) {
          const j = await r.json();
          const from = j?.result?.from as string | undefined;
          if (typeof from === 'string' && from.startsWith('0x')) return from.toLowerCase();
        }
      } catch {}
      try {
        // Fallback to transaction module
        const u2 = `${BLOCKSCOUT_BASE}?module=transaction&action=gettxinfo&txhash=${txHash}`;
        const r2 = await fetch(u2, { headers: { accept: 'application/json' }, cache: 'no-store' });
        if (r2.ok) {
          const j2 = await r2.json();
          const from = (j2?.result?.from || j2?.result?.from_address) as string | undefined;
          if (typeof from === 'string' && from.startsWith('0x')) return from.toLowerCase();
        }
      } catch {}
      return null;
    }

    async function collect(windowBlocks: bigint) {
      // Pick a healthy client to reduce cold-start latency
      const primary = await getHealthyClient();
      const latest = await primary.getBlockNumber();
      const zero = BigInt(0);
      const useWindow = envLookback > BigInt(0) ? envLookback : windowBlocks;
      const fromBlock = latest > useWindow ? latest - useWindow : zero;

      async function getLogsChunkedForAddress(address: `0x${string}`, event: typeof intentScheduledEvent | typeof intentExecutedEvent) {
        const step = BigInt(5_000);
        let cursor = fromBlock;
        const results: Array<{ args: Record<string, unknown>; transactionHash?: `0x${string}` }> = [];
        while (cursor <= latest) {
          const to = cursor + step > latest ? latest : cursor + step;
          try {
            // Try primary first; if it fails, rotate
            try {
              const part = await primary.getLogs({ address, event, fromBlock: cursor, toBlock: to });
              results.push(...(part as Array<{ args: Record<string, unknown>; transactionHash?: `0x${string}` }>));
            } catch {
              const part = await withAnyClient((client) => client.getLogs({ address, event, fromBlock: cursor, toBlock: to }));
              results.push(...(part as Array<{ args: Record<string, unknown>; transactionHash?: `0x${string}` }>));
            }
          } catch {
            // fallback to smaller chunks with per-chunk RPC rotation as well
            let inner = cursor;
            const innerStep = BigInt(1_000);
            while (inner <= to) {
              const innerEnd = inner + innerStep;
              const innerTo = innerEnd > to ? to : innerEnd;
              try {
                const partSmallPrimary = await primary.getLogs({ address, event, fromBlock: inner, toBlock: innerTo });
                results.push(...(partSmallPrimary as Array<{ args: Record<string, unknown>; transactionHash?: `0x${string}` }>));
              } catch {
                const partSmall = await withAnyClient((client) => client.getLogs({ address, event, fromBlock: inner, toBlock: innerTo }));
                results.push(...(partSmall as Array<{ args: Record<string, unknown>; transactionHash?: `0x${string}` }>));
              }
              inner = innerTo + BigInt(1);
            }
          }
          cursor = to + BigInt(1);
        }
        return results;
      }

      const perAddress = await Promise.all(addresses.map(async (addr) => {
        // Try Blockscout first (single call per event); fall back to RPC chunking if it fails
        let scheduled: Array<{ args: Record<string, unknown>; transactionHash?: `0x${string}` }>; 
        let executed: Array<{ args: Record<string, unknown>; transactionHash?: `0x${string}` }>; 
        try {
          [scheduled, executed] = await Promise.all([
            fetchLogsFromBlockscout(addr, topic0IntentScheduled, fromBlock, latest),
            fetchLogsFromBlockscout(addr, topic0IntentExecuted, fromBlock, latest),
          ]);
        } catch {
          [scheduled, executed] = await Promise.all([
            getLogsChunkedForAddress(addr, intentScheduledEvent),
            getLogsChunkedForAddress(addr, intentExecutedEvent),
          ]);
        }
        return { addr, scheduled, executed };
      }));

      const executedMap = new Map<string, string>();
      for (const { addr, executed } of perAddress) {
        for (const log of executed) {
          const key = `${addr.toLowerCase()}-${(log.args.intentId as string)}`;
          executedMap.set(key, (log.transactionHash ?? ''));
        }
      }

      // Build creator match map if filtering by creator
      let creatorMatch: Map<string, boolean> = new Map();
      if (creator) {
        const scheduleTxs = new Set<string>();
        for (const { scheduled } of perAddress) {
          for (const log of scheduled) {
            if (log.transactionHash) scheduleTxs.add(log.transactionHash.toLowerCase());
          }
        }
        const hashes = Array.from(scheduleTxs);
        const pairs = await Promise.all(
          hashes.map(async (h) => {
            const from = await getTxFrom(h as `0x${string}`);
            return [h, from === creator] as const;
          }),
        );
        creatorMatch = new Map(pairs);
      }

      const rows: Array<{
        id: string; worker: string; amount: number; releaseAt: number; claimed: boolean; txHash?: string; asset: 'PYUSD' | 'USDC'
      }> = [];
      for (const { addr, scheduled } of perAddress) {
        const isPyusd = addr.toLowerCase() === (CONTRACTS.payroll ?? '').toLowerCase();
        const asset: 'PYUSD' | 'USDC' = isPyusd ? 'PYUSD' : 'USDC';
        for (const log of scheduled) {
          const sTx = (log.transactionHash ?? '').toLowerCase();
          if (creator && (!sTx || creatorMatch.get(sTx) !== true)) {
            continue;
          }
          const key = `${addr.toLowerCase()}-${(log.args.intentId as string)}`;
          const amount = Number(formatUnits(log.args.amount as bigint, 6));
          rows.push({
            id: log.args.intentId as string,
            worker: log.args.worker as string,
            amount,
            releaseAt: Number(log.args.releaseAt as bigint),
            claimed: executedMap.has(key),
            txHash: executedMap.get(key),
            asset,
          });
        }
      }
      rows.sort((a, b) => a.releaseAt - b.releaseAt);
      return rows;
    }

    // Clamp lookback to avoid function timeouts. Prefer env override if set.
    const rows = await collect(defaultWindow);

    // Store fresh cache with short TTL and also update a stable fallback key
    await redis.set(cacheKey, JSON.stringify({ schedules: rows }), { ex: 30 }).catch(() => {});
    await redis.set('schedules:sepolia:last', JSON.stringify({ schedules: rows }), { ex: 300 }).catch(() => {});
    return NextResponse.json(
      { schedules: rows },
      { headers: { 'Cache-Control': 's-maxage=10, stale-while-revalidate=60' } },
    );
  } catch (e) {
    console.error('GET /api/schedules failed', e);
    // On failure, try to serve last cached data if available
    try {
      const redis = getRedis();
      const cached = await redis.get<string>('schedules:sepolia:last');
      if (cached) {
        const parsed = JSON.parse(cached);
        return NextResponse.json(parsed, { status: 200, headers: { 'Cache-Control': 's-maxage=0, stale-while-revalidate=60' } });
      }
    } catch {}
    return NextResponse.json(
      { schedules: [], error: 'stale' },
      { status: 200, headers: { 'Cache-Control': 's-maxage=0, stale-while-revalidate=60' } },
    );
  }
}
