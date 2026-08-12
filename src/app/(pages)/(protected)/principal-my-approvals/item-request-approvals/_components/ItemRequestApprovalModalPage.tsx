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
  getInvInternalIndentApprovalDetail,
  updateInvInternalIndentWorkflowApproval,
  type InvInternalIndentApprovalRow,
} from "@/services";
import { ITEM_REQUEST_APPROVAL_STORAGE_KEY } from "./item-request-approval-storage";

function readStorage(key: string): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(key) ?? "";
}

function readRowField(row: InvInternalIndentApprovalRow | null, ...keys: string[]): string {
  if (!row) return "";
  for (const key of keys) {
    const value = (row as Record<string, unknown>)[key];
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

function openMinioFile(path: string | null | undefined) {
  if (!path) return;
  const base = String(MINIO_URL ?? "").replace(/\/$/, "");
  const cleaned = String(path).replace(/^\/+/, "");
  const url = base ? `${base}/${cleaned}` : cleaned;
  window.open(url, "_blank", "width=700,height=600");
}

type StoredContext = {
  indent?: InvInternalIndentApprovalRow;
  workflowStages?: InvInternalIndentApprovalRow[];
};

/** Angular `mat-accordion` + `mat-expansion-panel` (hideToggle — header click collapses). */
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

/** Angular `mat-vertical-stepper` — blue step icons + matching connector lines (#5f95fb). */
function ApprovalVerticalStepper({
  steps,
}: {
  steps: InvInternalIndentApprovalRow[];
}) {
  return (
    <div className="item-request-approval-stepper">
      {steps.map((step, index) => {
        const workflow = readRowField(step, "workflow", "workflow");
        const approver = readRowField(
          step,
          "status_updated_employee",
          "statusUpdatedEmployee",
        );
        const empNumber = readRowField(step, "emp_number", "empNumber");
        const docPath =
          step.wf_document_path ??
          (step as Record<string, unknown>).wfDocumentPath;
        const status = readRowField(step, "workflow_status", "workflowStatus");
        const reason = readRowField(step, "status_comments", "statusComments");

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
 * Angular `ItemRequestApprovalModalComponent` (full-page route).
 */
export function ItemRequestApprovalModalPage() {
  const router = useRouter();
  const { user, isLoading: sessionLoading } = useSessionContext();
  const { employeeId, isResolving } = useLoginEmployeeId(user, sessionLoading);

  const [indent, setIndent] = useState<InvInternalIndentApprovalRow | null>(null);
  const [itemList, setItemList] = useState<InvInternalIndentApprovalRow[]>([]);
  const [workflowList, setWorkflowList] = useState<InvInternalIndentApprovalRow[]>(
    [],
  );
  const [wfStageStatus, setWfStageStatus] = useState<
    InvInternalIndentApprovalRow[]
  >([]);
  const [internalWfId, setInternalWfId] = useState<number>(0);
  const [stageId, setStageId] = useState<string>("");
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const mode = String(indent?.value ?? "approvalDetails");
  const viewOnly = mode === "viewDetails";
  const canEdit = !viewOnly;

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(ITEM_REQUEST_APPROVAL_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredContext;
      const row = parsed.indent ?? null;
      setIndent(row);
      if (row?.value === "updateDetails") {
        const sid = row.fk_internal_ind_wf_stage_id;
        setStageId(sid != null ? String(sid) : "");
        setComments(
          row.status_comments != null && String(row.status_comments) !== ""
            ? String(row.status_comments)
            : "No Comments",
        );
      }
    } catch {
      setIndent(null);
    }
  }, []);

  const loadDetail = useCallback(async () => {
    const indentId = Number(
      indent?.pk_internal_ind_id ??
        (indent as Record<string, unknown> | null)?.pkInternalIndId ??
        0,
    );
    if (!indentId || !employeeId) return;
    setLoading(true);
    try {
      const detail = await getInvInternalIndentApprovalDetail({
        loginEmployeeId: employeeId,
        internalIndentId: indentId,
      });
      setItemList(detail.itemList);
      setWorkflowList(detail.workflowList);
      setWfStageStatus(detail.workflowStageStatus);
      const currentStage = Number(
        indent?.current_wf_stage ??
          (indent as Record<string, unknown> | null)?.currentWfStage ??
          0,
      );
      const match = detail.workflowList.find(
        (x) => Number(x.stage ?? (x as Record<string, unknown>).stage) === currentStage,
      );
      setInternalWfId(
        Number(
          match?.pk_internal_indent_wf_id ??
            (match as Record<string, unknown> | undefined)?.pkInternalIndentWfId ??
            0,
        ),
      );
    } catch (e) {
      toastError(e, "Failed to load indent approval details");
      setItemList([]);
      setWorkflowList([]);
      setWfStageStatus([]);
      setInternalWfId(0);
    } finally {
      setLoading(false);
    }
  }, [employeeId, indent]);

  useEffect(() => {
    if (sessionLoading || isResolving || !indent) return;
    void loadDetail();
  }, [indent, isResolving, loadDetail, sessionLoading]);

  const stageOptions = useMemo<SelectOption[]>(
    () =>
      wfStageStatus.map((row) => ({
        value: String(row.pk_wf_stage_id ?? ""),
        label: String(row.wf_name ?? ""),
      })),
    [wfStageStatus],
  );

  const goBack = useCallback(() => {
    router.push("/principal-my-approvals/item-request-approvals");
  }, [router]);

  const handleSave = useCallback(async () => {
    const indentId = Number(
      indent?.pk_internal_ind_id ??
        (indent as Record<string, unknown> | null)?.pkInternalIndId ??
        0,
    );
    if (!indentId || !internalWfId || !stageId) {
      toastError(new Error("Status Approval is required"));
      return;
    }
    setSaving(true);
    try {
      await updateInvInternalIndentWorkflowApproval({
        internalIndWfStageId: Number(stageId),
        internalIndentWorkflowId: internalWfId,
        invInternalIndentId: indentId,
        fromStatusEmpId: String(
          employeeId || readStorage("employeeId") || "",
        ),
        statusComments: comments,
        academicYearId: Number(readStorage("academicYearId") || 0),
        collegeId: Number(
          user?.collegeId ?? (readStorage("collegeId") || 0),
        ),
      });
      toastSuccess("Updated successfully");
      goBack();
    } catch (e) {
      toastError(e, "Failed to update indent approval");
    } finally {
      setSaving(false);
    }
  }, [
    comments,
    employeeId,
    goBack,
    indent,
    internalWfId,
    stageId,
    user?.collegeId,
  ]);

  const busy = loading || sessionLoading || isResolving || saving;

  return (
    <PageContainer>
      {/* Angular `.page-table-head` — separate from accordion cards */}
      <div className="item-request-approval-page-head flex items-center gap-2">
        <span className="material-icons text-[22px] text-[#0c51a4]" aria-hidden>
          ballot
        </span>
        <strong className="text-[18px] font-medium tracking-tight text-[#0c51a4]">
          Internal Indents Approvals
        </strong>
      </div>

      {!indent ? (
        <div className="p-6 text-sm text-muted-foreground">
          No indent selected. Go back and open details from the list.
        </div>
      ) : (
        <div className="mx-[15px] flex flex-wrap">
          {/* Left — accordion1 */}
          <div className="w-full p-2 lg:w-1/2">
            <ApprovalAccordionPanel title="Indent Item Details">
              <table className="lastTable mb-3 w-full border-none text-[15px]">
                <tbody>
                  <DetailField
                    label="Indent No"
                    value={readRowField(indent, "internal_ind_no", "internalIndNo")}
                  />
                  <DetailField
                    label="Date"
                    value={formatDisplayDate(
                      readRowField(indent, "indent_date", "indentDate"),
                    )}
                  />
                  <DetailField
                    label="Store"
                    value={readRowField(indent, "store_name", "storeName")}
                  />
                  <DetailField
                    label="Transaction Type"
                    value={readRowField(
                      indent,
                      "indent_type_code",
                      "indentTypeCode",
                    )}
                  />
                  <DetailField
                    label="Satus"
                    value={readRowField(
                      indent,
                      "current_wf_status_name",
                      "currentWfStatusName",
                    )}
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
                      <th className="w-[20%] border border-[#C3D9FF] px-1 py-1 text-left font-normal">
                        Quantity
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemList.length === 0 ? (
                      <tr>
                        <td
                          colSpan={2}
                          className="border border-[#C3D9FF] px-2 py-3 text-muted-foreground"
                        >
                          {busy ? "Loading…" : "No items"}
                        </td>
                      </tr>
                    ) : (
                      itemList.map((item, idx) => {
                        const itemName = readRowField(
                          item,
                          "item_name",
                          "itemName",
                        );
                        const itemCode = readRowField(
                          item,
                          "item_code",
                          "itemCode",
                        );
                        const qty = readRowField(
                          item,
                          "indent_quantity",
                          "indentQuantity",
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
                  value={readRowField(indent, "purpose", "purpose")}
                  disabled
                  rows={2}
                  className="min-h-[52px] resize-y"
                />
              </FormField>

              {canEdit ? (
                <>
                  <hr className="mb-4 border-border" />
                  {/* Angular: two separate mat-form-field outline columns (~48% each) */}
                  <div className="-mx-2 flex flex-wrap">
                    <div className="w-full p-2 sm:w-1/2">
                      <Select
                        variant="outlined"
                        label="Status Approval"
                        required
                        value={stageId || null}
                        onChange={(v) => setStageId(v ?? "")}
                        options={stageOptions}
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

              {/* Angular `.save-btn-align` + `.back-btn` / `color="accent"` Save */}
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

          {/* Right — accordion2 */}
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
