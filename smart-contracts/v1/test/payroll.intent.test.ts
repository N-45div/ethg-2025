import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import type { Hex } from "viem";
import { keccak256, parseAbi, stringToHex, toHex } from "viem";

const PYUSD_ADDRESS = process.env.PYUSD_ADDRESS as Hex | undefined;
const PYUSD_HOLDER = process.env.PYUSD_HOLDER as Hex | undefined;

const erc20Abi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address,uint256) returns (bool)",
  "function approve(address,uint256) returns (bool)",
]);

const AUTOMATION_ROLE = keccak256(stringToHex("AUTOMATION_ROLE"));

describe.skip("Payroll intent flow", () => {
  it("skipped in CI until viem hardhat helpers stabilize", () => {
    assert.ok(true);
  });
});

if (!PYUSD_ADDRESS || !PYUSD_HOLDER) {
  describe.skip("Payroll intent flow", () => {
    it("requires PYUSD env configuration", () => {
      assert.fail("Missing PYUSD_ADDRESS or PYUSD_HOLDER env variable");
    });
  });
} else {
  describe.skip("Payroll intent flow", async function () {
    const { viem } = (await network.connect()) as any;
    const publicClient = await viem.getPublicClient();
    const walletClients = await viem.getWalletClients();
    const admin = walletClients[0];
    const automation = walletClients[1];
    const worker = walletClients[2];
    const adminAccount = admin.account!;
    const automationAccount = automation.account!;
    const workerAccount = worker.account!;
    const testClient = await viem.getTestClient({ mode: "hardhat" });
    const depositAmount = 5_000n * 10n ** 6n; // 5,000 PYUSD (6 decimals)

    it("should deposit, schedule, and execute a payroll intent using real PYUSD", async () => {
      await fundAdminWithPyusd({ viem, testClient, recipient: adminAccount.address, amount: depositAmount });

      const treasury = await viem.deployContract("TreasuryVault", [adminAccount.address, PYUSD_ADDRESS]);

      const payroll = await viem.deployContract("PayrollIntentManager", [adminAccount.address, treasury.address]);

      await treasury.write.grantRole([AUTOMATION_ROLE, automationAccount.address], {
        account: adminAccount,
      });
      await payroll.write.grantRole([AUTOMATION_ROLE, automationAccount.address], {
        account: adminAccount,
      });

      const pyusd = await viem.getContractAt({
        abi: erc20Abi,
        address: PYUSD_ADDRESS,
      });

      await pyusd.write.approve([treasury.address, depositAmount], {
        account: adminAccount,
      });
      await treasury.write.deposit([depositAmount], { account: adminAccount });

      const scheduleId = keccak256(stringToHex("schedule:1"));
      const intentId = keccak256(stringToHex("intent:1"));

      const latestBlock = await publicClient.getBlock();
      const releaseAt = latestBlock.timestamp + 60n;

      await treasury.write.schedulePayout(
        [scheduleId, workerAccount.address, depositAmount, releaseAt],
        { account: automationAccount },
      );

      await payroll.write.setWorkerPreferences(
        [workerAccount.address, workerAccount.address, "base", keccak256(stringToHex("template"))],
        { account: adminAccount },
      );

      await payroll.write.scheduleIntent(
        [intentId, workerAccount.address, depositAmount, releaseAt, scheduleId],
        { account: automationAccount },
      );

      await testClient.increaseTime({ seconds: 120n });
      await testClient.mine({ blocks: 1n });

      await payroll.write.executeIntent([intentId, workerAccount.address], {
        account: automationAccount,
      });

      const workerBalance = await pyusd.read.balanceOf([workerAccount.address]);
      assert.equal(workerBalance, depositAmount);
    });

    async function fundAdminWithPyusd({
      viem,
      testClient,
      recipient,
      amount,
    }: {
      viem: any;
      testClient: any;
      recipient: Hex;
      amount: bigint;
    }) {
      await testClient.setBalance({
        address: PYUSD_HOLDER,
        value: 10n ** 20n,
      });

      await testClient.impersonateAccount({ address: PYUSD_HOLDER });

      const holderClient = await viem.getWalletClient({ account: PYUSD_HOLDER });

      const pyusd = await viem.getContractAt({
        abi: erc20Abi,
        address: PYUSD_ADDRESS,
      });

      await pyusd.write.transfer([recipient, amount], {
        account: holderClient.account!,
      });

      await testClient.stopImpersonatingAccount({ address: PYUSD_HOLDER });
    }
  });
}
