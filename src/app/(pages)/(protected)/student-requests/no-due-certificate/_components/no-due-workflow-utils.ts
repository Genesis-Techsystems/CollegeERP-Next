import type { FeeCertificateWorkflowRow } from "@/types/tc-no-due";

function isEmptyObject(
  obj: Record<string, unknown> | null | undefined,
): boolean {
  return !obj || Object.keys(obj).length === 0;
}

/**
 * Angular `getNoDueDetails` / `ViewCertificateFlowsComponent` ordering:
 * move ACCOUNTS, OTHERS, PRINCIPAL/VICEPRINCIPAL to the end (in that order).
 */
export function orderNoDueWorkflows(
  workflows: FeeCertificateWorkflowRow[],
): FeeCertificateWorkflowRow[] {
  const list = [...workflows];
  let account: FeeCertificateWorkflowRow | Record<string, never> = {};
  let others: FeeCertificateWorkflowRow | Record<string, never> = {};
  let principal: FeeCertificateWorkflowRow | Record<string, never> = {};

  for (let index = 0; index < list.length; index++) {
    const code = String(list[index]?.deptCode ?? "").toUpperCase();
    if (code === "ACCOUNTS") {
      account = list[index]!;
      list.splice(index, 1);
      index--;
      continue;
    }
    if (code === "OTHERS") {
      others = list[index]!;
      list.splice(index, 1);
      index--;
      continue;
    }
    if (code === "PRINCIPAL" || code === "VICEPRINCIPAL") {
      principal = list[index]!;
      list.splice(index, 1);
      index--;
    }
  }

  if (!isEmptyObject(account as Record<string, unknown>)) {
    list.push(account as FeeCertificateWorkflowRow);
  }
  if (!isEmptyObject(others as Record<string, unknown>)) {
    list.push(others as FeeCertificateWorkflowRow);
  }
  if (!isEmptyObject(principal as Record<string, unknown>)) {
    list.push(principal as FeeCertificateWorkflowRow);
  }
  return list;
}

export function workflowsFromDetails(
  details: Record<string, unknown> | null | undefined,
): FeeCertificateWorkflowRow[] {
  const raw = details?.feeCertificateWorkflows;
  return Array.isArray(raw) ? (raw as FeeCertificateWorkflowRow[]) : [];
}
