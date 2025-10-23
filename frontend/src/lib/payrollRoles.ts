import { keccak256, stringToHex } from "viem";

export type PayrollRoleKey = "DEFAULT_ADMIN_ROLE" | "AUTOMATION_ROLE";

export const DEFAULT_ADMIN_ROLE = `0x${"0".repeat(64)}` as const satisfies `0x${string}`;
export const AUTOMATION_ROLE = keccak256(stringToHex("AUTOMATION_ROLE"));

export const SUPPORTED_PAYROLL_ROLES: readonly PayrollRoleKey[] = [
  "DEFAULT_ADMIN_ROLE",
  "AUTOMATION_ROLE",
] as const;

export function resolvePayrollRoleHash(role: PayrollRoleKey): `0x${string}` {
  return role === "AUTOMATION_ROLE" ? AUTOMATION_ROLE : DEFAULT_ADMIN_ROLE;
}
