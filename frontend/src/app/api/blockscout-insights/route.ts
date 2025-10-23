import { NextRequest, NextResponse } from "next/server";

const BLOCKSCOUT_BASE_URL =
  process.env.BLOCKSCOUT_BASE_URL ?? "https://syncedstreams-sepolia.cloud.blockscout.com";

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");
  if (!address || !ADDRESS_REGEX.test(address)) {
    return NextResponse.json(
      { error: "Please provide a valid 0x address." },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(
      `${BLOCKSCOUT_BASE_URL}/api/v2/addresses/${address}/transactions?limit=25`,
      { next: { revalidate: 30 } },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `Blockscout request failed with status ${response.status}` },
        { status: 502 },
      );
    }

    const data = (await response.json()) as {
      items: Array<{
        hash: string;
        timestamp: string;
        success: boolean;
        value?: string;
        method?: string | null;
      }>;
    };

    if (!data.items || data.items.length === 0) {
      return NextResponse.json({ summary: "No recent transactions found." });
    }

    const successful = data.items.filter((tx) => tx.success).length;
    const failed = data.items.length - successful;
    const totalValue = data.items.reduce((acc, tx) => {
      const val = tx.value ? Number(tx.value) : 0;
      return acc + val;
    }, 0);

    const latest = data.items.slice(0, 3).map((tx) => ({
      hash: tx.hash,
      method: tx.method ?? "N/A",
      timestamp: tx.timestamp,
      success: tx.success,
    }));

    const summary = {
      total: data.items.length,
      successful,
      failed,
      totalValue,
      latest,
    };

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Blockscout insights error", error);
    return NextResponse.json(
      { error: "Unable to reach Blockscout insights service." },
      { status: 500 },
    );
  }
}
