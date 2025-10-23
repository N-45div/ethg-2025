"use client";

import { useState } from "react";
import { MessageSquare, Loader2, Copy, ClipboardCheck, AlertCircle } from "lucide-react";
import { Button } from "../ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";

interface AskBlockscoutPanelProps {
  defaultAddress?: string;
  defaultChainId?: string;
}

interface ToolCallLog {
  tool: string;
  params: Record<string, unknown>;
  response: unknown;
}

const AskBlockscoutPanel = ({ defaultAddress, defaultChainId = "11155111" }: AskBlockscoutPanelProps) => {
  const [prompt, setPrompt] = useState("Summarize the most recent PYUSD treasury movements.");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [toolCalls, setToolCalls] = useState<ToolCallLog[]>([]);
  const [copied, setCopied] = useState(false);

  async function handleSubmit() {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    setToolCalls([]);
    setCopied(false);

    try {
      const response = await fetch("/api/mcp-agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt, chainId: defaultChainId, address: defaultAddress }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "MCP agent request failed");
      }

      const data = (await response.json()) as {
        answer: string;
        toolCalls: ToolCallLog[];
      };

      setAnswer(data.answer);
      setToolCalls(data.toolCalls ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!answer) return;
    void navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Card className="border border-border/60 bg-background/80 shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Ask Blockscout
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Query the MCP server for on-chain analytics. Include wallet addresses or transaction hashes in your prompt for deeper insights.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={prompt}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
            setPrompt(event.target.value)
          }
          placeholder="e.g. Explain the latest payroll intent execution and list impacted workers"
          className="min-h-[90px]"
        />
        <div className="flex items-center gap-2">
          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Running MCP query...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Ask Blockscout
              </span>
            )}
          </Button>
          {answer && (
            <Button variant="outline" size="icon" onClick={handleCopy}>
              {copied ? <ClipboardCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {answer && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">MCP insight</Badge>
            </div>
            <div className="rounded-md border border-border/50 bg-muted/20 p-3 text-sm leading-relaxed">
              {answer}
            </div>
          </div>
        )}

        {toolCalls.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tool calls
            </h4>
            <div className="max-h-60 overflow-y-auto rounded-md border border-border/60 bg-background/60 text-xs">
              {toolCalls.map((call, index) => (
                <div key={`${call.tool}-${index}`} className="border-b border-border/40 p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{call.tool}</span>
                    <Badge variant="outline">{index + 1}</Badge>
                  </div>
                  <p className="text-muted-foreground">
                    Params: <code>{JSON.stringify(call.params)}</code>
                  </p>
                  <pre className="whitespace-pre-wrap break-words rounded-md bg-muted/30 p-2">
                    {JSON.stringify(call.response, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AskBlockscoutPanel;
