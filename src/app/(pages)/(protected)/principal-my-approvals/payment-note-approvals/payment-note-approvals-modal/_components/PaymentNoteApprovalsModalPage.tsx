"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { format, isValid, parseISO } from "date-fns";
import { Eye } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { CardHeadingTitle } from "@/common/components/data-display";
import { FormField } from "@/common/components/forms";
import { Select, type SelectOption } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MINIO_URL } from "@/config/constants/api";
import { useSessionContext } from "@/context/SessionContext";
import { useLoginEmployeeId } from "@/hooks/useLoginEmployeeId";
import { cn } from "@/lib/utils";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  getEOfficeContextIds,
  getPaymentNoteApprovalDetail,
  updatePaymentNoteApprovalWorkflow,
} from "@/services";
import type {
  PaymentNoteApprovalRow,
  PaymentNotePoItemRow,
  PaymentNotePoWfRow,
} from "@/types/e-office";
import {
  PAYMENT_NOTE_APPROVAL_STORAGE_KEY,
  type PaymentNoteApprovalStoredContext,
} from "../../_components/payment-note-approval-storage";

function readStorage(key: string): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(key) ?? "";
}

function readRowField(row: Record<string, unknown> | null, ...keys: string[]): string {
  if (!row) return "";
  for (const key of keys) {
    const value = row[key];
    if (value != null && String(value) !== "") return String(value);
  }
  return "";
}

function formatDisplayDate(value?: unknown, pattern = "dd/MM/yyyy"): string {
  if (value == null || value === "") return "";
  const raw = String(value);
  const d = parseISO(raw.includes("T") ? raw : `${raw}T00:00:00`);
  if (isValid(d)) return format(d, pattern);
  const fallback = new Date(raw);
  return isValid(fallback) ? format(fallback, pattern) : raw;
}

function formatInr(value?: unknown): string {
  if (value == null || value === "") return "";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function openMinioFile(path: string | null | undefined) {
  if (!path) return;
  const base = String(MINIO_URL ?? "").replace(/\/$/, "");
  const cleaned = String(path).replace(/^\/+/, "");
  const url = base ? `${base}/${cleaned}` : cleaned;
  window.open(url, "_blank", "width=700,height=600");
}

function ApprovalAccordionPanel({
  title,
  children,
  className,
  defaultExpanded = true,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className={cn("item-request-approval-accordion", className)}>
      <button
        type="button"
        className={cn(
          "item-request-approval-accordion__header",
          expanded && "item-request-approval-accordion__header--expanded",
        )}
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        aria-label={`Toggle ${title}`}
      >
        <CardHeadingTitle as="div">{title}</CardHeadingTitle>
      </button>
      {expanded ? (
        <div className="item-request-approval-accordion__body">{children}</div>
      ) : null}
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <th className="w-[25%] py-2 pr-3 text-left text-[15px] font-normal">{label}</th>
      <td className="py-2 text-[15px]">:&nbsp; {value}</td>
    </tr>
  );
}

function DetailFieldWithDoc({
  label,
  path,
}: {
  label: string;
  path?: string | null;
}) {
  return (
    <tr>
      <th className="w-[25%] py-2 pr-3 text-left text-[15px] font-normal">{label}</th>
      <td className="py-2 text-[15px]">
        :&nbsp; <DocEye path={path} />
      </td>
    </tr>
  );
}

function DocEye({ path }: { path?: string | null }) {
  const hasDoc = path != null && String(path) !== "";
  if (!hasDoc) {
    return (
      <Eye
        className="ml-10 inline h-[18px] w-[18px] text-[#ccc]"
        aria-label="No document"
      />
    );
  }
  return (
    <button
      type="button"
      className="ml-10 inline-flex text-[#0e62c7] hover:text-[#0e62c7]/80"
      title="View Document"
      onClick={() => openMinioFile(String(path))}
    >
      <Eye className="h-[18px] w-[18px]" />
    </button>
  );
}

function ApprovalVerticalStepper({ steps }: { steps: PaymentNotePoWfRow[] }) {
  return (
    <div className="item-request-approval-stepper">
      {steps.map((step, index) => {
        const workflow = readRowField(step as Record<string, unknown>, "workflow");
        const approver = readRowField(
          step as Record<string, unknown>,
          "status_updated_employee",
          "statusUpdatedEmployee",
        );
        const empNumber = readRowField(
          step as Record<string, unknown>,
          "emp_number",
          "empNumber",
        );
        const docPath =
          step.wf_document_path ??
          (step as Record<string, unknown>).wfDocumentPath;
        const status = readRowField(
          step as Record<string, unknown>,
          "workflow_status",
          "workflowStatus",
        );
        const reason = readRowField(
          step as Record<string, unknown>,
          "status_comments",
          "statusComments",
        );

        return (
          <div
            key={`${workflow}-${index}`}
            className="item-request-approval-stepper__step"
          >
            <div className="item-request-approval-stepper__header">
              <div className="item-request-approval-stepper__icon">
                {index + 1}
              </div>
              <span className="item-request-approval-stepper__label">
                {workflow}
              </span>
            </div>

            <div className="item-request-approval-stepper__content">
              <p className="content-head mb-1.5">
                <span>Approval By :</span>{" "}
                <span className="font-normal">
                  {approver}
                  {empNumber ? `-${empNumber}` : ""}
                </span>
              </p>
              <p className="content-head mb-1.5 flex items-center">
                <span>Note :</span>
                <DocEye path={docPath as string | null | undefined} />
              </p>
              <p className="content-head mb-1.5">
                Status : <span className="font-normal">{status}</span>
              </p>
              <p className="content-head">
                Status Reason : <span className="font-normal">{reason}</span>
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Angular `PaymentNoteApprovalsModalComponent` (full-page route).
 */
export function PaymentNoteApprovalsModalPage() {
  const router = useRouter();
  const { user, isLoading: sessionLoading } = useSessionContext();
  const { employeeId, isResolving } = useLoginEmployeeId(user, sessionLoading);
  const ctx = getEOfficeContextIds();

  const [po, setPo] = useState<PaymentNoteApprovalRow | null>(null);
  const [itemList, setItemList] = useState<PaymentNotePoItemRow[]>([]);
  const [workflowList, setWorkflowList] = useState<PaymentNotePoWfRow[]>([]);
  const [wfStageStatus, setWfStageStatus] = useState<SelectOption[]>([]);
  const [poWfId, setPoWfId] = useState<number>(0);
  const [stageId, setStageId] = useState<string>("");
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const mode = String(po?.value ?? "approvalDetails");
  const viewOnly = mode === "viewDetails";
  const canEdit = !viewOnly;

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PAYMENT_NOTE_APPROVAL_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as
        | PaymentNoteApprovalStoredContext
        | PaymentNoteApprovalRow;
      const row =
        "po" in parsed && parsed.po
          ? parsed.po
          : (parsed as PaymentNoteApprovalRow);
      setPo(row);
      if (row?.value === "updateDetails") {
        const sid = row.fk_po_wf_stage_id;
        setStageId(sid != null ? String(sid) : "");
        setComments(
          row.status_comments != null && String(row.status_comments) !== ""
            ? String(row.status_comments)
            : "No Comments",
        );
      }
    } catch {
      setPo(null);
    }
  }, []);

  const loadDetail = useCallback(async () => {
    const poId = Number(
      po?.pk_po_id ?? (po as Record<string, unknown> | null)?.pkPoId ?? 0,
    );
    const loginEmpId = employeeId || Number(readStorage("employeeId") || 0);
    if (!poId || !loginEmpId) return;
    setLoading(true);
    try {
      const detail = await getPaymentNoteApprovalDetail({
        poId,
        employeeId: loginEmpId,
        currentWfStage: readApprovalWfStage(po),
      });
      setItemList(detail.poItems);
      setWorkflowList(detail.poWorkflow);
      setWfStageStatus(
        detail.wfStageOptions.map((opt) => ({
          value: String(opt.pk_wf_stage_id ?? ""),
          label: String(opt.wf_name ?? ""),
        })),
      );
      setPoWfId(detail.poWfId ?? 0);
    } catch (e) {
      toastError(e, "Failed to load purchase order approval details");
      setItemList([]);
      setWorkflowList([]);
      setWfStageStatus([]);
      setPoWfId(0);
    } finally {
      setLoading(false);
    }
  }, [employeeId, po]);

  useEffect(() => {
    if (sessionLoading || isResolving || !po) return;
    void loadDetail();
  }, [isResolving, loadDetail, po, sessionLoading]);

  const goBack = useCallback(() => {
    router.push("/principal-my-approvals/payment-note-approvals");
  }, [router]);

  const handleSave = useCallback(async () => {
    const poId = Number(
      po?.pk_po_id ?? (po as Record<string, unknown> | null)?.pkPoId ?? 0,
    );
    if (!poId || !poWfId || !stageId) {
      toastError(new Error("Status Approval is required"));
      return;
    }
    const loginEmpId = employeeId || Number(readStorage("employeeId") || 0);
    setSaving(true);
    try {
      await updatePaymentNoteApprovalWorkflow({
        poWorkFlowStageId: Number(stageId),
        poWfId,
        poId,
        fromStatusEmpId: loginEmpId,
        statusComments: comments,
        userLoggedInEmpId: loginEmpId,
        academicYearId: ctx.academicYearId,
        collegeId: ctx.collegeId,
      });
      toastSuccess("Updated successfully");
      sessionStorage.removeItem(PAYMENT_NOTE_APPROVAL_STORAGE_KEY);
      goBack();
    } catch (e) {
      toastError(e, "Failed to update purchase order approval");
    } finally {
      setSaving(false);
    }
  }, [
    comments,
    ctx.academicYearId,
    ctx.collegeId,
    employeeId,
    goBack,
    po,
    poWfId,
    stageId,
  ]);

  const busy = loading || sessionLoading || isResolving || saving;
  const poRow = po as Record<string, unknown> | null;

  return (
    <PageContainer>
      <div className="item-request-approval-page-head flex items-center gap-2">
        <span className="material-icons text-[22px] text-[#0c51a4]" aria-hidden>
          ballot
        </span>
        <strong className="text-[18px] font-medium tracking-tight text-[#0c51a4]">
          Purchase Order Approvals
        </strong>
      </div>

      {!po ? (
        <div className="p-6 text-sm text-muted-foreground">
          No purchase order selected. Go back and open details from the list.
        </div>
      ) : (
        <div className="mx-[15px] flex flex-wrap">
          <div className="w-full p-2 lg:w-1/2">
            <ApprovalAccordionPanel title="Purchase Order Approvals">
              <table className="lastTable mb-3 w-full border-none text-[15px]">
                <tbody>
                  <DetailField
                    label="PO No"
                    value={readRowField(poRow, "pono", "pono")}
                  />
                  <DetailField
                    label="Date"
                    value={formatDisplayDate(
                      readRowField(poRow, "po_date", "poDate"),
                    )}
                  />
                  <DetailField
                    label="Store"
                    value={readRowField(poRow, "store_name", "storeName")}
                  />
                  <DetailField
                    label="Transaction Type"
                    value={readRowField(
                      poRow,
                      "indent_type_code",
                      "indentTypeCode",
                    )}
                  />
                  <DetailField
                    label="Status"
                    value={readRowField(
                      poRow,
                      "current_wf_status_name",
                      "currentWfStatusName",
                    )}
                  />
                  <DetailFieldWithDoc
                    label="Comparative Statement"
                    path={
                      (poRow?.compare_statement_path ??
                        poRow?.compareStatementPath) as string | null | undefined
                    }
                  />
                  <DetailFieldWithDoc
                    label="Po Reference File"
                    path={
                      (poRow?.po_ref_file_path2 ??
                        poRow?.poRefFilePath2) as string | null | undefined
                    }
                  />
                </tbody>
              </table>

              <div className="twidth mb-4 overflow-x-auto">
                <table className="w-full table-fixed border-collapse text-[15px]">
                  <thead>
                    <tr className="bg-[#ecf3ff]">
                      <th className="border border-[#C3D9FF] px-1 py-1 text-left font-normal">
                        Item
                      </th>
                      <th className="w-[12%] border border-[#C3D9FF] px-1 py-1 text-left font-normal">
                        Quantity
                      </th>
                      <th className="w-[14%] border border-[#C3D9FF] px-1 py-1 text-left font-normal">
                        Unit Price
                      </th>
                      <th className="w-[14%] border border-[#C3D9FF] px-1 py-1 text-left font-normal">
                        Discount(%)
                      </th>
                      <th className="w-[16%] border border-[#C3D9FF] px-1 py-1 text-left font-normal">
                        Total Cost
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemList.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="border border-[#C3D9FF] px-2 py-3 text-muted-foreground"
                        >
                          {busy ? "Loading…" : "No items"}
                        </td>
                      </tr>
                    ) : (
                      itemList.map((item, idx) => {
                        const itemRow = item as Record<string, unknown>;
                        const itemName = readRowField(
                          itemRow,
                          "item_name",
                          "itemName",
                        );
                        const itemCode = readRowField(
                          itemRow,
                          "item_code",
                          "itemCode",
                        );
                        const qty = readRowField(
                          itemRow,
                          "order_quantity",
                          "orderQuantity",
                        );
                        const unitPrice = readRowField(
                          itemRow,
                          "unit_price",
                          "unitPrice",
                        );
                        const discount = readRowField(
                          itemRow,
                          "item_discount_percentage",
                          "itemDiscountPercentage",
                        );
                        const totalCost = formatInr(
                          itemRow.item_total_cost ?? itemRow.itemTotalCost,
                        );
                        return (
                          <tr key={`${itemName}-${idx}`}>
                            <td className="border border-[#C3D9FF] px-1 py-1.5">
                              {itemName}
                              {itemCode ? (
                                <span className="itemCode font-medium text-blue-600">
                                  ({itemCode})
                                </span>
                              ) : null}
                            </td>
                            <td className="border border-[#C3D9FF] px-1 py-1.5">
                              {qty}
                            </td>
                            <td className="border border-[#C3D9FF] px-1 py-1.5">
                              {unitPrice}
                            </td>
                            <td className="border border-[#C3D9FF] px-1 py-1.5">
                              {discount}
                            </td>
                            <td className="border border-[#C3D9FF] px-1 py-1.5">
                              {totalCost}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <FormField label="Comments" className="mb-4 w-full">
                <Textarea
                  variant="outlined"
                  value={readRowField(
                    poRow,
                    "indent_purpose",
                    "indentPurpose",
                    "purpose",
                  )}
                  disabled
                  rows={2}
                  className="min-h-[52px] resize-y"
                />
              </FormField>

              {canEdit ? (
                <>
                  <hr className="mb-4 border-border" />
                  <div className="-mx-2 flex flex-wrap">
                    <div className="w-full p-2 sm:w-1/2">
                      <Select
                        variant="outlined"
                        label="Status Approval"
                        required
                        value={stageId || null}
                        onChange={(v) => setStageId(v ?? "")}
                        options={wfStageStatus}
                        placeholder="Status Approval"
                        isLoading={busy}
                        searchable
                        clearable={false}
                      />
                    </div>
                    <div className="w-full p-2 sm:w-1/2">
                      <FormField label="Status Comments" htmlFor="status-comments">
                        <Textarea
                          id="status-comments"
                          variant="outlined"
                          value={comments}
                          onChange={(e) => setComments(e.target.value)}
                          rows={2}
                          className="min-h-[52px] resize-y"
                          placeholder="Status Comments"
                          disabled={saving}
                        />
                      </FormField>
                    </div>
                  </div>
                </>
              ) : null}

              <div className="save-btn-align mt-2 flex w-full justify-end gap-2 pr-2.5">
                <Button
                  type="button"
                  className="back-btn !h-[30px] !min-w-[80px] !border-0 !bg-[#ffcf46] !text-black shadow-sm hover:!bg-[#e5b535]"
                  onClick={goBack}
                  disabled={saving}
                >
                  Back
                </Button>
                {canEdit ? (
                  <Button
                    type="button"
                    className="add-btn !h-[30px] !min-w-[80px]"
                    onClick={() => void handleSave()}
                    disabled={busy}
                  >
                    Save
                  </Button>
                ) : null}
              </div>
            </ApprovalAccordionPanel>
          </div>

          <div className="w-full p-2 lg:w-1/2">
            <ApprovalAccordionPanel title="Approval Status">
              {workflowList.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {busy ? "Loading…" : "No workflow stages"}
                </p>
              ) : (
                <ApprovalVerticalStepper steps={workflowList} />
              )}
            </ApprovalAccordionPanel>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

function readApprovalWfStage(row: PaymentNoteApprovalRow | null): number {
  if (!row) return 0;
  const raw =
    row.current_wf_stage ??
    (row as Record<string, unknown>).currentWfStage ??
    (row as Record<string, unknown>).wf_stage ??
    0;
  return Number(raw);
}
