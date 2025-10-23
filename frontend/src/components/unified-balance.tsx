import { useNexus } from "@/providers/NexusProvider";
import { CHAIN_METADATA, type UserAsset } from "@avail-project/nexus-core";
import { DollarSign, Loader2 } from "lucide-react";
import Image from "next/image";
import { Fragment, useCallback, useEffect, useState } from "react";
import { Label } from "./ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import { SelectSeparator } from "./ui/select";

const NexusUnifiedBalance = () => {
  const [unifiedBalance, setUnifiedBalance] = useState<UserAsset[] | undefined>(
    undefined,
  );
  const [isLoading, setIsLoading] = useState(false);
  const { nexusSDK } = useNexus();
  const fetchUnifiedBalance = useCallback(async () => {
    if (!nexusSDK) return;
    setIsLoading(true);
    try {
      const balance = await nexusSDK.getUnifiedBalances();
      console.log("Unified Balance:", balance);
      setUnifiedBalance(balance);
    } catch (error) {
      console.error("Error fetching unified balance:", error);
    } finally {
      setIsLoading(false);
    }
  }, [nexusSDK]);

  useEffect(() => {
    fetchUnifiedBalance();
  }, [fetchUnifiedBalance]);

  const formatBalance = (balance: string, decimals: number) => {
    const num = parseFloat(balance);
    return num.toFixed(Math.min(6, decimals));
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto p-4 text-center flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto p-4 flex flex-col gap-y-2 items-center overflow-y-scroll max-h-[272px] rounded-lg border border-border">
      <div className="flex items-ceter justify-start w-full">
        <Label className="font-semibold text-muted-foreground">
          Total Balance:
        </Label>

        <Label className="text-lg font-bold gap-x-0">
          <DollarSign className="w-4 h-4 font-bold" strokeWidth={3} />
          {unifiedBalance
            ?.reduce((acc, fiat) => acc + fiat.balanceInFiat, 0)
            .toFixed(2)}
        </Label>
      </div>
      <Accordion type="single" collapsible className="w-full space-y-4">
        {unifiedBalance
          ?.filter((token) => parseFloat(token.balance) > 0)
          .map((token) => (
            <AccordionItem
              key={token.symbol}
              value={token.symbol}
              className="px-4 !shadow-[var(--ck-connectbutton-box-shadow)] !rounded-[var(--ck-connectbutton-border-radius)]"
            >
              <AccordionTrigger className="hover:no-underline cursor-pointer">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <div className="relative h-8 w-8">
                      <Image
                        src={token.icon ?? "/token-placeholder.svg"}
                        alt={token.symbol}
                        fill
                        className="rounded-full object-contain"
                        unoptimized
                      />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold">{token.symbol}</h3>
                      <p className="text-sm text-muted-foreground">
                        ${token.balanceInFiat.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <p className="text-lg font-medium">
                    {formatBalance(token.balance, 6)}
                  </p>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 py-2">
                  {token.breakdown
                    .filter((chain) => parseFloat(chain.balance) > 0)
                    .map((chain, index, filteredChains) => (
                      <Fragment key={chain.chain.id}>
                        <div className="flex items-center justify-between px-2 py-1 rounded-md">
                          <div className="flex items-center gap-2">
                            <div className="relative h-6 w-6">
                              <Image
                                src={
                                  CHAIN_METADATA[chain?.chain?.id]?.logo ??
                                  "/chain-placeholder.svg"
                                }
                                alt={chain.chain.name}
                                fill
                                className="rounded-full object-contain"
                                unoptimized
                              />
                            </div>
                            <span className="text-sm">{chain.chain.name}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {formatBalance(chain.balance, chain.decimals)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              ${chain.balanceInFiat.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        {index < filteredChains.length - 1 && (
                          <SelectSeparator className="my-2" />
                        )}
                      </Fragment>
                    ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
      </Accordion>
    </div>
  );
};

export default NexusUnifiedBalance;
