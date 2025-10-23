import {
  SUPPORTED_CHAINS,
  type SUPPORTED_CHAINS_IDS,
  type SUPPORTED_TOKENS,
} from "@avail-project/nexus-core";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useState } from "react";
import ChainSelect from "./blocks/chain-select";
import TokenSelect from "./blocks/token-select";
import { useNexus } from "@/providers/NexusProvider";
import IntentModal from "./blocks/intent-modal";
import AllowanceModal from "./blocks/allowance-modal";
import { ArrowBigRight, CircleAlertIcon } from "lucide-react";
import useListenTransaction from "@/hooks/useListenTransactions";

const NexusBridge = () => {
  const [inputs, setInputs] = useState<{
    chain: SUPPORTED_CHAINS_IDS | null;
    token: SUPPORTED_TOKENS | null;
    amount: string | null;
  }>({
    chain: null,
    token: null,
    amount: null,
  });
  const { nexusSDK, currentIntent } = useNexus();
  const { processing, explorerURL } = useListenTransaction({
    sdk: nexusSDK!,
    type: "bridge",
  });
  const [isLoading, setIsLoading] = useState(false);

  const initiateBridge = async () => {
    if (!inputs.chain || !inputs.token || !inputs.amount) return;
    setIsLoading(true);
    try {
      const bridgeResult = await nexusSDK?.bridge({
        token: inputs.token,
        amount: inputs.amount,
        chainId: inputs.chain,
      });
      if (bridgeResult?.success) {
        console.log("Bridge successful");
        console.log("Explorer URL:", bridgeResult.explorerUrl);
      }
    } catch (error) {
      console.error("Error while bridging:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className="w-full max-w-lg items-center mx-auto bg-transparent">
        <CardHeader className="w-full">
          <CardTitle className="text-center">Nexus Bridge</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-5 w-full max-w-md">
          <ChainSelect
            selectedChain={inputs?.chain ?? SUPPORTED_CHAINS.ETHEREUM}
            handleSelect={(chain) => {
              setInputs({ ...inputs, chain });
            }}
          />
          <TokenSelect
            selectedChain={(
              inputs?.chain ?? SUPPORTED_CHAINS.ETHEREUM
            ).toString()}
            selectedToken={inputs?.token ?? "ETH"}
            handleTokenSelect={(token) => setInputs({ ...inputs, token })}
          />
          <div className="grid gap-3 w-full text-left">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="text"
              className="w-full"
              value={inputs?.amount ?? "0"}
              onChange={(e) => setInputs({ ...inputs, amount: e.target.value })}
            />
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-y-5">
          <div className="grid gap-3">
            <Button
              type="submit"
              onClick={initiateBridge}
              disabled={
                !inputs.chain || !inputs.token || !inputs.amount || isLoading
              }
            >
              {isLoading ? (
                <CircleAlertIcon className="size-5 animate-spin" />
              ) : (
                "Send"
              )}
            </Button>
          </div>
          <div className="flex items-center flex-col gap-y-3">
            {currentIntent && (
              <>
                <p className="font-semibold text-lg">
                  Total Steps: {processing?.totalSteps}
                </p>
                <p className="font-semibold text-lg">
                  Status: {processing?.statusText}
                </p>
                <p className="font-semibold text-lg">
                  Progress: {processing?.currentStep}
                </p>
              </>
            )}

            {explorerURL && (
              <a
                href={explorerURL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold flex items-center gap-x-2"
              >
                <ArrowBigRight className="size-5" /> View on Explorer
              </a>
            )}
          </div>
        </CardFooter>
      </Card>
      <IntentModal />
      <AllowanceModal />
    </>
  );
};

export default NexusBridge;
