'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useNexus } from '@/providers/NexusProvider';
import { CHAIN_METADATA, SUPPORTED_CHAINS } from '@avail-project/nexus-core';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import { CONTRACTS } from '@/lib/contracts';
import { payrollIntentManagerAbi } from '@/lib/abi/payroll';
import { treasuryAbi } from '@/lib/abi/treasury';
import { usePayrollRoles } from '@/hooks/usePayrollRoles';
import useCompanyContracts from '@/hooks/useCompanyContracts';
import { keccak256, encodePacked, parseUnits } from 'viem';
import { padHex, stringToHex } from 'viem/utils';

interface CreatePayrollIntentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type IntentToken = 'PYUSD' | 'USDC';
const TOKEN_OPTIONS: { label: string; value: IntentToken }[] = [
  { label: 'PYUSD', value: 'PYUSD' },
  { label: 'USDC', value: 'USDC' },
];

const BASE_ONLY: number[] = [SUPPORTED_CHAINS.BASE_SEPOLIA];
const SEPOLIA_ONLY: number[] = [SUPPORTED_CHAINS.SEPOLIA];

type FormState = {
  workerAddress: string;
  token: IntentToken;
  destinationChainId: number;
  amount: string;
  memo: string;
  releaseAt: string;
  scheduleId: string;
};

const DEFAULT_FORM: FormState = {
  workerAddress: '',
  token: 'PYUSD',
  destinationChainId: SUPPORTED_CHAINS.SEPOLIA,
  amount: '',
  memo: '',
  releaseAt: '',
  scheduleId: '',
};

export function CreatePayrollIntentDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreatePayrollIntentDialogProps) {
  const { toast } = useToast();
  const { nexusSDK } = useNexus();
  const [form, setForm] = useState<FormState>(() => ({ ...DEFAULT_FORM }));
  const [submitting, setSubmitting] = useState(false);
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();
  const company = useCompanyContracts();
  // For now, route by token using env-configured addresses.
  // Company-scoped addresses will be supported when registry exposes per-token vaults.
  const selectedPayroll = useMemo(
    () => (form.token === 'USDC' ? CONTRACTS.payrollUsdc : CONTRACTS.payroll),
    [form.token]
  );
  const selectedTreasury = useMemo(
    () => (form.token === 'USDC' ? CONTRACTS.treasuryUsdc : CONTRACTS.treasury),
    [form.token]
  );
  const { isAutomation, isLoading: rolesLoading, granting, requestGrant, refreshRoles } = usePayrollRoles(selectedPayroll as `0x${string}` | undefined);
  const [grantingVault, setGrantingVault] = useState(false);

  const chainOptions = useMemo(() => {
    const ids = form.token === 'PYUSD' ? SEPOLIA_ONLY : BASE_ONLY;
    return ids.map((id) => CHAIN_METADATA[id]).filter(Boolean);
  }, [form.token]);

  // Ensure destination matches token semantics
  useEffect(() => {
    if (form.token === 'PYUSD' && form.destinationChainId !== SUPPORTED_CHAINS.SEPOLIA) {
      setForm((prev) => ({ ...prev, destinationChainId: SUPPORTED_CHAINS.SEPOLIA }));
    }
    if (form.token === 'USDC' && form.destinationChainId === SUPPORTED_CHAINS.SEPOLIA) {
      setForm((prev) => ({ ...prev, destinationChainId: SUPPORTED_CHAINS.BASE_SEPOLIA }));
    }
  }, [form.token]);

  const resetForm = () => {
    setForm(() => ({ ...DEFAULT_FORM }));
    setSubmitting(false);
  };

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      onOpenChange(false);
      resetForm();
    } else {
      onOpenChange(true);
    }
    setSubmitting(false);
  };

  const handleClose = () => {
    handleDialogChange(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      if (!nexusSDK || !nexusSDK.isInitialized()) {
        throw new Error('Connect wallet and initialize Nexus before creating intents.');
      }

      const targetPayroll = selectedPayroll;
      const targetTreasury = selectedTreasury;
      if (!targetPayroll) {
        throw new Error('Selected payroll contract address is not configured.');
      }
      if (!targetTreasury) {
        throw new Error('Selected treasury contract address is not configured.');
      }

      if (!isAutomation) {
        throw new Error('Connected wallet lacks AUTOMATION_ROLE. Ask an administrator to grant access.');
      }

      if (!address || !publicClient) {
        throw new Error('Connect wallet and network before creating intents.');
      }

      const normalizedWorker = form.workerAddress.trim() as `0x${string}`;
      const amountDecimal = Number.parseFloat(form.amount);
      if (!Number.isFinite(amountDecimal) || amountDecimal <= 0) {
        throw new Error('Enter a valid amount.');
      }

      if (!form.releaseAt) {
        throw new Error('Choose a release timestamp.');
      }

      const releaseDate = new Date(form.releaseAt);
      const releaseAtSeconds = Math.floor(releaseDate.getTime() / 1000);
      if (Number.isNaN(releaseAtSeconds) || releaseAtSeconds <= Math.floor(Date.now() / 1000)) {
        throw new Error('Select a release timestamp in the future.');
      }

      const scheduleIdInput = form.scheduleId.trim();
      if (!scheduleIdInput) {
        throw new Error('Provide a vault schedule ID (bytes32 hash).');
      }

      const scheduleId = scheduleIdInput.startsWith('0x')
        ? padHex(scheduleIdInput as `0x${string}`, { size: 32 })
        : padHex(stringToHex(scheduleIdInput, { size: 32 }), { size: 32 });
      const amount = parseUnits(form.amount, 6);

      const intentHash = keccak256(
        encodePacked(
          ['bytes32', 'address', 'uint256', 'uint64'],
          [scheduleId, normalizedWorker, amount, BigInt(releaseAtSeconds)],
        ),
      );

      // Ensure worker is registered on the selected payroll
      try {
        type WorkerPrefs = readonly [`0x${string}`, string, `0x${string}`];
        const prefs = (await publicClient.readContract({
          address: targetPayroll as `0x${string}`,
          abi: payrollIntentManagerAbi,
          functionName: 'workerPrefs',
          args: [normalizedWorker],
        })) as WorkerPrefs;
        const [registeredWallet] = prefs;
        if (!registeredWallet || registeredWallet === '0x0000000000000000000000000000000000000000') {
          throw new Error('Worker not registered on the selected payroll. Open "Create worker profile" and save the worker first.');
        }
      } catch (e) {
        if (e instanceof Error) throw e;
        throw new Error('Unable to verify worker registration on selected payroll.');
      }

      // 1) Schedule payout in the Treasury vault (must have AUTOMATION_ROLE on Treasury)
      const simPayout = await publicClient.simulateContract({
        account: address as `0x${string}`,
        address: targetTreasury as `0x${string}`,
        abi: treasuryAbi,
        functionName: 'schedulePayout',
        args: [scheduleId, normalizedWorker, amount, BigInt(releaseAtSeconds)],
      });
      const payoutBlock = await publicClient.getBlock();
      const payoutCap = payoutBlock.gasLimit;
      const payoutReq = { ...simPayout.request } as typeof simPayout.request & { gas?: bigint };
      if (payoutReq.gas && payoutReq.gas > payoutCap) {
        payoutReq.gas = (payoutCap * BigInt(95)) / BigInt(100);
      }
      const schedulePayoutTx = await writeContractAsync(payoutReq);
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: schedulePayoutTx });
      }

      // 2) Record intent in Payroll manager
      const simIntent = await publicClient.simulateContract({
        account: address as `0x${string}`,
        address: targetPayroll as `0x${string}`,
        abi: payrollIntentManagerAbi,
        functionName: 'scheduleIntent',
        args: [intentHash, normalizedWorker, amount, BigInt(releaseAtSeconds), scheduleId],
      });
      const intentBlock = await publicClient.getBlock();
      const intentCap = intentBlock.gasLimit;
      const intentReq = { ...simIntent.request } as typeof simIntent.request & { gas?: bigint };
      if (intentReq.gas && intentReq.gas > intentCap) {
        intentReq.gas = (intentCap * BigInt(95)) / BigInt(100);
      }
      const scheduleIntentTx = await writeContractAsync(intentReq);

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: scheduleIntentTx });
      }

      toast({
        title: 'Payroll intent scheduled',
        description: `Treasury + Payroll confirmed for ${form.workerAddress.slice(0, 6)}…${form.workerAddress.slice(-4)}`,
      });
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error('Failed to create payroll intent', error);
      toast({
        variant: 'destructive',
        title: 'Unable to create payroll intent',
        description:
          error instanceof Error ? error.message : 'Verify wallet permissions and try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGrantAutomation = async () => {
    try {
      const { txHash, status } = await requestGrant('AUTOMATION_ROLE');
      if (status === 'already_granted' || !txHash) {
        toast({
          title: 'Automation role already granted',
          description: 'This wallet already holds AUTOMATION_ROLE on the payroll.',
        });
      } else {
        toast({
          title: 'Role grant submitted',
          description: `Grant tx ${txHash.slice(0, 6)}…${txHash.slice(-4)} is pending confirmation.`,
        });
      }
      await refreshRoles();
    } catch (error) {
      console.error('Failed to grant automation role', error);
      toast({
        variant: 'destructive',
        title: 'Unable to grant automation role',
        description:
          error instanceof Error ? error.message : 'Verify API configuration and try again.',
      });
    }
  };

  const handleGrantVaultAutomation = async () => {
    try {
      if (!address) throw new Error('Connect wallet before requesting permissions.');
      const token = process.env.NEXT_PUBLIC_GRANT_ROLE_TOKEN;
      if (!token) throw new Error('Grant role API is not configured.');
      const treasuryAddress = selectedTreasury;
      if (!treasuryAddress) throw new Error('Selected treasury contract address is not configured.');
      setGrantingVault(true);
      const res = await fetch('/api/grant-vault-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ account: address, treasuryAddress }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? 'Unable to grant vault role.');
      }
      const payload = (await res.json()) as { txHash: string | null; status?: 'granted' | 'already_granted' };
      toast({
        title: 'Vault role submitted',
        description:
          payload.status === 'already_granted'
            ? 'Wallet already holds AUTOMATION_ROLE on the vault.'
            : `Grant tx ${payload.txHash?.slice(0, 6)}…${payload.txHash?.slice(-4)} submitted.`,
      });
    } catch (e) {
      console.error('Failed to grant vault automation', e);
      toast({ variant: 'destructive', title: 'Unable to grant vault role', description: e instanceof Error ? e.message : 'Try again.' });
    } finally {
      setGrantingVault(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New payroll intent</DialogTitle>
          <DialogDescription>
            Define the worker, token, and release amount for the next payroll intent.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="intent-worker">Worker wallet</Label>
            <Input
              id="intent-worker"
              placeholder="0x..."
              value={form.workerAddress}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, workerAddress: event.target.value }))
              }
              required
              pattern="^0x[a-fA-F0-9]{40}$"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="intent-token">Token</Label>
              <Select
                value={form.token}
                onValueChange={(value) => setForm((prev) => ({ ...prev, token: value as IntentToken }))}
              >
                <SelectTrigger id="intent-token" className="w-full">
                  <SelectValue placeholder="Select token" />
                </SelectTrigger>
                <SelectContent>
                  {TOKEN_OPTIONS.map((token) => (
                    <SelectItem key={token.value} value={token.value}>
                      {token.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="intent-amount">Amount</Label>
              <Input
                id="intent-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="500"
                value={form.amount}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, amount: event.target.value }))
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="intent-chain">Destination chain</Label>
            <Select
              value={String(form.destinationChainId)}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, destinationChainId: Number(value) }))
              }
            >
              <SelectTrigger id="intent-chain" className="w-full">
                <SelectValue placeholder="Select chain" />
              </SelectTrigger>
              <SelectContent>
                {chainOptions.map((chain) => (
                  <SelectItem key={chain.id} value={String(chain.id)}>
                    {chain.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="intent-memo">Notes (optional)</Label>
            <Input
              id="intent-memo"
              placeholder="Provide context for this payout"
              value={form.memo}
              onChange={(event) => setForm((prev) => ({ ...prev, memo: event.target.value }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="intent-release">Release time</Label>
              <Input
                id="intent-release"
                type="datetime-local"
                value={form.releaseAt}
                onChange={(event) => setForm((prev) => ({ ...prev, releaseAt: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="intent-schedule">Vault schedule ID</Label>
              <Input
                id="intent-schedule"
                placeholder="0x… or label"
                value={form.scheduleId}
                onChange={(event) => setForm((prev) => ({ ...prev, scheduleId: event.target.value }))}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose} disabled={submitting || isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || isPending || rolesLoading || !isAutomation}
            >
              {submitting || isPending ? 'Scheduling…' : 'Schedule intent'}
            </Button>
          </DialogFooter>
          {!isAutomation && !rolesLoading && (
            <div className="space-y-2 pt-2 text-sm text-muted-foreground">
              <p>
                Wallet must hold the AUTOMATION_ROLE on the payroll contract to schedule intents.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleGrantAutomation}
                disabled={Boolean(granting)}
              >
                {granting === 'AUTOMATION_ROLE' ? 'Requesting access…' : 'Request automation access'}
              </Button>
              <div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGrantVaultAutomation}
                  disabled={grantingVault}
                >
                  {grantingVault ? 'Requesting vault access…' : 'Request vault automation'}
                </Button>
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
