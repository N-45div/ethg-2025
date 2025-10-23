import { NextRequest } from "next/server";
import OpenAI from "openai";

const MCP_BASE_URL = process.env.MCP_BASE_URL ?? "http://127.0.0.1:8000";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SYSTEM_PROMPT = `You are Synced Streams' on-chain operations analyst. Leverage Blockscout MCP data to explain PYUSD payroll activity. Call out relevant transactions, token transfers, contract roles, and cite hashes or addresses in your answer.`;

type ToolCall = {
  tool: string;
  params: Record<string, unknown>;
  response: unknown;
};

const ADDRESS_REGEX = /0x[a-fA-F0-9]{40}/g;

async function callTool(tool: string, params: Record<string, unknown> = {}) {
  const url = new URL(`${MCP_BASE_URL}/v1/${tool}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  }

  const response = await fetch(url, {
    headers: {
      "content-type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`${tool} failed with status ${response.status}`);
  }

  return (await response.json()) as unknown;
}

function truncate(value: unknown, max = 1800) {
  const json = JSON.stringify(value, null, 2);
  if (!json || json.length <= max) return json;
  return `${json.slice(0, max)}...`;
}

export async function POST(request: NextRequest) {
  if (!OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing OPENAI_API_KEY in environment." }),
      { status: 500 },
    );
  }

  const { prompt, chainId, address } = (await request.json()) as {
    prompt?: string;
    chainId?: string;
    address?: string;
  };

  if (!prompt || prompt.trim().length === 0) {
    return new Response(JSON.stringify({ error: "Prompt is required" }), {
      status: 400,
    });
  }

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  const targetChainId = chainId ?? "11155111";

  const toolCalls: ToolCall[] = [];

  try {
    const unlock = await callTool("unlock_blockchain_analysis");
    toolCalls.push({ tool: "unlock_blockchain_analysis", params: {}, response: unlock });

    const addresses = new Set<string>();
    if (address && ADDRESS_REGEX.test(address)) {
      addresses.add(address.toLowerCase());
    }
    const matches = prompt.match(ADDRESS_REGEX);
    if (matches) {
      matches.forEach((addr) => addresses.add(addr.toLowerCase()));
    }

    const defaultAddress = process.env.NEXT_PUBLIC_TREASURY_ADDRESS;
    if (addresses.size === 0 && defaultAddress && ADDRESS_REGEX.test(defaultAddress)) {
      addresses.add(defaultAddress.toLowerCase());
    }

    for (const addr of addresses) {
      const addressInfo = await callTool("get_address_info", {
        chain_id: targetChainId,
        address: addr,
      });
      toolCalls.push({ tool: "get_address_info", params: { chain_id: targetChainId, address: addr }, response: addressInfo });

      const transactions = await callTool("get_transactions_by_address", {
        chain_id: targetChainId,
        address: addr,
      });
      toolCalls.push({
        tool: "get_transactions_by_address",
        params: { chain_id: targetChainId, address: addr },
        response: transactions,
      });

      const transfers = await callTool("get_token_transfers_by_address", {
        chain_id: targetChainId,
        address: addr,
      });
      toolCalls.push({
        tool: "get_token_transfers_by_address",
        params: { chain_id: targetChainId, address: addr },
        response: transfers,
      });
    }

    const context = toolCalls
      .map((call) => {
        return [
          `Tool: ${call.tool}`,
          `Params: ${JSON.stringify(call.params)}`,
          `Response: ${truncate(call.response)}`,
        ].join("\n");
      })
      .join("\n\n");

    const completion = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: `User prompt: ${prompt}\n\nRelevant MCP data:\n${context}`,
        },
      ],
    });

    const answer = completion.output_text ?? "No response generated.";

    return new Response(
      JSON.stringify({
        answer,
        toolCalls,
      }),
      {
        headers: {
          "content-type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("MCP agent error", error);
    return new Response(
      JSON.stringify({
        error: "Failed to generate MCP-assisted response.",
        details: (error as Error).message,
      }),
      { status: 500 },
    );
  }
}
