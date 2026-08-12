import type { PaymentNoteApprovalRow } from "@/types/e-office";

/** Angular `ParametersService.approvePurchaseOrder` session key. */
export const PAYMENT_NOTE_APPROVAL_STORAGE_KEY = "approvePurchaseOrder";

export type PaymentNoteApprovalMode =
  | "approvalDetails"
  | "viewDetails"
  | "updateDetails";

export type PaymentNoteApprovalStoredContext = {
  po?: PaymentNoteApprovalRow;
  workflowStages?: PaymentNoteApprovalRow[];
};
