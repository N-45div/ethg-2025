'use client';
import { useMemo, useState } from 'react';
import { useNexus } from '@/providers/NexusProvider';
import { usePublicClient, useWriteContract } from 'wagmi';
import type { NexusSDK } from '@avail-project/nexus-core';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { CONTRACTS } from '@/lib/contracts';
import { payrollIntentManagerAbi } from '@/lib/abi/payroll';
import { padHex, stringToHex } from 'viem/utils';
import { usePayrollRoles } from '@/hooks/usePayrollRoles';
import { getEnabledChains } from '@/lib/chains';

const DESTINATION_OPTIONS = getEnabledChains().map((chain) => ({
  value: chain.key,
  label: chain.name,
}));

const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000' as const;

interface CreateWorkerProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type FormState = {
  workerAddress: string;
  role: string;
  payrollNotes: string;
  allocationUsd: string;
  destinationChain: string;
  templateId: string;
};

const DEFAULT_FORM: FormState = {
  workerAddress: '',
  role: 'Contributor',
  payrollNotes: '',
  allocationUsd: '',
  destinationChain: DESTINATION_OPTIONS[0]!.value,
  templateId: '',
};

type WorkerRegistrationInput = {
  worker: `0x${string}`;
  role?: string;
  allocationUsd?: number;
  notes?: string;
};

type NexusWithWorkerRegistration = NexusSDK & {
  registerWorker?: (input: WorkerRegistrationInput) => Promise<unknown>;
};

export function CreateWorkerProfileDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateWorkerProfileDialogProps) {
  const { toast } = useToast();
  const { nexusSDK } = useNexus();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();
  const { isAdmin, isAutomation, isLoading: rolesLoading, granting, requestGrant, refreshRoles } = usePayrollRoles();
  const [form, setForm] = useState<FormState>(() => ({ ...DEFAULT_FORM }));
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    if (submitting || isPending) return false;
    if (rolesLoading) return false;
    return isAdmin;
  }, [isAdmin, isPending, rolesLoading, submitting]);

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
  };

  const handleGrantAdmin = async () => {
    try {
      const { txHash, status } = await requestGrant('DEFAULT_ADMIN_ROLE');
      toast({
        title: 'Role grant submitted',
        description:
          status === 'already_granted'
            ? 'Wallet already holds DEFAULT_ADMIN_ROLE. We refreshed your access state.'
            : `Grant tx ${txHash.slice(0, 6)}…${txHash.slice(-4)} submitted.`,
      });
    } catch (error) {
      console.error('Failed to grant admin role', error);
      toast({
        variant: 'destructive',
        title: 'Unable to grant admin role',
        description: error instanceof Error ? error.message : 'Verify API configuration and try again.',
      });
    }
  };

  const handleRefreshRoles = async () => {
    try {
      await refreshRoles();
      toast({ title: 'Permissions refreshed' });
    } catch (error) {
      console.error('Failed to refresh roles', error);
    }
  };

  const handleClose = () => {
    handleDialogChange(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      if (!isAdmin) {
        throw new Error('Wallet lacks DEFAULT_ADMIN_ROLE. Request access first.');
      }

      if (!nexusSDK || !nexusSDK.isInitialized()) {
        throw new Error('Connect wallet and initialize Nexus before creating workers.');
      }

      if (!CONTRACTS.payroll) {
        throw new Error('Payroll contract address is not configured.');
      }

      const normalizedWorker = form.workerAddress.trim() as `0x${string}`;
      const allocationUsd = Number.parseFloat(form.allocationUsd) || 0;
      const templateInput = form.templateId.trim();
      const templateBytes =
        templateInput.length === 0
          ? ZERO_BYTES32
          : templateInput.startsWith('0x')
            ? padHex(templateInput as `0x${string}`, { size: 32 })
            : padHex(stringToHex(templateInput, { size: 32 }), { size: 32 });

      const extended = nexusSDK as unknown as NexusWithWorkerRegistration;
      const registerWorker = extended.registerWorker;

      if (typeof registerWorker === 'function') {
        await registerWorker.call(nexusSDK, {
          worker: normalizedWorker,
          role: form.role?.trim() || undefined,
          allocationUsd,
          notes: form.payrollNotes.trim() || undefined,
        });
      }

      const txHash = await writeContractAsync({
        address: CONTRACTS.payroll,
        abi: payrollIntentManagerAbi,
        functionName: 'setWorkerPreferences',
        args: [
          normalizedWorker,
          normalizedWorker,
          form.destinationChain,
          templateBytes,
        ],
      });

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: txHash });
      }

      if (CONTRACTS.payrollUsdc) {
        try {
          const usdcTx = await writeContractAsync({
            address: CONTRACTS.payrollUsdc,
            abi: payrollIntentManagerAbi,
            functionName: 'setWorkerPreferences',
            args: [
              normalizedWorker,
              normalizedWorker,
              form.destinationChain,
              templateBytes,
            ],
          });
          if (publicClient) {
            await publicClient.waitForTransactionReceipt({ hash: usdcTx });
          }
        } catch (e) {
          console.warn('USDC worker registration skipped or failed', e);
        }
      }

      toast({
        title: 'Worker profile saved',
        description: `Worker ${normalizedWorker.slice(0, 6)}…${normalizedWorker.slice(-4)} registered for ${form.destinationChain}`,
      });
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error('Failed to create worker profile', error);
      toast({
        variant: 'destructive',
        title: 'Unable to create worker profile',
        description:
          error instanceof Error ? error.message : 'Check wallet permissions and try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create worker profile</DialogTitle>
          <DialogDescription>
            Capture the worker wallet, assign a role, and set an allocation to include them in
            payroll intents.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="workerAddress">Worker wallet</Label>
            <Input
              id="workerAddress"
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
              <Label htmlFor="role">Role / team</Label>
              <Input
                id="role"
                placeholder="Engineer, Designer, …"
                value={form.role}
                onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="allocationUsd">Monthly allocation (USD)</Label>
              <Input
                id="allocationUsd"
                type="number"
                min="0"
                step="0.01"
                placeholder="1500"
                value={form.allocationUsd}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, allocationUsd: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destinationChain">Destination chain</Label>
              <Select
                value={form.destinationChain}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, destinationChain: value }))
                }
              >
                <SelectTrigger id="destinationChain" className="w-full">
                  <SelectValue placeholder="Select chain" />
                </SelectTrigger>
                <SelectContent>
                  {DESTINATION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Reminder: worker is eligible for quarterly bonus payments."
              value={form.payrollNotes}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, payrollNotes: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="templateId">Intent template ID (optional)</Label>
            <Input
              id="templateId"
              placeholder="0x… or text key"
              value={form.templateId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, templateId: event.target.value }))
              }
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={submitting || isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitting || isPending ? 'Saving…' : 'Save profile'}
            </Button>
          </DialogFooter>
          <div className="space-y-3 pt-3 text-sm">
            {rolesLoading && (
              <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-muted-foreground">
                Checking wallet permissions on-chain…
              </div>
            )}
            {!rolesLoading && (
              <div
                className={`rounded-md border px-3 py-2 ${
                  isAdmin
                    ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300'
                    : 'border-destructive/60 bg-destructive/10 text-destructive'
                }`}
              >
                {isAdmin
                  ? 'Access confirmed. Wallet can manage worker profiles.'
                  : 'Wallet must hold the DEFAULT_ADMIN_ROLE on the payroll contract before profiles can be saved.'}
              </div>
            )}
            {!isAdmin && (
              <div className="space-y-2 text-muted-foreground">
                <p className="font-medium text-foreground">Need access?</p>
                <ol className="space-y-1 pl-4">
                  <li className="list-decimal">Request the admin role using the button below.</li>
                  <li className="list-decimal">Wait for confirmation, then refresh your permissions.</li>
                  <li className="list-decimal">Once granted, return here to create worker profiles.</li>
                </ol>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={handleGrantAdmin} disabled={granting === 'DEFAULT_ADMIN_ROLE'}>
                    {granting === 'DEFAULT_ADMIN_ROLE' ? 'Submitting…' : 'Request admin role'}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={handleRefreshRoles}>
                    Refresh permissions
                  </Button>
                </div>
              </div>
            )}
            {isAdmin && !isAutomation && (
              <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-muted-foreground">
                Automation role is optional but recommended for scheduling payroll intents. Request it from the access panel if needed.
              </div>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
