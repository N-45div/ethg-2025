import {
  TESTNET_TOKEN_METADATA,
  TOKEN_METADATA,
  type SUPPORTED_TOKENS,
} from "@avail-project/nexus-core";
import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Label } from "../ui/label";

const TokenSelect = ({
  selectedToken,
  selectedChain,
  handleTokenSelect,
  isTestnet = false,
  disabled = false,
  tokenLabel = "Destination Token",
}: {
  selectedToken?: SUPPORTED_TOKENS;
  selectedChain: string;
  handleTokenSelect: (token: SUPPORTED_TOKENS) => void;
  isTestnet?: boolean;
  disabled?: boolean;
  tokenLabel?: string;
}) => {
  const tokenData = isTestnet ? TESTNET_TOKEN_METADATA : TOKEN_METADATA;
  const selectedTokenData = Object.entries(tokenData)?.find(([, token]) => {
    return token.symbol === selectedToken;
  });
  return (
    <Select
      value={selectedToken}
      onValueChange={(value) =>
        !disabled && handleTokenSelect(value as SUPPORTED_TOKENS)
      }
    >
      <div className="flex flex-col items-start gap-y-1">
        {tokenLabel && (
          <Label className="text-sm font-semibold">{tokenLabel}</Label>
        )}
        <SelectTrigger disabled={disabled}>
          <SelectValue placeholder="Select a token">
            {selectedChain && selectedTokenData && (
              <div className="flex items-center gap-x-2">
                <Image
                  src={selectedTokenData[1].icon ?? "/token-placeholder.svg"}
                  alt={selectedTokenData[1].symbol}
                  width={24}
                  height={24}
                  className="rounded-full object-contain"
                  unoptimized
                />
                {selectedToken}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
      </div>

      <SelectContent>
        <SelectGroup>
          {Object.entries(tokenData)?.map(([, token]) => (
            <SelectItem key={token.symbol} value={token.symbol}>
              <div className="flex items-center gap-x-2 my-1">
                <Image
                  src={token.icon ?? "/token-placeholder.svg"}
                  alt={token.symbol}
                  width={24}
                  height={24}
                  className="rounded-full object-contain"
                  unoptimized
                />
                <div className="flex flex-col">
                  <span>
                    {isTestnet ? `${token.symbol} (Testnet)` : token.symbol}
                  </span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

export default TokenSelect;
